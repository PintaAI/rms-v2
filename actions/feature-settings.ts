"use server";

import prisma from "@/lib/prisma";
import {
  FEATURE_REGISTRY,
  FEATURE_KEYS,
  getFeatureLockReason,
  isFeatureKey,
  isPlanAtLeast,
  type SubscriptionPlan,
  type FeatureKey,
} from "@/lib/features";
import type { ActionResultWithData } from "@/lib/auth/authorization";
import { revalidatePath } from "next/cache";
import { assertPermission } from "@/lib/auth/request-scope";
import { withScope } from "@/lib/auth/wrapper";

export interface StoreFeatureSettingsData {
  storeId: string;
  disabledFeatures: FeatureKey[];
}

export interface FeatureSettingRow {
  key: FeatureKey;
  label: string;
  description: string;
  category: string;
  minimumPlan: string;
  configurable: boolean;
  enabled: boolean;
  status: "enabled" | "disabled_by_toko" | "plan_required" | "required";
}

export interface FeatureSettingsStatusData {
  storeId: string;
  tokoName: string;
  plan: SubscriptionPlan;
  features: FeatureSettingRow[];
}

export async function getStoreFeatureSettings(
  storeId: string
): Promise<ActionResultWithData<StoreFeatureSettingsData>> {
  return withScope(storeId, {}, async () => {
    const setting = await prisma.storeFeatureSetting.findUnique({
      where: { storeId },
      select: { storeId: true, disabledFeatures: true },
    });

    if (!setting) return { storeId, disabledFeatures: [] };

    return { storeId, disabledFeatures: parseDisabledFeatures(setting.disabledFeatures) };
  });
}

export async function getStoreFeatureSettingsWithStatus(
  storeId: string
): Promise<ActionResultWithData<FeatureSettingsStatusData>> {
  return withScope(storeId, {}, async (scope) => {
    assertPermission(scope, "features.view");

    const toko = await prisma.store.findUnique({
      where: { id: storeId },
      select: { name: true },
    });

    if (!toko) throw new Error("Toko not found");

    const disabledFeatures = scope.disabledFeatures;

    const rows: FeatureSettingRow[] = FEATURE_KEYS.map((key) => {
      const metadata = FEATURE_REGISTRY[key];
      const lockReason = getFeatureLockReason({ plan: scope.plan, role: scope.user.role, feature: key, disabledFeatures });
      const isPlanAllowed = lockReason !== "plan_required";
      const isDisabledByToko = disabledFeatures.includes(key);

      let status: FeatureSettingRow["status"];
      let enabled: boolean;

      if (!isPlanAllowed) {
        status = "plan_required";
        enabled = false;
      } else if (!metadata.configurable) {
        status = "required";
        enabled = true;
      } else if (isDisabledByToko || lockReason === "disabled_by_toko") {
        status = "disabled_by_toko";
        enabled = false;
      } else {
        status = "enabled";
        enabled = true;
      }

      return {
        key,
        label: metadata.label,
        description: metadata.description,
        category: metadata.category,
        minimumPlan: metadata.minimumPlan,
        configurable: metadata.configurable,
        enabled,
        status,
      };
    });

    return { storeId, tokoName: toko.name, plan: scope.plan, features: rows };
  });
}

function revalidateFeaturePaths(storeId: string) {
  revalidatePath(`/${storeId}/admin`);
  revalidatePath(`/${storeId}/admin/toko`);
  revalidatePath(`/${storeId}/staff`);
  revalidatePath(`/${storeId}/teknisi`);
}

async function upsertStoreFeatureSetting(
  storeId: string,
  disabledFeatures: FeatureKey[]
): Promise<StoreFeatureSettingsData> {
  const setting = await prisma.storeFeatureSetting.upsert({
    where: { storeId },
    create: { storeId, disabledFeatures: JSON.stringify(disabledFeatures) },
    update: { disabledFeatures: JSON.stringify(disabledFeatures) },
    select: { storeId: true, disabledFeatures: true },
  });
  return { storeId, disabledFeatures: parseDisabledFeatures(setting.disabledFeatures) };
}

function normalizeDisabledFeaturesForPlan(plan: SubscriptionPlan, disabledFeatures: FeatureKey[]): FeatureKey[] {
  const normalized = new Set(disabledFeatures.filter(isFeatureKey));

  if (plan === "free") {
    const serviceDisabled = normalized.has("service.management");
    const retailDisabled = normalized.has("retail.sales");

    if (serviceDisabled && retailDisabled) {
      normalized.delete("service.management");
    } else if (!serviceDisabled && !retailDisabled) {
      normalized.add("retail.sales");
    }
  }

  return [...normalized];
}

export async function updateStoreFeatureSettings(
  storeId: string,
  disabledFeatures: FeatureKey[]
): Promise<ActionResultWithData<StoreFeatureSettingsData>> {
  return withScope(storeId, {}, async (scope) => {
    assertPermission(scope, "features.manage");

    for (const feature of disabledFeatures) {
      const metadata = FEATURE_REGISTRY[feature];
      if (!metadata) throw new Error(`Invalid feature: ${feature}`);
      if (!metadata.configurable) throw new Error(`${metadata.label} cannot be disabled`);
      if (!isPlanAtLeast(scope.plan, metadata.minimumPlan)) {
        throw new Error(`${metadata.label} requires ${metadata.minimumPlan} plan`);
      }
    }

    const result = await upsertStoreFeatureSetting(storeId, normalizeDisabledFeaturesForPlan(scope.plan, disabledFeatures));

    revalidateFeaturePaths(storeId);

    return result;
  });
}

export async function setTokoFeatureEnabled(
  storeId: string,
  feature: FeatureKey,
  enabled: boolean
): Promise<ActionResultWithData<StoreFeatureSettingsData>> {
  return withScope(storeId, {}, async (scope) => {
    assertPermission(scope, "features.manage");

    if (!isFeatureKey(feature)) throw new Error("Invalid feature");

    const metadata = FEATURE_REGISTRY[feature];
    if (!metadata.configurable) throw new Error(`${metadata.label} cannot be disabled`);
    if (!isPlanAtLeast(scope.plan, metadata.minimumPlan)) {
      throw new Error(`${metadata.label} requires ${metadata.minimumPlan} plan`);
    }

    const existing = await prisma.storeFeatureSetting.findUnique({
      where: { storeId },
      select: { disabledFeatures: true },
    });

    const currentDisabled = existing ? parseDisabledFeatures(existing.disabledFeatures) : [];
    let newDisabled: FeatureKey[] = enabled
      ? currentDisabled.filter((f) => f !== feature)
      : currentDisabled.includes(feature)
        ? currentDisabled
        : [...currentDisabled, feature];

    if (scope.plan === "free" && enabled) {
      if (feature === "service.management") {
        newDisabled = [...new Set([...newDisabled, "retail.sales"])] as FeatureKey[];
      } else if (feature === "retail.sales") {
        newDisabled = [...new Set([...newDisabled, "service.management"])] as FeatureKey[];
      }
    }

    newDisabled = normalizeDisabledFeaturesForPlan(scope.plan, newDisabled);

    const result = await upsertStoreFeatureSetting(storeId, newDisabled);

    revalidateFeaturePaths(storeId);

    return result;
  });
}

export async function getDisabledFeaturesForStore(storeId: string): Promise<FeatureKey[]> {
  const setting = await prisma.storeFeatureSetting.findUnique({
    where: { storeId },
    select: { disabledFeatures: true },
  });

  if (!setting) return [];

  return parseDisabledFeatures(setting.disabledFeatures);
}

function parseDisabledFeatures(json: unknown): FeatureKey[] {
  if (!json) return [];

  try {
    const parsed = typeof json === "string" ? JSON.parse(json) : json;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isFeatureKey);
  } catch {
    return [];
  }
}
