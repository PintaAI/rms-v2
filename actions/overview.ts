"use server";

import prisma from "@/lib/prisma";
import { getRequestUser } from "@/lib/auth/request-user";
import { assertPermission, can } from "@/lib/auth/request-scope";
import { withScope } from "@/lib/auth/wrapper";
import type { Prisma } from "@/prisma/generated/prisma/client";
import type { PaymentStatus } from "@/prisma/generated/prisma/enums";
import type { ActionResultWithData } from "./service";

export interface AdminOverviewStats {
  services: {
    total: number;
    repairing: number;
    done: number;
    failed: number;
    daily: number;
    weekly: number;
  };
  revenue: {
    monthlyPaid: number;
    monthlyPending: number;
    dailyRevenue: number;
    monthlyIncome: number;
    supplierDebtRemaining: number;
    supplierDebtPaymentsThisMonth: number;
    supplierReturnRefundedThisMonth: number;
    supplierReturnPendingCount: number;
    supplierReturnPendingValue: number;
    cashBersihMonth: number;
    supplierSignalsEnabled: boolean;
  };
  inventory: {
    lowStockCount: number;
  };
}

export interface AdminOverviewRecentService {
  id: string;
  customerName: string | null;
  noWa: string;
  complaint: string;
  status: string;
  isPickedUp: boolean;
  checkinAt: Date;
  doneAt: Date | null;
  warrantyUntil: Date | null;
  checkoutAt: Date | null;
  deviceModel: {
    id: string;
    modelName: string;
    brand: { name: string };
  };
  technician: { id: string; name: string } | null;
  createdBy: { name: string } | null;
  invoice: {
    id: string;
    grandTotal: number;
    paymentStatus: PaymentStatus;
    dpAmount: number;
  } | null;
}

export interface AdminOverviewData {
  stats: AdminOverviewStats;
  recentServices: AdminOverviewRecentService[];
  recentActivities: AdminOverviewActivityItem[];
  featureAccess: {
    realtimeUpdates: boolean;
    revenueAnalytics: boolean;
    technicianAssignment: boolean;
  };
}

export interface AdminOverviewActivityItem {
  id: string;
  title: string;
  type: string;
  createdAt: Date;
  payload: Prisma.JsonValue | null;
  user: {
    name: string;
  };
  repairOrder: {
    id: string;
    customerName: string | null;
    deviceModel: {
      modelName: string;
      brand: { name: string };
    };
  } | null;
}

export interface StaffOverviewStats {
  services: {
    total: number;
    repairing: number;
    done: number;
    daily: number;
    weekly: number;
  };
  inventory: {
    lowStockCount: number;
  };
  retail: {
    itemCount: number;
    lowStockCount: number;
    dailySales: number;
    weeklySales: number;
    dailyRevenue: number;
    weeklyRevenue: number;
    canViewHistory: boolean;
  };
}

export interface StaffOverviewData {
  stats: StaffOverviewStats;
  recentServices: AdminOverviewRecentService[];
}

const emptyServiceStats = {
  total: 0,
  repairing: 0,
  done: 0,
  daily: 0,
  weekly: 0,
};

const emptyRetailStats = {
  itemCount: 0,
  lowStockCount: 0,
  dailySales: 0,
  weeklySales: 0,
  dailyRevenue: 0,
  weeklyRevenue: 0,
  canViewHistory: false,
};

function getOverviewDateRanges() {
  const now = new Date();
  const dailyStart = new Date(now);
  dailyStart.setHours(0, 0, 0, 0);
  const weeklyStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthlyStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  return { dailyStart, weeklyStart, monthlyStart };
}

const recentServiceSelect = {
  id: true,
  customerName: true,
  noWa: true,
  complaint: true,
  status: true,
  isPickedUp: true,
  checkinAt: true,
  doneAt: true,
  warrantyUntil: true,
  checkoutAt: true,
  deviceModel: {
    select: {
      id: true,
      modelName: true,
      brand: { select: { name: true } },
    },
  },
  technician: {
    select: { id: true, name: true },
  },
  createdBy: {
    select: { name: true },
  },
  invoice: {
    select: {
      id: true,
      grandTotal: true,
      paymentStatus: true,
      dpAmount: true,
    },
  },
};

const activityLogSelect = {
  id: true,
  title: true,
  type: true,
  createdAt: true,
  payload: true,
  user: {
    select: {
      name: true,
    },
  },
  repairOrder: {
    select: {
      id: true,
      customerName: true,
      deviceModel: {
        select: {
          modelName: true,
          brand: { select: { name: true } },
        },
      },
    },
  },
};

interface SharedOverviewData {
  dailyStart: Date;
  monthlyStart: Date;
  statusMap: Record<string, number>;
  pickedUpCount: number;
  dailyCount: number;
  weeklyCount: number;
  lowStockCount: number;
  recentServices: AdminOverviewRecentService[];
  total: number;
}

async function getSharedOverviewData(targetStoreId: string): Promise<ActionResultWithData<SharedOverviewData>> {
  const { dailyStart, weeklyStart, monthlyStart } = getOverviewDateRanges();

  const serviceStatusCounts = await prisma.repairOrder.groupBy({
    by: ["status"],
    where: { storeId: targetStoreId },
    _count: { status: true },
  });

  const statusMap: Record<string, number> = {};
  for (const row of serviceStatusCounts) {
    statusMap[row.status] = row._count.status;
  }

  const pickedUpCount = await prisma.repairOrder.count({
    where: { storeId: targetStoreId, isPickedUp: true },
  });

  const [dailyCount, weeklyCount, lowStockCount, recentServices] = await Promise.all([
    prisma.repairOrder.count({
      where: { storeId: targetStoreId, checkinAt: { gte: dailyStart } },
    }),
    prisma.repairOrder.count({
      where: { storeId: targetStoreId, checkinAt: { gte: weeklyStart } },
    }),
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM "inventory_item"
      WHERE "storeId" = ${targetStoreId}
        AND "stock" <= "criticalStock"
    `,
    prisma.repairOrder.findMany({
      where: { storeId: targetStoreId },
      orderBy: { checkinAt: "desc" },
      take: 5,
      select: recentServiceSelect,
    }),
  ]);

  const lowStockTotal = lowStockCount[0]?.count ?? 0;

  const total =
    (statusMap["received"] || 0) +
    (statusMap["repairing"] || 0) +
    (statusMap["done"] || 0) +
    (statusMap["failed"] || 0);

  return {
    success: true,
    data: {
      dailyStart,
      monthlyStart,
      statusMap,
      pickedUpCount,
      dailyCount,
      weeklyCount,
      lowStockCount: lowStockTotal,
      recentServices,
      total,
    },
  };
}

export async function getAdminOverview(
  storeId?: string
): Promise<ActionResultWithData<AdminOverviewData>> {
  if (!storeId) {
    const user = await getRequestUser();
    if (!user) return { success: false, error: "Unauthorized" };
    storeId = user.storeIds[0];
    if (!storeId) return { success: false, error: "No toko found" };
  }

  return withScope(storeId, {}, async (scope) => {
    assertPermission(scope, "dashboard.view");

    const shared = await getSharedOverviewData(storeId);
    if (!shared.success || !shared.data) throw new Error(shared.error ?? "Failed to fetch overview data");

    const { dailyStart, monthlyStart, statusMap, dailyCount, weeklyCount, lowStockCount, recentServices, total } = shared.data;

    const canUseRealtimeUpdates = scope.featureAccess["realtime.updates"] ?? false;
    const canViewRevenueAnalytics = scope.featureAccess["analytics.revenue"] ?? false;
    const canUseSalesOrders = scope.featureAccess["retail.sales"] ?? false;
    const canUseInventoryManagement = scope.featureAccess["inventory.management"] ?? false;

    const [
      monthlyPaidRevenue,
      monthlyPendingRevenue,
      dailyRevenue,
      monthlyRefunds,
      dailyRefunds,
      monthlyRetailRevenue,
      supplierDebtTotals,
      supplierDebtPayments,
      supplierReturnRefunds,
      supplierReturnPendingCount,
      supplierReturnPendingItems,
      recentActivities,
    ] = await Promise.all([
      canViewRevenueAnalytics
        ? prisma.repairInvoice.aggregate({ where: { repairOrder: { storeId }, paymentStatus: "paid", paidAt: { gte: monthlyStart } }, _sum: { grandTotal: true } })
        : Promise.resolve({ _sum: { grandTotal: 0 } }),
      canViewRevenueAnalytics
        ? prisma.repairInvoice.aggregate({ where: { repairOrder: { storeId }, paymentStatus: { in: ["unpaid", "dp"] }, createdAt: { gte: monthlyStart } }, _sum: { grandTotal: true } })
        : Promise.resolve({ _sum: { grandTotal: 0 } }),
      canViewRevenueAnalytics
        ? prisma.repairInvoice.aggregate({ where: { repairOrder: { storeId }, paymentStatus: "paid", paidAt: { gte: dailyStart } }, _sum: { grandTotal: true } })
        : Promise.resolve({ _sum: { grandTotal: 0 } }),
      canViewRevenueAnalytics
        ? prisma.warrantyClaim.aggregate({ where: { storeId, status: "resolved", refundAmount: { gt: 0 }, resolvedAt: { gte: monthlyStart } }, _sum: { refundAmount: true } })
        : Promise.resolve({ _sum: { refundAmount: 0 } }),
      canViewRevenueAnalytics
        ? prisma.warrantyClaim.aggregate({ where: { storeId, status: "resolved", refundAmount: { gt: 0 }, resolvedAt: { gte: dailyStart } }, _sum: { refundAmount: true } })
        : Promise.resolve({ _sum: { refundAmount: 0 } }),
      canViewRevenueAnalytics && canUseSalesOrders
        ? prisma.salesOrder.aggregate({ where: { storeId, status: "paid", paidAt: { gte: monthlyStart } }, _sum: { grandTotal: true } })
        : Promise.resolve({ _sum: { grandTotal: 0 } }),
      canViewRevenueAnalytics && canUseInventoryManagement
        ? prisma.supplierPayable.aggregate({ where: { storeId, status: { in: ["unpaid", "partial"] } }, _sum: { totalAmount: true, paidAmount: true } })
        : Promise.resolve({ _sum: { totalAmount: 0, paidAmount: 0 } }),
      canViewRevenueAnalytics && canUseInventoryManagement
        ? prisma.supplierPayablePayment.aggregate({ where: { paymentDate: { gte: monthlyStart }, payable: { storeId } }, _sum: { amount: true } })
        : Promise.resolve({ _sum: { amount: 0 } }),
      canViewRevenueAnalytics && canUseInventoryManagement
        ? prisma.supplierReturn.aggregate({ where: { storeId, status: "refunded", resolvedAt: { gte: monthlyStart } }, _sum: { refundAmount: true } })
        : Promise.resolve({ _sum: { refundAmount: 0 } }),
      canViewRevenueAnalytics && canUseInventoryManagement
        ? prisma.supplierReturn.count({ where: { storeId, status: { in: ["pending", "sent"] } } })
        : Promise.resolve(0),
      canViewRevenueAnalytics && canUseInventoryManagement
        ? prisma.supplierReturn.findMany({
            where: { storeId, status: { in: ["pending", "sent"] } },
            select: { qty: true, inventoryItem: { select: { purchasePrice: true } } },
          })
        : Promise.resolve([]),
      canUseRealtimeUpdates
        ? prisma.activityLog.findMany({ where: { storeId }, orderBy: { createdAt: "desc" }, take: 6, select: activityLogSelect })
        : Promise.resolve([]),
    ]);

    const monthlyPaidNet = Math.max((monthlyPaidRevenue._sum.grandTotal || 0) - (monthlyRefunds._sum.refundAmount || 0), 0);
    const dailyRevenueNet = Math.max((dailyRevenue._sum.grandTotal || 0) - (dailyRefunds._sum.refundAmount || 0), 0);
    const retailRevenueMonth = monthlyRetailRevenue._sum.grandTotal || 0;
    const monthlyIncome = monthlyPaidNet + retailRevenueMonth;
    const supplierDebtRemaining = Math.max((supplierDebtTotals._sum.totalAmount || 0) - (supplierDebtTotals._sum.paidAmount || 0), 0);
    const supplierDebtPaymentsThisMonth = supplierDebtPayments._sum.amount || 0;
    const supplierReturnRefundedThisMonth = supplierReturnRefunds._sum.refundAmount || 0;
    const supplierReturnPendingValue = supplierReturnPendingItems.reduce(
      (total, item) => total + item.qty * (item.inventoryItem.purchasePrice ?? 0),
      0
    );
    const cashBersihMonth = monthlyIncome + supplierReturnRefundedThisMonth - supplierDebtPaymentsThisMonth;

    return {
      stats: {
        services: { total, repairing: statusMap["repairing"] || 0, done: statusMap["done"] || 0, failed: statusMap["failed"] || 0, daily: dailyCount, weekly: weeklyCount },
        revenue: {
          monthlyPaid: monthlyPaidNet,
          monthlyPending: monthlyPendingRevenue._sum.grandTotal || 0,
          dailyRevenue: dailyRevenueNet,
          monthlyIncome,
          supplierDebtRemaining,
          supplierDebtPaymentsThisMonth,
          supplierReturnRefundedThisMonth,
          supplierReturnPendingCount,
          supplierReturnPendingValue,
          cashBersihMonth,
          supplierSignalsEnabled: canUseInventoryManagement,
        },
        inventory: { lowStockCount },
      },
      recentServices,
      recentActivities,
      featureAccess: {
        realtimeUpdates: canUseRealtimeUpdates,
        revenueAnalytics: canViewRevenueAnalytics,
        technicianAssignment: scope.featureAccess["service.technicianAssignment"] ?? false,
      },
    };
  });
}

export async function getStaffOverview(
  storeId?: string
): Promise<ActionResultWithData<StaffOverviewData>> {
  if (!storeId) {
    const user = await getRequestUser();
    if (!user) return { success: false, error: "Unauthorized" };
    storeId = user.storeIds[0];
    if (!storeId) return { success: false, error: "No toko found" };
  }

  return withScope(storeId, { feature: "staff.workflow" }, async (scope) => {
    assertPermission(scope, "dashboard.view");

    const canViewService = can(scope, "service.view");
    const canViewRetail = can(scope, "retail.view");
    const canViewRetailHistory = can(scope, "retail.viewHistory");
    const { dailyStart, weeklyStart } = getOverviewDateRanges();

    const [shared, retailItemCount, retailLowStockCount, dailyRetailSales, weeklyRetailSales] = await Promise.all([
      canViewService ? getSharedOverviewData(storeId) : Promise.resolve(null),
      canViewRetail
        ? prisma.inventoryItem.count({ where: { storeId, type: "retail_product" } })
        : Promise.resolve(0),
      canViewRetail
        ? prisma.$queryRaw<{ count: number }[]>`
            SELECT COUNT(*)::int AS count
            FROM "inventory_item"
            WHERE "storeId" = ${storeId}
              AND "type" = 'retail_product'
              AND "stock" <= "criticalStock"
          `
        : Promise.resolve([{ count: 0 }]),
      canViewRetailHistory
        ? prisma.salesOrder.aggregate({ where: { storeId, status: "paid", paidAt: { gte: dailyStart } }, _count: { id: true }, _sum: { grandTotal: true } })
        : Promise.resolve({ _count: { id: 0 }, _sum: { grandTotal: 0 } }),
      canViewRetailHistory
        ? prisma.salesOrder.aggregate({ where: { storeId, status: "paid", paidAt: { gte: weeklyStart } }, _count: { id: true }, _sum: { grandTotal: true } })
        : Promise.resolve({ _count: { id: 0 }, _sum: { grandTotal: 0 } }),
    ]);

    if (shared && (!shared.success || !shared.data)) throw new Error(shared.error ?? "Failed to fetch overview data");

    const sharedData = shared?.data;
    const statusMap = sharedData?.statusMap ?? {};

    return {
      stats: {
        services: sharedData
          ? { total: sharedData.total, repairing: statusMap["repairing"] || 0, done: statusMap["done"] || 0, daily: sharedData.dailyCount, weekly: sharedData.weeklyCount }
          : emptyServiceStats,
        inventory: { lowStockCount: sharedData?.lowStockCount ?? 0 },
        retail: canViewRetail
          ? {
              itemCount: retailItemCount,
              lowStockCount: retailLowStockCount[0]?.count ?? 0,
              dailySales: dailyRetailSales._count.id,
              weeklySales: weeklyRetailSales._count.id,
              dailyRevenue: dailyRetailSales._sum.grandTotal ?? 0,
              weeklyRevenue: weeklyRetailSales._sum.grandTotal ?? 0,
              canViewHistory: canViewRetailHistory,
            }
          : emptyRetailStats,
      },
      recentServices: sharedData?.recentServices ?? [],
    };
  });
}
