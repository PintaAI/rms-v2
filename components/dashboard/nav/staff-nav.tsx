"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { RiArchiveLine, RiDashboardLine, RiToolsLine, RiInboxLine, RiProgress1Line, RiCheckLine, RiLogoutBoxLine } from "@remixicon/react";
import { NavItem, NavFilterGroup } from "./nav-item";
import type { ServiceStats } from "@/actions/service";
import type { FeatureAccessMap, FeatureKey } from "@/lib/features";
import type { CapabilityAccessMap } from "@/lib/auth/request-scope";

interface StaffNavProps {
  tokoid: string;
  featureAccess: FeatureAccessMap;
  capabilities: CapabilityAccessMap;
  disabledFeatures: FeatureKey[];
  serviceStats?: ServiceStats | null;
}

export function StaffNav({ tokoid, featureAccess, capabilities, disabledFeatures, serviceStats }: StaffNavProps) {
  const isFeatureDisabled = (feature: FeatureKey) => disabledFeatures.includes(feature);
  const workflowEnabled = featureAccess["staff.workflow"] ?? false;
  const serviceEnabled = capabilities["service.management"] ?? false;
  const inventoryEnabled = featureAccess["inventory.management"] ?? false;

  const serviceItems = [
    {
      href: `/${tokoid}/staff/service`,
      icon: <RiToolsLine />,
      label: "Semua",
      badge: serviceStats?.total,
    },
    {
      href: `/${tokoid}/staff/service?status=received`,
      icon: <RiInboxLine />,
      label: "Masuk",
      badge: serviceStats?.received,
      badgeVariant: "secondary" as const,
    },
    {
      href: `/${tokoid}/staff/service?status=repairing`,
      icon: <RiProgress1Line />,
      label: "Proses",
      badge: serviceStats?.repairing,
      badgeVariant: "accent" as const,
    },
    {
      href: `/${tokoid}/staff/service?status=done,failed`,
      icon: <RiCheckLine />,
      label: "Selesai & Gagal",
      badge: (serviceStats?.done || 0) + (serviceStats?.failed || 0),
      badgeVariant: "success" as const,
    },
    {
      href: `/${tokoid}/staff/service?pickedup=true`,
      icon: <RiLogoutBoxLine />,
      label: "Sudah Diambil",
      badge: serviceStats?.pickedUp,
      badgeVariant: "outline" as const,
    },
  ];

  if (isFeatureDisabled("staff.workflow")) {
    return null;
  }

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          <NavItem
            href={`/${tokoid}/staff`}
            icon={<RiDashboardLine />}
            label="Staff Overview"
            isLocked={!workflowEnabled}
          />
          {workflowEnabled && serviceEnabled && (
            <NavFilterGroup
              title="Service"
              icon={<RiToolsLine />}
              defaultOpen={true}
              items={serviceItems}
            />
          )}
          {workflowEnabled && !isFeatureDisabled("inventory.management") && (
            <NavItem
              href={`/${tokoid}/staff/inventory`}
              icon={<RiArchiveLine />}
              label="Inventory"
              isLocked={!inventoryEnabled}
            />
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
