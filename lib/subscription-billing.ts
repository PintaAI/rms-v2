import prisma from "@/lib/prisma";
import {
  calculateMonthlyPlanAmount,
  getPlanAdditionalTokoPrice,
  getPlanIncludedTokos,
  PLAN_REGISTRY,
  type SubscriptionPlan,
} from "@/lib/plans";
import type { SubscriptionStatus } from "@/prisma/generated/prisma/enums";

export const PRO_TRIAL_DAYS = 30;
export const PRO_PERIOD_DAYS = 30;
export const GRACE_PERIOD_DAYS = 7;
export const BILLING_INSTRUCTIONS = {
  bankName: "Bank Manual RMS",
  accountNumber: "0000000000",
  accountName: "RMS Indonesia",
  qrisLabel: "QRIS RMS",
} as const;

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function isSubscriptionUsable(status: SubscriptionStatus) {
  return status === "trialing" || status === "active" || status === "past_due";
}

export async function ensureUserSubscription(userId: string) {
  const existing = await prisma.subscription.findUnique({ where: { userId } });
  if (existing) return refreshSubscriptionStatus(existing.id);

  return prisma.subscription.create({
    data: {
      userId,
      plan: "free",
      status: "active",
      trialEndsAt: null,
    },
  });
}

export async function refreshSubscriptionStatus(subscriptionId: string) {
  const subscription = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
  if (!subscription || subscription.status === "cancelled") return subscription;

  const now = new Date();

  if (subscription.plan === "free") {
    if (subscription.status !== "active" || subscription.trialEndsAt || subscription.graceEndsAt || subscription.currentPeriodEnd) {
      return prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: "active", trialEndsAt: null, currentPeriodStart: null, currentPeriodEnd: null, graceEndsAt: null },
      });
    }
    return subscription;
  }

  if (subscription.status === "suspended") return subscription;

  if (subscription.plan === "premium" && subscription.status === "trialing") {
    if (subscription.trialEndsAt && subscription.trialEndsAt > now) return subscription;

    return prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        plan: "free",
        status: "active",
        trialEndsAt: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        graceEndsAt: null,
      },
    });
  }

  if (subscription.plan === "enterprise") {
    if (subscription.status !== "active") {
      return prisma.subscription.update({ where: { id: subscription.id }, data: { status: "active", graceEndsAt: null } });
    }
    return subscription;
  }

  if (!subscription.currentPeriodEnd || subscription.currentPeriodEnd > now) {
    if (subscription.status !== "active") {
      return prisma.subscription.update({ where: { id: subscription.id }, data: { status: "active" } });
    }
    return subscription;
  }

  const graceEndsAt = subscription.graceEndsAt ?? addDays(subscription.currentPeriodEnd, GRACE_PERIOD_DAYS);
  const nextStatus = graceEndsAt > now ? "past_due" : "suspended";
  if (subscription.status !== nextStatus || !subscription.graceEndsAt) {
    return prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: nextStatus, graceEndsAt },
    });
  }

  return subscription;
}

export async function calculateOwnerMonthlyAmount(userId: string, plan: SubscriptionPlan = "premium") {
  const [tokoCount, subscription] = await Promise.all([
    prisma.userToko.count({ where: { userId } }),
    prisma.subscription.findUnique({ where: { userId }, select: { monthlyPriceOverride: true } }),
  ]);
  const defaultAmount = calculateMonthlyPlanAmount(plan, tokoCount);
  const amount = plan !== "free" && subscription?.monthlyPriceOverride !== null && subscription?.monthlyPriceOverride !== undefined
    ? subscription.monthlyPriceOverride
    : defaultAmount;
  const includedTokos = getPlanIncludedTokos(plan);
  const additionalTokoPrice = getPlanAdditionalTokoPrice(plan);
  const additionalTokos = Math.max(0, tokoCount - (includedTokos ?? tokoCount));

  return {
    amount: amount ?? 0,
    tokoCount,
    includedTokos,
    additionalTokos,
    additionalTokoPrice,
  };
}

export async function ensureOpenProInvoice(userId: string) {
  const subscription = await ensureUserSubscription(userId);
  const existing = await prisma.subscriptionInvoice.findFirst({
    where: {
      userId,
      status: { in: ["issued", "pending_review", "rejected", "overdue"] },
      plan: "premium",
    },
    orderBy: { issuedAt: "desc" },
    include: { payments: { orderBy: { submittedAt: "desc" } } },
  });

  if (existing) return existing;

  const now = new Date();
  const pricing = await calculateOwnerMonthlyAmount(userId, "premium");

  return prisma.subscriptionInvoice.create({
    data: {
      userId,
      subscriptionId: subscription!.id,
      invoiceNumber: await generateInvoiceNumber(),
      plan: "premium",
      amount: pricing.amount,
      tokoCount: pricing.tokoCount,
      includedTokos: pricing.includedTokos,
      additionalTokos: pricing.additionalTokos,
      additionalTokoPrice: pricing.additionalTokoPrice,
      status: "issued",
      issuedAt: now,
      dueAt: addDays(now, GRACE_PERIOD_DAYS),
      notes: `Pro ${PLAN_REGISTRY.premium.label} subscription`,
    },
    include: { payments: { orderBy: { submittedAt: "desc" } } },
  });
}

export async function startProTrial(userId: string) {
  const subscription = await ensureUserSubscription(userId);
  if (!subscription) return null;

  if (subscription.proTrialStartedAt) {
    throw new Error("Trial Pro hanya bisa digunakan satu kali");
  }

  const now = new Date();
  return prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      plan: "premium",
      status: "trialing",
      proTrialStartedAt: now,
      trialEndsAt: addDays(now, PRO_TRIAL_DAYS),
      currentPeriodStart: now,
      currentPeriodEnd: null,
      graceEndsAt: null,
      cancelledAt: null,
    },
  });
}

export async function activatePaidSubscription(userId: string, subscriptionId: string, invoiceId: string) {
  const now = new Date();
  const current = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
  const periodStart = current?.currentPeriodEnd && current.currentPeriodEnd > now ? current.currentPeriodEnd : now;
  const periodEnd = addDays(periodStart, PRO_PERIOD_DAYS);

  await prisma.$transaction([
    prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        plan: "premium",
        status: "active",
        trialEndsAt: null,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        graceEndsAt: null,
        cancelledAt: null,
      },
    }),
    prisma.subscriptionInvoice.update({
      where: { id: invoiceId },
      data: { status: "paid", paidAt: now },
    }),
  ]);

  return ensureUserSubscription(userId);
}

async function generateInvoiceNumber() {
  const now = new Date();
  const prefix = `RMS-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const count = await prisma.subscriptionInvoice.count({
    where: { invoiceNumber: { startsWith: prefix } },
  });
  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}
