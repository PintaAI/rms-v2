"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { RiDashboardLine, RiToolsLine, RiUserSettingsLine, RiArchiveLine, RiInboxLine, RiProgress1Line, RiCheckLine, RiStore2Line, RiLogoutBoxLine, RiMoneyDollarCircleLine, RiCloseLine } from "@remixicon/react";
import { NavItem, NavFilterGroup } from "../nav-item";
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
                badge: serviceStats?.received,
              },
              {
                href: `/${tokoid}/admin/service?status=repairing`,
                icon: <RiProgress1Line />,
                label: "Proses",
                badge: serviceStats?.repairing,
              },
              {
                href: `/${tokoid}/admin/service?status=done`,
                icon: <RiCheckLine />,
                label: "Selesai",
                badge: serviceStats?.done,
              },
              {
                href: `/${tokoid}/admin/service?status=failed`,
                icon: <RiCloseLine />,
                label: "Gagal",
                badge: serviceStats?.failed,
              },
              {
                href: `/${tokoid}/admin/service?status=picked_up`,
                icon: <RiLogoutBoxLine />,
                label: "Diambil",
                badge: serviceStats?.pickedUp,
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