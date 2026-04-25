"use server";

// DEV-ONLY: This file will be removed before production deployment.
// Bypasses payment flow for testing subscription plan changes.

import { getAuthUser } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import type { SubscriptionPlan } from "@/lib/features";

export async function setDevUserPlan(plan: SubscriptionPlan) {
  const user = await getAuthUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  if (user.role !== "admin") {
    return { success: false, error: "Only admins can change subscription plan" };
  }

  await prisma.subscription.upsert({
    where: { userId: user.id },
    update: { plan },
    create: { userId: user.id, plan },
  });

  return {
    success: true,
    data: { plan },
  };
}