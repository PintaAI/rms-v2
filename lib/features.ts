export type UserRole = "admin" | "staff" | "technician";

export type SubscriptionPlan = "free" | "premium" | "enterprise";

export type FeatureCategory = "dashboard" | "toko" | "service" | "inventory" | "team" | "analytics";

export type FeatureKey =
  | "dashboard.overview"
  | "toko.manage"
  | "service.management"
  | "service.manualItems"
  | "inventory.management"
  | "karyawan.management"
  | "staff.workflow"
  | "technician.workflow"
  | "service.technicianAssignment"
  | "service.invoice"
  | "activityLog.view"
  | "analytics.revenue"
  | "inventory.audit";

export type PlanLimitKey = "maxTokos" | "maxStaff" | "maxTechnicians" | "maxServicesMonthly" | "maxInvoicesMonthly";

export type FeatureLockReason = "role_denied" | "plan_required" | "disabled_by_toko";

export type FeatureAccessMap = Partial<Record<FeatureKey, boolean>>;

export interface FeatureMetadata {
  key: FeatureKey;
  label: string;
  description: string;
  category: FeatureCategory;
  allowedRoles: readonly UserRole[];
  minimumPlan: SubscriptionPlan;
  configurable: boolean;
}

export interface FeatureAccessInput {
  plan?: string | null;
  role: UserRole;
  feature: FeatureKey;
  disabledFeatures?: readonly FeatureKey[];
}

const PLAN_ORDER: Record<SubscriptionPlan, number> = {
  free: 0,
  premium: 1,
  enterprise: 2,
};

const PLAN_LIMITS: Record<SubscriptionPlan, Record<PlanLimitKey, number | null>> = {
  free: {
    maxTokos: 1,
    maxStaff: 0,
    maxTechnicians: 0,
    maxServicesMonthly: 50,
    maxInvoicesMonthly: 50,
  },
  premium: {
    maxTokos: 3,
    maxStaff: 5,
    maxTechnicians: 5,
    maxServicesMonthly: null,
    maxInvoicesMonthly: null,
  },
  enterprise: {
    maxTokos: null,
    maxStaff: null,
    maxTechnicians: null,
    maxServicesMonthly: null,
    maxInvoicesMonthly: null,
  },
};

export const FEATURE_REGISTRY = {
  "dashboard.overview": {
    key: "dashboard.overview",
    label: "Dashboard Overview",
    description: "Ringkasan operasional toko dan aktivitas utama.",
    category: "dashboard",
    allowedRoles: ["admin", "staff", "technician"],
    minimumPlan: "free",
    configurable: false,
  },
  "toko.manage": {
    key: "toko.manage",
    label: "Manajemen Toko",
    description: "Kelola profil, data, dan pengaturan dasar toko.",
    category: "toko",
    allowedRoles: ["admin"],
    minimumPlan: "free",
    configurable: false,
  },
  "service.management": {
    key: "service.management",
    label: "Manajemen Service",
    description: "Buat dan kelola data service pelanggan.",
    category: "service",
    allowedRoles: ["admin", "staff"],
    minimumPlan: "free",
    configurable: false,
  },
  "service.manualItems": {
    key: "service.manualItems",
    label: "Tambah Invoice Manual",
    description: "Tambahkan item manual ke pekerjaan service tanpa memakai inventory.",
    category: "service",
    allowedRoles: ["admin", "staff", "technician"],
    minimumPlan: "free",
    configurable: true,
  },
  "inventory.management": {
    key: "inventory.management",
    label: "Manajemen Inventory",
    description: "Kelola sparepart, jasa, stok, dan daftar harga.",
    category: "inventory",
    allowedRoles: ["admin", "staff", "technician"],
    minimumPlan: "premium",
    configurable: true,
  },
  "karyawan.management": {
    key: "karyawan.management",
    label: "Manajemen Karyawan",
    description: "Kelola akun staff dan teknisi toko.",
    category: "team",
    allowedRoles: ["admin"],
    minimumPlan: "premium",
    configurable: true,
  },
  "staff.workflow": {
    key: "staff.workflow",
    label: "Workflow Staff",
    description: "Akses workflow operasional staff untuk service dan inventory.",
    category: "team",
    allowedRoles: ["admin", "staff"],
    minimumPlan: "premium",
    configurable: true,
  },
  "technician.workflow": {
    key: "technician.workflow",
    label: "Workflow Teknisi",
    description: "Akses tugas teknisi dan alur pengerjaan service.",
    category: "team",
    allowedRoles: ["admin", "technician"],
    minimumPlan: "premium",
    configurable: true,
  },
  "service.technicianAssignment": {
    key: "service.technicianAssignment",
    label: "Assignment Teknisi",
    description: "Assign teknisi ke pekerjaan service.",
    category: "service",
    allowedRoles: ["admin", "staff"],
    minimumPlan: "premium",
    configurable: true,
  },
  "service.invoice": {
    key: "service.invoice",
    label: "Invoice Service",
    description: "Buat dan kelola invoice untuk pekerjaan service.",
    category: "service",
    allowedRoles: ["admin", "staff"],
    minimumPlan: "premium",
    configurable: true,
  },
  "activityLog.view": {
    key: "activityLog.view",
    label: "Activity Log",
    description: "Lihat riwayat aktivitas operasional toko.",
    category: "analytics",
    allowedRoles: ["admin"],
    minimumPlan: "premium",
    configurable: true,
  },
  "analytics.revenue": {
    key: "analytics.revenue",
    label: "Revenue Analytics",
    description: "Pantau performa pendapatan dan metrik service.",
    category: "analytics",
    allowedRoles: ["admin"],
    minimumPlan: "premium",
    configurable: true,
  },
  "inventory.audit": {
    key: "inventory.audit",
    label: "Audit Gudang",
    description: "Jalankan audit stok fisik dan penyesuaian inventory.",
    category: "inventory",
    allowedRoles: ["admin"],
    minimumPlan: "enterprise",
    configurable: true,
  },
} as const satisfies Record<FeatureKey, FeatureMetadata>;

export const FEATURE_KEYS = Object.keys(FEATURE_REGISTRY) as FeatureKey[];

export const SUBSCRIPTION_PLANS = ["free", "premium", "enterprise"] as const satisfies readonly SubscriptionPlan[];

export const PLAN_LIMIT_KEYS = ["maxTokos", "maxStaff", "maxTechnicians"] as const satisfies readonly PlanLimitKey[];

export function normalizePlan(plan: string | null | undefined): SubscriptionPlan {
  return isSubscriptionPlan(plan) ? plan : "free";
}

export function isSubscriptionPlan(plan: string | null | undefined): plan is SubscriptionPlan {
  return plan === "free" || plan === "premium" || plan === "enterprise";
}

export function isFeatureKey(feature: string): feature is FeatureKey {
  return Object.prototype.hasOwnProperty.call(FEATURE_REGISTRY, feature);
}

export function isPlanAtLeast(plan: string | null | undefined, minimumPlan: SubscriptionPlan): boolean {
  return PLAN_ORDER[normalizePlan(plan)] >= PLAN_ORDER[minimumPlan];
}

export function canUseFeature(input: FeatureAccessInput): boolean {
  return getFeatureLockReason(input) === null;
}

export function getFeatureLockReason(input: FeatureAccessInput): FeatureLockReason | null {
  const feature = FEATURE_REGISTRY[input.feature];

  if (!(feature.allowedRoles as readonly UserRole[]).includes(input.role)) {
    return "role_denied";
  }

  if (!isPlanAtLeast(input.plan, feature.minimumPlan)) {
    return "plan_required";
  }

  if (input.disabledFeatures?.includes(input.feature)) {
    return "disabled_by_toko";
  }

  return null;
}

export function getPlanLimit(plan: string | null | undefined, limitKey: PlanLimitKey): number | null {
  return PLAN_LIMITS[normalizePlan(plan)][limitKey];
}

export function getConfigurableFeatures(plan: string | null | undefined): FeatureMetadata[] {
  return FEATURE_KEYS
    .map((feature) => FEATURE_REGISTRY[feature])
    .filter((feature) => feature.configurable && isPlanAtLeast(plan, feature.minimumPlan));
}

export function getFeaturesForPlan(plan: string | null | undefined): FeatureMetadata[] {
  return FEATURE_KEYS
    .map((feature) => FEATURE_REGISTRY[feature])
    .filter((feature) => isPlanAtLeast(plan, feature.minimumPlan));
}
