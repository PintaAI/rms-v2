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

export interface AdminDeletionPreview {
  admin: {
    id: string;
    name: string;
    email: string;
  };
  counts: {
    tokos: number;
    services: number;
    spareparts: number;
    retailSales: number;
    warrantyClaims: number;
    supplierReturns: number;
    inventoryAuditSessions: number;
    stockMovements: number;
    orphanStaff: number;
    orphanTechnicians: number;
    referralAsCustomer: number;
    commissionAsCustomer: number;
    affiliatorProfiles: number;
  };
  affiliateCommissionAmount: {
    pending: number;
    approved: number;
    paid: number;
    rejected: number;
  };
  whatsappInstances: string[];
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

async function getAdminDeletionPreviewData(adminUserId: string): Promise<AdminDeletionPreview | null> {
  const targetUser = await prisma.user.findUnique({
    where: { id: adminUserId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      tokoAssignments: { select: { tokoId: true } },
      affiliatorProfile: { select: { id: true } },
    },
  });

  if (!targetUser || targetUser.role !== "admin") return null;

  const tokoIds = targetUser.tokoAssignments.map((assignment) => assignment.tokoId);
  const tokoWhere = { tokoId: { in: tokoIds } };
  const [
    services,
    spareparts,
    retailSales,
    warrantyClaims,
    supplierReturns,
    inventoryAuditSessions,
    stockMovements,
    assignedKaryawan,
    referralAsCustomer,
    commissionAsCustomer,
    commissions,
    whatsappSettings,
  ] = await Promise.all([
    prisma.service.count({ where: tokoWhere }),
    prisma.sparepart.count({ where: tokoWhere }),
    prisma.retailSale.count({ where: tokoWhere }),
    prisma.warrantyClaim.count({ where: tokoWhere }),
    prisma.supplierReturn.count({ where: tokoWhere }),
    prisma.inventoryAuditSession.count({ where: tokoWhere }),
    prisma.stockMovement.count({ where: tokoWhere }),
    prisma.user.findMany({
      where: {
        role: { in: ["staff", "technician"] },
        tokoAssignments: { some: { tokoId: { in: tokoIds } } },
      },
      select: {
        role: true,
        tokoAssignments: { select: { tokoId: true } },
      },
    }),
    prisma.referral.count({ where: { referredUserId: adminUserId } }),
    prisma.affiliateCommission.count({ where: { userId: adminUserId } }),
    prisma.affiliateCommission.findMany({
      where: { userId: adminUserId },
      select: { amount: true, status: true },
    }),
    prisma.tokoWhatsappSetting.findMany({
      where: { tokoId: { in: tokoIds } },
      select: { instanceName: true },
    }),
  ]);

  const targetTokoSet = new Set(tokoIds);
  let orphanStaff = 0;
  let orphanTechnicians = 0;
  for (const karyawan of assignedKaryawan) {
    const onlyInDeletedTokos = karyawan.tokoAssignments.every((assignment) => targetTokoSet.has(assignment.tokoId));
    if (!onlyInDeletedTokos) continue;
    if (karyawan.role === "staff") orphanStaff += 1;
    if (karyawan.role === "technician") orphanTechnicians += 1;
  }

  const affiliateCommissionAmount = {
    pending: 0,
    approved: 0,
    paid: 0,
    rejected: 0,
  };
  for (const commission of commissions) {
    affiliateCommissionAmount[commission.status as keyof typeof affiliateCommissionAmount] += commission.amount;
  }

  return {
    admin: {
      id: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
    },
    counts: {
      tokos: tokoIds.length,
      services,
      spareparts,
      retailSales,
      warrantyClaims,
      supplierReturns,
      inventoryAuditSessions,
      stockMovements,
      orphanStaff,
      orphanTechnicians,
      referralAsCustomer,
      commissionAsCustomer,
      affiliatorProfiles: targetUser.affiliatorProfile ? 1 : 0,
    },
    affiliateCommissionAmount,
    whatsappInstances: whatsappSettings.map((setting) => setting.instanceName),
  };
}

export async function getAdminDeletionPreview(adminUserId: string): Promise<ActionResultWithData<AdminDeletionPreview>> {
  const user = await requireRequestUser();
  if (user.role !== "superuser") {
    return { success: false, error: "Superuser access required" };
  }

  const preview = await getAdminDeletionPreviewData(adminUserId);
  if (!preview) return { success: false, error: "Admin user not found" };

  return { success: true, data: preview };
}

async function revokeWhatsappInstancesForAdminDeletion(instanceNames: string[]) {
  for (const instanceName of instanceNames) {
    try {
      await deleteWhatsappInstance(instanceName);
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      if (!message.includes("404") && !message.includes("not found")) throw error;
    }
  }
}

export async function deleteAdminAccountCascade(
  adminUserId: string,
  confirmationEmail: string
): Promise<ActionResultWithData<{ userId: string }>> {
  const user = await requireRequestUser();
  if (user.role !== "superuser") {
    return { success: false, error: "Superuser access required" };
  }
  if (user.id === adminUserId) {
    return { success: false, error: "Cannot delete yourself" };
  }

  const preview = await getAdminDeletionPreviewData(adminUserId);
  if (!preview) return { success: false, error: "Admin user not found" };
  if (confirmationEmail.trim().toLowerCase() !== preview.admin.email.toLowerCase()) {
    return { success: false, error: "Confirmation email does not match" };
  }

  const tokoIds = await prisma.userToko.findMany({
    where: { userId: adminUserId },
    select: { tokoId: true },
  });
  const tokoIdValues = tokoIds.map((assignment) => assignment.tokoId);
  const tokoWhere = { tokoId: { in: tokoIdValues } };

  try {
    await revokeWhatsappInstancesForAdminDeletion(preview.whatsappInstances);

    await prisma.$transaction(async (tx) => {
      const orphanKaryawan = await tx.user.findMany({
        where: {
          role: { in: ["staff", "technician"] },
          tokoAssignments: { some: { tokoId: { in: tokoIdValues } } },
        },
        select: {
          id: true,
          tokoAssignments: { select: { tokoId: true } },
        },
      });
      const targetTokoSet = new Set(tokoIdValues);
      const orphanKaryawanIds = orphanKaryawan
        .filter((karyawan) => karyawan.tokoAssignments.every((assignment) => targetTokoSet.has(assignment.tokoId)))
        .map((karyawan) => karyawan.id);

      await tx.affiliateCommission.deleteMany({ where: { userId: adminUserId } });
      await tx.referral.deleteMany({ where: { referredUserId: adminUserId } });
      await tx.affiliator.updateMany({ where: { userId: adminUserId }, data: { userId: null, status: "inactive" } });

      if (tokoIdValues.length > 0) {
        await tx.activityLog.deleteMany({ where: tokoWhere });
        await tx.invoiceItem.deleteMany({ where: { invoice: { service: tokoWhere } } });
        await tx.invoice.deleteMany({ where: { service: tokoWhere } });
        await tx.serviceItem.deleteMany({ where: { service: tokoWhere } });
        await tx.warrantyClaimItem.deleteMany({ where: { warrantyClaim: tokoWhere } });
        await tx.supplierReturn.deleteMany({ where: tokoWhere });
        await tx.warrantyClaim.deleteMany({ where: tokoWhere });
        await tx.retailSaleItem.deleteMany({ where: { sale: tokoWhere } });
        await tx.retailSale.deleteMany({ where: tokoWhere });
        await tx.supplierDebtPayment.deleteMany({ where: { debt: tokoWhere } });
        await tx.supplierDebt.deleteMany({ where: tokoWhere });
        await tx.supplier.deleteMany({ where: tokoWhere });
        await tx.inventoryAuditItem.deleteMany({ where: { session: tokoWhere } });
        await tx.inventoryAuditSession.deleteMany({ where: tokoWhere });
        await tx.stockMovement.deleteMany({ where: tokoWhere });
        await tx.sparepartCompatibility.deleteMany({ where: { sparepart: tokoWhere } });
        await tx.service.deleteMany({ where: tokoWhere });
        await tx.servicePricelist.deleteMany({ where: tokoWhere });
        await tx.sparepart.deleteMany({ where: tokoWhere });
        await tx.sparepartCategory.deleteMany({ where: tokoWhere });
        await tx.tokoWhatsappIdentity.deleteMany({ where: tokoWhere });
        await tx.tokoWhatsappSetting.deleteMany({ where: tokoWhere });
        await tx.tokoFeatureSetting.deleteMany({ where: { tokoId: { in: tokoIdValues } } });
        await tx.tokoUserPermission.deleteMany({ where: tokoWhere });
        await tx.userToko.deleteMany({ where: { tokoId: { in: tokoIdValues } } });
        await tx.toko.deleteMany({ where: { id: { in: tokoIdValues } } });
      }

      if (orphanKaryawanIds.length > 0) {
        await tx.affiliateCommission.deleteMany({ where: { userId: { in: orphanKaryawanIds } } });
        await tx.referral.deleteMany({ where: { referredUserId: { in: orphanKaryawanIds } } });
        await tx.affiliator.updateMany({ where: { userId: { in: orphanKaryawanIds } }, data: { userId: null, status: "inactive" } });
        await tx.user.deleteMany({ where: { id: { in: orphanKaryawanIds } } });
      }

      await tx.user.delete({ where: { id: adminUserId } });
    });
  } catch (error) {
    console.error("Failed to delete admin account:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete admin account" };
  }

  revalidatePath("/superuser");
  revalidatePath("/dashboard");
  return { success: true, data: { userId: adminUserId } };
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
