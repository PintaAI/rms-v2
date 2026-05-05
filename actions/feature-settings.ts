"use server";

import prisma from "@/lib/prisma";
import {
  FEATURE_REGISTRY,
  FEATURE_KEYS,
  isFeatureKey,
  isPlanAtLeast,
  type SubscriptionPlan,
  type FeatureKey,
} from "@/lib/features";
import type { ActionResultWithData } from "@/lib/auth/authorization";
import { revalidatePath } from "next/cache";
import { withScope } from "@/lib/auth/wrapper";

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
  return withScope(tokoId, {}, async () => {
    const setting = await prisma.tokoFeatureSetting.findUnique({
      where: { tokoId },
      select: { tokoId: true, disabledFeatures: true },
    });

    if (!setting) return { tokoId, disabledFeatures: [] };

    return { tokoId, disabledFeatures: parseDisabledFeatures(setting.disabledFeatures) };
  });
}

export async function getTokoFeatureSettingsWithStatus(
  tokoId: string
): Promise<ActionResultWithData<FeatureSettingsStatusData>> {
  return withScope(tokoId, {}, async (scope) => {
    const toko = await prisma.toko.findUnique({
      where: { id: tokoId },
      select: { name: true },
    });

    if (!toko) throw new Error("Toko not found");

    const disabledFeatures = scope.disabledFeatures;

    const rows: FeatureSettingRow[] = FEATURE_KEYS.map((key) => {
      const metadata = FEATURE_REGISTRY[key];
      const isPlanAllowed = isPlanAtLeast(scope.plan, metadata.minimumPlan);
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

    return { tokoId, tokoName: toko.name, plan: scope.plan, features: rows };
  });
}

export async function updateTokoFeatureSettings(
  tokoId: string,
  disabledFeatures: FeatureKey[]
): Promise<ActionResultWithData<TokoFeatureSettingsData>> {
  return withScope(tokoId, { role: ["admin"] }, async (scope) => {
    for (const feature of disabledFeatures) {
      const metadata = FEATURE_REGISTRY[feature];

      if (!metadata) throw new Error(`Invalid feature: ${feature}`);
      if (!metadata.configurable) throw new Error(`${metadata.label} cannot be disabled`);
      if (!isPlanAtLeast(scope.plan, metadata.minimumPlan)) {
        throw new Error(`${metadata.label} requires ${metadata.minimumPlan} plan`);
      }
    }

    const validFeatures = disabledFeatures.filter(isFeatureKey);

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

    return { tokoId, disabledFeatures: parseDisabledFeatures(setting.disabledFeatures) };
  });
}

export async function setTokoFeatureEnabled(
  tokoId: string,
  feature: FeatureKey,
  enabled: boolean
): Promise<ActionResultWithData<TokoFeatureSettingsData>> {
  return withScope(tokoId, { role: ["admin"] }, async (scope) => {
    if (!isFeatureKey(feature)) throw new Error("Invalid feature");

    const metadata = FEATURE_REGISTRY[feature];

    if (!metadata.configurable) throw new Error(`${metadata.label} cannot be disabled`);
    if (!isPlanAtLeast(scope.plan, metadata.minimumPlan)) {
      throw new Error(`${metadata.label} requires ${metadata.minimumPlan} plan`);
    }

    const existing = await prisma.tokoFeatureSetting.findUnique({
      where: { tokoId },
      select: { disabledFeatures: true },
    });

    const currentDisabled = existing ? parseDisabledFeatures(existing.disabledFeatures) : [];
    const newDisabled: FeatureKey[] = enabled
      ? currentDisabled.filter((f) => f !== feature)
      : currentDisabled.includes(feature)
        ? currentDisabled
        : [...currentDisabled, feature];

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

    return { tokoId, disabledFeatures: parseDisabledFeatures(setting.disabledFeatures) };
  });
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
