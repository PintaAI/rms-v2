import type { ActionResult, AuthUser } from "@/lib/rbac";
import {
  FEATURE_REGISTRY,
  getFeatureLockReason,
  getPlanLimit,
  type FeatureKey,
  type PlanLimitKey,
} from "@/lib/features";

const planLabels = {
  free: "Free",
  premium: "Premium",
  enterprise: "Enterprise",
} as const;

const limitLabels: Record<PlanLimitKey, string> = {
  maxTokos: "toko",
  maxStaff: "staff",
  maxTechnicians: "technicians",
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
