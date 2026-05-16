"use client";

import { RoleNav } from "./role-nav";
import { buildTeknisiNav } from "./nav-config";
import type { TechnicianTaskStats } from "@/actions/service";
import type { FeatureAccessMap, FeatureKey } from "@/lib/features";
import type { PermissionAccessMap } from "@/lib/permissions";

interface TeknisiNavProps {
  tokoid: string;
  featureAccess: FeatureAccessMap;
  permissionAccess: PermissionAccessMap;
  disabledFeatures: FeatureKey[];
  taskStats?: TechnicianTaskStats | null;
}

export function TeknisiNav({ tokoid, featureAccess, permissionAccess, disabledFeatures, taskStats }: TeknisiNavProps) {
  const entries = buildTeknisiNav({ tokoid, featureAccess, permissionAccess, disabledFeatures, taskStats });
  return <RoleNav entries={entries} />;
}
