"use client";

import { useCallback } from "react";
import { useDeviceSearch } from "@/hooks/use-device-search";
import { getBrandIcon } from "@/lib/brand-icons";
import { HpCatalogOption } from "@/components/shared/device-input";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RiLoader4Line,
  RiSearchLine,
  RiAddLine,
  RiCloseLine,
  RiCheckLine,
  RiAlertLine,
} from "@remixicon/react";
import { cn } from "@/lib/utils";

export type { HpCatalogOption };

interface MultiDeviceInputProps {
  value: HpCatalogOption[];
  onChange: (devices: HpCatalogOption[]) => void;
  disabled?: boolean;
  error?: string | null;
  devices?: HpCatalogOption[];
  isLoadingDevices?: boolean;
  onDeviceCreated?: (device: HpCatalogOption) => void;
}

export function MultiDeviceInput({
  value,
  onChange,
  disabled = false,
  error,
  devices = [],
  isLoadingDevices = false,
  onDeviceCreated,
}: MultiDeviceInputProps) {
  const handleSelect = useCallback(
    (device: HpCatalogOption) => {
      if (value.some((v) => v.id === device.id)) {
        return;
      }
      onChange([...value, device]);
    },
    [value, onChange]
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
    selectDevice,
    createLabel,
  } = useDeviceSearch({
    devices,
    isLoadingDevices,
    onDeviceCreated,
    excludeIds: value.map((v) => v.id),
    onSelect: handleSelect,
  });

  const handleRemove = useCallback(
    (deviceId: string) => {
      onChange(value.filter((d) => d.id !== deviceId));
    },
    [value, onChange]
  );

  const handleFocus = useCallback(() => {
    if (query.trim()) {
      setShowDropdown(true);
    }
  }, [query, setShowDropdown]);

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((device) => (
            <Badge
              key={device.id}
              variant="secondary"
              className="flex items-center gap-1.5 pr-1 py-1.5"
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
                className="ml-1 hover:text-destructive focus:outline-none"
                disabled={disabled}
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
                  Perangkat yang Sudah Ada
                </div>
                {results.map((device, index) => (
                  <button
                    key={device.id}
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors",
                      highlightedIndex === index ? "bg-accent" : "hover:bg-accent"
                    )}
                    onClick={() => selectDevice(device)}
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

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          <RiAlertLine className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
