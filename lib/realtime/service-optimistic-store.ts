"use client";

import { create } from "zustand";

import type { ServiceListItem, ServiceStats } from "@/actions/service";

interface ServiceOptimisticState {
  storeId: string | null;
  services: ServiceListItem[];
  pendingCount: number;
  isHydrated: boolean;
  hydrateServices: (storeId: string, services: ServiceListItem[]) => void;
  optimisticCreate: (service: ServiceListItem) => void;
  rollbackCreate: (tempId: string) => void;
  optimisticUpdate: (service: ServiceListItem) => void;
  optimisticPatch: (repairOrderId: string, patch: Partial<Omit<ServiceListItem, "id">>) => void;
  rollbackUpdate: (originalService: ServiceListItem) => void;
  optimisticDelete: (repairOrderId: string) => void;
  rollbackDelete: (service: ServiceListItem) => void;
  settleMutation: () => void;
  reset: () => void;
}

function decrementPendingCount(pendingCount: number) {
  return Math.max(0, pendingCount - 1);
}

function sortByLatestCheckin(services: ServiceListItem[]) {
  return [...services].sort(
    (a, b) => new Date(b.checkinAt).getTime() - new Date(a.checkinAt).getTime()
  );
}

export function deriveServiceStats(services: ServiceListItem[]): ServiceStats {
  let received = 0;
  let repairing = 0;
  let done = 0;
  let failed = 0;
  let pickedUp = 0;

  for (const service of services) {
    if (service.isPickedUp) {
      pickedUp++;
      continue;
    }

    if (service.status === "received") received++;
    if (service.status === "repairing") repairing++;
    if (service.status === "done") done++;
    if (service.status === "failed") failed++;
  }

  return {
    total: services.length,
    received,
    repairing,
    done,
    pickedUp,
    failed,
    history: done + failed + pickedUp,
  };
}

export const useServiceOptimisticStore = create<ServiceOptimisticState>((set) => ({
  storeId: null,
  services: [],
  pendingCount: 0,
  isHydrated: false,
  hydrateServices: (storeId, services) =>
    set((state) => {
      if (state.storeId !== storeId) {
        return { storeId, services, pendingCount: 0, isHydrated: true };
      }

      if (state.pendingCount === 0) {
        return { services, isHydrated: true };
      }

      return { isHydrated: true };
    }),
  optimisticCreate: (service) =>
    set((state) => ({
      services: [service, ...state.services.filter((item) => item.id !== service.id)],
      pendingCount: state.pendingCount + 1,
    })),
  rollbackCreate: (tempId) =>
    set((state) => ({
      services: state.services.filter((service) => service.id !== tempId),
      pendingCount: decrementPendingCount(state.pendingCount),
    })),
  optimisticUpdate: (service) =>
    set((state) => ({
      services: state.services.map((item) => (item.id === service.id ? service : item)),
      pendingCount: state.pendingCount + 1,
    })),
  optimisticPatch: (repairOrderId, patch) =>
    set((state) => {
      const serviceExists = state.services.some((service) => service.id === repairOrderId);
      if (!serviceExists) return state;

      return {
        services: state.services.map((service) =>
          service.id === repairOrderId ? { ...service, ...patch } : service
        ),
        pendingCount: state.pendingCount + 1,
      };
    }),
  rollbackUpdate: (originalService) =>
    set((state) => ({
      services: state.services.map((service) =>
        service.id === originalService.id ? originalService : service
      ),
      pendingCount: decrementPendingCount(state.pendingCount),
    })),
  optimisticDelete: (repairOrderId) =>
    set((state) => ({
      services: state.services.filter((service) => service.id !== repairOrderId),
      pendingCount: state.pendingCount + 1,
    })),
  rollbackDelete: (service) =>
    set((state) => ({
      services: sortByLatestCheckin([
        ...state.services.filter((item) => item.id !== service.id),
        service,
      ]),
      pendingCount: decrementPendingCount(state.pendingCount),
    })),
  settleMutation: () =>
    set((state) => ({ pendingCount: decrementPendingCount(state.pendingCount) })),
  reset: () =>
    set({ storeId: null, services: [], pendingCount: 0, isHydrated: false }),
}));
