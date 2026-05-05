"use server";

import { getRequestUser } from "@/lib/auth/request-user";
import prisma from "@/lib/prisma";
import type { SubscriptionPlan } from "@/lib/features";

export async function setDevUserPlan(plan: SubscriptionPlan) {
  if (process.env.NODE_ENV !== "development") {
    return { success: false, error: "This action is only available in development" };
  }

  const user = await getRequestUser();
  if (!user) return { success: false, error: "Unauthorized" };
  if (user.role !== "admin") return { success: false, error: "Only admins can change subscription plan" };

  await prisma.subscription.upsert({
    where: { userId: user.id },
    update: { plan },
    create: { userId: user.id, plan },
  });

  return { success: true, data: { plan } };
}