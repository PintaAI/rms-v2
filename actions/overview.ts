"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import type { ServiceStatus, PaymentStatus } from "@/prisma/generated/prisma/enums";
import type { ServiceListItem, ActionResult, ActionResultWithData } from "./service";

export interface AdminOverviewStats {
  services: {
    total: number;
    received: number;
    repairing: number;
    done: number;
    pickedUp: number;
    failed: number;
    daily: number;
    weekly: number;
    monthly: number;
  };
  revenue: {
    totalPaid: number;
    totalPending: number;
    dailyRevenue: number;
  };
  inventory: {
    totalSpareparts: number;
    lowStockCount: number;
  };
  staff: {
    totalTechnicians: number;
    totalStaff: number;
  };
}

export interface AdminOverviewData {
  stats: AdminOverviewStats;
  recentServices: ServiceListItem[];
}

async function getSessionAndTokos() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user) {
    return { user: null, tokoIds: [] };
  }

  const userTokoAssignments = await prisma.userToko.findMany({
    where: { userId: session.user.id },
    select: { tokoId: true },
  });

  const tokoIds = userTokoAssignments.map((a) => a.tokoId);

  return { user: session.user, tokoIds };
}

const serviceSelectBase = {
  id: true,
  customerName: true,
  noWa: true,
  complaint: true,
  status: true,
  checkinAt: true,
  doneAt: true,
  checkoutAt: true,
  passwordPattern: true,
  imei: true,
  note: true,
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
  createdBy: {
    select: { name: true },
  },
  invoice: {
    select: {
      id: true,
      grandTotal: true,
      paymentStatus: true,
    },
  },
};

function mapServiceToListItem(service: any): ServiceListItem {
  return {
    id: service.id,
    hpCatalogId: service.hpCatalog.id,
    customerName: service.customerName,
    noWa: service.noWa,
    complaint: service.complaint,
    note: service.note,
    status: service.status,
    checkinAt: service.checkinAt,
    doneAt: service.doneAt,
    checkoutAt: service.checkoutAt,
    passwordPattern: service.passwordPattern,
    imei: service.imei,
    hpCatalog: {
      id: service.hpCatalog.id,
      modelName: service.hpCatalog.modelName,
      brand: { name: service.hpCatalog.brand.name },
    },
    technician: service.technician,
    createdBy: service.createdBy ?? undefined,
    invoice: service.invoice,
  };
}

function getTimeRanges() {
  const now = new Date();
  
  const dailyStart = new Date(now);
  dailyStart.setHours(0, 0, 0, 0);
  
  const weeklyStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const monthlyStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  return { now, dailyStart, weeklyStart, monthlyStart };
}

export async function getAdminOverview(
  tokoId?: string
): Promise<ActionResultWithData<AdminOverviewData>> {
  try {
    const { user, tokoIds } = await getSessionAndTokos();
    if (!user) return { success: false, error: "Unauthorized" };

    const targetTokoId = tokoId ?? tokoIds[0];
    if (!targetTokoId) return { success: false, error: "No toko found" };
    if (!tokoIds.includes(targetTokoId)) return { success: false, error: "Access denied" };

    const { dailyStart, weeklyStart, monthlyStart } = getTimeRanges();

    const [
      total,
      received,
      repairing,
      done,
      pickedUp,
      failed,
      dailyCount,
      weeklyCount,
      monthlyCount,
      totalPaidRevenue,
      totalPendingRevenue,
      dailyRevenue,
      totalSpareparts,
      lowStockCount,
      totalTechnicians,
      totalStaff,
      recentServices,
    ] = await Promise.all([
      prisma.service.count({ where: { tokoId: targetTokoId } }),
      prisma.service.count({ where: { tokoId: targetTokoId, status: "received" } }),
      prisma.service.count({ where: { tokoId: targetTokoId, status: "repairing" } }),
      prisma.service.count({ where: { tokoId: targetTokoId, status: "done" } }),
      prisma.service.count({ where: { tokoId: targetTokoId, status: "picked_up" } }),
      prisma.service.count({ where: { tokoId: targetTokoId, status: "failed" } }),
      prisma.service.count({ where: { tokoId: targetTokoId, checkinAt: { gte: dailyStart } } }),
      prisma.service.count({ where: { tokoId: targetTokoId, checkinAt: { gte: weeklyStart } } }),
      prisma.service.count({ where: { tokoId: targetTokoId, checkinAt: { gte: monthlyStart } } }),
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
      prisma.sparepart.count({ where: { tokoId: targetTokoId } }),
      prisma.sparepart.count({ where: { tokoId: targetTokoId, stock: { lte: 5 } } }),
      prisma.userToko.count({
        where: { tokoId: targetTokoId, user: { role: "technician" } },
      }),
      prisma.userToko.count({
        where: { tokoId: targetTokoId, user: { role: "staff" } },
      }),
      prisma.service.findMany({
        where: { tokoId: targetTokoId },
        orderBy: { checkinAt: "desc" },
        take: 5,
        select: serviceSelectBase,
      }),
    ]);

    const stats: AdminOverviewStats = {
      services: {
        total,
        received,
        repairing,
        done,
        pickedUp,
        failed,
        daily: dailyCount,
        weekly: weeklyCount,
        monthly: monthlyCount,
      },
      revenue: {
        totalPaid: totalPaidRevenue._sum.grandTotal || 0,
        totalPending: totalPendingRevenue._sum.grandTotal || 0,
        dailyRevenue: dailyRevenue._sum.grandTotal || 0,
      },
      inventory: {
        totalSpareparts,
        lowStockCount,
      },
      staff: {
        totalTechnicians,
        totalStaff,
      },
    };

    return {
      success: true,
      data: {
        stats,
        recentServices: recentServices.map(mapServiceToListItem),
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
    received: number;
    repairing: number;
    done: number;
    daily: number;
    weekly: number;
    monthly: number;
  };
  inventory: {
    totalSpareparts: number;
    lowStockCount: number;
  };
}

export interface StaffOverviewData {
  stats: StaffOverviewStats;
  recentServices: ServiceListItem[];
}

export async function getStaffOverview(
  tokoId?: string
): Promise<ActionResultWithData<StaffOverviewData>> {
  try {
    const { user, tokoIds } = await getSessionAndTokos();
    if (!user) return { success: false, error: "Unauthorized" };

    const targetTokoId = tokoId ?? tokoIds[0];
    if (!targetTokoId) return { success: false, error: "No toko found" };
    if (!tokoIds.includes(targetTokoId)) return { success: false, error: "Access denied" };

    const { dailyStart, weeklyStart, monthlyStart } = getTimeRanges();

    const [total, received, repairing, done, pickedUp, dailyCount, weeklyCount, monthlyCount, totalSpareparts, lowStockCount, recentServices] = await Promise.all([
      prisma.service.count({ where: { tokoId: targetTokoId } }),
      prisma.service.count({ where: { tokoId: targetTokoId, status: "received" } }),
      prisma.service.count({ where: { tokoId: targetTokoId, status: "repairing" } }),
      prisma.service.count({ where: { tokoId: targetTokoId, status: "done" } }),
      prisma.service.count({ where: { tokoId: targetTokoId, status: "picked_up" } }),
      prisma.service.count({ where: { tokoId: targetTokoId, checkinAt: { gte: dailyStart } } }),
      prisma.service.count({ where: { tokoId: targetTokoId, checkinAt: { gte: weeklyStart } } }),
      prisma.service.count({ where: { tokoId: targetTokoId, checkinAt: { gte: monthlyStart } } }),
      prisma.sparepart.count({ where: { tokoId: targetTokoId } }),
      prisma.sparepart.count({ where: { tokoId: targetTokoId, stock: { lte: 5 } } }),
      prisma.service.findMany({
        where: { tokoId: targetTokoId },
        orderBy: { checkinAt: "desc" },
        take: 5,
        select: serviceSelectBase,
      }),
    ]);

    const stats: StaffOverviewStats = {
      services: {
        total,
        received,
        repairing,
        done: done + pickedUp,
        daily: dailyCount,
        weekly: weeklyCount,
        monthly: monthlyCount,
      },
      inventory: {
        totalSpareparts,
        lowStockCount,
      },
    };

    return {
      success: true,
      data: {
        stats,
        recentServices: recentServices.map(mapServiceToListItem),
      },
    };
  } catch (error) {
    console.error("Error fetching staff overview:", error);
    return { success: false, error: "Failed to fetch overview data" };
  }
}

export async function getTechnicianOverview(): Promise<ActionResultWithData<{
  stats: { totalAssigned: number; inProgress: number; done: number };
  myActiveTasks: ServiceListItem[];
}>> {
  try {
    const { user, tokoIds } = await getSessionAndTokos();
    if (!user) return { success: false, error: "Unauthorized" };

    const [totalAssigned, inProgress, done, myActiveTasks] = await Promise.all([
      prisma.service.count({ where: { technicianId: user.id } }),
      prisma.service.count({ where: { technicianId: user.id, status: "repairing" } }),
      prisma.service.count({ where: { technicianId: user.id, status: { in: ["done", "picked_up"] } } }),
      prisma.service.findMany({
        where: { technicianId: user.id, status: { in: ["received", "repairing"] } },
        orderBy: { checkinAt: "asc" },
        take: 5,
        select: serviceSelectBase,
      }),
    ]);

    return {
      success: true,
      data: {
        stats: { totalAssigned, inProgress, done },
        myActiveTasks: myActiveTasks.map(mapServiceToListItem),
      },
    };
  } catch (error) {
    console.error("Error fetching technician overview:", error);
    return { success: false, error: "Failed to fetch overview data" };
  }
}