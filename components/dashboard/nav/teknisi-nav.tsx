"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { RiDashboardLine, RiTaskLine, RiArchiveLine, RiCheckLine, RiCloseCircleLine, RiFolderLine, RiToolsLine, RiHistoryLine } from "@remixicon/react";
import { NavItem, NavFilterGroup } from "./nav-item";
import type { TechnicianTaskStats } from "@/actions/service";
import type { FeatureAccessMap } from "@/lib/features";

interface TeknisiNavProps {
  tokoid: string;
  featureAccess: FeatureAccessMap;
  taskStats?: TechnicianTaskStats | null;
}

export function TeknisiNav({ tokoid, featureAccess, taskStats }: TeknisiNavProps) {
  const workflowEnabled = featureAccess["technician.workflow"] ?? false;
  const inventoryEnabled = featureAccess["inventory.management"] ?? false;

  const taskItems = [
    {
      href: `/${tokoid}/teknisi/task`,
      icon: <RiFolderLine />,
      label: "Semua",
    },
    {
      href: `/${tokoid}/teknisi/task?status=tersedia`,
      icon: <RiTaskLine />,
      label: "Tersedia",
      badge: taskStats?.tersedia,
      badgeVariant: "secondary" as const,
    },
    {
      href: `/${tokoid}/teknisi/task?status=repairing`,
      icon: <RiToolsLine />,
      label: "Dikerjakan",
      badge: taskStats?.repairing,
      badgeVariant: "accent" as const,
    },
    {
      href: `/${tokoid}/teknisi/task?status=selesai`,
      icon: <RiCheckLine />,
      label: "Selesai",
      badge: taskStats?.selesai,
      badgeVariant: "success" as const,
    },
    {
      href: `/${tokoid}/teknisi/task?status=gagal`,
      icon: <RiCloseCircleLine />,
      label: "Gagal",
      badge: taskStats?.gagal,
      badgeVariant: "destructive" as const,
    },
    {
      href: `/${tokoid}/teknisi/task?status=history`,
      icon: <RiHistoryLine />,
      label: "History",
      badgeVariant: "outline" as const,
    },
  ];

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          <NavItem
            href={`/${tokoid}/teknisi`}
            icon={<RiDashboardLine />}
            label="Teknisi Overview"
            isLocked={!workflowEnabled}
          />
          <NavFilterGroup
            title="Task"
            icon={<RiTaskLine />}
            defaultOpen={true}
            items={taskItems}
          />
          <NavItem
            href={`/${tokoid}/teknisi/inventory`}
            icon={<RiArchiveLine />}
            label="Inventory"
            isLocked={!inventoryEnabled}
          />
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}