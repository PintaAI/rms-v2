"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { RiDashboardLine, RiToolsLine, RiBox1Line, RiInboxLine, RiProgress1Line, RiCheckLine, RiLogoutBoxLine, RiCloseLine, RiHistoryLine } from "@remixicon/react";
import { NavItem, NavFilterGroup } from "../nav-item";
import type { ServiceStats } from "@/actions/service";

interface StaffNavProps {
  tokoid: string;
  serviceStats?: ServiceStats | null;
}

export function StaffNav({ tokoid, serviceStats }: StaffNavProps) {
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          <NavItem
            href={`/${tokoid}/staff`}
            icon={<RiDashboardLine />}
            label="Overview"
          />
          <NavFilterGroup
            title="Service"
            icon={<RiToolsLine />}
            defaultOpen={true}
            items={[
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
              },
              {
                href: `/${tokoid}/staff/service?status=repairing`,
                icon: <RiProgress1Line />,
                label: "Proses",
                badge: serviceStats?.repairing,
              },
              {
                href: `/${tokoid}/staff/service?status=done`,
                icon: <RiCheckLine />,
                label: "Selesai",
                badge: serviceStats?.done,
              },
              {
                href: `/${tokoid}/staff/service?status=failed`,
                icon: <RiCloseLine />,
                label: "Gagal",
                badge: serviceStats?.failed,
              },
              {
                href: `/${tokoid}/staff/service?status=picked_up`,
                icon: <RiLogoutBoxLine />,
                label: "Diambil",
                badge: serviceStats?.pickedUp,
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