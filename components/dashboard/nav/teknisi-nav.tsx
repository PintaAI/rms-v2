"use client";

import { RoleNav } from "./role-nav";
import { buildTeknisiNav } from "./nav-config";
import type { TechnicianTaskStats } from "@/actions/service";
import type { FeatureAccessMap, FeatureKey } from "@/lib/features";

interface TeknisiNavProps {
  tokoid: string;
  featureAccess: FeatureAccessMap;
  disabledFeatures: FeatureKey[];
  taskStats?: TechnicianTaskStats | null;
}

export function TeknisiNav({ tokoid, featureAccess, disabledFeatures, taskStats }: TeknisiNavProps) {
  const entries = buildTeknisiNav({ tokoid, featureAccess, disabledFeatures, taskStats });
  return <RoleNav entries={entries} />;
}
