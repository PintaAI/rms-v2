"use server";

import prisma from "@/lib/prisma";
import { getDisabledFeaturesForToko } from "@/actions/feature-settings";
import { canAccessToko, getAuthUser, isAdmin, isStaff } from "@/lib/rbac";
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
  checkoutAt: Date | null;
  hpCatalog: {
    id: string;
    modelName: string;
    brand: { name: string };
  };
  technician: { id: string; name: string } | null;
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
    activityLog: boolean;
    revenueAnalytics: boolean;
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
  service: {
    id: string;
    customerName: string | null;
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
}

export interface StaffOverviewData {
  stats: StaffOverviewStats;
  recentServices: AdminOverviewRecentService[];
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
  checkoutAt: true,
  hpCatalog: {
    select: {
      id: true,
      modelName: true,
      brand: { select: { name: true } },
    },
  },
  technician: {
    select: { id: true, name: true },
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
  service: {
    select: {
      id: true,
      customerName: true,
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

async function getSharedOverviewData(targetTokoId: string): Promise<ActionResultWithData<SharedOverviewData>> {
  const now = new Date();
  const dailyStart = new Date(now);
  dailyStart.setHours(0, 0, 0, 0);
  const weeklyStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthlyStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const serviceStatusCounts = await prisma.service.groupBy({
    by: ["status"],
    where: { tokoId: targetTokoId },
    _count: { status: true },
  });

  const statusMap: Record<string, number> = {};
  for (const row of serviceStatusCounts) {
    statusMap[row.status] = row._count.status;
  }

  const pickedUpCount = await prisma.service.count({
    where: { tokoId: targetTokoId, isPickedUp: true },
  });

  const [dailyCount, weeklyCount, lowStockCount, recentServices] = await Promise.all([
    prisma.service.count({
      where: { tokoId: targetTokoId, checkinAt: { gte: dailyStart } },
    }),
    prisma.service.count({
      where: { tokoId: targetTokoId, checkinAt: { gte: weeklyStart } },
    }),
    prisma.sparepart.count({
      where: { tokoId: targetTokoId, stock: { lte: 5 } },
    }),
    prisma.service.findMany({
      where: { tokoId: targetTokoId },
      orderBy: { checkinAt: "desc" },
      take: 5,
      select: recentServiceSelect,
    }),
  ]);

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
      lowStockCount,
      recentServices,
      total,
    },
  };
}

export async function getAdminOverview(
  tokoId?: string
): Promise<ActionResultWithData<AdminOverviewData>> {
  try {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };
    if (!isAdmin(user)) return { success: false, error: "Access denied" };

    const targetTokoId = tokoId ?? user.tokoIds[0];
    if (!targetTokoId) return { success: false, error: "No toko found" };
    if (!canAccessToko(user, targetTokoId)) return { success: false, error: "Access denied" };

    const shared = await getSharedOverviewData(targetTokoId);
    if (!shared.success || !shared.data) {
      return { success: false, error: shared.error ?? "Failed to fetch overview data" };
    }

    const { dailyStart, monthlyStart, statusMap, dailyCount, weeklyCount, lowStockCount, recentServices, total } = shared.data;

    const disabledFeatures = await getDisabledFeaturesForToko(targetTokoId);
    const canViewActivityLog = !disabledFeatures.includes("activityLog.view");
    const canViewRevenueAnalytics = !disabledFeatures.includes("analytics.revenue");

    const [monthlyPaidRevenue, monthlyPendingRevenue, dailyRevenue, recentActivities] = await Promise.all([
      canViewRevenueAnalytics
        ? prisma.invoice.aggregate({
            where: {
              service: { tokoId: targetTokoId },
              paymentStatus: "paid",
              paidAt: { gte: monthlyStart },
            },
            _sum: { grandTotal: true },
          })
        : Promise.resolve({ _sum: { grandTotal: 0 } }),
      canViewRevenueAnalytics
        ? prisma.invoice.aggregate({
            where: {
              service: { tokoId: targetTokoId },
              paymentStatus: { in: ["unpaid", "dp"] },
              createdAt: { gte: monthlyStart },
            },
            _sum: { grandTotal: true },
          })
        : Promise.resolve({ _sum: { grandTotal: 0 } }),
      canViewRevenueAnalytics
        ? prisma.invoice.aggregate({
            where: {
              service: { tokoId: targetTokoId },
              paymentStatus: "paid",
              paidAt: { gte: dailyStart },
            },
            _sum: { grandTotal: true },
          })
        : Promise.resolve({ _sum: { grandTotal: 0 } }),
      canViewActivityLog
        ? prisma.activityLog.findMany({
            where: { tokoId: targetTokoId },
            orderBy: { createdAt: "desc" },
            take: 6,
            select: activityLogSelect,
          })
        : Promise.resolve([]),
    ]);

    const stats: AdminOverviewStats = {
      services: {
        total,
        repairing: statusMap["repairing"] || 0,
        done: statusMap["done"] || 0,
        failed: statusMap["failed"] || 0,
        daily: dailyCount,
        weekly: weeklyCount,
      },
      revenue: {
        monthlyPaid: monthlyPaidRevenue._sum.grandTotal || 0,
        monthlyPending: monthlyPendingRevenue._sum.grandTotal || 0,
        dailyRevenue: dailyRevenue._sum.grandTotal || 0,
      },
      inventory: {
        lowStockCount,
      },
    };

    return {
      success: true,
      data: {
        stats,
        recentServices,
        recentActivities,
        featureAccess: {
          activityLog: canViewActivityLog,
          revenueAnalytics: canViewRevenueAnalytics,
        },
      },
    };
  } catch (error) {
    console.error("Error fetching admin overview:", error);
    return { success: false, error: "Failed to fetch overview data" };
  }
}

export async function getStaffOverview(
  tokoId?: string
): Promise<ActionResultWithData<StaffOverviewData>> {
  try {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };
    if (!isStaff(user) && !isAdmin(user)) return { success: false, error: "Access denied" };

    const targetTokoId = tokoId ?? user.tokoIds[0];
    if (!targetTokoId) return { success: false, error: "No toko found" };
    if (!canAccessToko(user, targetTokoId)) return { success: false, error: "Access denied" };

    const shared = await getSharedOverviewData(targetTokoId);
    if (!shared.success || !shared.data) {
      return { success: false, error: shared.error ?? "Failed to fetch overview data" };
    }

    const { statusMap, dailyCount, weeklyCount, lowStockCount, recentServices, total } = shared.data;

    const stats: StaffOverviewStats = {
      services: {
        total,
        repairing: statusMap["repairing"] || 0,
        done: statusMap["done"] || 0,
        daily: dailyCount,
        weekly: weeklyCount,
      },
      inventory: {
        lowStockCount,
      },
    };

    return {
      success: true,
      data: {
        stats,
        recentServices,
      },
    };
  } catch (error) {
    console.error("Error fetching staff overview:", error);
    return { success: false, error: "Failed to fetch overview data" };
  }
}
