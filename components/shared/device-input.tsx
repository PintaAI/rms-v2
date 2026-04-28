"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { searchDevices, createDevice } from "@/actions";
import { getBrandIcon } from "@/lib/brand-icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  RiCheckLine,
  RiLoader4Line,
  RiSearchLine,
  RiAddLine,
  RiAlertLine,
  RiEditLine,
  RiSmartphoneLine,
} from "@remixicon/react";
import { cn } from "@/lib/utils";

export interface HpCatalogOption {
  id: string;
  modelName: string;
  brandName: string;
}

interface DeviceInputProps {
  value: HpCatalogOption | null;
  onChange: (device: HpCatalogOption | null) => void;
  disabled?: boolean;
  error?: string | null;
}

export function DeviceInput({
  value,
  onChange,
  disabled = false,
  error,
}: DeviceInputProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<HpCatalogOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [showInput, setShowInput] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const selectedLabel = value ? `${value.brandName} ${value.modelName}` : "";
  const displayQuery = showInput ? query : selectedLabel;

  const isSelected = useMemo(() => {
    return !!value && selectedLabel === displayQuery;
  }, [value, selectedLabel, displayQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim() || isSelected) {
      queueMicrotask(() => {
        setResults([]);
        setShowDropdown(false);
      });
      return;
    }

    let active = true;
    queueMicrotask(() => {
      setShowDropdown(true);
    });

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchDevices(query);
        if (!active) return;
        setResults(results);
      } catch {
        if (!active) return;
        setResults([]);
      }
      setIsSearching(false);
      setHighlightedIndex(-1);
    }, 150);

    return () => {
      active = false;
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, isSelected]);

  const handleSelect = useCallback((device: HpCatalogOption) => {
    onChange(device);
    setShowDropdown(false);
    setShowInput(false);
  }, [onChange]);

  const handleCreate = useCallback(async () => {
    if (!query.trim()) return;

    setIsCreating(true);
    const parts = query.trim().split(/\s+/);
    const brandName = parts.length >= 2 ? parts[0] : "Unknown";
    const modelName = parts.length >= 2 ? parts.slice(1).join(" ") : parts[0];

    try {
      const device = await createDevice({ brandName, modelName });
      handleSelect(device);
    } catch {
      // Silently fail - user can retry
    }
    setIsCreating(false);
  }, [query, handleSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const maxIndex = results.length > 0 ? results.length - 1 : 0;
        return prev < maxIndex ? prev + 1 : 0;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const maxIndex = results.length > 0 ? results.length - 1 : 0;
        return prev > 0 ? prev - 1 : maxIndex;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && results[highlightedIndex]) {
        handleSelect(results[highlightedIndex]);
      } else if (results.length === 0 && query.trim()) {
        handleCreate();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowDropdown(false);
      setHighlightedIndex(-1);
    }
  }, [showDropdown, results, highlightedIndex, handleSelect, handleCreate, query]);

  const handleClear = useCallback(() => {
    onChange(null);
    setQuery("");
    setShowInput(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [onChange]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    onChange(null);
  }, [onChange]);

  const handleFocus = useCallback(() => {
    if (query.trim() && !isSelected) {
      setShowDropdown(true);
    }
  }, [query, isSelected]);

  const parseDeviceName = useCallback((deviceQuery: string) => {
    const parts = deviceQuery.trim().split(/\s+/);
    if (parts.length >= 2) {
      return { brand: parts[0], model: parts.slice(1).join(" ") };
    }
    return { brand: "Unknown", model: parts[0] || deviceQuery };
  }, []);

  const createLabel = useMemo(() => {
    if (!query.trim()) return query;
    const parsed = parseDeviceName(query);
    return `${parsed.brand} ${parsed.model}`;
  }, [query, parseDeviceName]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Label htmlFor="device" className="text-base font-medium flex items-center gap-1.5">
          <RiSmartphoneLine className="h-4 w-4" />
          Perangkat
        </Label>
        <span className="text-destructive text-sm leading-none">*</span>
      </div>

      {value && !showInput ? (
        <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="flex items-center justify-center w-10 h-10 bg-green-500/20 rounded-lg">
            {getBrandIcon(value.brandName)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{value.brandName}</div>
            <div className="text-muted-foreground text-sm truncate">{value.modelName}</div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={disabled || isCreating}
            className="text-muted-foreground hover:text-foreground"
          >
            <RiEditLine className="w-4 h-4" />
            Ubah
          </Button>
        </div>
      ) : (
        <div className="relative" ref={dropdownRef}>
          <Input
            ref={inputRef}
            id="device"
          value={displayQuery}
            onChange={handleChange}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder="Cari atau ketik perangkat baru..."
            disabled={disabled || isCreating}
            autoComplete="off"
            className="w-full"
          />

          {showDropdown && (
            <div className="absolute z-50 w-full mt-1 bg-background border border-input rounded-lg shadow-lg max-h-60 overflow-auto">
              {isSearching ? (
                <div className="p-4 text-sm text-muted-foreground flex items-center gap-2">
                  <RiLoader4Line className="w-4 h-4 animate-spin" />
                  Mencari perangkat...
                </div>
              ) : results.length > 0 ? (
                <div className="py-1">
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Perangkat yang Ada
                  </div>
                  {results.map((device, index) => (
                    <button
                      key={device.id}
                      type="button"
                      className={cn(
                        "w-full px-3 py-2.5 text-sm text-left transition-colors flex items-center gap-3",
                        highlightedIndex === index ? "bg-accent" : "hover:bg-accent"
                      )}
                      onClick={() => handleSelect(device)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                    >
                      <div className="flex items-center justify-center w-8 h-8 bg-muted/50 rounded-md">
                        {getBrandIcon(device.brandName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{device.brandName}</span>
                        <span className="text-muted-foreground ml-1">{device.modelName}</span>
                      </div>
                      <RiCheckLine className={cn(
                        "w-4 h-4 text-muted-foreground transition-opacity",
                        highlightedIndex === index ? "opacity-100" : "opacity-0"
                      )} />
                    </button>
                  ))}
                </div>
              ) : query.trim() ? (
                <div className="p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <RiSearchLine className="w-4 h-4" />
                    Tidak ada perangkat yang ditemukan
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCreate}
                    disabled={isCreating}
                    className="w-full"
                  >
                    {isCreating ? (
                      <>
                        <RiLoader4Line className="w-4 h-4 mr-2 animate-spin" />
                        Membuat...
                      </>
                    ) : (
                      <>
                        <RiAddLine className="w-4 h-4 mr-2" />
                        Buat &quot;{createLabel}&quot;
                      </>
                    )}
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
          <RiAlertLine className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
