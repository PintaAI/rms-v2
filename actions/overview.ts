"use server";

import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/rbac";
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
    totalPaid: number;
    totalPending: number;
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
  } | null;
}

export interface AdminOverviewData {
  stats: AdminOverviewStats;
  recentServices: AdminOverviewRecentService[];
  recentActivities: AdminOverviewActivityItem[];
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
    },
  },
};

function getTimeRanges() {
  const now = new Date();

  const dailyStart = new Date(now);
  dailyStart.setHours(0, 0, 0, 0);

  const weeklyStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  return { now, dailyStart, weeklyStart };
}

export async function getAdminOverview(
  tokoId?: string
): Promise<ActionResultWithData<AdminOverviewData>> {
  try {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const targetTokoId = tokoId ?? user.tokoIds[0];
    if (!targetTokoId) return { success: false, error: "No toko found" };
    if (!user.tokoIds.includes(targetTokoId)) return { success: false, error: "Access denied" };

    const { dailyStart, weeklyStart } = getTimeRanges();

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

    const [dailyCount, weeklyCount] = await Promise.all([
      prisma.service.count({
        where: { tokoId: targetTokoId, checkinAt: { gte: dailyStart } },
      }),
      prisma.service.count({
        where: { tokoId: targetTokoId, checkinAt: { gte: weeklyStart } },
      }),
    ]);

    const [totalPaidRevenue, totalPendingRevenue, dailyRevenue] = await Promise.all([
      prisma.invoice.aggregate({
        where: {
          service: { tokoId: targetTokoId },
          paymentStatus: "paid",
        },
        _sum: { grandTotal: true },
      }),
      prisma.invoice.aggregate({
        where: {
          service: { tokoId: targetTokoId },
          paymentStatus: "unpaid",
        },
        _sum: { grandTotal: true },
      }),
      prisma.invoice.aggregate({
        where: {
          service: { tokoId: targetTokoId },
          paymentStatus: "paid",
          paidAt: { gte: dailyStart },
        },
        _sum: { grandTotal: true },
      }),
    ]);

    const lowStockCount = await prisma.sparepart.count({
      where: { tokoId: targetTokoId, stock: { lte: 5 } },
    });

    const [recentServices, recentActivities] = await Promise.all([
      prisma.service.findMany({
        where: { tokoId: targetTokoId },
        orderBy: { checkinAt: "desc" },
        take: 5,
        select: recentServiceSelect,
      }),
      prisma.activityLog.findMany({
        where: { tokoId: targetTokoId },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
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
        },
      }),
    ]);

    const total =
      (statusMap["received"] || 0) +
      (statusMap["repairing"] || 0) +
      (statusMap["done"] || 0) +
      (statusMap["failed"] || 0) +
      pickedUpCount;

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
        totalPaid: totalPaidRevenue._sum.grandTotal || 0,
        totalPending: totalPendingRevenue._sum.grandTotal || 0,
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
      },
    };
  } catch (error) {
    console.error("Error fetching admin overview:", error);
    return { success: false, error: "Failed to fetch overview data" };
  }
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

export async function getStaffOverview(
  tokoId?: string
): Promise<ActionResultWithData<StaffOverviewData>> {
  try {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const targetTokoId = tokoId ?? user.tokoIds[0];
    if (!targetTokoId) return { success: false, error: "No toko found" };
    if (!user.tokoIds.includes(targetTokoId)) return { success: false, error: "Access denied" };

    const { dailyStart, weeklyStart } = getTimeRanges();

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
      (statusMap["failed"] || 0) +
      pickedUpCount;

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

export async function getTechnicianOverview(): Promise<ActionResultWithData<{
  stats: { totalAssigned: number; inProgress: number; done: number };
  myActiveTasks: AdminOverviewRecentService[];
}>> {
  try {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const [totalAssigned, inProgress, done, myActiveTasks] = await Promise.all([
      prisma.service.count({ where: { technicianId: user.id } }),
      prisma.service.count({ where: { technicianId: user.id, status: "repairing" } }),
      prisma.service.count({ where: { technicianId: user.id, status: "done", isPickedUp: false } }),
      prisma.service.findMany({
        where: { technicianId: user.id, status: { in: ["received", "repairing"] } },
        orderBy: { checkinAt: "asc" },
        take: 5,
        select: recentServiceSelect,
      }),
    ]);

    return {
      success: true,
      data: {
        stats: { totalAssigned, inProgress, done },
        myActiveTasks,
      },
    };
  } catch (error) {
    console.error("Error fetching technician overview:", error);
    return { success: false, error: "Failed to fetch overview data" };
  }
}