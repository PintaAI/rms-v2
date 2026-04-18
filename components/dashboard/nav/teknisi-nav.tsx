"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { RiDashboardLine, RiTaskLine, RiArchiveLine, RiCheckLine, RiCloseCircleLine } from "@remixicon/react";
import { NavItem, NavGroup } from "../nav-item";

interface TeknisiNavProps {
  tokoid: string;
}

export function TeknisiNav({ tokoid }: TeknisiNavProps) {
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          <NavItem
            href={`/${tokoid}/teknisi`}
            icon={<RiDashboardLine />}
            label="Overview"
          />
          <NavGroup
            title="Task"
            icon={<RiTaskLine />}
            defaultOpen={true}
            items={[
              {
                href: `/${tokoid}/teknisi/task?status=done`,
                icon: <RiCheckLine />,
                label: "Selesai",
              },
              {
                href: `/${tokoid}/teknisi/task?status=failed`,
                icon: <RiCloseCircleLine />,
                label: "Gagal",
              },
            ]}
          />
          <NavItem
            href={`/${tokoid}/teknisi/inventory`}
            icon={<RiArchiveLine />}
            label="Inventory"
          />
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}