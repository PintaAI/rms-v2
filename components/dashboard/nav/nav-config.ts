import type { ReactNode } from "react";
import type { ServiceStats, TechnicianTaskStats } from "@/actions/service";
import type { FeatureAccessMap, FeatureKey } from "@/lib/features";
import type { CapabilityAccessMap } from "@/lib/auth/request-scope";
import type { PermissionAccessMap, PermissionKey } from "@/lib/permissions";

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
  basePath: string,
  serviceStats: ServiceStats | null | undefined
): NavFilterItem[] {
  const servicePath = `/${tokoid}${basePath}/service`;

  return [
    {
      href: servicePath,
      icon: "tools",
      label: "Semua",
    },
    {
      href: `${servicePath}?status=received`,
      icon: "inbox",
      label: "Masuk",
      badge: serviceStats?.received,
      badgeVariant: "secondary",
    },
    {
      href: `${servicePath}?status=repairing`,
      icon: "progress",
      label: "Proses",
      badge: serviceStats?.repairing,
      badgeVariant: "accent",
    },
    {
      href: `${servicePath}?status=done,failed`,
      icon: "check",
      label: "Selesai & Gagal",
      badge: (serviceStats?.done ?? 0) + (serviceStats?.failed ?? 0),
      badgeVariant: "success",
    },
    {
      href: `${servicePath}?pickedup=true`,
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
      href: `/${tokoid}/service/tasks`,
      icon: "folder",
      label: "Semua",
    },
    {
      href: `/${tokoid}/service/tasks?status=tersedia`,
      icon: "task",
      label: "Tersedia",
      badge: taskStats?.tersedia,
      badgeVariant: "secondary",
    },
    {
      href: `/${tokoid}/service/tasks?status=repairing`,
      icon: "tools",
      label: "Dikerjakan",
      badge: taskStats?.repairing,
      badgeVariant: "accent",
    },
    {
      href: `/${tokoid}/service/tasks?status=selesai`,
      icon: "check",
      label: "Selesai",
      badge: taskStats?.selesai,
      badgeVariant: "success",
    },
    {
      href: `/${tokoid}/service/tasks?status=gagal`,
      icon: "close",
      label: "Gagal",
      badge: taskStats?.gagal,
      badgeVariant: "destructive",
    },
    {
      href: `/${tokoid}/service/tasks?status=history`,
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
  permissionAccess: PermissionAccessMap;
  disabledFeatures: FeatureKey[];
}

interface AdminStaffNavProps extends CommonNavProps {
  capabilities: CapabilityAccessMap;
  serviceStats: ServiceStats | null | undefined;
}

function shouldShowPermission(permissionAccess: PermissionAccessMap, permission: PermissionKey): boolean {
  const access = permissionAccess[permission];
  return access.allowed || access.lockReason === "feature_unavailable";
}

function canUsePermission(permissionAccess: PermissionAccessMap, permission: PermissionKey): boolean {
  return permissionAccess[permission]?.allowed === true;
}

export function buildAdminNav({
  tokoid,
  featureAccess,
  permissionAccess,
  capabilities,
  disabledFeatures,
  serviceStats,
}: AdminStaffNavProps): DashboardNavEntry[] {
  const isFeatureDisabled = (feature: FeatureKey) => disabledFeatures.includes(feature);

  const dashboardEnabled = canUsePermission(permissionAccess, "dashboard.view") && (capabilities["dashboard.overview"] ?? false);
  const tokoEnabled = canUsePermission(permissionAccess, "toko.viewSettings") && (capabilities["toko.manage"] ?? false);
  const serviceEnabled = canUsePermission(permissionAccess, "service.view") && (capabilities["service.management"] ?? false);
  const karyawanEnabled = canUsePermission(permissionAccess, "karyawan.view");
  const analyticsEnabled = canUsePermission(permissionAccess, "analytics.view");
  const inventoryEnabled = canUsePermission(permissionAccess, "inventory.view");
  const retailEnabled = canUsePermission(permissionAccess, "retail.view");
  const retailHistoryEnabled = canUsePermission(permissionAccess, "retail.viewHistory");
  const retailFeatureEnabled = featureAccess["retail.sales"] ?? false;
  const auditEnabled = canUsePermission(permissionAccess, "inventory.audit");

  const entries: DashboardNavEntry[] = [];

  if (shouldShowPermission(permissionAccess, "dashboard.view")) {
    entries.push({
      type: "item",
      href: `/${tokoid}/admin`,
      icon: "dashboard",
      label: "Admin Overview",
      isLocked: !dashboardEnabled,
    });
  }

  if (!isFeatureDisabled("analytics.revenue") && shouldShowPermission(permissionAccess, "analytics.view")) {
    entries.push({
      type: "item",
      href: `/${tokoid}/analytics`,
      icon: "chart",
      label: "Analytics",
      isLocked: !analyticsEnabled,
    });
  }

  if (shouldShowPermission(permissionAccess, "toko.viewSettings")) {
    entries.push({
      type: "item",
      href: `/${tokoid}/admin/toko`,
      icon: "store",
      label: "Toko",
      isLocked: !tokoEnabled,
    });
  }

  if (serviceEnabled) {
    entries.push({
      type: "filterGroup",
      title: "Service",
      icon: "tools",
      defaultOpen: true,
      items: buildServiceFilterItems(tokoid, "", serviceStats),
    });
  }

  if (retailFeatureEnabled && !isFeatureDisabled("retail.sales") && (retailEnabled || retailHistoryEnabled)) {
    entries.push({
      type: "group",
      title: "Retail",
      icon: "store",
      defaultOpen: true,
      items: [
        {
          href: `/${tokoid}/retail`,
          icon: "store",
          label: "Kasir",
          isLocked: !retailEnabled,
        },
        {
          href: `/${tokoid}/retail/history`,
          icon: "history",
          label: "Riwayat Penjualan",
          isLocked: !retailHistoryEnabled,
        },
      ].filter((item) => item.label === "Kasir" ? shouldShowPermission(permissionAccess, "retail.view") : shouldShowPermission(permissionAccess, "retail.viewHistory")),
    });
  }

  if (!isFeatureDisabled("karyawan.management") && shouldShowPermission(permissionAccess, "karyawan.view")) {
    entries.push({
      type: "item",
      href: `/${tokoid}/karyawan`,
      icon: "people",
      label: "Karyawan",
      isLocked: !karyawanEnabled,
    });
  }

  const inventoryItems: NavGroupItem[] = [];

  if (!isFeatureDisabled("inventory.management") && shouldShowPermission(permissionAccess, "inventory.view")) {
    inventoryItems.push(
      {
        href: `/${tokoid}/inventory`,
        icon: "tools",
        label: "Inventory Toko",
        isLocked: !inventoryEnabled,
      },
      {
        href: `/${tokoid}/inventory/restock-history`,
        icon: "history",
        label: "Riwayat Restock",
        isLocked: !canUsePermission(permissionAccess, "inventory.viewHistory"),
      },
      ...(canUsePermission(permissionAccess, "supplier_returns.view") ? [{
        href: `/${tokoid}/inventory/supplier-returns`,
        icon: "form",
        label: "Retur Supplier",
        isLocked: false,
      }] : []),
      {
        href: `/${tokoid}/supplier-debts`,
        icon: "form",
        label: "Hutang Supplier",
        isLocked: !canUsePermission(permissionAccess, "supplier_debts.view"),
      },
      {
        href: `/${tokoid}/inventory/reports`,
        icon: "chart",
        label: "Laporan Inventory",
        isLocked: !canUsePermission(permissionAccess, "inventory.report"),
      }
    );
  }

  if (!isFeatureDisabled("inventory.audit") && shouldShowPermission(permissionAccess, "inventory.audit")) {
    inventoryItems.push({
      href: `/${tokoid}/inventory/audit-gudang`,
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
  permissionAccess,
  capabilities,
  disabledFeatures,
  serviceStats,
}: AdminStaffNavProps): DashboardNavEntry[] {
  const isFeatureDisabled = (feature: FeatureKey) => disabledFeatures.includes(feature);

  const workflowEnabled = featureAccess["staff.workflow"] ?? false;
  const serviceEnabled = canUsePermission(permissionAccess, "service.view") && (capabilities["service.management"] ?? false);
  const inventoryEnabled = canUsePermission(permissionAccess, "inventory.view");
  const retailEnabled = canUsePermission(permissionAccess, "retail.view");
  const retailHistoryEnabled = canUsePermission(permissionAccess, "retail.viewHistory");

  if (isFeatureDisabled("staff.workflow")) {
    return [];
  }

  const entries: DashboardNavEntry[] = [];

  if (shouldShowPermission(permissionAccess, "dashboard.view")) {
    entries.push({
      type: "item",
      href: `/${tokoid}/staff`,
      icon: "dashboard",
      label: "Staff Overview",
      isLocked: !workflowEnabled || !canUsePermission(permissionAccess, "dashboard.view"),
    });
  }

  if (!isFeatureDisabled("analytics.revenue") && shouldShowPermission(permissionAccess, "analytics.view")) {
    entries.push({
      type: "item",
      href: `/${tokoid}/analytics`,
      icon: "chart",
      label: "Analytics",
      isLocked: !canUsePermission(permissionAccess, "analytics.view"),
    });
  }

  if (!isFeatureDisabled("karyawan.management") && shouldShowPermission(permissionAccess, "karyawan.view")) {
    entries.push({
      type: "item",
      href: `/${tokoid}/karyawan`,
      icon: "people",
      label: "Karyawan",
      isLocked: !canUsePermission(permissionAccess, "karyawan.view"),
    });
  }

  if (workflowEnabled && serviceEnabled) {
    entries.push({
      type: "filterGroup",
      title: "Service",
      icon: "tools",
      defaultOpen: true,
      items: buildServiceFilterItems(tokoid, "", serviceStats),
    });
  }

  if (workflowEnabled && !isFeatureDisabled("retail.sales") && (retailEnabled || retailHistoryEnabled)) {
    entries.push({
      type: "group",
      title: "Retail",
      icon: "store",
      defaultOpen: true,
      items: [
        {
          href: `/${tokoid}/retail`,
          icon: "store",
          label: "Kasir",
          isLocked: false,
        },
        {
          href: `/${tokoid}/retail/history`,
          icon: "history",
          label: "Riwayat Penjualan",
          isLocked: false,
        },
      ].filter((item) => item.label === "Kasir" ? retailEnabled : retailHistoryEnabled),
    });
  }

  const inventoryItems: NavGroupItem[] = [];

  if (workflowEnabled && !isFeatureDisabled("inventory.management") && canUsePermission(permissionAccess, "inventory.view")) {
    inventoryItems.push(
      {
        href: `/${tokoid}/inventory`,
        icon: "archive",
        label: "Inventory",
        isLocked: false,
      },
    );
    if (canUsePermission(permissionAccess, "inventory.viewHistory")) {
      inventoryItems.push(
      {
        href: `/${tokoid}/inventory/restock-history`,
        icon: "history",
        label: "Riwayat Restock",
        isLocked: false,
      });
    }
    if (canUsePermission(permissionAccess, "supplier_returns.view")) {
      inventoryItems.push({
        href: `/${tokoid}/inventory/supplier-returns`,
        icon: "form",
        label: "Retur Supplier",
        isLocked: false,
      });
    }
    if (canUsePermission(permissionAccess, "supplier_debts.view")) {
      inventoryItems.push(
      {
        href: `/${tokoid}/supplier-debts`,
        icon: "form",
        label: "Hutang Supplier",
        isLocked: false,
      });
    }
    if (canUsePermission(permissionAccess, "inventory.report")) {
      inventoryItems.push(
      {
        href: `/${tokoid}/inventory/reports`,
        icon: "chart",
        label: "Laporan Inventory",
        isLocked: false,
      }
      );
    }
  } else if (workflowEnabled && !isFeatureDisabled("retail.sales") && canUsePermission(permissionAccess, "inventory.manageRetail")) {
    inventoryItems.push({
      href: `/${tokoid}/inventory`,
      icon: "archive",
      label: "Inventory",
      isLocked: false,
    });
  }

  if (workflowEnabled && !isFeatureDisabled("inventory.audit") && canUsePermission(permissionAccess, "inventory.audit")) {
    inventoryItems.push({
      href: `/${tokoid}/inventory/audit-gudang`,
      icon: "form",
      label: "Audit Gudang",
      isLocked: false,
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

export function buildTeknisiNav({
  tokoid,
  featureAccess,
  permissionAccess,
  disabledFeatures,
  taskStats,
}: CommonNavProps & { taskStats: TechnicianTaskStats | null | undefined }): DashboardNavEntry[] {
  const isFeatureDisabled = (feature: FeatureKey) => disabledFeatures.includes(feature);
  const workflowEnabled = featureAccess["technician.workflow"] ?? false;
  const entries: DashboardNavEntry[] = [];

  if (!isFeatureDisabled("technician.workflow") && shouldShowPermission(permissionAccess, "dashboard.view")) {
    entries.push(
      {
        type: "item",
        href: `/${tokoid}/teknisi`,
        icon: "dashboard",
        label: "Teknisi Overview",
        isLocked: !workflowEnabled || !canUsePermission(permissionAccess, "dashboard.view"),
      }
    );
  }

  if (!isFeatureDisabled("technician.workflow") && shouldShowPermission(permissionAccess, "service.view")) {
    entries.push(
      {
        type: "filterGroup",
        title: "Task",
        icon: "task",
        defaultOpen: true,
        items: buildTechnicianTaskFilterItems(tokoid, taskStats),
      }
    );
  }

  const inventoryItems: NavGroupItem[] = [];

  if (!isFeatureDisabled("inventory.management") && canUsePermission(permissionAccess, "inventory.view")) {
    inventoryItems.push(
      {
        href: `/${tokoid}/inventory`,
        icon: "archive",
        label: "Inventory",
        isLocked: false,
      },
    );
    if (canUsePermission(permissionAccess, "inventory.viewHistory")) {
      inventoryItems.push(
      {
        href: `/${tokoid}/inventory/restock-history`,
        icon: "history",
        label: "Riwayat Restock",
        isLocked: false,
      });
    }
    if (canUsePermission(permissionAccess, "supplier_returns.view")) {
      inventoryItems.push({
        href: `/${tokoid}/inventory/supplier-returns`,
        icon: "form",
        label: "Retur Supplier",
        isLocked: false,
      });
    }
    if (canUsePermission(permissionAccess, "supplier_debts.view")) {
      inventoryItems.push(
      {
        href: `/${tokoid}/supplier-debts`,
        icon: "form",
        label: "Hutang Supplier",
        isLocked: false,
      });
    }
    if (canUsePermission(permissionAccess, "inventory.report")) {
      inventoryItems.push(
      {
        href: `/${tokoid}/inventory/reports`,
        icon: "chart",
        label: "Laporan Inventory",
        isLocked: false,
      }
      );
    }
  }

  if (!isFeatureDisabled("inventory.audit") && canUsePermission(permissionAccess, "inventory.audit")) {
    inventoryItems.push({
      href: `/${tokoid}/inventory/audit-gudang`,
      icon: "form",
      label: "Audit Gudang",
      isLocked: false,
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
