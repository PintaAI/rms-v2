"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { RiDashboardLine, RiToolsLine, RiUserSettingsLine, RiArchiveLine, RiInboxLine, RiProgress1Line, RiCheckLine, RiStore2Line } from "@remixicon/react";
import { NavItem, NavGroup, NavFilterGroup } from "../nav-item";

interface AdminNavProps {
  tokoid: string;
}

export function AdminNav({ tokoid }: AdminNavProps) {
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          <NavItem
            href={`/${tokoid}/admin`}
            icon={<RiDashboardLine />}
            label="Overview"
          />
          <NavItem
            href={`/${tokoid}/admin/toko`}
            icon={<RiStore2Line />}
            label="Toko"
          />
          <NavFilterGroup
            title="Service"
            icon={<RiToolsLine />}
            defaultOpen={true}
            items={[
              {
                href: `/${tokoid}/admin/service`,
                icon: <RiToolsLine />,
                label: "Semua",
              },
              {
                href: `/${tokoid}/admin/service?status=received`,
                icon: <RiInboxLine />,
                label: "Masuk",
              },
              {
                href: `/${tokoid}/admin/service?status=repairing`,
                icon: <RiProgress1Line />,
                label: "Proses",
              },
              {
                href: `/${tokoid}/admin/service?status=done,picked_up,failed`,
                icon: <RiCheckLine />,
                label: "Selesai",
              },
            ]}
          />
          <NavItem
            href={`/${tokoid}/admin/karyawan`}
            icon={<RiUserSettingsLine />}
            label="Karyawan"
          />
          <NavItem
            href={`/${tokoid}/admin/inventory`}
            icon={<RiArchiveLine />}
            label="Inventory"
          />

        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}