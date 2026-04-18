"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { RiDashboardLine, RiToolsLine, RiBox1Line, RiInboxLine, RiProgress1Line, RiCheckLine } from "@remixicon/react";
import { NavItem, NavGroup } from "../nav-item";

interface StaffNavProps {
  tokoid: string;
}

export function StaffNav({ tokoid }: StaffNavProps) {
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          <NavItem
            href={`/${tokoid}/staff`}
            icon={<RiDashboardLine />}
            label="Overview"
          />
          <NavGroup
            title="Service"
            icon={<RiToolsLine />}
            defaultOpen={true}
            items={[
              {
                href: `/${tokoid}/staff/service?status=received`,
                icon: <RiInboxLine />,
                label: "Masuk",
              },
              {
                href: `/${tokoid}/staff/service?status=repairing`,
                icon: <RiProgress1Line />,
                label: "Proses",
              },
              {
                href: `/${tokoid}/staff/service?status=done,picked_up`,
                icon: <RiCheckLine />,
                label: "Selesai",
              },
            ]}
          />
          <NavItem
            href={`/${tokoid}/staff/inventory`}
            icon={<RiBox1Line />}
            label="Sparepart"
          />
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}