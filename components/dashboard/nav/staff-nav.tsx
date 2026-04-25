"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { RiArchiveLine, RiDashboardLine, RiToolsLine, RiInboxLine, RiProgress1Line, RiCheckLine, RiLogoutBoxLine } from "@remixicon/react";
import { NavItem, NavFilterGroup } from "./nav-item";
import type { ServiceStats } from "@/actions/service";
import type { FeatureAccessMap } from "@/lib/features";

interface StaffNavProps {
  tokoid: string;
  featureAccess: FeatureAccessMap;
  serviceStats?: ServiceStats | null;
}

export function StaffNav({ tokoid, featureAccess, serviceStats }: StaffNavProps) {
  if (!featureAccess["staff.workflow"]) return null;

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

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          <NavItem
            href={`/${tokoid}/staff`}
            icon={<RiDashboardLine />}
            label="Staff Overview"
          />
          {featureAccess["service.management"] && (
            <NavFilterGroup
              title="Service"
              icon={<RiToolsLine />}
              defaultOpen={true}
              items={serviceItems}
            />
          )}
          {featureAccess["inventory.management"] && (
            <NavItem
              href={`/${tokoid}/staff/inventory`}
              icon={<RiArchiveLine />}
              label="Inventory"
            />
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
