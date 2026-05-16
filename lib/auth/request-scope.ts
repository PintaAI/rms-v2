import { cache } from "react";
import type { UserRole, AuthUser } from "./request-user";
import { requireRequestUser } from "./request-user";
import { AuthError, assertTokoAccess } from "./authorization";
import { getEffectivePlanForToko } from "./plan";
import { getDisabledFeaturesForToko as fetchDisabledFeatures } from "@/actions/feature-settings";
import { FEATURE_REGISTRY, getFeatureLockReason, type FeatureKey, type FeatureAccessMap, type FeatureLockReason, type FeatureMetadata } from "@/lib/features";
import { getPlanLimit, type SubscriptionPlan, type PlanLimitKey } from "@/lib/plans";
import { getUserPermissionOverrides } from "@/lib/permission-overrides";
import {
  computeAllPermissionAccess,
  type PermissionAccessMap,
  type PermissionKey,
  type PermissionLockReason,
  type PermissionOverrideInput,
} from "@/lib/permissions";

export type CapabilityKey = "dashboard.overview" | "toko.manage" | "service.management";

export type CapabilityAccessMap = Record<CapabilityKey, boolean>;

const CAPABILITY_REGISTRY: Record<CapabilityKey, { allowedRoles: readonly UserRole[] }> = {
  "dashboard.overview": {
    allowedRoles: ["admin", "staff", "technician"],
  },
  "toko.manage": {
    allowedRoles: ["admin"],
  },
  "service.management": {
    allowedRoles: ["admin", "staff"],
  },
};

export function getCapabilityAccessMap(role: UserRole): CapabilityAccessMap {
  return Object.fromEntries(
    (Object.keys(CAPABILITY_REGISTRY) as CapabilityKey[]).map((key) => [
      key,
      (CAPABILITY_REGISTRY[key].allowedRoles as readonly UserRole[]).includes(role),
    ])
  ) as CapabilityAccessMap;
}

function getFeatureAccessMap(
  role: UserRole,
  plan: SubscriptionPlan,
  disabledFeatures: FeatureKey[]
): FeatureAccessMap {
  const features = Object.keys(FEATURE_REGISTRY) as FeatureKey[];
  return Object.fromEntries(
    features.map((feature) => [
      feature,
      getFeatureLockReason({ plan, role, feature, disabledFeatures }) === null,
    ])
  ) as FeatureAccessMap;
}

const getCachedDisabledFeatures = cache(async (tokoId: string): Promise<FeatureKey[]> => {
  return fetchDisabledFeatures(tokoId);
});

function getScopePlan(user: AuthUser, tokoId: string): Promise<SubscriptionPlan> | SubscriptionPlan {
  if (user.role === "admin" || (user.tokoIds.length === 1 && user.tokoIds[0] === tokoId)) {
    return user.plan;
  }

  return getEffectivePlanForToko(user, tokoId);
}

export type RequestScope = {
  user: AuthUser;
  tokoId: string;
  plan: SubscriptionPlan;
  subscriptionStatus: AuthUser["subscriptionStatus"];
  disabledFeatures: FeatureKey[];
  featureAccess: FeatureAccessMap;
  permissionOverrides: PermissionOverrideInput[];
  permissionAccess: PermissionAccessMap;
  capabilities: CapabilityAccessMap;
};

export const getRequestScope = cache(async (tokoId: string): Promise<RequestScope> => {
  const user = await requireRequestUser();
  assertTokoAccess(user, tokoId);

  const [plan, disabledFeatures, permissionOverrides] = await Promise.all([
    getScopePlan(user, tokoId),
    getCachedDisabledFeatures(tokoId),
    getUserPermissionOverrides(tokoId, user.id),
  ]);

  const featureAccess = getFeatureAccessMap(user.role, plan, disabledFeatures);

  return {
    user,
    tokoId,
    plan,
    subscriptionStatus: user.subscriptionStatus,
    disabledFeatures,
    featureAccess,
    permissionOverrides,
    permissionAccess: computeAllPermissionAccess(
      user.role,
      permissionOverrides,
      (feature) => featureAccess[feature] === true,
    ),
    capabilities: getCapabilityAccessMap(user.role),
  };
});

export function can(scope: RequestScope, permissionKey: PermissionKey): boolean {
  return scope.permissionAccess[permissionKey]?.allowed === true;
}

export function getPermissionLockReason(
  scope: RequestScope,
  permissionKey: PermissionKey,
): PermissionLockReason | null {
  return scope.permissionAccess[permissionKey]?.lockReason ?? "unknown_permission";
}

export function assertPermission(scope: RequestScope, permissionKey: PermissionKey): void {
  const access = scope.permissionAccess[permissionKey];

  if (access?.allowed) return;

  if (access?.lockReason === "feature_unavailable" && access.requiredFeature) {
    assertFeature(scope, access.requiredFeature);
  }

  throw new AuthError("forbidden", "Anda tidak memiliki izin untuk aksi ini");
}

export function assertRole(scope: RequestScope, allowedRoles: UserRole[]): void {
  if (!allowedRoles.includes(scope.user.role)) {
    throw new AuthError("forbidden", "Anda tidak memiliki akses ke halaman ini");
  }
}

export function assertCapability(scope: RequestScope, capability: CapabilityKey): void {
  if (!scope.capabilities[capability]) {
    throw new AuthError("forbidden", `Fitur '${capability}' tidak tersedia untuk peran Anda`);
  }
}

export function assertFeature(scope: RequestScope, feature: FeatureKey): void {
  if (!scope.featureAccess[feature]) {
    const reason = getFeatureLockReason({
      plan: scope.plan,
      role: scope.user.role,
      feature,
      disabledFeatures: scope.disabledFeatures,
    });

    switch (reason) {
      case "plan_required":
        throw new AuthError("feature_locked", "Fitur ini membutuhkan paket yang lebih tinggi");
      case "disabled_by_toko":
        throw new AuthError("feature_locked", "Fitur ini dinonaktifkan untuk toko ini");
      default:
        throw new AuthError("forbidden", "Fitur ini tidak tersedia");
    }
  }
}

export function assertPlanLimit(
  scope: RequestScope,
  limitKey: PlanLimitKey,
  currentCount: number,
  incomingCount: number = 1
): void {
  const limit = getPlanLimit(scope.plan, limitKey);
  if (limit !== null && currentCount + incomingCount > limit) {
    throw new AuthError("plan_limit", `Batas paket terlampaui: ${limitKey}`);
  }
}

export interface PageFeatureCheck {
  allowed: boolean;
  reason: FeatureLockReason | null;
  metadata: FeatureMetadata;
}

export function getPageFeatureCheck(scope: RequestScope, feature: FeatureKey): PageFeatureCheck {
  const reason = getFeatureLockReason({
    plan: scope.plan,
    role: scope.user.role,
    feature,
    disabledFeatures: scope.disabledFeatures,
  });
  return {
    allowed: reason === null,
    reason,
    metadata: FEATURE_REGISTRY[feature],
  };
}
