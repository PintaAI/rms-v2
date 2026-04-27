"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { FeatureAccessMap } from "@/lib/features";

const FeatureAccessContext = createContext<FeatureAccessContextValue>({
  featureAccess: {},
  inventoryEnabled: false,
  manualItemsEnabled: false,
});

export interface FeatureAccessContextValue {
  featureAccess: FeatureAccessMap;
  inventoryEnabled: boolean;
  manualItemsEnabled: boolean;
}

export function useFeatureAccess(): FeatureAccessContextValue {
  const context = useContext(FeatureAccessContext);
  if (!context) {
    throw new Error("useFeatureAccess must be used within a FeatureAccessProvider");
  }
  return context;
}

interface FeatureAccessProviderProps {
  children: ReactNode;
  featureAccess: FeatureAccessMap;
}

export function FeatureAccessProvider({ children, featureAccess }: FeatureAccessProviderProps) {
  const inventoryEnabled = featureAccess["inventory.management"] ?? false;
  const manualItemsEnabled = featureAccess["service.manualItems"] ?? false;

  return (
    <FeatureAccessContext.Provider value={{ featureAccess, inventoryEnabled, manualItemsEnabled }}>
      {children}
    </FeatureAccessContext.Provider>
  );
}