"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
} from "@/components/ui/sidebar";
import {
  RiDashboardLine,
  RiLineChartLine,
  RiStore2Line,
  RiToolsLine,
  RiUserSettingsLine,
  RiArchiveLine,
  RiFileList3Line,
  RiTaskLine,
  RiInboxLine,
  RiProgress1Line,
  RiCheckLine,
  RiLogoutBoxLine,
  RiFolderLine,
  RiCloseCircleLine,
  RiHistoryLine,
} from "@remixicon/react";
import { NavItem, NavGroup, NavFilterGroup } from "./nav-item";
import type { DashboardNavEntry } from "./nav-config";

const iconMap: Record<string, React.ReactNode> = {
  dashboard: <RiDashboardLine />,
  chart: <RiLineChartLine />,
  store: <RiStore2Line />,
  tools: <RiToolsLine />,
  people: <RiUserSettingsLine />,
  archive: <RiArchiveLine />,
  form: <RiFileList3Line />,
  task: <RiTaskLine />,
  inbox: <RiInboxLine />,
  progress: <RiProgress1Line />,
  check: <RiCheckLine />,
  logout: <RiLogoutBoxLine />,
  folder: <RiFolderLine />,
  close: <RiCloseCircleLine />,
  history: <RiHistoryLine />,
};

function resolveIcon(icon: string | React.ReactNode): React.ReactNode {
  if (typeof icon === "string") return iconMap[icon] ?? null;
  return icon;
}

function renderEntry(entry: DashboardNavEntry) {
  switch (entry.type) {
    case "item":
      return (
        <NavItem
          key={entry.href}
          href={entry.href}
          icon={entry.icon != null ? resolveIcon(entry.icon) : undefined}
          label={entry.label}
          isLocked={entry.isLocked}
        />
      );
    case "group":
      return (
        <NavGroup
          key={entry.title}
          title={entry.title}
          icon={resolveIcon(entry.icon)}
          defaultOpen={entry.defaultOpen}
          items={entry.items.map((item) => ({
            href: item.href,
            icon: item.icon != null ? resolveIcon(item.icon) : undefined,
            label: item.label,
            isLocked: item.isLocked,
          }))}
        />
      );
    case "filterGroup":
      return (
        <NavFilterGroup
          key={entry.title}
          title={entry.title}
          icon={resolveIcon(entry.icon)}
          defaultOpen={entry.defaultOpen}
          items={entry.items.map((item) => ({
            ...item,
            icon: resolveIcon(item.icon),
          }))}
        />
      );
  }
}

export function RoleNav({ entries }: { entries: DashboardNavEntry[] }) {
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {entries.filter((e) => !e.hidden).map(renderEntry)}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
