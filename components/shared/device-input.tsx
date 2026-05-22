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

export interface DeviceModelOption {
  id: string;
  modelName: string;
  brandName: string;
  imageB64?: string | null;
}

interface DeviceInputProps {
  value: DeviceModelOption | null;
  onChange: (device: DeviceModelOption | null) => void;
  disabled?: boolean;
  error?: string | null;
  devices?: DeviceModelOption[];
  isLoadingDevices?: boolean;
  onDeviceCreated?: (device: DeviceModelOption) => void;
}

function getDeviceImageSrc(imageB64?: string | null) {
  if (!imageB64) return null;
  if (imageB64.startsWith("data:") || imageB64.startsWith("http")) return imageB64;
  return `data:image/jpeg;base64,${imageB64}`;
}

function DeviceAvatar({ device, className }: { device: Pick<DeviceModelOption, "brandName" | "imageB64">; className?: string }) {
  const imageSrc = getDeviceImageSrc(device.imageB64);

  return (
    <div className={cn("flex items-center justify-center overflow-hidden bg-muted/50", className, imageSrc && "rounded-sm")}>
      {imageSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageSrc} alt="" className="size-full object-contain p-2" />
      ) : getBrandIcon(device.brandName)}
    </div>
  );
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
    (device: DeviceModelOption) => {
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
    mobileApiResults,
    isSearchingMobileApi,
    dropdownRef,
    inputRef,
    handleCreate,
    handleImportMobileApiDevice,
    handleKeyDown,
    createLabel,
  } = useDeviceSearch({
    devices,
    isLoadingDevices,
    onDeviceCreated,
    onSelect: handleSelect,
  });

  const isSelected = !!value;
  const selectedDevice = value
    ? { ...value, imageB64: value.imageB64 ?? devices.find((device) => device.id === value.id)?.imageB64 ?? null }
    : null;

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
        {selectedDevice && !showInput ? (
          <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <DeviceAvatar device={selectedDevice} className="size-10 rounded-lg bg-primary/10" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{selectedDevice.brandName}</div>
              <div className="truncate text-sm text-muted-foreground">{selectedDevice.modelName}</div>
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
                ) : results.length > 0 || mobileApiResults.length > 0 || isSearchingMobileApi ? (
                  <div className="py-1">
                    {results.length > 0 ? (
                      <>
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
                            <DeviceAvatar device={device} className="size-8 rounded-md" />
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
                      </>
                    ) : null}

                    {mobileApiResults.length > 0 ? (
                      <>
                        <div className="border-t px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Saran MobileAPI
                        </div>
                        {mobileApiResults.map((device) => (
                          <button
                            key={device.mobileApiId}
                            type="button"
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent disabled:opacity-60"
                            onClick={() => handleImportMobileApiDevice(device)}
                            disabled={isCreating}
                          >
                            <DeviceAvatar device={device} className="size-8 rounded-md" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate">
                                <span className="font-medium">{device.brandName}</span>
                                <span className="ml-1 text-muted-foreground">{device.modelName}</span>
                              </div>
                              <div className="truncate text-xs text-muted-foreground">
                                {device.matchCertainty ? `${device.matchCertainty} cocok` : "Import ke katalog lokal"}
                                {device.modelNumber ? ` · ${device.modelNumber}` : ""}
                              </div>
                            </div>
                            {isCreating ? <RiLoader4Line className="size-4 animate-spin text-muted-foreground" /> : <RiAddLine className="size-4 text-muted-foreground" />}
                          </button>
                        ))}
                      </>
                    ) : null}

                    {isSearchingMobileApi ? (
                      <div className="flex items-center gap-2 border-t px-3 py-2 text-xs text-muted-foreground">
                        <RiLoader4Line className="size-3.5 animate-spin" />
                        Mencari saran MobileAPI...
                      </div>
                    ) : null}
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
