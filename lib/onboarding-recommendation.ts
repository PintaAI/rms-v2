import {
  FEATURE_REGISTRY,
  getPlanLimit,
  isPlanAtLeast,
  normalizePlan,
  type FeatureKey,
  type SubscriptionPlan,
} from "@/lib/features";

export type BranchPlan = "one" | "twoToThree" | "moreThanThree";
export type OperationalMode = "service_catalog_item" | "retail" | "both";
export type TeamSize = "ownerOnly" | "smallTeam" | "largerTeam";
export type TeamAccess = "none" | "staffOnly" | "technicianOnly" | "staffAndTechnician";

export interface OnboardingSurveyAnswers {
  branchPlan: BranchPlan;
  operationalMode: OperationalMode;
  teamSize: TeamSize;
  teamAccess: TeamAccess;
  usesInventory: boolean;
  needsInvoices: boolean;
  needsAnalyticsAndLogs: boolean;
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
  "service.management",
  "service.manualItems",
  "service.technicianAssignment",
  "inventory.staffCreateSparepart",
  "retail.sales",
  "karyawan.management",
  "staff.workflow",
  "technician.workflow",
  "realtime.updates",
  "realtime.mobileScanner",
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
    requirePlan("premium", "Anda berencana mengelola 2-3 cabang.");
  }

  if (answers.branchPlan === "moreThanThree") {
    requirePlan("premium", "Lebih dari 2 cabang bisa memakai Pro dengan biaya tambahan per toko.");
  }

  if (answers.operationalMode === "service_catalog_item" || answers.operationalMode === "both") {
    neededFeatures.add("service.management");
  }

  if (answers.operationalMode === "retail" || answers.operationalMode === "both") {
    neededFeatures.add("retail.sales");
    neededFeatures.add("inventory.management");
  }

  if (answers.operationalMode === "both") {
    requirePlan("premium", "Free hanya bisa memakai Service atau Retail. Pro membuka keduanya sekaligus.");
  }

  if (answers.staffCount > 0 || answers.technicianCount > 0) {
    neededFeatures.add("karyawan.management");
    requirePlan("premium", "Akses staff atau teknisi membutuhkan fitur manajemen karyawan.");
  }

  if (answers.staffCount > 0) {
    neededFeatures.add("staff.workflow");
  }

  if (answers.technicianCount > 0) {
    neededFeatures.add("service.technicianAssignment");
    if (answers.teamAccess === "technicianOnly" || answers.teamAccess === "staffAndTechnician") {
      neededFeatures.add("technician.workflow");
    }
  }

  const premiumStaffLimit = getPlanLimit("premium", "maxStaff") ?? Number.POSITIVE_INFINITY;
  const premiumTechnicianLimit = getPlanLimit("premium", "maxTechnicians") ?? Number.POSITIVE_INFINITY;

  if (answers.staffCount > premiumStaffLimit || answers.technicianCount > premiumTechnicianLimit) {
    requirePlan("enterprise", "Jumlah tim melewati batas Pro dan membutuhkan konfigurasi Enterprise custom.");
  }

  if (answers.usesInventory) {
    neededFeatures.add("inventory.management");
    if (answers.staffCount > 0) neededFeatures.add("inventory.staffCreateSparepart");
  } else if (answers.operationalMode !== "retail") {
    neededFeatures.add("service.manualItems");
  }

  if (answers.usesInventory && answers.needsAudit) {
    neededFeatures.add("inventory.audit");
    requirePlan("enterprise", "Audit stok gudang adalah fitur Enterprise.");
  }

  if (answers.needsAnalyticsAndLogs) {
    neededFeatures.add("realtime.updates");
    neededFeatures.add("analytics.revenue");
    requirePlan("premium", "Statistik dan pantauan proses membutuhkan fitur analytics dan realtime update Pro.");
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
