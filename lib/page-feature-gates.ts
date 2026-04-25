import { FEATURE_REGISTRY, getFeatureLockReason, type FeatureKey } from "@/lib/features";
import { canAccessToko, getAuthUser, getEffectivePlanForToko } from "@/lib/rbac";
import { getDisabledFeaturesForToko } from "@/actions/feature-settings";

export type PageFeatureAccessReason = "unauthorized" | "toko_denied" | "role_denied" | "plan_required" | "disabled_by_toko" | null;

export async function getPageFeatureAccess(tokoId: string, feature: FeatureKey) {
  const user = await getAuthUser();

  if (!user) {
    return {
      user: null,
      allowed: false,
      reason: "unauthorized" as const,
      metadata: FEATURE_REGISTRY[feature],
    };
  }

  if (!canAccessToko(user, tokoId)) {
    return {
      user,
      allowed: false,
      reason: "toko_denied" as const,
      metadata: FEATURE_REGISTRY[feature],
    };
  }

  const plan = await getEffectivePlanForToko(user, tokoId);
  const disabledFeatures = await getDisabledFeaturesForToko(tokoId);
  
  const reason = getFeatureLockReason({
    plan,
    role: user.role,
    feature,
    disabledFeatures,
  });

  return {
    user,
    allowed: reason === null,
    reason,
    metadata: FEATURE_REGISTRY[feature],
  };
}
