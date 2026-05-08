"use client";

import { RoleNav } from "./role-nav";
import { buildAdminNav } from "./nav-config";
import type { ServiceStats } from "@/actions/service";
import type { FeatureAccessMap, FeatureKey } from "@/lib/features";
import type { CapabilityAccessMap } from "@/lib/auth/request-scope";

interface AdminNavProps {
  tokoid: string;
  featureAccess: FeatureAccessMap;
  capabilities: CapabilityAccessMap;
  disabledFeatures: FeatureKey[];
  serviceStats?: ServiceStats | null;
}

export function AdminNav({ tokoid, featureAccess, capabilities, disabledFeatures, serviceStats }: AdminNavProps) {
  const entries = buildAdminNav({ tokoid, featureAccess, capabilities, disabledFeatures, serviceStats });
  return <RoleNav entries={entries} />;
}
