"use client";

import {
  Sidebar,
  SidebarContent,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebarHeader } from "./app-sidebar-header";
import { AdminNav } from "../nav/admin-nav";
import { StaffNav } from "../nav/staff-nav";
import { TeknisiNav } from "../nav/teknisi-nav";
import { useAuth } from "@/components/auth/auth-provider";
import { useOptimisticServiceStats } from "@/components/dashboard/services/use-optimistic-service-stats";
import type { ServiceStats, TechnicianTaskStats } from "@/actions/service";
import type { FeatureAccessMap, FeatureKey } from "@/lib/features";
import type { CapabilityAccessMap } from "@/lib/auth/request-scope";
import type { PermissionAccessMap } from "@/lib/permissions";

const emptyServiceStats: ServiceStats = {
  received: 0,
  repairing: 0,
  done: 0,
  pickedUp: 0,
  failed: 0,
  history: 0,
  total: 0,
};

interface AppSidebarProps {
  tokoid: string;
  featureAccess: FeatureAccessMap;
  permissionAccess: PermissionAccessMap;
  capabilities: CapabilityAccessMap;
  disabledFeatures: FeatureKey[];
  serviceStats?: ServiceStats | null;
  technicianTaskStats?: TechnicianTaskStats | null;
}

export function AppSidebar({ tokoid, featureAccess, permissionAccess, capabilities, disabledFeatures, serviceStats, technicianTaskStats }: AppSidebarProps) {
  const { user, tokoList } = useAuth();
  const optimisticServiceStats = useOptimisticServiceStats(tokoid, serviceStats ?? emptyServiceStats);

  return (
    <TooltipProvider>
    <Sidebar collapsible="icon">
      <AppSidebarHeader
        tokoid={tokoid}
        userRole={user?.role || ""}
        tokoList={tokoList}
      />
      <SidebarContent data-tour="sidebar-nav" className="bg-gradient-to-b from-sidebar  to-background border-none border-border/70">
        {user?.role === "admin" && <AdminNav tokoid={tokoid} featureAccess={featureAccess} permissionAccess={permissionAccess} capabilities={capabilities} disabledFeatures={disabledFeatures} serviceStats={optimisticServiceStats} />}
        {user?.role === "staff" && <StaffNav tokoid={tokoid} featureAccess={featureAccess} permissionAccess={permissionAccess} capabilities={capabilities} disabledFeatures={disabledFeatures} serviceStats={optimisticServiceStats} />}
        {user?.role === "technician" && <TeknisiNav tokoid={tokoid} featureAccess={featureAccess} permissionAccess={permissionAccess} disabledFeatures={disabledFeatures} taskStats={technicianTaskStats} />}
      </SidebarContent>
    </Sidebar>
    </TooltipProvider>
  );
}
