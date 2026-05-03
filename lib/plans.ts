export type SubscriptionPlan = "free" | "premium" | "enterprise";

export type PlanLimitKey = "maxTokos" | "maxStaff" | "maxTechnicians" | "maxServicesMonthly" | "maxInvoicesMonthly";

export const SUBSCRIPTION_PLANS = ["free", "premium", "enterprise"] as const satisfies readonly SubscriptionPlan[];

export const PLAN_LIMIT_KEYS = ["maxTokos", "maxStaff", "maxTechnicians"] as const satisfies readonly PlanLimitKey[];

export const PLAN_REGISTRY = {
  free: {
    label: "Free",
    rank: 0,
    limits: { maxTokos: 1, maxStaff: 0, maxTechnicians: 0, maxServicesMonthly: 50, maxInvoicesMonthly: 50 },
  },
  premium: {
    label: "Premium",
    rank: 1,
    limits: { maxTokos: 3, maxStaff: 5, maxTechnicians: 5, maxServicesMonthly: null, maxInvoicesMonthly: null },
  },
  enterprise: {
    label: "Enterprise",
    rank: 2,
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

export function getPlanOptions() {
  return SUBSCRIPTION_PLANS.map((plan) => ({
    key: plan,
    label: PLAN_REGISTRY[plan].label,
    rank: PLAN_REGISTRY[plan].rank,
  }));
}
