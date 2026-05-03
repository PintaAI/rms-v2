"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { FeatureAccessMap, FeatureKey } from "@/lib/features";
import type { CapabilityAccessMap } from "@/lib/auth/request-scope";
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
  capabilities: CapabilityAccessMap;
  disabledFeatures: FeatureKey[];
  inventoryEnabled: boolean;
  manualItemsEnabled: boolean;
}

const DashboardScopeContext = createContext<DashboardScopeContextValue | null>(null);

export function useDashboardScope(): DashboardScopeContextValue {
  const context = useContext(DashboardScopeContext);
  if (!context) {
    throw new Error("useDashboardScope must be used within a DashboardScopeProvider");
  }
  return context;
}

interface DashboardScopeProviderProps {
  children: ReactNode;
  value: Omit<DashboardScopeContextValue, "inventoryEnabled" | "manualItemsEnabled">;
}

export function DashboardScopeProvider({ children, value }: DashboardScopeProviderProps) {
  const enriched: DashboardScopeContextValue = {
    ...value,
    inventoryEnabled: value.featureAccess["inventory.management"] ?? false,
    manualItemsEnabled: value.featureAccess["service.manualItems"] ?? false,
  };

  return (
    <DashboardScopeContext.Provider value={enriched}>
      {children}
    </DashboardScopeContext.Provider>
  );
}
