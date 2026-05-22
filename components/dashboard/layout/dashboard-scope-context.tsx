"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { FeatureAccessMap, FeatureKey } from "@/lib/features";
import type { CapabilityAccessMap } from "@/lib/auth/request-scope";
import type { PermissionAccessMap } from "@/lib/permissions";
import type { SubscriptionPlan } from "@/lib/plans";
import type { UserRole } from "@/lib/auth/request-user";

export interface DashboardScopeContextValue {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    plan: SubscriptionPlan;
  };
  tokoId: string;
  featureAccess: FeatureAccessMap;
  permissionAccess: PermissionAccessMap;
  capabilities: CapabilityAccessMap;
  disabledFeatures: FeatureKey[];
  hasStoreEmployee: boolean;
  inventoryEnabled: boolean;
  manualItemsEnabled: boolean;
  staffCreateSparepartEnabled: boolean;
  realtimeUpdatesEnabled: boolean;
  realtimeMobileScannerEnabled: boolean;
}

const DashboardScopeContext = createContext<DashboardScopeContextValue | null>(null);

export function useDashboardScope(): DashboardScopeContextValue {
  const context = useContext(DashboardScopeContext);
  if (!context) {
    throw new Error("useDashboardScope must be used within a DashboardScopeProvider");
  }
  return context;
}

export function useOptionalDashboardScope(): DashboardScopeContextValue | null {
  return useContext(DashboardScopeContext);
}

interface DashboardScopeProviderProps {
  children: ReactNode;
  value: Omit<
    DashboardScopeContextValue,
    "inventoryEnabled" | "manualItemsEnabled" | "staffCreateSparepartEnabled" | "realtimeUpdatesEnabled" | "realtimeMobileScannerEnabled"
  >;
}

export function DashboardScopeProvider({ children, value }: DashboardScopeProviderProps) {
  const enriched: DashboardScopeContextValue = {
    ...value,
    inventoryEnabled: value.featureAccess["inventory.management"] ?? false,
    manualItemsEnabled: value.featureAccess["service.manualItems"] ?? false,
    staffCreateSparepartEnabled: value.featureAccess["inventory.staffCreateSparepart"] ?? false,
    realtimeUpdatesEnabled: Boolean(value.featureAccess["realtime.updates"] && value.hasStoreEmployee),
    realtimeMobileScannerEnabled: Boolean(value.featureAccess["realtime.updates"] && value.hasStoreEmployee && value.featureAccess["realtime.mobileScanner"] && value.featureAccess["inventory.management"]),
  };

  return (
    <DashboardScopeContext.Provider value={enriched}>
      {children}
    </DashboardScopeContext.Provider>
  );
}
