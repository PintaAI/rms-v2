"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  FEATURE_KEYS,
  FEATURE_REGISTRY,
  getPlanLimit,
  isPlanAtLeast,
  type FeatureCategory,
  type FeatureKey,
  type SubscriptionPlan,
} from "@/lib/features";
import type { ActionResult, ActionResultWithData } from "@/lib/rbac";
import { getAuthUser } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function getUserTokoList() {
  const user = await getAuthUser();

  if (!user) {
    return [];
  }

  const assignments = await prisma.userToko.findMany({
    where: { userId: user.id },
    include: {
      toko: {
        select: {
          id: true,
          name: true,
          status: true,
          logoUrl: true,
          address: true,
        },
      },
    },
  });

  return assignments.map((a) => ({
    id: a.toko.id,
    name: a.toko.name,
    status: a.toko.status,
    role: a.role,
    logoUrl: a.toko.logoUrl,
    address: a.toko.address,
  }));
}

export async function getCurrentAuthUser() {
  const user = await getAuthUser();

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    plan: user.plan,
  };
}

export type BillingFeatureSummary = {
  key: FeatureKey;
  label: string;
  description: string;
  category: FeatureCategory;
  minimumPlan: SubscriptionPlan;
};

export type BillingPlanSummary = {
  plan: SubscriptionPlan;
  tokoId: string | null;
  limits: {
    tokos: number | null;
    staff: number | null;
    technicians: number | null;
  };
  usage: {
    tokos: number;
    staff: number;
    technicians: number;
  };
  includedFeatures: BillingFeatureSummary[];
  lockedFeatures: BillingFeatureSummary[];
};

export async function getBillingPlanSummary(tokoId?: string): Promise<ActionResultWithData<BillingPlanSummary>> {
  const user = await getAuthUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const targetTokoId = tokoId && user.tokoIds.includes(tokoId) ? tokoId : user.tokoIds[0] ?? null;

  const [staff, technicians] = targetTokoId
    ? await Promise.all([
        prisma.userToko.count({
          where: {
            tokoId: targetTokoId,
            user: { role: "staff" },
          },
        }),
        prisma.userToko.count({
          where: {
            tokoId: targetTokoId,
            user: { role: "technician" },
          },
        }),
      ])
    : [0, 0];

  const features = FEATURE_KEYS.map((featureKey) => {
    const feature = FEATURE_REGISTRY[featureKey];
    return {
      key: feature.key,
      label: feature.label,
      description: feature.description,
      category: feature.category,
      minimumPlan: feature.minimumPlan,
    };
  });

  return {
    success: true,
    data: {
      plan: user.plan,
      tokoId: targetTokoId,
      limits: {
        tokos: getPlanLimit(user.plan, "maxTokos"),
        staff: getPlanLimit(user.plan, "maxStaff"),
        technicians: getPlanLimit(user.plan, "maxTechnicians"),
      },
      usage: {
        tokos: user.tokoIds.length,
        staff,
        technicians,
      },
      includedFeatures: features.filter((feature) => isPlanAtLeast(user.plan, feature.minimumPlan)),
      lockedFeatures: features.filter((feature) => !isPlanAtLeast(user.plan, feature.minimumPlan)),
    },
  };
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<ActionResult> {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    await auth.api.changePassword({
      headers: headersList,
      body: {
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      },
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error changing password:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to change password" };
  }
}

export async function updateProfile(
  name: string,
  image?: string | null
): Promise<ActionResult> {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    await auth.api.updateUser({
      headers: headersList,
      body: {
        name,
        image: image ?? undefined,
      },
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error updating profile:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update profile" };
  }
}

export async function uploadAvatar(file: File): Promise<ActionResultWithData<string>> {
  try {
    const user = await getAuthUser();
    const headersList = await headers();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { put } = await import("@vercel/blob");
    const blob = await put(`avatars/${user.id}/${Date.now()}-${file.name}`, file, {
      access: "public",
    });

    const imageUrl = blob.url;

    await auth.api.updateUser({
      headers: headersList,
      body: {
        image: imageUrl,
      },
    });

    revalidatePath("/");
    return { success: true, data: imageUrl };
  } catch (error) {
    console.error("Error uploading avatar:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to upload avatar" };
  }
}
