"use client";

import { useState, useCallback } from "react";
import { useDeviceSearch } from "@/hooks/use-device-search";
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
  devices?: HpCatalogOption[];
  isLoadingDevices?: boolean;
  onDeviceCreated?: (device: HpCatalogOption) => void;
}

export function DeviceInput({
  value,
  onChange,
  disabled = false,
  error,
  devices = [],
  isLoadingDevices = false,
  onDeviceCreated,
}: DeviceInputProps) {
  const [showInput, setShowInput] = useState(() => !value);

  const handleSelect = useCallback(
    (device: HpCatalogOption) => {
      onChange(device);
      setShowInput(false);
    },
    [onChange]
  );

  const {
    query,
    setQuery,
    results,
    isCreating,
    showDropdown,
    setShowDropdown,
    highlightedIndex,
    setHighlightedIndex,
    dropdownRef,
    inputRef,
    handleCreate,
    handleKeyDown,
    createLabel,
  } = useDeviceSearch({
    devices,
    isLoadingDevices,
    onDeviceCreated,
    onSelect: handleSelect,
  });

  const isSelected = !!value;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value);
      onChange(null);
    },
    [onChange, setQuery]
  );

  const handleClear = useCallback(() => {
    onChange(null);
    setQuery("");
    setShowInput(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [onChange, setQuery, inputRef]);

  const handleFocus = useCallback(() => {
    if (query.trim() && !isSelected) {
      setShowDropdown(true);
    }
  }, [query, isSelected, setShowDropdown]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1">
        <div className="h-5 w-1 rounded-full bg-primary" />
        <Label htmlFor="device" className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-muted-foreground">
          <RiSmartphoneLine className="size-4" />
          Perangkat
        </Label>
        <span className="text-sm leading-none text-destructive">*</span>
      </div>

      <div className="ml-4 border-l border-border pl-4">
        {value && !showInput ? (
          <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              {getBrandIcon(value.brandName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{value.brandName}</div>
              <div className="truncate text-sm text-muted-foreground">{value.modelName}</div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={disabled || isCreating}
              className="text-muted-foreground hover:text-foreground"
            >
              <RiEditLine className="size-4" />
              Ubah
            </Button>
          </div>
        ) : (
          <div className="relative" ref={dropdownRef}>
            <Input
              ref={inputRef}
              id="device"
              value={query}
              onChange={handleChange}
              onFocus={handleFocus}
              onKeyDown={handleKeyDown}
              placeholder="Cari atau ketik perangkat baru..."
              disabled={disabled || isCreating}
              autoComplete="off"
              className="w-full"
            />

            {showDropdown && (
              <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-input bg-background shadow-lg">
                {isLoadingDevices ? (
                  <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                    <RiLoader4Line className="size-4 animate-spin" />
                    Mencari perangkat...
                  </div>
                ) : results.length > 0 ? (
                  <div className="py-1">
                    <div className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Perangkat yang Ada
                    </div>
                    {results.map((device, index) => (
                      <button
                        key={device.id}
                        type="button"
                        className={cn(
                          "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors",
                          highlightedIndex === index ? "bg-accent" : "hover:bg-accent"
                        )}
                        onClick={() => handleSelect(device)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                      >
                        <div className="flex size-8 items-center justify-center rounded-md bg-muted/50">
                          {getBrandIcon(device.brandName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="font-medium">{device.brandName}</span>
                          <span className="ml-1 text-muted-foreground">{device.modelName}</span>
                        </div>
                        <RiCheckLine className={cn(
                          "size-4 text-muted-foreground transition-opacity",
                          highlightedIndex === index ? "opacity-100" : "opacity-0"
                        )} />
                      </button>
                    ))}
                  </div>
                ) : query.trim() ? (
                  <div className="p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                      <RiSearchLine className="size-4" />
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
                          <RiLoader4Line className="mr-2 size-4 animate-spin" />
                          Membuat...
                        </>
                      ) : (
                        <>
                          <RiAddLine className="mr-2 size-4" />
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
          <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <RiAlertLine className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
