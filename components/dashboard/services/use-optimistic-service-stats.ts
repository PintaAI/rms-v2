"use client";

import { useMemo } from "react";

import type { ServiceStats } from "@/actions/service";
import { deriveServiceStats, useServiceOptimisticStore } from "@/lib/realtime/service-optimistic-store";

export function useOptimisticServiceStats(tokoId: string, fallbackStats: ServiceStats): ServiceStats {
  const storeTokoId = useServiceOptimisticStore((state) => state.storeId);
  const services = useServiceOptimisticStore((state) => state.services);
  const isHydrated = useServiceOptimisticStore((state) => state.isHydrated);

  return useMemo(() => {
    if (storeTokoId === tokoId && isHydrated) {
      return deriveServiceStats(services);
    }

    return fallbackStats;
  }, [fallbackStats, isHydrated, services, storeTokoId, tokoId]);
}
