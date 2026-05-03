import { getFeatureLockReason, FEATURE_REGISTRY, type FeatureKey, type PlanLimitKey } from "@/lib/features";
import { getPlanLimit, type SubscriptionPlan } from "@/lib/plans";
import type { AuthUser } from "./request-user";
import type { ActionResult } from "./authorization";
import prisma from "@/lib/prisma";
import type { ActivityType } from "@/prisma/generated/prisma/enums";

const planLabels = {
  free: "Free",
  premium: "Premium",
  enterprise: "Enterprise",
} as const;

const limitLabels: Record<PlanLimitKey, string> = {
  maxTokos: "toko",
  maxStaff: "staff",
  maxTechnicians: "technicians",
  maxServicesMonthly: "services per month",
  maxInvoicesMonthly: "invoices per month",
};

export function ensureFeatureAccess(
  user: Pick<AuthUser, "role" | "plan">,
  feature: FeatureKey,
  disabledFeatures?: readonly FeatureKey[]
): ActionResult | null {
  const reason = getFeatureLockReason({
    plan: user.plan,
    role: user.role,
    feature,
    disabledFeatures,
  });

  if (!reason) {
    return null;
  }

  const metadata = FEATURE_REGISTRY[feature];

  if (reason === "role_denied") {
    return { success: false, error: `${metadata.label} is not available for your role` };
  }

  if (reason === "plan_required") {
    return {
      success: false,
      error: `${metadata.label} requires ${planLabels[metadata.minimumPlan]} plan or higher`,
    };
  }

  return { success: false, error: `${metadata.label} is disabled for this toko` };
}

export function ensurePlanLimit(
  user: Pick<AuthUser, "plan">,
  limitKey: PlanLimitKey,
  currentCount: number,
  incomingCount = 1
): ActionResult | null {
  const limit = getPlanLimit(user.plan, limitKey);

  if (limit === null || currentCount + incomingCount <= limit) {
    return null;
  }

  return {
    success: false,
    error: `Your ${planLabels[user.plan]} plan allows ${limit} ${limitLabels[limitKey]}. Upgrade to add more.`,
  };
}

export async function ensureMonthlyActivityLimit(
  user: Pick<AuthUser, "plan">,
  limitKey: "maxServicesMonthly" | "maxInvoicesMonthly",
  activityType: ActivityType,
  tokoId: string
): Promise<ActionResult | null> {
  const limit = getPlanLimit(user.plan, limitKey);
  if (limit === null) return null;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

  const count = await prisma.activityLog.count({
    where: {
      tokoId,
      type: activityType,
      createdAt: { gte: startOfMonth },
    },
  });

  if (count >= limit) {
    return {
      success: false,
      error: `Your ${planLabels[user.plan]} plan allows ${limit} ${limitLabels[limitKey]}. Upgrade to continue.`,
    };
  }

  return null;
}
