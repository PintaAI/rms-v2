export type SubscriptionPlan = "free" | "premium" | "enterprise";

export type PlanLimitKey = "maxTokos" | "maxStaff" | "maxTechnicians" | "maxServicesMonthly" | "maxInvoicesMonthly";

export const SUBSCRIPTION_PLANS = ["free", "premium", "enterprise"] as const satisfies readonly SubscriptionPlan[];

export const PLAN_LIMIT_KEYS = ["maxTokos", "maxStaff", "maxTechnicians"] as const satisfies readonly PlanLimitKey[];

export const PLAN_REGISTRY = {
  free: {
    label: "Free",
    rank: 0,
    monthlyPrice: 0,
    trialDays: null,
    includedTokos: 1,
    additionalTokoPrice: null,
    limits: { maxTokos: 1, maxStaff: 1, maxTechnicians: 1, maxServicesMonthly: 20, maxInvoicesMonthly: 50 },
  },
  premium: {
    label: "Pro",
    rank: 1,
    monthlyPrice: 990_000,
    trialDays: 30,
    includedTokos: 2,
    additionalTokoPrice: 499_000,
    limits: { maxTokos: null, maxStaff: 3, maxTechnicians: 2, maxServicesMonthly: 100, maxInvoicesMonthly: null },
  },
  enterprise: {
    label: "Enterprise",
    rank: 2,
    monthlyPrice: null,
    trialDays: null,
    includedTokos: null,
    additionalTokoPrice: null,
    limits: { maxTokos: null, maxStaff: null, maxTechnicians: null, maxServicesMonthly: null, maxInvoicesMonthly: null },
  },
} as const;

export function isSubscriptionPlan(plan: string | null | undefined): plan is SubscriptionPlan {
  return plan === "free" || plan === "premium" || plan === "enterprise";
}

export function normalizePlan(plan: string | null | undefined): SubscriptionPlan {
  return isSubscriptionPlan(plan) ? plan : "free";
}

export function isPlanAtLeast(plan: string | null | undefined, minimumPlan: SubscriptionPlan): boolean {
  return PLAN_REGISTRY[normalizePlan(plan)].rank >= PLAN_REGISTRY[minimumPlan].rank;
}

export function getPlanLimit(plan: string | null | undefined, limitKey: PlanLimitKey): number | null {
  return PLAN_REGISTRY[normalizePlan(plan)].limits[limitKey];
}

export function getPlanMonthlyPrice(plan: string | null | undefined): number | null {
  return PLAN_REGISTRY[normalizePlan(plan)].monthlyPrice;
}

export function getPlanIncludedTokos(plan: string | null | undefined): number | null {
  return PLAN_REGISTRY[normalizePlan(plan)].includedTokos;
}

export function getPlanAdditionalTokoPrice(plan: string | null | undefined): number | null {
  return PLAN_REGISTRY[normalizePlan(plan)].additionalTokoPrice;
}

export function calculateMonthlyPlanAmount(plan: string | null | undefined, tokoCount: number): number | null {
  const normalizedPlan = normalizePlan(plan);
  const monthlyPrice = getPlanMonthlyPrice(normalizedPlan);
  if (monthlyPrice === null) return null;

  const includedTokos = getPlanIncludedTokos(normalizedPlan) ?? tokoCount;
  const additionalTokoPrice = getPlanAdditionalTokoPrice(normalizedPlan) ?? 0;
  const additionalTokos = Math.max(0, tokoCount - includedTokos);

  return monthlyPrice + additionalTokos * additionalTokoPrice;
}

export function getPlanOptions() {
  return SUBSCRIPTION_PLANS.map((plan) => ({
    key: plan,
    label: PLAN_REGISTRY[plan].label,
    rank: PLAN_REGISTRY[plan].rank,
    monthlyPrice: PLAN_REGISTRY[plan].monthlyPrice,
    includedTokos: PLAN_REGISTRY[plan].includedTokos,
    additionalTokoPrice: PLAN_REGISTRY[plan].additionalTokoPrice,
  }));
}
