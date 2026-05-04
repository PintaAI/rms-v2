"use server";

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import prisma from "@/lib/prisma";
import { getRequestUser, requireRequestUser } from "@/lib/auth/request-user";
import type { ActionResultWithData } from "@/lib/auth/authorization";
import type { SubscriptionPlan } from "@/lib/plans";
import {
  AFFILIATE_PENDING_REFERRAL_COOKIE,
  DEFAULT_ENTERPRISE_COMMISSION,
  DEFAULT_PREMIUM_COMMISSION,
  generateAffiliatorCode,
  generatePortalToken,
  getCommissionAmount,
  getReferralLink,
  maskEmail,
  normalizeReferralCode,
} from "@/lib/affiliate";

type AffiliatorStatus = "active" | "inactive";
type AffiliateCommissionStatus = "pending" | "approved" | "paid" | "rejected";

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
}

export interface AffiliateCommissionRow {
  id: string;
  affiliatorName: string;
  customerName: string;
  customerEmail: string;
  plan: Exclude<SubscriptionPlan, "free">;
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
  }>;
  commissions: Array<{
    id: string;
    customer: string;
    plan: Exclude<SubscriptionPlan, "free">;
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

export async function getSuperuserAffiliateDashboard(): Promise<ActionResultWithData<AffiliateDashboardData>> {
  try {
    await requireSuperuser();

    const [affiliators, commissions, linkableUsers] = await Promise.all([
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
    ]);

    const rows = affiliators.map(toAffiliatorRow);
    const commissionRows: AffiliateCommissionRow[] = commissions.map((commission) => ({
      id: commission.id,
      affiliatorName: commission.affiliator.name,
      customerName: commission.user.name,
      customerEmail: commission.user.email,
      plan: commission.plan as Exclude<SubscriptionPlan, "free">,
      amount: commission.amount,
      status: commission.status as AffiliateCommissionStatus,
      createdAt: commission.createdAt,
      approvedAt: commission.approvedAt,
      paidAt: commission.paidAt,
      rejectedAt: commission.rejectedAt,
      notes: commission.notes,
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
        premiumCommissionValue: parseCommissionValue(input.premiumCommissionValue, DEFAULT_PREMIUM_COMMISSION),
        enterpriseCommissionValue: parseCommissionValue(input.enterpriseCommissionValue, DEFAULT_ENTERPRISE_COMMISSION),
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
        premiumCommissionValue: parseCommissionValue(input.premiumCommissionValue, DEFAULT_PREMIUM_COMMISSION),
        enterpriseCommissionValue: parseCommissionValue(input.enterpriseCommissionValue, DEFAULT_ENTERPRISE_COMMISSION),
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
        premiumCommissionValue: parseCommissionValue(input.premiumCommissionValue, DEFAULT_PREMIUM_COMMISSION),
        enterpriseCommissionValue: parseCommissionValue(input.enterpriseCommissionValue, DEFAULT_ENTERPRISE_COMMISSION),
        payoutInfo: parsePayoutInfo(input.payoutInfo) ?? undefined,
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

    const referral = await prisma.referral.create({
      data: { affiliatorId: affiliator.id, referredUserId: currentUser.id, referralCode: normalizedCode },
      select: { id: true },
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
}): Promise<void> {
  if (!PAID_PLANS.has(input.nextPlan)) return;
  if (input.previousPlan && PAID_PLANS.has(input.previousPlan)) return;

  const referral = await prisma.referral.findUnique({
    where: { referredUserId: input.userId },
    include: { affiliator: true },
  });
  if (!referral || referral.affiliator.status !== "active") return;

  const plan = input.nextPlan as Exclude<SubscriptionPlan, "free">;
  const amount = getCommissionAmount({
    plan,
    commissionType: referral.affiliator.commissionType,
    premiumCommissionValue: referral.affiliator.premiumCommissionValue,
    enterpriseCommissionValue: referral.affiliator.enterpriseCommissionValue,
  });

  await prisma.$transaction(async (tx) => {
    await tx.affiliateCommission.upsert({
      where: { referralId_plan: { referralId: referral.id, plan } },
      create: { affiliatorId: referral.affiliatorId, referralId: referral.id, userId: input.userId, plan, amount },
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
        id: commission.id,
        affiliatorName: commission.affiliator.name,
        customerName: commission.user.name,
        customerEmail: commission.user.email,
        plan: commission.plan as Exclude<SubscriptionPlan, "free">,
        amount: commission.amount,
        status: commission.status as AffiliateCommissionStatus,
        createdAt: commission.createdAt,
        approvedAt: commission.approvedAt,
        paidAt: commission.paidAt,
        rejectedAt: commission.rejectedAt,
        notes: commission.notes,
      },
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to update commission status:", error);
    return { success: false, error: "Failed to update commission status" };
  }
}

export async function getAffiliatePortalData(input: {
  code: string;
  token: string;
}): Promise<ActionResultWithData<AffiliatePortalData>> {
  const code = normalizeReferralCode(input.code);
  const affiliator = await prisma.affiliator.findFirst({
    where: { code, portalToken: input.token },
    include: {
      referrals: {
        include: { referredUser: { select: { id: true, email: true } } },
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
      })),
      commissions: typedCommissions.map((commission) => ({
        id: commission.id,
        customer: customerDisplay(commission.user),
        plan: commission.plan as Exclude<SubscriptionPlan, "free">,
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

  const affiliator = await prisma.affiliator.findUnique({
    where: { userId: currentUser.id },
    include: {
      referrals: {
        include: { referredUser: { select: { id: true, email: true } } },
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
      })),
      commissions: typedCommissions.map((commission) => ({
        id: commission.id,
        customer: customerDisplay(commission.user),
        plan: commission.plan as Exclude<SubscriptionPlan, "free">,
        amount: commission.amount,
        status: commission.status,
        createdAt: commission.createdAt,
        approvedAt: commission.approvedAt,
        paidAt: commission.paidAt,
      })),
    },
  };
}
