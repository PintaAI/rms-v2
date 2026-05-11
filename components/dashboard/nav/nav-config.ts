import type { ReactNode } from "react";
import type { ServiceStats, TechnicianTaskStats } from "@/actions/service";
import type { FeatureAccessMap, FeatureKey } from "@/lib/features";
import type { CapabilityAccessMap } from "@/lib/auth/request-scope";

// ── Shared nav item shapes ──────────────────────────────────────────

export interface NavFilterItem {
  href: string;
  icon: ReactNode;
  label: string;
  badge?: number;
  badgeVariant?: "secondary" | "accent" | "success" | "destructive" | "outline";
}

export interface NavGroupItem {
  href: string;
  icon?: ReactNode;
  label: string;
  isLocked?: boolean;
}

export type DashboardNavEntry =
  | {
      type: "item";
      href: string;
      icon?: ReactNode;
      label: string;
      isLocked?: boolean;
      hidden?: boolean;
    }
  | {
      type: "filterGroup";
      title: string;
      icon: ReactNode;
      defaultOpen?: boolean;
      items: NavFilterItem[];
      hidden?: boolean;
    }
  | {
      type: "group";
      title: string;
      icon: ReactNode;
      defaultOpen?: boolean;
      items: NavGroupItem[];
      hidden?: boolean;
    };

// ── Service badge builder (admin & staff) ───────────────────────────

export function buildServiceFilterItems(
  tokoid: string,
  rolePath: "admin" | "staff",
  serviceStats: ServiceStats | null | undefined
): NavFilterItem[] {
  return [
    {
      href: `/${tokoid}/${rolePath}/service`,
      icon: "tools",
      label: "Semua",
    },
    {
      href: `/${tokoid}/${rolePath}/service?status=received`,
      icon: "inbox",
      label: "Masuk",
      badge: serviceStats?.received,
      badgeVariant: "secondary",
    },
    {
      href: `/${tokoid}/${rolePath}/service?status=repairing`,
      icon: "progress",
      label: "Proses",
      badge: serviceStats?.repairing,
      badgeVariant: "accent",
    },
    {
      href: `/${tokoid}/${rolePath}/service?status=done,failed`,
      icon: "check",
      label: "Selesai & Gagal",
      badge: (serviceStats?.done ?? 0) + (serviceStats?.failed ?? 0),
      badgeVariant: "success",
    },
    {
      href: `/${tokoid}/${rolePath}/service?pickedup=true`,
      icon: "logout",
      label: "Sudah Diambil",
      badge: serviceStats?.pickedUp,
      badgeVariant: "outline",
    },
  ] as NavFilterItem[];
}

// ── Task badge builder (teknisi) ────────────────────────────────────

export function buildTechnicianTaskFilterItems(
  tokoid: string,
  taskStats: TechnicianTaskStats | null | undefined
): NavFilterItem[] {
  return [
    {
      href: `/${tokoid}/teknisi/task`,
      icon: "folder",
      label: "Semua",
    },
    {
      href: `/${tokoid}/teknisi/task?status=tersedia`,
      icon: "task",
      label: "Tersedia",
      badge: taskStats?.tersedia,
      badgeVariant: "secondary",
    },
    {
      href: `/${tokoid}/teknisi/task?status=repairing`,
      icon: "tools",
      label: "Dikerjakan",
      badge: taskStats?.repairing,
      badgeVariant: "accent",
    },
    {
      href: `/${tokoid}/teknisi/task?status=selesai`,
      icon: "check",
      label: "Selesai",
      badge: taskStats?.selesai,
      badgeVariant: "success",
    },
    {
      href: `/${tokoid}/teknisi/task?status=gagal`,
      icon: "close",
      label: "Gagal",
      badge: taskStats?.gagal,
      badgeVariant: "destructive",
    },
    {
      href: `/${tokoid}/teknisi/task?status=history`,
      icon: "history",
      label: "History",
      badgeVariant: "outline",
    },
  ] as NavFilterItem[];
}

// ── Nav builders per role ───────────────────────────────────────────

interface CommonNavProps {
  tokoid: string;
  featureAccess: FeatureAccessMap;
  disabledFeatures: FeatureKey[];
}

interface AdminStaffNavProps extends CommonNavProps {
  capabilities: CapabilityAccessMap;
  serviceStats: ServiceStats | null | undefined;
}

export function buildAdminNav({
  tokoid,
  featureAccess,
  capabilities,
  disabledFeatures,
  serviceStats,
}: AdminStaffNavProps): DashboardNavEntry[] {
  const isFeatureDisabled = (feature: FeatureKey) => disabledFeatures.includes(feature);

  const dashboardEnabled = capabilities["dashboard.overview"] ?? false;
  const tokoEnabled = capabilities["toko.manage"] ?? false;
  const serviceEnabled = capabilities["service.management"] ?? false;
  const karyawanEnabled = featureAccess["karyawan.management"] ?? false;
  const analyticsEnabled = featureAccess["analytics.revenue"] ?? false;
  const inventoryEnabled = featureAccess["inventory.management"] ?? false;
  const retailEnabled = featureAccess["retail.sales"] ?? false;
  const auditEnabled = featureAccess["inventory.audit"] ?? false;

  const entries: DashboardNavEntry[] = [
    {
      type: "item",
      href: `/${tokoid}/admin`,
      icon: "dashboard",
      label: "Admin Overview",
      isLocked: !dashboardEnabled,
    },
  ];

  if (!isFeatureDisabled("analytics.revenue")) {
    entries.push({
      type: "item",
      href: `/${tokoid}/admin/analytics`,
      icon: "chart",
      label: "Analytics",
      isLocked: !analyticsEnabled,
    });
  }

  entries.push({
    type: "item",
    href: `/${tokoid}/admin/toko`,
    icon: "store",
    label: "Toko",
    isLocked: !tokoEnabled,
  });

  if (serviceEnabled) {
    entries.push({
      type: "filterGroup",
      title: "Service",
      icon: "tools",
      defaultOpen: true,
      items: buildServiceFilterItems(tokoid, "admin", serviceStats),
    });
  }

  if (!isFeatureDisabled("retail.sales")) {
    entries.push({
      type: "item",
      href: `/${tokoid}/admin/retail`,
      icon: "store",
      label: "Retail",
      isLocked: !inventoryEnabled || !retailEnabled,
    });
  }

  if (!isFeatureDisabled("karyawan.management")) {
    entries.push({
      type: "item",
      href: `/${tokoid}/admin/karyawan`,
      icon: "people",
      label: "Karyawan",
      isLocked: !karyawanEnabled,
    });
  }

  const inventoryItems: NavGroupItem[] = [];

  if (!isFeatureDisabled("inventory.management")) {
    inventoryItems.push(
      {
        href: `/${tokoid}/admin/inventory`,
        icon: "tools",
        label: "Sparepart & Jasa",
        isLocked: !inventoryEnabled,
      },
      {
        href: `/${tokoid}/admin/inventory/retail`,
        icon: "store",
        label: "Barang Retail",
        isLocked: !inventoryEnabled,
      },
      {
        href: `/${tokoid}/admin/inventory/restock-history`,
        icon: "history",
        label: "Riwayat Restock",
        isLocked: !inventoryEnabled,
      },
      {
        href: `/${tokoid}/admin/inventory/reports`,
        icon: "chart",
        label: "Laporan Inventory",
        isLocked: !inventoryEnabled,
      }
    );
  }

  if (!isFeatureDisabled("inventory.audit")) {
    inventoryItems.push({
      href: `/${tokoid}/admin/inventory/audit-gudang`,
      icon: "form",
      label: "Audit Gudang",
      isLocked: !auditEnabled,
    });
  }

  if (inventoryItems.length > 0) {
    entries.push({
      type: "group",
      title: "Inventory",
      icon: "archive",
      defaultOpen: true,
      items: inventoryItems,
    });
  }

  return entries;
}

export function buildStaffNav({
  tokoid,
  featureAccess,
  capabilities,
  disabledFeatures,
  serviceStats,
}: AdminStaffNavProps): DashboardNavEntry[] {
  const isFeatureDisabled = (feature: FeatureKey) => disabledFeatures.includes(feature);

  const workflowEnabled = featureAccess["staff.workflow"] ?? false;
  const serviceEnabled = capabilities["service.management"] ?? false;
  const inventoryEnabled = featureAccess["inventory.management"] ?? false;
  const retailEnabled = featureAccess["retail.sales"] ?? false;

  if (isFeatureDisabled("staff.workflow")) {
    return [];
  }

  const entries: DashboardNavEntry[] = [
    {
      type: "item",
      href: `/${tokoid}/staff`,
      icon: "dashboard",
      label: "Staff Overview",
      isLocked: !workflowEnabled,
    },
  ];

  if (workflowEnabled && serviceEnabled) {
    entries.push({
      type: "filterGroup",
      title: "Service",
      icon: "tools",
      defaultOpen: true,
      items: buildServiceFilterItems(tokoid, "staff", serviceStats),
    });
  }

  if (workflowEnabled && !isFeatureDisabled("retail.sales")) {
    entries.push({
      type: "item",
      href: `/${tokoid}/staff/retail`,
      icon: "store",
      label: "Retail",
      isLocked: !inventoryEnabled || !retailEnabled,
    });
  }

  if (workflowEnabled && !isFeatureDisabled("inventory.management")) {
    entries.push({
      type: "item",
      href: `/${tokoid}/staff/inventory`,
      icon: "archive",
      label: "Inventory",
      isLocked: !inventoryEnabled,
    });
  }

  return entries;
}

export function buildTeknisiNav({
  tokoid,
  featureAccess,
  disabledFeatures,
  taskStats,
}: CommonNavProps & { taskStats: TechnicianTaskStats | null | undefined }): DashboardNavEntry[] {
  const isFeatureDisabled = (feature: FeatureKey) => disabledFeatures.includes(feature);
  const workflowEnabled = featureAccess["technician.workflow"] ?? false;
  const inventoryEnabled = featureAccess["inventory.management"] ?? false;

  const entries: DashboardNavEntry[] = [];

  if (!isFeatureDisabled("technician.workflow")) {
    entries.push(
      {
        type: "item",
        href: `/${tokoid}/teknisi`,
        icon: "dashboard",
        label: "Teknisi Overview",
        isLocked: !workflowEnabled,
      },
      {
        type: "filterGroup",
        title: "Task",
        icon: "task",
        defaultOpen: true,
        items: buildTechnicianTaskFilterItems(tokoid, taskStats),
      }
    );
  }

  if (!isFeatureDisabled("inventory.management")) {
    entries.push({
      type: "item",
      href: `/${tokoid}/teknisi/inventory`,
      icon: "archive",
      label: "Inventory",
      isLocked: !inventoryEnabled,
    });
  }

  return entries;
}
