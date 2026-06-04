import prisma from "@/lib/prisma";
import { getUserPermissionOverrides } from "@/lib/permission-overrides";
import { FEATURE_REGISTRY, getFeatureLockReason, isFeatureKey, type FeatureAccessMap, type FeatureKey } from "@/lib/features";
import { computeAllPermissionAccess } from "@/lib/permissions";
import { resolveEffectivePlan, getEffectivePlanForStore } from "@/lib/auth/plan";
import {
  getCapabilityAccessMap,
  type RequestScope,
} from "@/lib/auth/request-scope";
import { AuthError } from "@/lib/auth/authorization";
import type { AuthUser, UserRole } from "@/lib/auth/request-user";

function getFeatureAccessMap(
  role: UserRole,
  plan: RequestScope["plan"],
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

async function getDisabledFeaturesForStore(storeId: string): Promise<FeatureKey[]> {
  const setting = await prisma.storeFeatureSetting.findUnique({
    where: { storeId },
    select: { disabledFeatures: true },
  });

  if (!setting) return [];

  try {
    const parsed = typeof setting.disabledFeatures === "string"
      ? JSON.parse(setting.disabledFeatures)
      : setting.disabledFeatures;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isFeatureKey);
  } catch {
    return [];
  }
}

export async function resolveMcpStoreId(userId: string, requestedStoreId?: string | null) {
  const assignments = await prisma.userStore.findMany({
    where: { userId },
    select: { storeId: true },
    orderBy: { createdAt: "asc" },
  });

  const storeIds = assignments.map((assignment) => assignment.storeId);
  if (storeIds.length === 0) throw new AuthError("forbidden", "User belum memiliki akses toko");

  if (requestedStoreId) {
    if (!storeIds.includes(requestedStoreId)) {
      throw new AuthError("forbidden", "Akses ke toko ini ditolak");
    }
    return requestedStoreId;
  }

  return storeIds[0];
}

export async function buildMcpScope(userId: string, storeId: string): Promise<RequestScope> {
  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      storeAssignments: { select: { storeId: true } },
    },
  });

  if (!userRecord) throw new AuthError("unauthorized", "User tidak ditemukan");

  const role = userRecord.role as UserRole;
  const storeIds = userRecord.storeAssignments.map((assignment) => assignment.storeId);
  if (!storeIds.includes(storeId)) throw new AuthError("forbidden", "Akses ke toko ini ditolak");

  const effectivePlan = await resolveEffectivePlan(userRecord.id, role, storeIds);
  const user: AuthUser = {
    id: userRecord.id,
    name: userRecord.name,
    email: userRecord.email,
    role,
    plan: effectivePlan.plan,
    subscriptionStatus: effectivePlan.status,
    storeIds,
  };

  const [plan, disabledFeatures, permissionOverrides, hasStoreEmployee] = await Promise.all([
    role === "admin" || (storeIds.length === 1 && storeIds[0] === storeId)
      ? user.plan
      : getEffectivePlanForStore(user, storeId),
    getDisabledFeaturesForStore(storeId),
    getUserPermissionOverrides(storeId, user.id),
    prisma.userStore.findFirst({
      where: { storeId, user: { role: { in: ["staff", "technician"] } } },
      select: { userId: true },
    }).then(Boolean),
  ]);

  const featureAccess = getFeatureAccessMap(role, plan, disabledFeatures);

  return {
    user,
    storeId,
    plan,
    subscriptionStatus: user.subscriptionStatus,
    disabledFeatures,
    featureAccess,
    permissionOverrides,
    permissionAccess: computeAllPermissionAccess(
      role,
      permissionOverrides,
      (feature) => featureAccess[feature] === true,
    ),
    capabilities: getCapabilityAccessMap(role),
    hasStoreEmployee,
  };
}
