"use server";

import prisma from "@/lib/prisma";
import { requireRequestUser } from "@/lib/auth/request-user";
import type { ActionResultWithData } from "@/lib/auth/authorization";
import { revalidatePath } from "next/cache";
import type { SubscriptionPlan } from "@/lib/features";

const SUBSCRIPTION_PRICES: Record<Exclude<SubscriptionPlan, "free">, number> = {
  premium: 500_000,
  enterprise: 1_000_000,
};

export interface SuperuserDashboardStats {
  users: {
    total: number;
    admins: number;
    staff: number;
    technicians: number;
    superusers: number;
  };
  subscriptions: {
    free: number;
    premium: number;
    enterprise: number;
  };
  tokos: {
    total: number;
    active: number;
    inactive: number;
  };
  services: {
    total: number;
    monthly: number;
    byStatus: {
      received: number;
      repairing: number;
      done: number;
      failed: number;
    };
  };
  revenue: {
    totalSubscriptionRevenue: number;
    monthlyNewSubscriptionRevenue: number;
    paidSubscribers: number;
  };
}

export interface SuperuserUserRow {
  id: string;
  name: string;
  email: string;
  plan: SubscriptionPlan;
  tokoCount: number;
  staffCount: number;
  technicianCount: number;
  createdAt: Date;
  lastActivity?: Date | null;
}

export interface SuperuserDashboardData {
  stats: SuperuserDashboardStats;
  users: SuperuserUserRow[];
}

export async function getSuperuserDashboard(): Promise<ActionResultWithData<SuperuserDashboardData>> {
  const user = await requireRequestUser();
  if (user.role !== "superuser") {
    return { success: false, error: "Superuser access required" };
  }

  const now = new Date();
  const monthlyStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    userCounts,
    subscriptionCounts,
    tokoCounts,
    serviceCounts,
    serviceStatusCounts,
    monthlyServiceCount,
    monthlySubscriptionCounts,
    users,
  ] = await Promise.all([
    prisma.user.groupBy({
      by: ["role"],
      _count: { role: true },
    }),
    prisma.subscription.groupBy({
      by: ["plan"],
      _count: { plan: true },
    }),
    prisma.toko.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.service.count(),
    prisma.service.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.service.count({
      where: { checkinAt: { gte: monthlyStart } },
    }),
    prisma.subscription.groupBy({
      by: ["plan"],
      where: { createdAt: { gte: monthlyStart } },
      _count: { plan: true },
    }),
    prisma.user.findMany({
      where: { role: "admin" },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        subscription: {
          select: { plan: true },
        },
        tokoAssignments: {
          select: {
            tokoId: true,
            toko: {
              select: {
                userAssignments: {
                  where: { user: { role: { in: ["staff", "technician"] } } },
                  select: {
                    userId: true,
                    user: { select: { role: true } },
                  },
                },
              },
            },
          },
        },
        activities: {
          select: { createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const usersByRole: Record<string, number> = {};
  for (const row of userCounts) {
    usersByRole[row.role] = row._count.role;
  }

  const subscriptionsByPlan: Record<string, number> = {};
  for (const row of subscriptionCounts) {
    subscriptionsByPlan[row.plan] = row._count.plan;
  }

  const monthlySubscriptionsByPlan: Record<string, number> = {};
  for (const row of monthlySubscriptionCounts) {
    monthlySubscriptionsByPlan[row.plan] = row._count.plan;
  }

  const totalSubscriptionRevenue =
    (subscriptionsByPlan["premium"] || 0) * SUBSCRIPTION_PRICES.premium +
    (subscriptionsByPlan["enterprise"] || 0) * SUBSCRIPTION_PRICES.enterprise;
  const monthlyNewSubscriptionRevenue =
    (monthlySubscriptionsByPlan["premium"] || 0) * SUBSCRIPTION_PRICES.premium +
    (monthlySubscriptionsByPlan["enterprise"] || 0) * SUBSCRIPTION_PRICES.enterprise;
  const paidSubscribers = (subscriptionsByPlan["premium"] || 0) + (subscriptionsByPlan["enterprise"] || 0);

  const tokosByStatus: Record<string, number> = {};
  for (const row of tokoCounts) {
    tokosByStatus[row.status] = row._count.status;
  }

  const servicesByStatus: Record<string, number> = {};
  for (const row of serviceStatusCounts) {
    servicesByStatus[row.status] = row._count.status;
  }

  const userRows: SuperuserUserRow[] = users.map((user) => {
    const staffIds = new Set<string>();
    const technicianIds = new Set<string>();

    for (const assignment of user.tokoAssignments) {
      for (const relatedAssignment of assignment.toko.userAssignments) {
        if (relatedAssignment.user.role === "staff") {
          staffIds.add(relatedAssignment.userId);
        }

        if (relatedAssignment.user.role === "technician") {
          technicianIds.add(relatedAssignment.userId);
        }
      }
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      plan: (user.subscription?.plan as SubscriptionPlan) || "free",
      tokoCount: user.tokoAssignments.length,
      staffCount: staffIds.size,
      technicianCount: technicianIds.size,
      createdAt: user.createdAt,
      lastActivity: user.activities[0]?.createdAt ?? null,
    };
  });

  const stats: SuperuserDashboardStats = {
    users: {
      total: (usersByRole["admin"] || 0) +
             (usersByRole["staff"] || 0) +
             (usersByRole["technician"] || 0) +
             (usersByRole["superuser"] || 0),
      admins: usersByRole["admin"] || 0,
      staff: usersByRole["staff"] || 0,
      technicians: usersByRole["technician"] || 0,
      superusers: usersByRole["superuser"] || 0,
    },
    subscriptions: {
      free: subscriptionsByPlan["free"] || 0,
      premium: subscriptionsByPlan["premium"] || 0,
      enterprise: subscriptionsByPlan["enterprise"] || 0,
    },
    tokos: {
      total: (tokosByStatus["active"] || 0) + (tokosByStatus["inactive"] || 0),
      active: tokosByStatus["active"] || 0,
      inactive: tokosByStatus["inactive"] || 0,
    },
    services: {
      total: serviceCounts,
      monthly: monthlyServiceCount,
      byStatus: {
        received: servicesByStatus["received"] || 0,
        repairing: servicesByStatus["repairing"] || 0,
        done: servicesByStatus["done"] || 0,
        failed: servicesByStatus["failed"] || 0,
      },
    },
    revenue: {
      totalSubscriptionRevenue,
      monthlyNewSubscriptionRevenue,
      paidSubscribers,
    },
  };

  return {
    success: true,
    data: { stats, users: userRows },
  };
}

export async function updateUserSubscription(
  userId: string,
  plan: SubscriptionPlan
): Promise<ActionResultWithData<{ userId: string; plan: SubscriptionPlan }>> {
  const user = await requireRequestUser();
  if (user.role !== "superuser") {
    return { success: false, error: "Superuser access required" };
  }

  if (!["free", "premium", "enterprise"].includes(plan)) {
    return { success: false, error: "Invalid plan" };
  }

  try {
    const subscription = await prisma.subscription.upsert({
      where: { userId },
      create: { userId, plan },
      update: { plan },
      select: { userId: true, plan: true },
    });

    revalidatePath("/superuser");
    return { success: true, data: { userId: subscription.userId, plan: subscription.plan as SubscriptionPlan } };
  } catch (error) {
    console.error("Failed to update subscription:", error);
    return { success: false, error: "Failed to update subscription" };
  }
}

export async function updateUserRole(
  userId: string,
  role: "admin" | "staff" | "technician" | "superuser"
): Promise<ActionResultWithData<{ userId: string; role: string }>> {
  const user = await requireRequestUser();
  if (user.role !== "superuser") {
    return { success: false, error: "Superuser access required" };
  }

  if (!["admin", "staff", "technician", "superuser"].includes(role)) {
    return { success: false, error: "Invalid role" };
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, role: true },
    });

    revalidatePath("/superuser");
    return { success: true, data: { userId: user.id, role: user.role } };
  } catch (error) {
    console.error("Failed to update role:", error);
    return { success: false, error: "Failed to update role" };
  }
}
