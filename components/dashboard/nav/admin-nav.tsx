"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { RiDashboardLine, RiToolsLine, RiUserSettingsLine, RiArchiveLine, RiInboxLine, RiProgress1Line, RiCheckLine, RiStore2Line, RiLogoutBoxLine } from "@remixicon/react";
import { NavItem, NavFilterGroup, NavGroup } from "./nav-item";
import type { ServiceStats } from "@/actions/service";

interface AdminNavProps {
  tokoid: string;
  serviceStats?: ServiceStats | null;
}

export function AdminNav({ tokoid, serviceStats }: AdminNavProps) {
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          <NavItem
            href={`/${tokoid}/admin`}
            icon={<RiDashboardLine />}
            label="Admin Overview"
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
                badge: serviceStats?.received,
                badgeVariant: "secondary",
              },
              {
                href: `/${tokoid}/admin/service?status=repairing`,
                icon: <RiProgress1Line />,
                label: "Proses",
                badge: serviceStats?.repairing,
                badgeVariant: "accent",
              },
              {
                href: `/${tokoid}/admin/service?status=done,failed`,
                icon: <RiCheckLine />,
                label: "Selesai & Gagal",
                badge: (serviceStats?.done || 0) + (serviceStats?.failed || 0),
                badgeVariant: "success",
              },
              {
                href: `/${tokoid}/admin/service?status=picked_up`,
                icon: <RiLogoutBoxLine />,
                label: "Sudah Diambil",
                badge: serviceStats?.pickedUp,
                badgeVariant: "outline",
              },
            ]}
          />
          <NavItem
            href={`/${tokoid}/admin/karyawan`}
            icon={<RiUserSettingsLine />}
            label="Karyawan"
          />
          <NavGroup
            title="Inventory"
            icon={<RiArchiveLine />}
            defaultOpen={true}
            items={[
              {
                href: `/${tokoid}/admin/inventory`,
                icon: <RiToolsLine />,
                label: "Sparepart & Jasa",
              },
              {
                href: `/${tokoid}/admin/inventory/audit-gudang`,
                icon: <RiArchiveLine />,
                label: "Audit Gudang",
              },
            ]}
          />

        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
