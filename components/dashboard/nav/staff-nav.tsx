"use client";

import { RoleNav } from "./role-nav";
import { buildStaffNav } from "./nav-config";
import type { ServiceStats } from "@/actions/service";
import type { FeatureAccessMap, FeatureKey } from "@/lib/features";
import type { CapabilityAccessMap } from "@/lib/auth/request-scope";
import type { PermissionAccessMap } from "@/lib/permissions";

interface StaffNavProps {
  tokoid: string;
  featureAccess: FeatureAccessMap;
  permissionAccess: PermissionAccessMap;
  capabilities: CapabilityAccessMap;
  disabledFeatures: FeatureKey[];
  serviceStats?: ServiceStats | null;
}

export function StaffNav({ tokoid, featureAccess, permissionAccess, capabilities, disabledFeatures, serviceStats }: StaffNavProps) {
  const entries = buildStaffNav({ tokoid, featureAccess, permissionAccess, capabilities, disabledFeatures, serviceStats });
  return <RoleNav entries={entries} />;
}
