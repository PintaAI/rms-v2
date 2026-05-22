import { cache } from "react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import type { SubscriptionPlan } from "@/lib/plans";
import type { SubscriptionStatus } from "@/prisma/generated/prisma/enums";
import { AuthError } from "./authorization";
import { resolveEffectivePlan } from "./plan";

export type UserRole = "admin" | "staff" | "technician" | "superuser";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  plan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus | null;
  storeIds: string[];
}

export const getRequestUser = cache(async (): Promise<AuthUser | null> => {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session?.user) return null;

  const role = session.user.role as UserRole;

  const userToko = await prisma.userStore.findMany({
    where: { userId: session.user.id },
    select: { storeId: true },
  });

  const storeIds = userToko.map((t) => t.storeId);
  const { plan, status } = await resolveEffectivePlan(session.user.id, role, storeIds);

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role,
    plan,
    subscriptionStatus: status,
    storeIds,
  };
});

export async function requireRequestUser(): Promise<AuthUser> {
  const user = await getRequestUser();
  if (!user) throw new AuthError("unauthorized", "Silakan login terlebih dahulu");
  return user;
}
