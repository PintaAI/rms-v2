"use server";

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import prisma from "@/lib/prisma";
import { getRequestUser, requireRequestUser } from "@/lib/auth/request-user";
import type { ActionResultWithData } from "@/lib/auth/authorization";
import { getPlanMonthlyPrice, type SubscriptionPlan } from "@/lib/plans";
import { startProTrial } from "@/lib/subscription-billing";
import { Prisma } from "@/prisma/generated/prisma/client";
import {
  AFFILIATE_PENDING_REFERRAL_COOKIE,
  DEFAULT_ENTERPRISE_COMMISSION_PERCENT,
  DEFAULT_PRO_RECURRING_COMMISSION_PERCENT,
  DEFAULT_REGISTER_COMMISSION,
  generateAffiliatorCode,
  generatePortalToken,
  buildAffiliateLinks,
  getPercentageCommissionAmount,
  getReferralLink,
  maskEmail,
  normalizeReferralCode,
} from "@/lib/affiliate";

type AffiliatorStatus = "active" | "inactive";
type AffiliateCommissionStatus = "pending" | "approved" | "paid" | "rejected";
type AffiliateCommissionKind = "registration_bonus" | "pro_recurring" | "enterprise_one_time";

export interface AffiliatorRow {
  id: string;
  userId: string | null;
  type: "external" | "user";
  name: string;
  email: string | null;
  phone: string | null;
  code: string;
  portalToken: string;
  status: AffiliatorStatus;
  premiumCommissionValue: number;
  enterpriseCommissionValue: number;
  payoutInfo: string;
  notes: string | null;
  referralCount: number;
  paidConversionCount: number;
  pendingCommissionAmount: number;
  approvedCommissionAmount: number;
  paidCommissionAmount: number;
  createdAt: Date;
  links: {
    referralLink: string;
    trackingLink: string;
  };
}

export interface AffiliateCommissionRow {
  id: string;
  affiliatorName: string;
  customerName: string;
  customerEmail: string;
  plan: SubscriptionPlan;
  kind: AffiliateCommissionKind;
  commissionBaseAmount: number | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  amount: number;
  status: AffiliateCommissionStatus;
  createdAt: Date;
  approvedAt: Date | null;
  paidAt: Date | null;
  rejectedAt: Date | null;
  notes: string | null;
}

export interface AffiliateDashboardData {
  stats: {
    totalAffiliators: number;
    activeAffiliators: number;
    totalReferrals: number;
    paidConversions: number;
    pendingCommissionAmount: number;
    approvedCommissionAmount: number;
    paidCommissionAmount: number;
    rejectedCommissionAmount: number;
  };
  affiliators: AffiliatorRow[];
  commissions: AffiliateCommissionRow[];
  linkableUsers: Array<{ id: string; name: string; email: string }>;
  referrals: AffiliateReferralRow[];
}

export interface AffiliateReferralRow {
  id: string;
  affiliatorName: string;
  customerName: string;
  customerEmail: string;
  registrationCommissionAmount: number;
  createdAt: Date;
  convertedAt: Date | null;
}

export interface ReferralCodePreview {
  code: string;
  affiliatorName: string;
}

export interface AffiliatePortalData {
  affiliator: {
    name: string;
    code: string;
    status: AffiliatorStatus;
  };
  links: {
    referralLink: string;
  };
  stats: {
    totalReferrals: number;
    paidConversions: number;
    conversionRate: number;
    pendingAmount: number;
    approvedAmount: number;
    paidAmount: number;
    rejectedAmount: number;
  };
  referrals: Array<{
    id: string;
    customer: string;
    joinedAt: Date;
    convertedAt: Date | null;
    canGrantProTrial: boolean;
    subscriptionStatus: string | null;
    trialEndsAt: Date | null;
    proTrialStartedAt: Date | null;
  }>;
  commissions: Array<{
    id: string;
    customer: string;
    plan: SubscriptionPlan;
    kind: AffiliateCommissionKind;
    amount: number;
    status: AffiliateCommissionStatus;
    createdAt: Date;
    approvedAt: Date | null;
    paidAt: Date | null;
  }>;
}

interface CreateExternalAffiliatorInput {
  name: string;
  email?: string;
  phone?: string;
  premiumCommissionValue?: number;
  enterpriseCommissionValue?: number;
  payoutInfo?: string;
  notes?: string;
}

interface CreateUserAffiliatorInput {
  userId: string;
  premiumCommissionValue?: number;
  enterpriseCommissionValue?: number;
  payoutInfo?: string;
  notes?: string;
}

interface UpdateAffiliatorInput extends CreateExternalAffiliatorInput {
  id: string;
  status?: AffiliatorStatus;
}

const PAID_PLANS = new Set<SubscriptionPlan>(["premium", "enterprise"]);

function getCookieSecret(): string {
  return process.env.BETTER_AUTH_SECRET || process.env.DATABASE_URL || "rms-affiliate-dev-secret";
}

function signValue(value: string): string {
  return createHmac("sha256", getCookieSecret()).update(value).digest("hex");
}

function encodePendingReferralCookie(code: string): string {
  const payload = Buffer.from(JSON.stringify({ code, expiresAt: Date.now() + 24 * 60 * 60 * 1000 })).toString("base64url");
  return `${payload}.${signValue(payload)}`;
}

function decodePendingReferralCookie(value: string | undefined): string | null {
  if (!value) return null;

  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const expected = signValue(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      code?: string;
      expiresAt?: number;
    };

    if (!data.code || !data.expiresAt || data.expiresAt < Date.now()) return null;
    return normalizeReferralCode(data.code);
  } catch {
    return null;
  }
}

function normalizeOptionalString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function parseCommissionValue(value: number | undefined, fallback: number): number {
  if (value === undefined || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.floor(value));
}

function parsePayoutInfo(value: string | undefined): { text: string } | undefined {
  const text = normalizeOptionalString(value);
  return text ? { text } : undefined;
}

function payoutInfoToText(value: unknown): string {
  if (!value || typeof value !== "object" || !("text" in value)) return "";
  const text = (value as { text?: unknown }).text;
  return typeof text === "string" ? text : "";
}

async function requireSuperuser() {
  const user = await requireRequestUser();
  if (user.role !== "superuser") {
    throw new Error("Superuser access required");
  }
  return user;
}

async function createUniqueAffiliatorCode(name: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateAffiliatorCode(name);
    const existing = await prisma.affiliator.findUnique({ where: { code }, select: { id: true } });
    if (!existing) return code;
  }

  throw new Error("Failed to generate unique affiliate code");
}

function toAffiliatorRow(affiliator: {
  id: string;
  userId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  code: string;
  portalToken: string;
  status: AffiliatorStatus;
  premiumCommissionValue: number;
  enterpriseCommissionValue: number;
  payoutInfo: unknown;
  notes: string | null;
  createdAt: Date;
  referrals: Array<{ convertedAt: Date | null }>;
  commissions: Array<{ amount: number; status: AffiliateCommissionStatus }>;
}): AffiliatorRow {
  return {
    id: affiliator.id,
    userId: affiliator.userId,
    type: affiliator.userId ? "user" : "external",
    name: affiliator.name,
    email: affiliator.email,
    phone: affiliator.phone,
    code: affiliator.code,
    portalToken: affiliator.portalToken,
    status: affiliator.status,
    premiumCommissionValue: affiliator.premiumCommissionValue,
    enterpriseCommissionValue: affiliator.enterpriseCommissionValue,
    payoutInfo: payoutInfoToText(affiliator.payoutInfo),
    notes: affiliator.notes,
    referralCount: affiliator.referrals.length,
    paidConversionCount: affiliator.referrals.filter((referral) => referral.convertedAt).length,
    pendingCommissionAmount: sumCommissions(affiliator.commissions, "pending"),
    approvedCommissionAmount: sumCommissions(affiliator.commissions, "approved"),
    paidCommissionAmount: sumCommissions(affiliator.commissions, "paid"),
    createdAt: affiliator.createdAt,
    links: buildAffiliateLinks(affiliator.code, affiliator.portalToken),
  };
}

function sumCommissions(
  commissions: Array<{ amount: number; status: AffiliateCommissionStatus }>,
  status: AffiliateCommissionStatus
): number {
  return commissions.filter((commission) => commission.status === status).reduce((total, commission) => total + commission.amount, 0);
}

function customerDisplay(user: { id: string; email: string | null; name?: string | null }): string {
  if (user.email) return maskEmail(user.email);
  return `Customer #${user.id.slice(0, 6)}`;
}

function commissionPeriodKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function canGrantReferralProTrial(referral: {
  referredUser: {
    role: string;
    subscription: {
      plan: SubscriptionPlan;
      status: string;
      proTrialStartedAt: Date | null;
    } | null;
  };
}): boolean {
  const subscription = referral.referredUser.subscription;
  if (referral.referredUser.role !== "admin") return false;
  if (subscription?.proTrialStartedAt) return false;
  if (subscription?.plan === "premium" && ["active", "trialing"].includes(subscription.status)) return false;
  return true;
}

function toCommissionRow(commission: {
  id: string;
  affiliator: { name: string };
  user: { name: string; email: string };
  plan: SubscriptionPlan;
  kind: AffiliateCommissionKind;
  commissionBaseAmount: number | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  amount: number;
  status: AffiliateCommissionStatus;
  createdAt: Date;
  approvedAt: Date | null;
  paidAt: Date | null;
  rejectedAt: Date | null;
  notes: string | null;
}): AffiliateCommissionRow {
  return {
    id: commission.id,
    affiliatorName: commission.affiliator.name,
    customerName: commission.user.name,
    customerEmail: commission.user.email,
    plan: commission.plan,
    kind: commission.kind,
    commissionBaseAmount: commission.commissionBaseAmount,
    periodStart: commission.periodStart,
    periodEnd: commission.periodEnd,
    amount: commission.amount,
    status: commission.status,
    createdAt: commission.createdAt,
    approvedAt: commission.approvedAt,
    paidAt: commission.paidAt,
    rejectedAt: commission.rejectedAt,
    notes: commission.notes,
  };
}

async function syncAffiliateCommissions(): Promise<void> {
  const registrationReferrals = await prisma.referral.findMany({
    where: { affiliator: { status: "active" } },
    select: { id: true, affiliatorId: true, referredUserId: true, registrationCommissionAmount: true },
  });

  await Promise.all(registrationReferrals.map((referral) => prisma.affiliateCommission.upsert({
    where: {
      referralId_plan_kind_periodKey: {
        referralId: referral.id,
        plan: "free",
        kind: "registration_bonus",
        periodKey: "registration",
      },
    },
    create: {
      affiliatorId: referral.affiliatorId,
      referralId: referral.id,
      userId: referral.referredUserId,
      plan: "free",
      kind: "registration_bonus",
      periodKey: "registration",
      amount: referral.registrationCommissionAmount,
    },
    update: {},
  })));

  const referrals = await prisma.referral.findMany({
    where: {
      affiliator: { status: "active" },
      referredUser: { subscription: { is: { plan: "premium", status: "active", currentPeriodStart: { not: null } } } },
    },
    include: {
      affiliator: { select: { id: true, premiumCommissionValue: true } },
      referredUser: {
        select: {
          id: true,
          subscription: { select: { currentPeriodStart: true, currentPeriodEnd: true } },
          subscriptionInvoices: {
            where: { plan: "premium", status: "paid" },
            orderBy: { paidAt: "desc" },
            take: 1,
            select: { amount: true },
          },
        },
      },
    },
  });

  await Promise.all(referrals.map(async (referral) => {
    const periodStart = referral.referredUser.subscription?.currentPeriodStart;
    if (!periodStart) return;

    const baseAmount = referral.referredUser.subscriptionInvoices[0]?.amount ?? getPlanMonthlyPrice("premium") ?? 0;
    const amount = getPercentageCommissionAmount(baseAmount, referral.affiliator.premiumCommissionValue);

    await prisma.affiliateCommission.upsert({
      where: {
        referralId_plan_kind_periodKey: {
          referralId: referral.id,
          plan: "premium",
          kind: "pro_recurring",
          periodKey: commissionPeriodKey(periodStart),
        },
      },
      create: {
        affiliatorId: referral.affiliatorId,
        referralId: referral.id,
        userId: referral.referredUserId,
        plan: "premium",
        kind: "pro_recurring",
        periodKey: commissionPeriodKey(periodStart),
        periodStart,
        periodEnd: referral.referredUser.subscription?.currentPeriodEnd,
        commissionBaseAmount: baseAmount,
        amount,
      },
      update: {},
    });
  }));
}

export async function getSuperuserAffiliateDashboard(): Promise<ActionResultWithData<AffiliateDashboardData>> {
  try {
    await requireSuperuser();
    await syncAffiliateCommissions();

    const [affiliators, commissions, linkableUsers, referrals] = await Promise.all([
      prisma.affiliator.findMany({
        include: {
          referrals: { select: { convertedAt: true } },
          commissions: { select: { amount: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.affiliateCommission.findMany({
        include: {
          affiliator: { select: { name: true } },
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.user.findMany({
        where: { role: "admin", affiliatorProfile: null },
        select: { id: true, name: true, email: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.referral.findMany({
        include: {
          affiliator: { select: { name: true } },
          referredUser: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

    const rows = affiliators.map(toAffiliatorRow);
    const commissionRows: AffiliateCommissionRow[] = commissions.map((commission) => toCommissionRow({
      ...commission,
      kind: commission.kind as AffiliateCommissionKind,
      status: commission.status as AffiliateCommissionStatus,
    }));

    return {
      success: true,
      data: {
        stats: {
          totalAffiliators: rows.length,
          activeAffiliators: rows.filter((row) => row.status === "active").length,
          totalReferrals: rows.reduce((total, row) => total + row.referralCount, 0),
          paidConversions: rows.reduce((total, row) => total + row.paidConversionCount, 0),
          pendingCommissionAmount: rows.reduce((total, row) => total + row.pendingCommissionAmount, 0),
          approvedCommissionAmount: rows.reduce((total, row) => total + row.approvedCommissionAmount, 0),
          paidCommissionAmount: rows.reduce((total, row) => total + row.paidCommissionAmount, 0),
          rejectedCommissionAmount: affiliators.reduce((total, row) => total + sumCommissions(row.commissions, "rejected"), 0),
        },
        affiliators: rows,
        commissions: commissionRows,
        linkableUsers,
        referrals: referrals.map((referral) => ({
          id: referral.id,
          affiliatorName: referral.affiliator.name,
          customerName: referral.referredUser.name,
          customerEmail: referral.referredUser.email,
          registrationCommissionAmount: referral.registrationCommissionAmount,
          createdAt: referral.createdAt,
          convertedAt: referral.convertedAt,
        })),
      },
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to load affiliate dashboard:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to load affiliate dashboard" };
  }
}

export async function createExternalAffiliator(input: CreateExternalAffiliatorInput): Promise<ActionResultWithData<AffiliatorRow>> {
  try {
    await requireSuperuser();
    const name = input.name.trim();
    if (name.length < 2) return { success: false, error: "Name must be at least 2 characters" };

    const affiliator = await prisma.affiliator.create({
      data: {
        name,
        email: normalizeOptionalString(input.email),
        phone: normalizeOptionalString(input.phone),
        code: await createUniqueAffiliatorCode(name),
        portalToken: generatePortalToken(),
        premiumCommissionValue: parseCommissionValue(input.premiumCommissionValue, DEFAULT_PRO_RECURRING_COMMISSION_PERCENT),
        enterpriseCommissionValue: parseCommissionValue(input.enterpriseCommissionValue, DEFAULT_ENTERPRISE_COMMISSION_PERCENT),
        payoutInfo: parsePayoutInfo(input.payoutInfo),
        notes: normalizeOptionalString(input.notes),
      },
      include: { referrals: { select: { convertedAt: true } }, commissions: { select: { amount: true, status: true } } },
    });

    revalidatePath("/superuser");
    return { success: true, data: toAffiliatorRow(affiliator) };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to create external affiliator:", error);
    return { success: false, error: "Failed to create affiliator" };
  }
}

export async function createUserAffiliator(input: CreateUserAffiliatorInput): Promise<ActionResultWithData<AffiliatorRow>> {
  try {
    await requireSuperuser();
    const existingUser = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, name: true, email: true, role: true, affiliatorProfile: { select: { id: true } } },
    });
    if (!existingUser) return { success: false, error: "User not found" };
    if (existingUser.role !== "admin") return { success: false, error: "Only admin users can be linked as affiliators" };
    if (existingUser.affiliatorProfile) return { success: false, error: "User is already an affiliator" };

    const affiliator = await prisma.affiliator.create({
      data: {
        userId: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        code: await createUniqueAffiliatorCode(existingUser.name),
        portalToken: generatePortalToken(),
        premiumCommissionValue: parseCommissionValue(input.premiumCommissionValue, DEFAULT_PRO_RECURRING_COMMISSION_PERCENT),
        enterpriseCommissionValue: parseCommissionValue(input.enterpriseCommissionValue, DEFAULT_ENTERPRISE_COMMISSION_PERCENT),
        payoutInfo: parsePayoutInfo(input.payoutInfo),
        notes: normalizeOptionalString(input.notes),
      },
      include: { referrals: { select: { convertedAt: true } }, commissions: { select: { amount: true, status: true } } },
    });

    revalidatePath("/superuser");
    return { success: true, data: toAffiliatorRow(affiliator) };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to link user affiliator:", error);
    return { success: false, error: "Failed to link user affiliator" };
  }
}

export async function updateAffiliator(input: UpdateAffiliatorInput): Promise<ActionResultWithData<AffiliatorRow>> {
  try {
    await requireSuperuser();
    const name = input.name.trim();
    if (name.length < 2) return { success: false, error: "Name must be at least 2 characters" };

    const affiliator = await prisma.affiliator.update({
      where: { id: input.id },
      data: {
        name,
        email: normalizeOptionalString(input.email) ?? null,
        phone: normalizeOptionalString(input.phone) ?? null,
        status: input.status,
        premiumCommissionValue: parseCommissionValue(input.premiumCommissionValue, DEFAULT_PRO_RECURRING_COMMISSION_PERCENT),
        enterpriseCommissionValue: parseCommissionValue(input.enterpriseCommissionValue, DEFAULT_ENTERPRISE_COMMISSION_PERCENT),
        payoutInfo: parsePayoutInfo(input.payoutInfo) ?? Prisma.JsonNull,
        notes: normalizeOptionalString(input.notes) ?? null,
      },
      include: { referrals: { select: { convertedAt: true } }, commissions: { select: { amount: true, status: true } } },
    });

    revalidatePath("/superuser");
    return { success: true, data: toAffiliatorRow(affiliator) };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to update affiliator:", error);
    return { success: false, error: "Failed to update affiliator" };
  }
}

export async function deleteAffiliator(id: string): Promise<ActionResultWithData<{ id: string }>> {
  try {
    await requireSuperuser();

    const existing = await prisma.affiliator.findUnique({
      where: { id },
      select: {
        id: true,
        _count: { select: { referrals: true, commissions: true } },
      },
    });
    if (!existing) return { success: false, error: "Affiliator not found" };
    if (existing._count.referrals > 0 || existing._count.commissions > 0) {
      return { success: false, error: "Affiliators with referrals or commissions cannot be deleted. Set the status to inactive instead." };
    }

    await prisma.affiliator.delete({ where: { id } });

    revalidatePath("/superuser");
    return { success: true, data: { id } };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to delete affiliator:", error);
    return { success: false, error: "Failed to delete affiliator" };
  }
}

export async function updateAffiliatorStatus(id: string, status: AffiliatorStatus): Promise<ActionResultWithData<AffiliatorRow>> {
  return updateAffiliatorStatusInternal(id, status);
}

async function updateAffiliatorStatusInternal(id: string, status: AffiliatorStatus): Promise<ActionResultWithData<AffiliatorRow>> {
  try {
    await requireSuperuser();
    const affiliator = await prisma.affiliator.update({
      where: { id },
      data: { status },
      include: { referrals: { select: { convertedAt: true } }, commissions: { select: { amount: true, status: true } } },
    });

    revalidatePath("/superuser");
    return { success: true, data: toAffiliatorRow(affiliator) };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to update affiliator status:", error);
    return { success: false, error: "Failed to update affiliator status" };
  }
}

export async function regenerateAffiliatorPortalToken(id: string): Promise<ActionResultWithData<{ id: string; portalToken: string }>> {
  try {
    await requireSuperuser();
    const affiliator = await prisma.affiliator.update({
      where: { id },
      data: { portalToken: generatePortalToken() },
      select: { id: true, portalToken: true },
    });

    revalidatePath("/superuser");
    return { success: true, data: affiliator };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to regenerate portal token:", error);
    return { success: false, error: "Failed to regenerate portal token" };
  }
}

export async function getReferralCodePreview(code: string): Promise<ActionResultWithData<ReferralCodePreview | null>> {
  const normalizedCode = normalizeReferralCode(code);
  if (!normalizedCode) return { success: true, data: null };

  const affiliator = await prisma.affiliator.findFirst({
    where: { code: normalizedCode, status: "active" },
    select: { name: true, code: true },
  });

  return { success: true, data: affiliator ? { code: affiliator.code, affiliatorName: affiliator.name } : null };
}

export async function storePendingReferralCode(code: string): Promise<ActionResultWithData<ReferralCodePreview | null>> {
  const preview = await getReferralCodePreview(code);
  if (!preview.success || !preview.data) return preview;

  const cookieStore = await cookies();
  cookieStore.set(AFFILIATE_PENDING_REFERRAL_COOKIE, encodePendingReferralCookie(preview.data.code), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60,
    path: "/",
  });

  return preview;
}

async function clearPendingReferralCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(AFFILIATE_PENDING_REFERRAL_COOKIE);
}

export async function attachPendingReferralToCurrentUser(): Promise<ActionResultWithData<{ referralId: string } | null>> {
  const cookieStore = await cookies();
  const code = decodePendingReferralCookie(cookieStore.get(AFFILIATE_PENDING_REFERRAL_COOKIE)?.value);
  if (!code) {
    await clearPendingReferralCookie();
    return { success: true, data: null };
  }

  return attachReferralToCurrentUser(code, true);
}

export async function attachReferralToCurrentUser(
  code: string,
  shouldClearCookie = false
): Promise<ActionResultWithData<{ referralId: string } | null>> {
  try {
    const currentUser = await getRequestUser();
    if (!currentUser) return { success: true, data: null };

    const normalizedCode = normalizeReferralCode(code);
    const existingReferral = await prisma.referral.findUnique({
      where: { referredUserId: currentUser.id },
      select: { id: true },
    });
    if (existingReferral) {
      if (shouldClearCookie) await clearPendingReferralCookie();
      return { success: true, data: { referralId: existingReferral.id } };
    }

    const affiliator = await prisma.affiliator.findFirst({
      where: { code: normalizedCode, status: "active" },
      select: { id: true, userId: true, email: true },
    });
    if (!affiliator || affiliator.userId === currentUser.id || affiliator.email === currentUser.email) {
      if (shouldClearCookie) await clearPendingReferralCookie();
      return { success: true, data: null };
    }

    const referral = await prisma.$transaction(async (tx) => {
      const createdReferral = await tx.referral.create({
        data: {
          affiliatorId: affiliator.id,
          referredUserId: currentUser.id,
          referralCode: normalizedCode,
          registrationCommissionAmount: DEFAULT_REGISTER_COMMISSION,
        },
        select: { id: true, affiliatorId: true, referredUserId: true, registrationCommissionAmount: true },
      });

      await tx.affiliateCommission.create({
        data: {
          affiliatorId: createdReferral.affiliatorId,
          referralId: createdReferral.id,
          userId: createdReferral.referredUserId,
          plan: "free",
          kind: "registration_bonus",
          periodKey: "registration",
          amount: createdReferral.registrationCommissionAmount,
        },
      });

      return createdReferral;
    });

    if (shouldClearCookie) await clearPendingReferralCookie();
    return { success: true, data: { referralId: referral.id } };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to attach referral:", error);
    return { success: false, error: "Failed to attach referral" };
  }
}

export async function createCommissionForPaidPlanActivation(input: {
  userId: string;
  previousPlan: SubscriptionPlan | null;
  nextPlan: SubscriptionPlan;
  subscriptionAmount?: number;
}): Promise<void> {
  if (!PAID_PLANS.has(input.nextPlan)) return;

  const referral = await prisma.referral.findUnique({
    where: { referredUserId: input.userId },
    include: { affiliator: true, referredUser: { select: { subscription: true } } },
  });
  if (!referral || referral.affiliator.status !== "active") return;

  const plan = input.nextPlan as Exclude<SubscriptionPlan, "free">;
  const periodStart = referral.referredUser.subscription?.currentPeriodStart ?? new Date();
  const periodEnd = referral.referredUser.subscription?.currentPeriodEnd ?? null;
  const baseAmount = input.subscriptionAmount ?? getPlanMonthlyPrice(plan) ?? 0;
  const kind: AffiliateCommissionKind = plan === "premium" ? "pro_recurring" : "enterprise_one_time";
  const percentage = plan === "premium" ? referral.affiliator.premiumCommissionValue : referral.affiliator.enterpriseCommissionValue;
  const amount = getPercentageCommissionAmount(baseAmount, percentage);
  const periodKey = plan === "premium" ? commissionPeriodKey(periodStart) : "enterprise";

  await prisma.$transaction(async (tx) => {
    await tx.affiliateCommission.upsert({
      where: { referralId_plan_kind_periodKey: { referralId: referral.id, plan, kind, periodKey } },
      create: {
        affiliatorId: referral.affiliatorId,
        referralId: referral.id,
        userId: input.userId,
        plan,
        kind,
        periodKey,
        periodStart: plan === "premium" ? periodStart : null,
        periodEnd: plan === "premium" ? periodEnd : null,
        commissionBaseAmount: baseAmount,
        amount,
      },
      update: {},
    });

    if (!referral.convertedAt) {
      await tx.referral.update({ where: { id: referral.id }, data: { convertedAt: new Date() } });
    }
  });
}

export async function updateAffiliateCommissionStatus(input: {
  commissionId: string;
  status: AffiliateCommissionStatus;
  notes?: string;
}): Promise<ActionResultWithData<AffiliateCommissionRow>> {
  try {
    await requireSuperuser();

    const existing = await prisma.affiliateCommission.findUnique({ where: { id: input.commissionId }, select: { status: true } });
    if (!existing) return { success: false, error: "Commission not found" };

    const allowedTransitions: Record<AffiliateCommissionStatus, AffiliateCommissionStatus[]> = {
      pending: ["approved", "rejected"],
      approved: ["paid", "rejected"],
      paid: [],
      rejected: ["pending"],
    };
    if (existing.status !== input.status && !allowedTransitions[existing.status as AffiliateCommissionStatus].includes(input.status)) {
      return { success: false, error: "Invalid commission status transition" };
    }

    const now = new Date();
    const commission = await prisma.affiliateCommission.update({
      where: { id: input.commissionId },
      data: {
        status: input.status,
        notes: normalizeOptionalString(input.notes) ?? undefined,
        approvedAt: input.status === "approved" ? now : undefined,
        paidAt: input.status === "paid" ? now : undefined,
        rejectedAt: input.status === "rejected" ? now : undefined,
      },
      include: { affiliator: { select: { name: true } }, user: { select: { name: true, email: true } } },
    });

    revalidatePath("/superuser");
    return {
      success: true,
      data: {
        ...toCommissionRow({
          ...commission,
          kind: commission.kind as AffiliateCommissionKind,
          status: commission.status as AffiliateCommissionStatus,
        }),
      },
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to update commission status:", error);
    return { success: false, error: "Failed to update commission status" };
  }
}

export async function updateReferralRegistrationCommission(input: {
  referralId: string;
  amount: number;
}): Promise<ActionResultWithData<AffiliateReferralRow>> {
  try {
    await requireSuperuser();
    const amount = parseCommissionValue(input.amount, DEFAULT_REGISTER_COMMISSION);

    const referral = await prisma.$transaction(async (tx) => {
      const updatedReferral = await tx.referral.update({
        where: { id: input.referralId },
        data: { registrationCommissionAmount: amount },
        include: {
          affiliator: { select: { name: true } },
          referredUser: { select: { name: true, email: true } },
        },
      });

      await tx.affiliateCommission.updateMany({
        where: {
          referralId: input.referralId,
          kind: "registration_bonus",
          status: { in: ["pending", "approved"] },
        },
        data: { amount },
      });

      return updatedReferral;
    });

    revalidatePath("/superuser");
    return {
      success: true,
      data: {
        id: referral.id,
        affiliatorName: referral.affiliator.name,
        customerName: referral.referredUser.name,
        customerEmail: referral.referredUser.email,
        registrationCommissionAmount: referral.registrationCommissionAmount,
        createdAt: referral.createdAt,
        convertedAt: referral.convertedAt,
      },
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to update referral registration commission:", error);
    return { success: false, error: "Failed to update referral registration commission" };
  }
}

export async function grantReferralProTrialFromPortal(input: {
  code: string;
  token: string;
  referralId: string;
}): Promise<ActionResultWithData<{ referralId: string; trialEndsAt: Date | null }>> {
  try {
    const code = normalizeReferralCode(input.code);
    const affiliator = await prisma.affiliator.findFirst({
      where: { code, portalToken: input.token },
      select: {
        id: true,
        status: true,
        referrals: {
          where: { id: input.referralId },
          select: {
            id: true,
            referredUserId: true,
            referredUser: {
              select: {
                role: true,
                subscription: {
                  select: {
                    plan: true,
                    status: true,
                    proTrialStartedAt: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!affiliator) return { success: false, error: "Invalid affiliate portal link" };
    if (affiliator.status !== "active") return { success: false, error: "Affiliate account is inactive" };

    const referral = affiliator.referrals[0];
    if (!referral) return { success: false, error: "Referral not found for this tracking link" };
    if (!canGrantReferralProTrial(referral)) return { success: false, error: "This customer is not eligible for Pro trial" };

    // Trial approval is intentionally not a paid conversion and must not create affiliate commission.
    const subscription = await startProTrial(referral.referredUserId);

    revalidatePath(`/affiliate/portal/${encodeURIComponent(code)}`);
    return { success: true, data: { referralId: referral.id, trialEndsAt: subscription?.trialEndsAt ?? null } };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to grant referral Pro trial:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to grant Pro trial" };
  }
}

export async function getAffiliatePortalData(input: {
  code: string;
  token: string;
}): Promise<ActionResultWithData<AffiliatePortalData>> {
  await syncAffiliateCommissions();

  const code = normalizeReferralCode(input.code);
  const affiliator = await prisma.affiliator.findFirst({
    where: { code, portalToken: input.token },
    include: {
      referrals: {
        include: {
          referredUser: {
            select: {
              id: true,
              email: true,
              role: true,
              subscription: {
                select: {
                  plan: true,
                  status: true,
                  trialEndsAt: true,
                  proTrialStartedAt: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      commissions: {
        include: { user: { select: { id: true, email: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!affiliator) return { success: false, error: "Invalid affiliate portal link" };

  const totalReferrals = affiliator.referrals.length;
  const paidConversions = affiliator.referrals.filter((referral) => referral.convertedAt).length;
  const typedCommissions = affiliator.commissions.map((commission) => ({
    ...commission,
    kind: commission.kind as AffiliateCommissionKind,
    status: commission.status as AffiliateCommissionStatus,
  }));

  return {
    success: true,
    data: {
      affiliator: { name: affiliator.name, code: affiliator.code, status: affiliator.status as AffiliatorStatus },
      links: { referralLink: getReferralLink(affiliator.code) },
      stats: {
        totalReferrals,
        paidConversions,
        conversionRate: totalReferrals === 0 ? 0 : Math.round((paidConversions / totalReferrals) * 100),
        pendingAmount: sumCommissions(typedCommissions, "pending"),
        approvedAmount: sumCommissions(typedCommissions, "approved"),
        paidAmount: sumCommissions(typedCommissions, "paid"),
        rejectedAmount: sumCommissions(typedCommissions, "rejected"),
      },
      referrals: affiliator.referrals.map((referral) => ({
        id: referral.id,
        customer: customerDisplay(referral.referredUser),
        joinedAt: referral.createdAt,
        convertedAt: referral.convertedAt,
        canGrantProTrial: canGrantReferralProTrial(referral),
        subscriptionStatus: referral.referredUser.subscription?.status ?? null,
        trialEndsAt: referral.referredUser.subscription?.trialEndsAt ?? null,
        proTrialStartedAt: referral.referredUser.subscription?.proTrialStartedAt ?? null,
      })),
      commissions: typedCommissions.map((commission) => ({
        id: commission.id,
        customer: customerDisplay(commission.user),
        plan: commission.plan,
        kind: commission.kind,
        amount: commission.amount,
        status: commission.status,
        createdAt: commission.createdAt,
        approvedAt: commission.approvedAt,
        paidAt: commission.paidAt,
      })),
    },
  };
}

export async function getCurrentUserAffiliateDashboard(): Promise<ActionResultWithData<AffiliatePortalData | null>> {
  const currentUser = await getRequestUser();
  if (!currentUser) return { success: false, error: "Silakan login terlebih dahulu" };
  await syncAffiliateCommissions();

  const affiliator = await prisma.affiliator.findUnique({
    where: { userId: currentUser.id },
    include: {
      referrals: {
        include: {
          referredUser: {
            select: {
              id: true,
              email: true,
              role: true,
              subscription: {
                select: {
                  plan: true,
                  status: true,
                  trialEndsAt: true,
                  proTrialStartedAt: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      commissions: {
        include: { user: { select: { id: true, email: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!affiliator) return { success: true, data: null };

  const totalReferrals = affiliator.referrals.length;
  const paidConversions = affiliator.referrals.filter((referral) => referral.convertedAt).length;
  const typedCommissions = affiliator.commissions.map((commission) => ({
    ...commission,
    kind: commission.kind as AffiliateCommissionKind,
    status: commission.status as AffiliateCommissionStatus,
  }));

  return {
    success: true,
    data: {
      affiliator: { name: affiliator.name, code: affiliator.code, status: affiliator.status as AffiliatorStatus },
      links: { referralLink: getReferralLink(affiliator.code) },
      stats: {
        totalReferrals,
        paidConversions,
        conversionRate: totalReferrals === 0 ? 0 : Math.round((paidConversions / totalReferrals) * 100),
        pendingAmount: sumCommissions(typedCommissions, "pending"),
        approvedAmount: sumCommissions(typedCommissions, "approved"),
        paidAmount: sumCommissions(typedCommissions, "paid"),
        rejectedAmount: sumCommissions(typedCommissions, "rejected"),
      },
      referrals: affiliator.referrals.map((referral) => ({
        id: referral.id,
        customer: customerDisplay(referral.referredUser),
        joinedAt: referral.createdAt,
        convertedAt: referral.convertedAt,
        canGrantProTrial: canGrantReferralProTrial(referral),
        subscriptionStatus: referral.referredUser.subscription?.status ?? null,
        trialEndsAt: referral.referredUser.subscription?.trialEndsAt ?? null,
        proTrialStartedAt: referral.referredUser.subscription?.proTrialStartedAt ?? null,
      })),
      commissions: typedCommissions.map((commission) => ({
        id: commission.id,
        customer: customerDisplay(commission.user),
        plan: commission.plan,
        kind: commission.kind,
        amount: commission.amount,
        status: commission.status,
        createdAt: commission.createdAt,
        approvedAt: commission.approvedAt,
        paidAt: commission.paidAt,
      })),
    },
  };
}
