import { cache } from "react";
import prisma from "@/lib/prisma";
import { isPlanAtLeast, normalizePlan, type SubscriptionPlan } from "@/lib/plans";
import type { AuthUser, UserRole } from "./request-user";

function getHighestPlan(plans: Array<string | null | undefined>): SubscriptionPlan {
  return plans.reduce<SubscriptionPlan>((highestPlan, plan) => {
    const normalizedPlan = normalizePlan(plan);
    return isPlanAtLeast(normalizedPlan, highestPlan) ? normalizedPlan : highestPlan;
  }, "free");
}

async function resolveEffectivePlan(userId: string, role: UserRole, tokoIds: string[]): Promise<SubscriptionPlan> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { plan: true },
  });

  if (role === "admin" || tokoIds.length === 0) {
    return normalizePlan(subscription?.plan);
  }

  const adminUsers = await prisma.user.findMany({
    where: {
      role: "admin",
      tokoAssignments: {
        some: {
          tokoId: { in: tokoIds },
        },
      },
    },
    select: {
      subscription: {
        select: { plan: true },
      },
    },
  });

  return getHighestPlan([
    subscription?.plan,
    ...adminUsers.map((admin) => admin.subscription?.plan),
  ]);
}

export const getEffectivePlanForToko = cache(async (user: AuthUser, tokoId: string): Promise<SubscriptionPlan> => {
  if (user.role === "admin") {
    return user.plan;
  }

  const adminUsers = await prisma.user.findMany({
    where: {
      role: "admin",
      tokoAssignments: {
        some: { tokoId },
      },
    },
    select: {
      subscription: {
        select: { plan: true },
      },
    },
  });

  return getHighestPlan(adminUsers.map((admin) => admin.subscription?.plan));
});

export { resolveEffectivePlan };
