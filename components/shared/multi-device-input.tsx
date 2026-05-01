"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { searchDevices, createDevice } from "@/actions";
import { getBrandIcon } from "@/lib/brand-icons";
import { HpCatalogOption } from "@/components/shared/device-input";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RiLoader4Line, RiSearchLine, RiAddLine, RiCloseLine, RiCheckLine } from "@remixicon/react";
import { cn } from "@/lib/utils";

export type { HpCatalogOption };

interface MultiDeviceInputProps {
  value: HpCatalogOption[];
  onChange: (devices: HpCatalogOption[]) => void;
  disabled?: boolean;
}

export function MultiDeviceInput({
  value,
  onChange,
  disabled = false,
}: MultiDeviceInputProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<HpCatalogOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    if (!query.trim()) {
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
        const filtered = results.filter((d) => !value.some((v) => v.id === d.id));
        setResults(filtered);
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
  }, [query, value]);

  const handleSelect = useCallback((device: HpCatalogOption) => {
    if (value.some((v) => v.id === device.id)) {
      setShowDropdown(false);
      return;
    }
    onChange([...value, device]);
    setQuery("");
    setResults([]);
    setShowDropdown(false);
  }, [value, onChange]);

  const handleRemove = useCallback((deviceId: string) => {
    onChange(value.filter((d) => d.id !== deviceId));
  }, [value, onChange]);

  const handleCreate = useCallback(async () => {
    if (!query.trim()) return;

    setIsCreating(true);
    const parts = query.trim().split(/\s+/);
    const brandName = parts.length >= 2 ? parts[0] : "Unknown";
    const modelName = parts.length >= 2 ? parts.slice(1).join(" ") : parts[0];

    try {
      const device = await createDevice({ brandName, modelName });
      if (value.some((v) => v.id === device.id)) {
        setQuery("");
        setShowDropdown(false);
        return;
      }
      handleSelect(device);
    } catch {
      // Silently fail - user can retry
    }
    setIsCreating(false);
  }, [query, value, handleSelect]);

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

  const parseDeviceName = useCallback((deviceQuery: string) => {
    const parts = deviceQuery.trim().split(/\s+/);
    if (parts.length >= 2) {
      return { brand: parts[0], model: parts.slice(1).join(" ") };
    }
    return { brand: "Unknown", model: parts[0] || deviceQuery };
  }, []);

  const displayQuery = useMemo(() => {
    if (!query.trim()) return query;
    const parsed = parseDeviceName(query);
    return `${parsed.brand} ${parsed.model}`;
  }, [query, parseDeviceName]);

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((device) => (
            <Badge
              key={device.id}
              variant="secondary"
              className="gap-1.5 pr-1 py-1.5"
            >
              <div className="flex items-center gap-1.5">
                {getBrandIcon(device.brandName)}
                <span className="text-sm">
                  {device.brandName} {device.modelName}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(device.id)}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
              >
                <RiCloseLine className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="relative" ref={dropdownRef}>
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (query.trim()) {
              setShowDropdown(true);
            }
          }}
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
                  Perangkat yang Sudah Ada
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
                  Tidak ditemukan perangkat yang sesuai
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
                        Buat &quot;{displayQuery}&quot;
                    </>
                  )}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
