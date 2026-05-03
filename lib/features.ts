export type UserRole = "admin" | "staff" | "technician" | "superuser";

import type { SubscriptionPlan, PlanLimitKey } from "@/lib/plans";
export type { SubscriptionPlan, PlanLimitKey };

export type FeatureCategory = "dashboard" | "toko" | "service" | "inventory" | "team" | "analytics";

export type FeatureKey =
  | "service.manualItems"
  | "inventory.management"
  | "karyawan.management"
  | "staff.workflow"
  | "technician.workflow"
  | "activityLog.view"
  | "analytics.revenue"
  | "inventory.audit";

export type FeatureLockReason = "role_denied" | "plan_required" | "disabled_by_toko";

export type FeatureAccessMap = Record<string, boolean | undefined>;

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

export const FEATURE_REGISTRY = {
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
    allowedRoles: ["admin", "staff", "technician"],
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
    label: "Analytics",
    description: "Pantau performa pendapatan, service, teknisi, dan inventory toko.",
    category: "analytics",
    allowedRoles: ["admin"],
    minimumPlan: "enterprise",
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

import {
  normalizePlan as _normalizePlan,
  isPlanAtLeast as _isPlanAtLeast,
  isSubscriptionPlan as _isSubscriptionPlan,
  getPlanLimit as _getPlanLimit,
  SUBSCRIPTION_PLANS as _SUBSCRIPTION_PLANS,
  PLAN_LIMIT_KEYS as _PLAN_LIMIT_KEYS,
} from "@/lib/plans";

export const SUBSCRIPTION_PLANS = _SUBSCRIPTION_PLANS;
export const PLAN_LIMIT_KEYS = _PLAN_LIMIT_KEYS;
export const normalizePlan = _normalizePlan;
export const isSubscriptionPlan = _isSubscriptionPlan;
export const isPlanAtLeast = _isPlanAtLeast;
export const getPlanLimit = _getPlanLimit;

export function isFeatureKey(feature: string): feature is FeatureKey {
  return Object.prototype.hasOwnProperty.call(FEATURE_REGISTRY, feature);
}

export function canUseFeature(input: FeatureAccessInput): boolean {
  return getFeatureLockReason(input) === null;
}

export function getFeatureLockReason(input: FeatureAccessInput): FeatureLockReason | null {
  const feature = FEATURE_REGISTRY[input.feature];
  if (!feature) return null;

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
