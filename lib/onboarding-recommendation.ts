import {
  FEATURE_REGISTRY,
  getPlanLimit,
  isPlanAtLeast,
  normalizePlan,
  type FeatureKey,
  type SubscriptionPlan,
} from "@/lib/features";

export type BranchPlan = "one" | "twoToThree" | "moreThanThree";
export type MonthlyServiceVolume = "low" | "medium" | "high";

export interface OnboardingSurveyAnswers {
  branchPlan: BranchPlan;
  monthlyServiceVolume: MonthlyServiceVolume;
  usesInventory: boolean;
  needsTechnicianAssignment: boolean;
  needsInvoices: boolean;
  needsAnalytics: boolean;
  needsAudit: boolean;
  wantsBranding: boolean;
  staffCount: number;
  technicianCount: number;
}

export interface OnboardingPlanRecommendation {
  recommendedPlan: SubscriptionPlan;
  reasons: string[];
  recommendedFeatures: FeatureKey[];
  lockedIfFree: FeatureKey[];
  recommendedDisabledFeatures: FeatureKey[];
}

const optionalFeatureKeys: FeatureKey[] = [
  "appearance.dynamicTheme",
  "inventory.management",
  "service.inventoryItems",
  "karyawan.management",
  "staff.workflow",
  "technician.workflow",
  "service.technicianAssignment",
  "service.invoice",
  "activityLog.view",
  "analytics.revenue",
  "inventory.audit",
];

export function getOnboardingPlanRecommendation(
  answers: OnboardingSurveyAnswers,
  currentPlan?: string | null
): OnboardingPlanRecommendation {
  const reasons: string[] = [];
  const neededFeatures = new Set<FeatureKey>();
  let recommendedPlan: SubscriptionPlan = "free";

  const requirePlan = (plan: SubscriptionPlan, reason: string) => {
    if (!isPlanAtLeast(recommendedPlan, plan)) {
      recommendedPlan = plan;
    }
    reasons.push(reason);
  };

  if (answers.branchPlan === "twoToThree") {
    requirePlan("premium", "Anda berencana mengelola lebih dari 1 toko.");
  }

  if (answers.branchPlan === "moreThanThree") {
    requirePlan("enterprise", "Kebutuhan cabang melewati batas Premium.");
  }

  if (answers.staffCount > 0 || answers.technicianCount > 0) {
    neededFeatures.add("karyawan.management");
    requirePlan("premium", "Akun staff dan teknisi membutuhkan fitur manajemen karyawan.");
  }

  if (answers.staffCount > 0) {
    neededFeatures.add("staff.workflow");
  }

  if (answers.technicianCount > 0) {
    neededFeatures.add("technician.workflow");
  }

  if (answers.staffCount > (getPlanLimit("premium", "maxStaff") ?? Number.POSITIVE_INFINITY)) {
    requirePlan("enterprise", "Jumlah staff melewati batas Premium.");
  }

  if (answers.technicianCount > (getPlanLimit("premium", "maxTechnicians") ?? Number.POSITIVE_INFINITY)) {
    requirePlan("enterprise", "Jumlah teknisi melewati batas Premium.");
  }

  if (answers.usesInventory) {
    neededFeatures.add("inventory.management");
    neededFeatures.add("service.inventoryItems");
    requirePlan("premium", "Stok sparepart dan pemakaian inventory membutuhkan Premium.");
  }

  if (answers.needsTechnicianAssignment) {
    neededFeatures.add("service.technicianAssignment");
    requirePlan("premium", "Assignment teknisi membutuhkan workflow operasional Premium.");
  }

  if (answers.needsInvoices) {
    neededFeatures.add("service.invoice");
    requirePlan("premium", "Invoice service tersedia mulai Premium.");
  }

  if (answers.needsAnalytics || answers.monthlyServiceVolume === "high") {
    neededFeatures.add("activityLog.view");
    neededFeatures.add("analytics.revenue");
    requirePlan("premium", "Monitoring performa dan aktivitas toko membutuhkan fitur analytics Premium.");
  }

  if (answers.needsAudit) {
    neededFeatures.add("inventory.audit");
    requirePlan("enterprise", "Audit stok gudang adalah fitur Enterprise.");
  }

  if (answers.wantsBranding) {
    neededFeatures.add("appearance.dynamicTheme");
  }

  if (reasons.length === 0) {
    reasons.push("Kebutuhan awal Anda cocok untuk operasional dasar pemilik toko.");
  }

  const normalizedCurrentPlan = normalizePlan(currentPlan);
  const recommendedFeatures = [...neededFeatures].filter((feature) =>
    isPlanAtLeast(recommendedPlan, FEATURE_REGISTRY[feature].minimumPlan)
  );
  const lockedIfFree = recommendedFeatures.filter(
    (feature) => !isPlanAtLeast("free", FEATURE_REGISTRY[feature].minimumPlan)
  );
  const recommendedDisabledFeatures = optionalFeatureKeys.filter((feature) => {
    const metadata = FEATURE_REGISTRY[feature];
    return (
      metadata.configurable &&
      isPlanAtLeast(normalizedCurrentPlan, metadata.minimumPlan) &&
      !neededFeatures.has(feature)
    );
  });

  return {
    recommendedPlan,
    reasons,
    recommendedFeatures,
    lockedIfFree,
    recommendedDisabledFeatures,
  };
}
