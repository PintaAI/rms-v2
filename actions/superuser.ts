"use server";

import prisma from "@/lib/prisma";
import { requireRequestUser } from "@/lib/auth/request-user";
import type { ActionResultWithData } from "@/lib/auth/authorization";
import { revalidatePath } from "next/cache";
import type { SubscriptionPlan } from "@/lib/features";
import { fetchWhatsappInstances, deleteWhatsappInstance } from "@/lib/evolution";
import { createCommissionForPaidPlanActivation } from "@/actions/affiliate";
import { activatePaidSubscription } from "@/lib/subscription-billing";
import { addDays, PRO_PERIOD_DAYS, startProTrial } from "@/lib/subscription-billing";
import type { SubscriptionInvoiceStatus, SubscriptionPaymentMethod } from "@/prisma/generated/prisma/enums";

const SUBSCRIPTION_PRICES: Record<Exclude<SubscriptionPlan, "free">, number> = {
  premium: 990_000,
  enterprise: 0,
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
  subscriptionStatus: string | null;
  trialEndsAt: Date | null;
  proTrialStartedAt: Date | null;
  currentPeriodEnd: Date | null;
  tokoCount: number;
  staffCount: number;
  technicianCount: number;
  createdAt: Date;
  lastActivity?: Date | null;
}

export interface PendingSubscriptionPaymentRow {
  paymentId: string;
  invoiceId: string;
  invoiceNumber: string;
  invoiceStatus: SubscriptionInvoiceStatus;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  amount: number;
  invoiceAmount: number;
  method: SubscriptionPaymentMethod;
  referenceNumber: string | null;
  proofUrl: string | null;
  note: string | null;
  submittedAt: Date;
}

export interface SuperuserDashboardData {
  stats: SuperuserDashboardStats;
  users: SuperuserUserRow[];
  pendingPayments: PendingSubscriptionPaymentRow[];
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
    pendingPayments,
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
          select: { plan: true, status: true, trialEndsAt: true, proTrialStartedAt: true, currentPeriodEnd: true },
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
    prisma.subscriptionPayment.findMany({
      where: { status: "pending_review" },
      orderBy: { submittedAt: "asc" },
      include: {
        invoice: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
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
      subscriptionStatus: user.subscription?.status ?? null,
      trialEndsAt: user.subscription?.trialEndsAt ?? null,
      proTrialStartedAt: user.subscription?.proTrialStartedAt ?? null,
      currentPeriodEnd: user.subscription?.currentPeriodEnd ?? null,
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
    data: {
      stats,
      users: userRows,
      pendingPayments: pendingPayments.map((payment) => ({
        paymentId: payment.id,
        invoiceId: payment.invoiceId,
        invoiceNumber: payment.invoice.invoiceNumber,
        invoiceStatus: payment.invoice.status,
        ownerId: payment.invoice.user.id,
        ownerName: payment.invoice.user.name,
        ownerEmail: payment.invoice.user.email,
        amount: payment.amount,
        invoiceAmount: payment.invoice.amount,
        method: payment.method,
        referenceNumber: payment.referenceNumber,
        proofUrl: payment.proofUrl,
        note: payment.note,
        submittedAt: payment.submittedAt,
      })),
    },
  };
}

export async function approveSubscriptionPayment(paymentId: string): Promise<ActionResultWithData<{ paymentId: string }>> {
  const user = await requireRequestUser();
  if (user.role !== "superuser") return { success: false, error: "Superuser access required" };

  const payment = await prisma.subscriptionPayment.findUnique({
    where: { id: paymentId },
    include: { invoice: { include: { subscription: true } } },
  });

  if (!payment || payment.status !== "pending_review") {
    return { success: false, error: "Pending payment not found" };
  }

  await prisma.subscriptionPayment.update({
    where: { id: paymentId },
    data: { status: "approved", reviewedById: user.id, reviewedAt: new Date() },
  });

  await activatePaidSubscription(payment.invoice.userId, payment.invoice.subscriptionId, payment.invoiceId);

  await createCommissionForPaidPlanActivation({
    userId: payment.invoice.userId,
    previousPlan: payment.invoice.subscription.status === "trialing" ? "free" : payment.invoice.subscription.plan as SubscriptionPlan,
    nextPlan: "premium",
    subscriptionAmount: payment.invoice.amount,
  });

  revalidatePath("/superuser");
  revalidatePath("/dashboard");
  return { success: true, data: { paymentId } };
}

export async function rejectSubscriptionPayment(paymentId: string, rejectionReason: string): Promise<ActionResultWithData<{ paymentId: string }>> {
  const user = await requireRequestUser();
  if (user.role !== "superuser") return { success: false, error: "Superuser access required" };

  const payment = await prisma.subscriptionPayment.findUnique({
    where: { id: paymentId },
    include: { invoice: true },
  });

  if (!payment || payment.status !== "pending_review") {
    return { success: false, error: "Pending payment not found" };
  }

  await prisma.$transaction([
    prisma.subscriptionPayment.update({
      where: { id: paymentId },
      data: {
        status: "rejected",
        reviewedById: user.id,
        reviewedAt: new Date(),
        rejectionReason: rejectionReason.trim() || "Bukti pembayaran belum valid",
      },
    }),
    prisma.subscriptionInvoice.update({
      where: { id: payment.invoiceId },
      data: { status: "rejected" },
    }),
  ]);

  revalidatePath("/superuser");
  revalidatePath("/dashboard");
  return { success: true, data: { paymentId } };
}

export async function updateUserSubscription(
  userId: string,
  plan: SubscriptionPlan,
  enterpriseAmount?: number
): Promise<ActionResultWithData<{ userId: string; plan: SubscriptionPlan }>> {
  const user = await requireRequestUser();
  if (user.role !== "superuser") {
    return { success: false, error: "Superuser access required" };
  }

  if (!["free", "premium", "enterprise"].includes(plan)) {
    return { success: false, error: "Invalid plan" };
  }

  try {
    const existingSubscription = await prisma.subscription.findUnique({
      where: { userId },
      select: { plan: true, status: true },
    });

    const now = new Date();
    const subscriptionData = plan === "free"
      ? { plan, status: "active" as const, trialEndsAt: null, currentPeriodStart: null, currentPeriodEnd: null, graceEndsAt: null, cancelledAt: null }
      : { plan, status: "active" as const, trialEndsAt: null, currentPeriodStart: now, currentPeriodEnd: plan === "premium" ? addDays(now, PRO_PERIOD_DAYS) : null, graceEndsAt: null, cancelledAt: null };

    const subscription = await prisma.subscription.upsert({
      where: { userId },
      create: { userId, ...subscriptionData },
      update: subscriptionData,
      select: { userId: true, plan: true },
    });

    await createCommissionForPaidPlanActivation({
      userId,
      previousPlan: existingSubscription?.status === "trialing" ? "free" : (existingSubscription?.plan as SubscriptionPlan | undefined) ?? null,
      nextPlan: plan,
      subscriptionAmount: plan === "enterprise" ? enterpriseAmount : undefined,
    });

    revalidatePath("/superuser");
    return { success: true, data: { userId: subscription.userId, plan: subscription.plan as SubscriptionPlan } };
  } catch (error) {
    console.error("Failed to update subscription:", error);
    return { success: false, error: "Failed to update subscription" };
  }
}

export async function grantUserProTrial(userId: string): Promise<ActionResultWithData<{ userId: string; trialEndsAt: Date | null }>> {
  const user = await requireRequestUser();
  if (user.role !== "superuser") {
    return { success: false, error: "Superuser access required" };
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!targetUser || targetUser.role !== "admin") {
    return { success: false, error: "Only admin owners can receive Pro trial" };
  }

  try {
    const subscription = await startProTrial(userId);
    revalidatePath("/superuser");
    revalidatePath("/dashboard");
    return { success: true, data: { userId, trialEndsAt: subscription?.trialEndsAt ?? null } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to grant Pro trial" };
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

// WhatsApp Instance Management

export interface SuperuserWhatsappInstanceRow {
  instanceName: string;
  instanceId: string | null;
  status: string | null;
  ownerJid: string | null;
  connectedNumber: string | null;
  profileName: string | null;
  tokoId: string | null;
  tokoName: string | null;
  dbEnabled: boolean;
  dbConnectedNumber: string | null;
}

function parseInstanceStatus(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  if (typeof rec.state === "string") return rec.state;
  if (typeof rec.connectionState === "string") return rec.connectionState;
  if (typeof rec.status === "string") return rec.status;
  const inst = rec.instance;
  if (inst && typeof inst === "object") {
    const irec = inst as Record<string, unknown>;
    if (typeof irec.state === "string") return irec.state;
    if (typeof irec.connectionStatus === "string") return irec.connectionStatus;
    if (typeof irec.status === "string") return irec.status;
  }
  return null;
}

function parseInstanceOwner(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  if (typeof rec.owner === "string") return rec.owner;
  if (typeof rec.ownerJid === "string") return rec.ownerJid;
  if (typeof rec.connectedNumber === "string") return rec.connectedNumber;
  const inst = rec.instance;
  if (inst && typeof inst === "object") {
    const irec = inst as Record<string, unknown>;
    if (typeof irec.owner === "string") return irec.owner;
    if (typeof irec.ownerJid === "string") return irec.ownerJid;
  }
  return null;
}

function parseInstanceProfileName(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  if (typeof rec.profileName === "string") return rec.profileName;
  if (typeof rec.name === "string") return rec.name;
  const inst = rec.instance;
  if (inst && typeof inst === "object") {
    const irec = inst as Record<string, unknown>;
    if (typeof irec.profileName === "string") return irec.profileName;
    if (typeof irec.name === "string") return irec.name;
  }
  return null;
}

function parseInstanceName(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  if (typeof rec.instanceName === "string") return rec.instanceName;
  if (typeof rec.name === "string") return rec.name;
  const inst = rec.instance;
  if (inst && typeof inst === "object") {
    const irec = inst as Record<string, unknown>;
    if (typeof irec.instanceName === "string") return irec.instanceName;
    if (typeof irec.name === "string") return irec.name;
  }
  return null;
}

function parseInstanceId(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  if (typeof rec.instanceId === "string") return rec.instanceId;
  if (typeof rec.id === "string") return rec.id;
  const inst = rec.instance;
  if (inst && typeof inst === "object") {
    const irec = inst as Record<string, unknown>;
    if (typeof irec.instanceId === "string") return irec.instanceId;
    if (typeof irec.id === "string") return irec.id;
  }
  return null;
}

function extractNumberFromJid(jid: string): string {
  return jid.split("@")[0] ?? jid;
}

export async function getSuperuserWhatsappInstances(): Promise<ActionResultWithData<SuperuserWhatsappInstanceRow[]>> {
  const user = await requireRequestUser();
  if (user.role !== "superuser") {
    return { success: false, error: "Superuser access required" };
  }

  try {
    const [rawInstances, dbSettings] = await Promise.all([
      fetchWhatsappInstances().catch((error) => {
        console.error("Failed to fetch Evolution instances:", error);
        return [] as unknown[];
      }),
      prisma.tokoWhatsappSetting.findMany({
        select: {
          tokoId: true,
          instanceName: true,
          enabled: true,
          connectedNumber: true,
          toko: { select: { name: true } },
        },
      }),
    ]);

    const dbMap = new Map(dbSettings.map((s) => [s.instanceName, s]));

    const rows: SuperuserWhatsappInstanceRow[] = rawInstances.flatMap((raw) => {
      const instanceName = parseInstanceName(raw);
      if (!instanceName) return [];
      const instanceId = parseInstanceId(raw);
      const ownerJid = parseInstanceOwner(raw);
      const db = dbMap.get(instanceName);

      return {
        instanceName,
        instanceId,
        status: parseInstanceStatus(raw),
        ownerJid,
        connectedNumber: ownerJid ? extractNumberFromJid(ownerJid) : db?.connectedNumber ?? null,
        profileName: parseInstanceProfileName(raw),
        tokoId: db?.tokoId ?? null,
        tokoName: db?.toko.name ?? null,
        dbEnabled: db?.enabled ?? false,
        dbConnectedNumber: db?.connectedNumber ?? null,
      };
    });

    return { success: true, data: rows };
  } catch (error) {
    console.error("Failed to get WhatsApp instances:", error);
    return { success: false, error: "Failed to get WhatsApp instances" };
  }
}

export async function revokeSuperuserWhatsappInstance(
  instanceName: string
): Promise<ActionResultWithData<{ instanceName: string }>> {
  const user = await requireRequestUser();
  if (user.role !== "superuser") {
    return { success: false, error: "Superuser access required" };
  }

  const normalizedInstanceName = instanceName.trim();
  if (!normalizedInstanceName) {
    return { success: false, error: "Instance name is required" };
  }

  const linkedSettings = await prisma.tokoWhatsappSetting.findMany({
    where: { instanceName: normalizedInstanceName },
    select: { tokoId: true },
  });

  try {
    await deleteWhatsappInstance(normalizedInstanceName);
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    if (!message.includes("404") && !message.includes("not found")) throw error;
  }

  await prisma.tokoWhatsappSetting.updateMany({
    where: { instanceName: normalizedInstanceName },
    data: { instanceToken: null, connectedNumber: null, connectedProfileName: null },
  });

  revalidatePath("/superuser");
  for (const setting of linkedSettings) {
    revalidatePath(`/${setting.tokoId}/admin`);
  }
  return { success: true, data: { instanceName: normalizedInstanceName } };
}
