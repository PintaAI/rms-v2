"use server";

import prisma from "@/lib/prisma";
import { canAccessToko, getAuthUser, isAdmin, type ActionResultWithData } from "@/lib/rbac";
import {
  FEATURE_REGISTRY,
  FEATURE_KEYS,
  isFeatureKey,
  isPlanAtLeast,
  type SubscriptionPlan,
  type FeatureKey,
} from "@/lib/features";
import { getEffectivePlanForToko } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

export interface TokoFeatureSettingsData {
  tokoId: string;
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
  tokoId: string;
  tokoName: string;
  plan: SubscriptionPlan;
  features: FeatureSettingRow[];
}

export async function getTokoFeatureSettings(
  tokoId: string
): Promise<ActionResultWithData<TokoFeatureSettingsData>> {
  const user = await getAuthUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  if (!canAccessToko(user, tokoId)) {
    return { success: false, error: "Access denied" };
  }

  const setting = await prisma.tokoFeatureSetting.findUnique({
    where: { tokoId },
    select: { tokoId: true, disabledFeatures: true },
  });

  if (!setting) {
    return {
      success: true,
      data: { tokoId, disabledFeatures: [] },
    };
  }

  const disabledFeatures = parseDisabledFeatures(setting.disabledFeatures);

  return {
    success: true,
    data: { tokoId, disabledFeatures },
  };
}

export async function getTokoFeatureSettingsWithStatus(
  tokoId: string
): Promise<ActionResultWithData<FeatureSettingsStatusData>> {
  const user = await getAuthUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  if (!canAccessToko(user, tokoId)) {
    return { success: false, error: "Access denied" };
  }

  const toko = await prisma.toko.findUnique({
    where: { id: tokoId },
    select: { name: true },
  });

  if (!toko) {
    return { success: false, error: "Toko not found" };
  }

  const plan = await getEffectivePlanForToko(user, tokoId);

  const setting = await prisma.tokoFeatureSetting.findUnique({
    where: { tokoId },
    select: { disabledFeatures: true },
  });

  const disabledFeatures = setting ? parseDisabledFeatures(setting.disabledFeatures) : [];

  const rows: FeatureSettingRow[] = FEATURE_KEYS.map((key) => {
    const metadata = FEATURE_REGISTRY[key];
    const isPlanAllowed = isPlanAtLeast(plan, metadata.minimumPlan);
    const isDisabledByToko = disabledFeatures.includes(key);

    let status: FeatureSettingRow["status"];
    let enabled: boolean;

    if (!isPlanAllowed) {
      status = "plan_required";
      enabled = false;
    } else if (!metadata.configurable) {
      status = "required";
      enabled = true;
    } else if (isDisabledByToko) {
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

  console.group(`[feature-settings] resolved features for toko ${toko.name} (${tokoId})`);
  console.log("Current plan:", plan);
  console.log("Disabled features from database:", disabledFeatures);
  console.table(
    rows.map((feature) => ({
      key: feature.key,
      label: feature.label,
      category: feature.category,
      minimumPlan: feature.minimumPlan,
      configurable: feature.configurable,
      enabled: feature.enabled,
      status: feature.status,
      shownIn: feature.configurable ? "Fitur yang Bisa Diatur" : "Required",
      decision:
        !feature.configurable
          ? "shown as required because configurable=false"
          : feature.status === "plan_required"
            ? "shown as configurable but switch disabled because plan is below minimum"
            : feature.status === "disabled_by_toko"
              ? "shown as configurable and off because disabledFeatures contains key"
              : "shown as configurable and on",
    }))
  );
  console.groupEnd();

  return { success: true, data: { tokoId, tokoName: toko.name, plan, features: rows } };
}

export async function updateTokoFeatureSettings(
  tokoId: string,
  disabledFeatures: FeatureKey[]
): Promise<ActionResultWithData<TokoFeatureSettingsData>> {
  const user = await getAuthUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  if (!isAdmin(user)) {
    return { success: false, error: "Only admins can update feature settings" };
  }

  if (!canAccessToko(user, tokoId)) {
    return { success: false, error: "Access denied" };
  }

  const plan = await getEffectivePlanForToko(user, tokoId);

  for (const feature of disabledFeatures) {
    const metadata = FEATURE_REGISTRY[feature];

    if (!metadata) {
      return { success: false, error: `Invalid feature: ${feature}` };
    }

    if (!metadata.configurable) {
      return { success: false, error: `${metadata.label} cannot be disabled` };
    }

    if (!isPlanAtLeast(plan, metadata.minimumPlan)) {
      return { success: false, error: `${metadata.label} requires ${metadata.minimumPlan} plan` };
    }
  }

  const validFeatures = disabledFeatures.filter(isFeatureKey);

  try {
    const setting = await prisma.tokoFeatureSetting.upsert({
      where: { tokoId },
      create: {
        tokoId,
        disabledFeatures: JSON.stringify(validFeatures),
      },
      update: {
        disabledFeatures: JSON.stringify(validFeatures),
      },
      select: { tokoId: true, disabledFeatures: true },
    });

    revalidatePath(`/${tokoId}/admin`);
    revalidatePath(`/${tokoId}/admin/toko`);
    revalidatePath(`/${tokoId}/staff`);
    revalidatePath(`/${tokoId}/teknisi`);

    return {
      success: true,
      data: { tokoId, disabledFeatures: parseDisabledFeatures(setting.disabledFeatures) },
    };
  } catch (error) {
    console.error("Failed to update feature settings:", error);
    return { success: false, error: "Failed to update feature settings" };
  }
}

export async function setTokoFeatureEnabled(
  tokoId: string,
  feature: FeatureKey,
  enabled: boolean
): Promise<ActionResultWithData<TokoFeatureSettingsData>> {
  const user = await getAuthUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  if (!isAdmin(user)) {
    return { success: false, error: "Only admins can update feature settings" };
  }

  if (!canAccessToko(user, tokoId)) {
    return { success: false, error: "Access denied" };
  }

  if (!isFeatureKey(feature)) {
    return { success: false, error: "Invalid feature" };
  }

  const metadata = FEATURE_REGISTRY[feature];
  const plan = await getEffectivePlanForToko(user, tokoId);

  if (!metadata.configurable) {
    return { success: false, error: `${metadata.label} cannot be disabled` };
  }

  if (!isPlanAtLeast(plan, metadata.minimumPlan)) {
    return { success: false, error: `${metadata.label} requires ${metadata.minimumPlan} plan` };
  }

  try {
    const existing = await prisma.tokoFeatureSetting.findUnique({
      where: { tokoId },
      select: { disabledFeatures: true },
    });

    const currentDisabled = existing ? parseDisabledFeatures(existing.disabledFeatures) : [];
    let newDisabled: FeatureKey[];

    if (enabled) {
      newDisabled = currentDisabled.filter((f) => f !== feature);
    } else {
      if (!currentDisabled.includes(feature)) {
        newDisabled = [...currentDisabled, feature];
      } else {
        newDisabled = currentDisabled;
      }
    }

    const setting = await prisma.tokoFeatureSetting.upsert({
      where: { tokoId },
      create: {
        tokoId,
        disabledFeatures: JSON.stringify(newDisabled),
      },
      update: {
        disabledFeatures: JSON.stringify(newDisabled),
      },
      select: { tokoId: true, disabledFeatures: true },
    });

    revalidatePath(`/${tokoId}/admin`);
    revalidatePath(`/${tokoId}/admin/toko`);
    revalidatePath(`/${tokoId}/staff`);
    revalidatePath(`/${tokoId}/teknisi`);

    return {
      success: true,
      data: { tokoId, disabledFeatures: parseDisabledFeatures(setting.disabledFeatures) },
    };
  } catch (error) {
    console.error("Failed to update feature setting:", error);
    return { success: false, error: "Failed to update feature setting" };
  }
}

export async function getDisabledFeaturesForToko(tokoId: string): Promise<FeatureKey[]> {
  const setting = await prisma.tokoFeatureSetting.findUnique({
    where: { tokoId },
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
