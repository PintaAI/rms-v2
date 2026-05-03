"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { RiDashboardLine, RiToolsLine, RiUserSettingsLine, RiArchiveLine, RiInboxLine, RiProgress1Line, RiCheckLine, RiStore2Line, RiLogoutBoxLine, RiFileList3Line } from "@remixicon/react";
import { NavItem, NavFilterGroup, NavGroup } from "./nav-item";
import type { ServiceStats } from "@/actions/service";
import type { FeatureAccessMap, FeatureKey } from "@/lib/features";
import type { CapabilityAccessMap } from "@/lib/auth/request-scope";
import type { ReactNode } from "react";

interface AdminNavProps {
  tokoid: string;
  featureAccess: FeatureAccessMap;
  capabilities: CapabilityAccessMap;
  disabledFeatures: FeatureKey[];
  serviceStats?: ServiceStats | null;
}

export function AdminNav({ tokoid, featureAccess, capabilities, disabledFeatures, serviceStats }: AdminNavProps) {
  const inventoryItems: { href: string; icon: ReactNode; label: string; isLocked?: boolean }[] = [];
  const isFeatureDisabled = (feature: FeatureKey) => disabledFeatures.includes(feature);

  const inventoryEnabled = featureAccess["inventory.management"] ?? false;
  const auditEnabled = featureAccess["inventory.audit"] ?? false;

  if (!isFeatureDisabled("inventory.management")) {
    inventoryItems.push({
      href: `/${tokoid}/admin/inventory`,
      icon: <RiToolsLine />,
      label: "Sparepart & Jasa",
      isLocked: !inventoryEnabled,
    });
  }

  if (!isFeatureDisabled("inventory.audit")) {
    inventoryItems.push({
      href: `/${tokoid}/admin/inventory/audit-gudang`,
      icon: <RiFileList3Line />,
      label: "Audit Gudang",
      isLocked: !auditEnabled,
    });
  }

  const karyawanEnabled = featureAccess["karyawan.management"] ?? false;
  const dashboardEnabled = capabilities["dashboard.overview"] ?? false;
  const tokoEnabled = capabilities["toko.manage"] ?? false;
  const serviceEnabled = capabilities["service.management"] ?? false;

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          <NavItem
            href={`/${tokoid}/admin`}
            icon={<RiDashboardLine />}
            label="Admin Overview"
            isLocked={!dashboardEnabled}
          />
          <NavItem
            href={`/${tokoid}/admin/toko`}
            icon={<RiStore2Line />}
            label="Toko"
            isLocked={!tokoEnabled}
          />
          {serviceEnabled && (
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
                href: `/${tokoid}/admin/service?pickedup=true`,
                icon: <RiLogoutBoxLine />,
                label: "Sudah Diambil",
                badge: serviceStats?.pickedUp,
                badgeVariant: "outline",
              },
              ]}
            />
          )}
          {!isFeatureDisabled("karyawan.management") && (
            <NavItem
              href={`/${tokoid}/admin/karyawan`}
              icon={<RiUserSettingsLine />}
              label="Karyawan"
              isLocked={!karyawanEnabled}
            />
          )}
          {inventoryItems.length > 0 && (
            <NavGroup
              title="Inventory"
              icon={<RiArchiveLine />}
              defaultOpen={true}
              items={inventoryItems}
            />
          )}

        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
