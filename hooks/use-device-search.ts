"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createDevice } from "@/actions";
import { upsertStoredDevice } from "@/lib/device-catalog-cache";
import { fuzzyScore } from "@/lib/fuzzy-search";
import type { HpCatalogOption } from "@/components/shared/device-input";

function parseDeviceName(deviceQuery: string) {
  const parts = deviceQuery.trim().split(/\s+/);
  if (parts.length >= 2) {
    return { brand: parts[0], model: parts.slice(1).join(" ") };
  }
  return { brand: "Unknown", model: parts[0] || deviceQuery };
}

interface UseDeviceSearchOptions {
  devices: HpCatalogOption[];
  isLoadingDevices?: boolean;
  onDeviceCreated?: (device: HpCatalogOption) => void;
  excludeIds?: string[];
  onSelect: (device: HpCatalogOption) => void;
}

const EMPTY_EXCLUDE_IDS: string[] = [];

export function useDeviceSearch({
  devices,
  isLoadingDevices = false,
  onDeviceCreated,
  excludeIds = EMPTY_EXCLUDE_IDS,
  onSelect,
}: UseDeviceSearchOptions) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<HpCatalogOption[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const excludeSet = useMemo(() => new Set(excludeIds), [excludeIds]);

  useEffect(() => {
    if (highlightedIndex >= 0 && dropdownRef.current) {
      const items = dropdownRef.current.querySelectorAll('button[type="button"]');
      items[highlightedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

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
      let active = true;
      queueMicrotask(() => {
        if (!active) return;
        setResults((prev) => (prev.length > 0 ? [] : prev));
        setShowDropdown(false);
        setHighlightedIndex(-1);
      });
      return () => {
        active = false;
      };
    }

    let active = true;
    queueMicrotask(() => {
      setShowDropdown(true);
    });

    searchTimeoutRef.current = setTimeout(() => {
      if (!active) return;

      const filtered = devices
        .filter((d) => !excludeSet.has(d.id))
        .map((device) => ({
          device,
          score: fuzzyScore(query, `${device.brandName} ${device.modelName}`),
        }))
        .filter((item): item is { device: HpCatalogOption; score: number } => item.score !== null)
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          const brandCompare = a.device.brandName.localeCompare(b.device.brandName);
          return brandCompare === 0
            ? a.device.modelName.localeCompare(b.device.modelName)
            : brandCompare;
        })
        .map((item) => item.device);

      setResults(filtered.slice(0, 20));
      setHighlightedIndex(-1);
    }, 150);

    return () => {
      active = false;
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, devices, excludeSet]);

  const handleCreate = useCallback(async () => {
    if (!query.trim()) return;

    setIsCreating(true);
    const { brand, model } = parseDeviceName(query);

    try {
      const device = await createDevice({ brandName: brand, modelName: model });
      upsertStoredDevice(device);
      onDeviceCreated?.(device);
      onSelect(device);
    } catch {
      // Silently fail - user can retry
    } finally {
      setIsCreating(false);
    }
  }, [query, onSelect, onDeviceCreated]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
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
          onSelect(results[highlightedIndex]);
        } else if (results.length === 0 && query.trim()) {
          handleCreate();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setShowDropdown(false);
        setHighlightedIndex(-1);
      }
    },
    [showDropdown, results, highlightedIndex, handleCreate, query, onSelect]
  );

  const createLabel = useMemo(() => {
    if (!query.trim()) return query;
    const { brand, model } = parseDeviceName(query);
    return `${brand} ${model}`;
  }, [query]);

  return {
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
    isLoadingDevices,
  };
}
