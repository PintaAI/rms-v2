"use server";

import prisma from "@/lib/prisma";
import { requireRequestUser } from "@/lib/auth/request-user";
import type { ActionResultWithData } from "@/lib/auth/authorization";
import { revalidatePath, updateTag } from "next/cache";
import type { SubscriptionPlan } from "@/lib/features";
import { fetchWhatsappInstances, deleteWhatsappInstance } from "@/lib/evolution";
import { createCommissionForPaidPlanActivation } from "@/actions/affiliate";
import { activatePaidSubscription } from "@/lib/subscription-billing";
import { addDays, PRO_PERIOD_DAYS, startProTrial } from "@/lib/subscription-billing";
import type { SubscriptionInvoiceStatus, SubscriptionPaymentMethod } from "@/prisma/generated/prisma/enums";
import { z } from "zod";
import { calculateMonthlyPlanAmount } from "@/lib/plans";

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
  monthlyPriceOverride: number | null;
  estimatedMonthlyPrice: number | null;
  storeCount: number;
  staffCount: number;
  technicianCount: number;
  serviceCount: number;
  monthlyServiceCount: number;
  monthlyRevenue: number;
  totalRevenue: number;
  tokoSummaries: Array<{
    id: string;
    name: string;
    status: string;
  }>;
  createdAt: Date;
  lastActivity?: Date | null;
}

export interface PendingSubscriptionPaymentRow {
  paymentId: string;
  repairInvoiceId: string;
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
    inventoryItems: number;
    salesOrders: number;
    warrantyClaims: number;
    supplierReturns: number;
    inventoryAuditSessions: number;
    inventoryMovements: number;
    sessions: number;
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

export interface SuperuserBrandRow {
  id: string;
  name: string;
  deviceCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SuperuserHpCatalogRow {
  id: string;
  brandId: string;
  brandName: string;
  modelName: string;
  modelNumber: string | null;
  mobileApiId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SuperuserDeviceCatalogData {
  brands: SuperuserBrandRow[];
  devices: SuperuserHpCatalogRow[];
  stats: {
    brandCount: number;
    deviceCount: number;
  };
}

const brandMutationSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1, "Brand name is required"),
});

const deviceModelMutationSchema = z.object({
  id: z.string().min(1).optional(),
  brandId: z.string().min(1, "Brand is required"),
  modelName: z.string().trim().min(1, "Model name is required"),
  modelNumber: z.string().trim().optional(),
});

function mapBrandRow(brand: {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  _count: { deviceModels: number };
}): SuperuserBrandRow {
  return {
    id: brand.id,
    name: brand.name,
    deviceCount: brand._count.deviceModels,
    createdAt: brand.createdAt,
    updatedAt: brand.updatedAt,
  };
}

function mapHpCatalogRow(device: {
  id: string;
  brandId: string;
  modelName: string;
  modelNumber: string | null;
  mobileApiId: string | null;
  createdAt: Date;
  updatedAt: Date;
  brand: { name: string };
}): SuperuserHpCatalogRow {
  return {
    id: device.id,
    brandId: device.brandId,
    brandName: device.brand.name,
    modelName: device.modelName,
    modelNumber: device.modelNumber,
    mobileApiId: device.mobileApiId,
    createdAt: device.createdAt,
    updatedAt: device.updatedAt,
  };
}

function revalidateDeviceCatalogManagement() {
  revalidatePath("/superuser");
  revalidatePath("/dashboard/admin/devices");
  revalidatePath("/dashboard/staff/services");
  updateTag("brands");
  updateTag("devices");
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
    storeCounts,
    serviceCounts,
    serviceStatusCounts,
    monthlyServiceCount,
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
    prisma.store.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.repairOrder.count(),
    prisma.repairOrder.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.repairOrder.count({
      where: { checkinAt: { gte: monthlyStart } },
    }),
    prisma.user.findMany({
      where: { role: "admin" },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        subscription: {
          select: {
            plan: true,
            status: true,
            trialEndsAt: true,
            proTrialStartedAt: true,
            currentPeriodEnd: true,
            monthlyPriceOverride: true,
            createdAt: true,
          },
        },
        storeAssignments: {
          select: {
            storeId: true,
            store: {
              select: {
                id: true,
                name: true,
                status: true,
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

  const adminDetailStats = new Map(
    await Promise.all(
      users.map(async (user) => {
        const storeIds = user.storeAssignments.map((assignment) => assignment.storeId);
        if (storeIds.length === 0) {
          return [
            user.id,
            { serviceCount: 0, monthlyServiceCount: 0, monthlyRevenue: 0, totalRevenue: 0 },
          ] as const;
        }

        const [serviceCount, monthlyServiceCount, totalRevenue, monthlyRevenue] = await Promise.all([
          prisma.repairOrder.count({ where: { storeId: { in: storeIds } } }),
          prisma.repairOrder.count({ where: { storeId: { in: storeIds }, checkinAt: { gte: monthlyStart } } }),
          prisma.repairInvoice.aggregate({
            where: { paymentStatus: "paid", repairOrder: { storeId: { in: storeIds } } },
            _sum: { grandTotal: true },
          }),
          prisma.repairInvoice.aggregate({
            where: {
              paymentStatus: "paid",
              paidAt: { gte: monthlyStart },
              repairOrder: { storeId: { in: storeIds } },
            },
            _sum: { grandTotal: true },
          }),
        ]);

        return [
          user.id,
          {
            serviceCount,
            monthlyServiceCount,
            monthlyRevenue: monthlyRevenue._sum.grandTotal ?? 0,
            totalRevenue: totalRevenue._sum.grandTotal ?? 0,
          },
        ] as const;
      })
    )
  );

  const usersByRole: Record<string, number> = {};
  for (const row of userCounts) {
    usersByRole[row.role] = row._count.role;
  }

  const subscriptionsByPlan: Record<string, number> = {};
  for (const row of subscriptionCounts) {
    subscriptionsByPlan[row.plan] = row._count.plan;
  }

  const paidSubscribers = (subscriptionsByPlan["premium"] || 0) + (subscriptionsByPlan["enterprise"] || 0);

  const tokosByStatus: Record<string, number> = {};
  for (const row of storeCounts) {
    tokosByStatus[row.status] = row._count.status;
  }

  const servicesByStatus: Record<string, number> = {};
  for (const row of serviceStatusCounts) {
    servicesByStatus[row.status] = row._count.status;
  }

  const userRows: SuperuserUserRow[] = users.map((user) => {
    const staffIds = new Set<string>();
    const technicianIds = new Set<string>();
    const detailStats = adminDetailStats.get(user.id) ?? {
      serviceCount: 0,
      monthlyServiceCount: 0,
      monthlyRevenue: 0,
      totalRevenue: 0,
    };

    for (const assignment of user.storeAssignments) {
      for (const relatedAssignment of assignment.store.userAssignments) {
        if (relatedAssignment.user.role === "staff") {
          staffIds.add(relatedAssignment.userId);
        }

        if (relatedAssignment.user.role === "technician") {
          technicianIds.add(relatedAssignment.userId);
        }
      }
    }

    const plan = (user.subscription?.plan as SubscriptionPlan) || "free";
    const estimatedMonthlyPrice = user.subscription?.monthlyPriceOverride ?? calculateMonthlyPlanAmount(plan, user.storeAssignments.length);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      plan,
      subscriptionStatus: user.subscription?.status ?? null,
      trialEndsAt: user.subscription?.trialEndsAt ?? null,
      proTrialStartedAt: user.subscription?.proTrialStartedAt ?? null,
      currentPeriodEnd: user.subscription?.currentPeriodEnd ?? null,
      monthlyPriceOverride: user.subscription?.monthlyPriceOverride ?? null,
      estimatedMonthlyPrice,
      storeCount: user.storeAssignments.length,
      staffCount: staffIds.size,
      technicianCount: technicianIds.size,
      serviceCount: detailStats.serviceCount,
      monthlyServiceCount: detailStats.monthlyServiceCount,
      monthlyRevenue: detailStats.monthlyRevenue,
      totalRevenue: detailStats.totalRevenue,
      tokoSummaries: user.storeAssignments.map((assignment) => ({
        id: assignment.store.id,
        name: assignment.store.name,
        status: assignment.store.status,
      })),
      createdAt: user.createdAt,
      lastActivity: user.activities[0]?.createdAt ?? null,
    };
  });

  const totalSubscriptionRevenue = userRows.reduce((sum, row) => {
    if (row.plan !== "premium" && row.plan !== "enterprise") return sum;
    return sum + (row.estimatedMonthlyPrice ?? 0);
  }, 0);
  const monthlyNewSubscriptionRevenue = userRows.reduce((sum, row) => {
    if (row.plan !== "premium" && row.plan !== "enterprise") return sum;
    const user = users.find((candidate) => candidate.id === row.id);
    if (!user?.subscription?.createdAt || user.subscription.createdAt < monthlyStart) return sum;
    return sum + (row.estimatedMonthlyPrice ?? 0);
  }, 0);

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
        repairInvoiceId: payment.invoiceId,
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

export async function getSuperuserDeviceCatalog(): Promise<ActionResultWithData<SuperuserDeviceCatalogData>> {
  const user = await requireRequestUser();
  if (user.role !== "superuser") {
    return { success: false, error: "Superuser access required" };
  }

  const [brands, devices] = await Promise.all([
    prisma.deviceBrand.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { deviceModels: true } } },
    }),
    prisma.deviceModel.findMany({
      orderBy: [{ brand: { name: "asc" } }, { modelName: "asc" }],
      include: { brand: { select: { name: true } } },
    }),
  ]);

  return {
    success: true,
    data: {
      brands: brands.map(mapBrandRow),
      devices: devices.map(mapHpCatalogRow),
      stats: {
        brandCount: brands.length,
        deviceCount: devices.length,
      },
    },
  };
}

export async function createSuperuserBrand(input: z.infer<typeof brandMutationSchema>): Promise<ActionResultWithData<SuperuserBrandRow>> {
  const user = await requireRequestUser();
  if (user.role !== "superuser") return { success: false, error: "Superuser access required" };

  const parsed = brandMutationSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid brand data" };

  try {
    const brand = await prisma.deviceBrand.create({
      data: { name: parsed.data.name },
      include: { _count: { select: { deviceModels: true } } },
    });

    revalidateDeviceCatalogManagement();
    return { success: true, data: mapBrandRow(brand) };
  } catch (error) {
    console.error("Failed to create brand:", error);
    return { success: false, error: "Brand name already exists or could not be created" };
  }
}

export async function updateSuperuserBrand(input: z.infer<typeof brandMutationSchema>): Promise<ActionResultWithData<SuperuserBrandRow>> {
  const user = await requireRequestUser();
  if (user.role !== "superuser") return { success: false, error: "Superuser access required" };

  const parsed = brandMutationSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid brand data" };
  if (!parsed.data.id) return { success: false, error: "Brand ID is required" };

  try {
    const brand = await prisma.deviceBrand.update({
      where: { id: parsed.data.id },
      data: { name: parsed.data.name },
      include: { _count: { select: { deviceModels: true } } },
    });

    revalidateDeviceCatalogManagement();
    return { success: true, data: mapBrandRow(brand) };
  } catch (error) {
    console.error("Failed to update brand:", error);
    return { success: false, error: "Brand name already exists or could not be updated" };
  }
}

export async function deleteSuperuserBrand(id: string): Promise<ActionResultWithData<{ id: string }>> {
  const user = await requireRequestUser();
  if (user.role !== "superuser") return { success: false, error: "Superuser access required" };

  const deviceCount = await prisma.deviceModel.count({ where: { brandId: id } });
  if (deviceCount > 0) {
    return { success: false, error: "Cannot delete a brand that still has HP catalog entries" };
  }

  try {
    await prisma.deviceBrand.delete({ where: { id } });
    revalidateDeviceCatalogManagement();
    return { success: true, data: { id } };
  } catch (error) {
    console.error("Failed to delete brand:", error);
    return { success: false, error: "Brand could not be deleted" };
  }
}

export async function createSuperuserHpCatalog(input: z.infer<typeof deviceModelMutationSchema>): Promise<ActionResultWithData<SuperuserHpCatalogRow>> {
  const user = await requireRequestUser();
  if (user.role !== "superuser") return { success: false, error: "Superuser access required" };

  const parsed = deviceModelMutationSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid HP catalog data" };

  try {
    const device = await prisma.deviceModel.create({
      data: {
        brandId: parsed.data.brandId,
        modelName: parsed.data.modelName,
        modelNumber: parsed.data.modelNumber || null,
      },
      include: { brand: { select: { name: true } } },
    });

    revalidateDeviceCatalogManagement();
    return { success: true, data: mapHpCatalogRow(device) };
  } catch (error) {
    console.error("Failed to create HP catalog:", error);
    return { success: false, error: "HP model already exists for this brand or could not be created" };
  }
}

export async function updateSuperuserHpCatalog(input: z.infer<typeof deviceModelMutationSchema>): Promise<ActionResultWithData<SuperuserHpCatalogRow>> {
  const user = await requireRequestUser();
  if (user.role !== "superuser") return { success: false, error: "Superuser access required" };

  const parsed = deviceModelMutationSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid HP catalog data" };
  if (!parsed.data.id) return { success: false, error: "HP catalog ID is required" };

  try {
    const device = await prisma.deviceModel.update({
      where: { id: parsed.data.id },
      data: {
        brandId: parsed.data.brandId,
        modelName: parsed.data.modelName,
        modelNumber: parsed.data.modelNumber || null,
      },
      include: { brand: { select: { name: true } } },
    });

    revalidateDeviceCatalogManagement();
    return { success: true, data: mapHpCatalogRow(device) };
  } catch (error) {
    console.error("Failed to update HP catalog:", error);
    return { success: false, error: "HP model already exists for this brand or could not be updated" };
  }
}

export async function deleteSuperuserHpCatalog(id: string): Promise<ActionResultWithData<{ id: string }>> {
  const user = await requireRequestUser();
  if (user.role !== "superuser") return { success: false, error: "Superuser access required" };

  const device = await prisma.deviceModel.findUnique({
    where: { id },
    select: {
      id: true,
      repairOrders: { select: { id: true }, take: 1 },
      compatibilities: { select: { inventoryItemId: true }, take: 1 },
    },
  });

  if (!device) return { success: false, error: "HP catalog entry not found" };
  if (device.repairOrders.length > 0) return { success: false, error: "Cannot delete HP model used by service records" };
  if (device.compatibilities.length > 0) return { success: false, error: "Cannot delete HP model used by inventoryItem compatibility" };

  try {
    await prisma.deviceModel.delete({ where: { id } });
    revalidateDeviceCatalogManagement();
    return { success: true, data: { id } };
  } catch (error) {
    console.error("Failed to delete HP catalog:", error);
    return { success: false, error: "HP catalog entry could not be deleted" };
  }
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

export async function updateUserMonthlyPriceOverride(
  userId: string,
  monthlyPriceOverride: number | null
): Promise<ActionResultWithData<{ userId: string; monthlyPriceOverride: number | null }>> {
  const user = await requireRequestUser();
  if (user.role !== "superuser") {
    return { success: false, error: "Superuser access required" };
  }

  if (monthlyPriceOverride !== null && (!Number.isInteger(monthlyPriceOverride) || monthlyPriceOverride <= 0)) {
    return { success: false, error: "Monthly price must be a positive whole number" };
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!targetUser || targetUser.role !== "admin") {
    return { success: false, error: "Only admin accounts can have custom monthly pricing" };
  }

  const subscription = await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      plan: "free",
      status: "active",
      monthlyPriceOverride,
    },
    update: { monthlyPriceOverride },
    select: { userId: true, monthlyPriceOverride: true },
  });

  revalidatePath("/superuser");
  revalidatePath("/dashboard");
  return { success: true, data: subscription };
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
      storeAssignments: { select: { storeId: true } },
      affiliatorProfile: { select: { id: true } },
    },
  });

  if (!targetUser || targetUser.role !== "admin") return null;

  const storeIds = targetUser.storeAssignments.map((assignment) => assignment.storeId);
  const storeWhere = { storeId: { in: storeIds } };
  const [
    services,
    inventoryItems,
    salesOrders,
    warrantyClaims,
    supplierReturns,
    inventoryAuditSessions,
    inventoryMovements,
    assignedKaryawan,
    referralAsCustomer,
    commissionAsCustomer,
    commissions,
    whatsappSettings,
  ] = await Promise.all([
    prisma.repairOrder.count({ where: storeWhere }),
    prisma.inventoryItem.count({ where: storeWhere }),
    prisma.salesOrder.count({ where: storeWhere }),
    prisma.warrantyClaim.count({ where: storeWhere }),
    prisma.supplierReturn.count({ where: storeWhere }),
    prisma.inventoryAuditSession.count({ where: storeWhere }),
    prisma.inventoryMovement.count({ where: storeWhere }),
    prisma.user.findMany({
      where: {
        role: { in: ["staff", "technician"] },
        storeAssignments: { some: { storeId: { in: storeIds } } },
      },
      select: {
        id: true,
        role: true,
        storeAssignments: { select: { storeId: true } },
      },
    }),
    prisma.referral.count({ where: { referredUserId: adminUserId } }),
    prisma.affiliateCommission.count({ where: { userId: adminUserId } }),
    prisma.affiliateCommission.findMany({
      where: { userId: adminUserId },
      select: { amount: true, status: true },
    }),
    prisma.storeWhatsappSetting.findMany({
      where: { storeId: { in: storeIds } },
      select: { instanceName: true },
    }),
  ]);

  const targetStoreSet = new Set(storeIds);
  let orphanStaff = 0;
  let orphanTechnicians = 0;
  const orphanKaryawanIds: string[] = [];
  for (const karyawan of assignedKaryawan) {
    const onlyInDeletedTokos = karyawan.storeAssignments.every((assignment) => targetStoreSet.has(assignment.storeId));
    if (!onlyInDeletedTokos) continue;
    orphanKaryawanIds.push(karyawan.id);
    if (karyawan.role === "staff") orphanStaff += 1;
    if (karyawan.role === "technician") orphanTechnicians += 1;
  }

  const sessions = await prisma.session.count({
    where: { userId: { in: [adminUserId, ...orphanKaryawanIds] } },
  });

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
      tokos: storeIds.length,
      services,
      inventoryItems,
      salesOrders,
      warrantyClaims,
      supplierReturns,
      inventoryAuditSessions,
      inventoryMovements,
      sessions,
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

  const storeIds = await prisma.userStore.findMany({
    where: { userId: adminUserId },
    select: { storeId: true },
  });
  const storeIdValues = storeIds.map((assignment) => assignment.storeId);
  const storeWhere = { storeId: { in: storeIdValues } };

  try {
    await revokeWhatsappInstancesForAdminDeletion(preview.whatsappInstances);

    await prisma.$transaction(async (tx) => {
      const orphanKaryawan = await tx.user.findMany({
        where: {
          role: { in: ["staff", "technician"] },
          storeAssignments: { some: { storeId: { in: storeIdValues } } },
        },
        select: {
          id: true,
          storeAssignments: { select: { storeId: true } },
        },
      });
      const targetStoreSet = new Set(storeIdValues);
      const orphanKaryawanIds = orphanKaryawan
        .filter((karyawan) => karyawan.storeAssignments.every((assignment) => targetStoreSet.has(assignment.storeId)))
        .map((karyawan) => karyawan.id);

      await tx.affiliateCommission.deleteMany({ where: { userId: adminUserId } });
      await tx.referral.deleteMany({ where: { referredUserId: adminUserId } });
      await tx.affiliator.updateMany({ where: { userId: adminUserId }, data: { userId: null, status: "inactive" } });

      if (storeIdValues.length > 0) {
        await tx.activityLog.deleteMany({ where: storeWhere });
        await tx.repairInvoiceItem.deleteMany({ where: { repairInvoice: { repairOrder: storeWhere } } });
        await tx.repairInvoice.deleteMany({ where: { repairOrder: storeWhere } });
        await tx.repairOrderItem.deleteMany({ where: { repairOrder: storeWhere } });
        await tx.warrantyClaimItem.deleteMany({ where: { warrantyClaim: storeWhere } });
        await tx.supplierReturn.deleteMany({ where: storeWhere });
        await tx.warrantyClaim.deleteMany({ where: storeWhere });
        await tx.salesOrderItem.deleteMany({ where: { salesOrder: storeWhere } });
        await tx.salesOrder.deleteMany({ where: storeWhere });
        await tx.supplierPayablePayment.deleteMany({ where: { payable: storeWhere } });
        await tx.supplierPayable.deleteMany({ where: storeWhere });
        await tx.supplier.deleteMany({ where: storeWhere });
        await tx.inventoryAuditItem.deleteMany({ where: { session: storeWhere } });
        await tx.inventoryAuditSession.deleteMany({ where: storeWhere });
        await tx.inventoryMovement.deleteMany({ where: storeWhere });
        await tx.partCompatibility.deleteMany({ where: { inventoryItem: storeWhere } });
        await tx.repairOrder.deleteMany({ where: storeWhere });
        await tx.serviceCatalogItem.deleteMany({ where: storeWhere });
        await tx.inventoryItem.deleteMany({ where: storeWhere });
        await tx.inventoryCategory.deleteMany({ where: storeWhere });
        await tx.storeWhatsappIdentity.deleteMany({ where: storeWhere });
        await tx.storeWhatsappSetting.deleteMany({ where: storeWhere });
        await tx.storeFeatureSetting.deleteMany({ where: { storeId: { in: storeIdValues } } });
        await tx.storeUserPermission.deleteMany({ where: storeWhere });
        await tx.userStore.deleteMany({ where: { storeId: { in: storeIdValues } } });
        await tx.store.deleteMany({ where: { id: { in: storeIdValues } } });
      }

      if (orphanKaryawanIds.length > 0) {
        await tx.affiliateCommission.deleteMany({ where: { userId: { in: orphanKaryawanIds } } });
        await tx.referral.deleteMany({ where: { referredUserId: { in: orphanKaryawanIds } } });
        await tx.affiliator.updateMany({ where: { userId: { in: orphanKaryawanIds } }, data: { userId: null, status: "inactive" } });
      }

      await tx.session.deleteMany({ where: { userId: { in: [adminUserId, ...orphanKaryawanIds] } } });

      if (orphanKaryawanIds.length > 0) {
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
  storeId: string | null;
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
      prisma.storeWhatsappSetting.findMany({
        select: {
          storeId: true,
          instanceName: true,
          enabled: true,
          connectedNumber: true,
          store: { select: { name: true } },
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
        storeId: db?.storeId ?? null,
        tokoName: db?.store.name ?? null,
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

  const linkedSettings = await prisma.storeWhatsappSetting.findMany({
    where: { instanceName: normalizedInstanceName },
    select: { storeId: true },
  });

  try {
    await deleteWhatsappInstance(normalizedInstanceName);
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    if (!message.includes("404") && !message.includes("not found")) throw error;
  }

  await prisma.storeWhatsappSetting.updateMany({
    where: { instanceName: normalizedInstanceName },
    data: { instanceToken: null, connectedNumber: null, connectedProfileName: null },
  });

  revalidatePath("/superuser");
  for (const setting of linkedSettings) {
    revalidatePath(`/${setting.storeId}/admin`);
  }
  return { success: true, data: { instanceName: normalizedInstanceName } };
}
