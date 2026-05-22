import { cache } from "react";
import prisma from "@/lib/prisma";
import { isPlanAtLeast, normalizePlan, type SubscriptionPlan } from "@/lib/plans";
import type { AuthUser, UserRole } from "./request-user";
import { ensureUserSubscription, refreshSubscriptionStatus } from "@/lib/subscription-billing";
import type { SubscriptionStatus } from "@/prisma/generated/prisma/enums";

type EffectivePlanResult = {
  plan: SubscriptionPlan;
  status: SubscriptionStatus | null;
};

function getHighestPlan(plans: Array<string | null | undefined>): SubscriptionPlan {
  return plans.reduce<SubscriptionPlan>((highestPlan, plan) => {
    const normalizedPlan = normalizePlan(plan);
    return isPlanAtLeast(normalizedPlan, highestPlan) ? normalizedPlan : highestPlan;
  }, "free");
}

async function resolveEffectivePlan(userId: string, role: UserRole, storeIds: string[]): Promise<EffectivePlanResult> {
  const subscription = role === "admin"
    ? await ensureUserSubscription(userId)
    : await prisma.subscription.findUnique({ where: { userId } });

  if (role === "admin" || storeIds.length === 0) {
    return { plan: normalizePlan(subscription?.plan), status: subscription?.status ?? null };
  }

  const adminUsers = await prisma.user.findMany({
    where: {
      role: "admin",
      storeAssignments: {
        some: {
          storeId: { in: storeIds },
        },
      },
    },
    select: {
      subscription: {
        select: { id: true, plan: true, status: true },
      },
    },
  });

  const refreshedSubscriptions = await Promise.all(
    adminUsers.map((admin) => admin.subscription?.id ? refreshSubscriptionStatus(admin.subscription.id) : null)
  );
  const highestPlan = getHighestPlan([
    subscription?.plan,
    ...refreshedSubscriptions.map((adminSubscription) => adminSubscription?.plan),
  ]);
  const ownerSubscription = refreshedSubscriptions.find((adminSubscription) => adminSubscription?.plan === highestPlan) ?? refreshedSubscriptions[0];

  return { plan: highestPlan, status: ownerSubscription?.status ?? null };
}

export const getEffectivePlanForStore = cache(async (user: AuthUser, storeId: string): Promise<SubscriptionPlan> => {
  if (user.role === "admin") {
    return user.plan;
  }

  const adminUsers = await prisma.user.findMany({
    where: {
      role: "admin",
      storeAssignments: {
        some: { storeId },
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
