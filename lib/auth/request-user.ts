import { cache } from "react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import type { SubscriptionPlan } from "@/lib/plans";
import { AuthError } from "./authorization";
import { resolveEffectivePlan } from "./plan";

export type UserRole = "admin" | "staff" | "technician" | "superuser";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  plan: SubscriptionPlan;
  tokoIds: string[];
}

export const getRequestUser = cache(async (): Promise<AuthUser | null> => {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session?.user) return null;

  const role = session.user.role as UserRole;

  const userToko = await prisma.userToko.findMany({
    where: { userId: session.user.id },
    select: { tokoId: true },
  });

  const tokoIds = userToko.map((t) => t.tokoId);
  const plan = await resolveEffectivePlan(session.user.id, role, tokoIds);

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role,
    plan,
    tokoIds,
  };
});

export async function requireRequestUser(): Promise<AuthUser> {
  const user = await getRequestUser();
  if (!user) throw new AuthError("unauthorized", "Silakan login terlebih dahulu");
  return user;
}
