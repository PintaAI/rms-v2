import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { isPlanAtLeast, normalizePlan, type SubscriptionPlan } from "@/lib/features";

export type UserRole = "admin" | "staff" | "technician" | "superuser";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  plan: SubscriptionPlan;
  tokoIds: string[];
}

export interface ActionResult {
  success: boolean;
  error?: string;
}

export interface ActionResultWithData<T> extends ActionResult {
  data?: T;
}

export async function getAuthUser(): Promise<AuthUser | null> {
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

export async function getEffectivePlanForToko(user: AuthUser, tokoId: string): Promise<SubscriptionPlan> {
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
}

function getHighestPlan(plans: Array<string | null | undefined>): SubscriptionPlan {
  return plans.reduce<SubscriptionPlan>((highestPlan, plan) => {
    const normalizedPlan = normalizePlan(plan);
    return isPlanAtLeast(normalizedPlan, highestPlan) ? normalizedPlan : highestPlan;
  }, "free");
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireRole(role: UserRole): Promise<AuthUser> {
  const user = await requireAuth();
  if (user.role !== role && user.role !== "admin" && user.role !== "superuser") {
    throw new Error("Access denied");
  }
  return user;
}

export async function requireSuperuser(): Promise<AuthUser> {
  const user = await requireAuth();
  if (user.role !== "superuser") {
    throw new Error("Superuser access required");
  }
  return user;
}

export async function requireAdmin(): Promise<AuthUser> {
  return requireRole("admin");
}

export async function requireStaff(): Promise<AuthUser> {
  return requireRole("staff");
}

export async function requireStaffOrAdmin(): Promise<AuthUser> {
  return requireStaff();
}

export async function requireTechnician(): Promise<AuthUser> {
  return requireRole("technician");
}

export async function requireTechnicianOrAdmin(): Promise<AuthUser> {
  return requireTechnician();
}

export async function requireTokoAccess(tokoId: string): Promise<void> {
  const user = await requireAuth();
  if (!canAccessToko(user, tokoId)) {
    throw new Error("Access denied");
  }
}

export async function requireServiceAssignment(serviceId: string): Promise<AuthUser> {
  const user = await requireTechnician();

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { technicianId: true },
  });

  if (!service) throw new Error("Not found");

  if (isTechnician(user) && service.technicianId !== user.id) {
    throw new Error("Access denied");
  }

  return user;
}

export function unauthorized(): ActionResult {
  return { success: false, error: "Unauthorized" };
}

export function forbidden(message?: string): ActionResult {
  return { success: false, error: message || "Access denied" };
}

export function notFound(resource: string): ActionResultWithData<never> {
  return { success: false, error: `${resource} not found` };
}

export function isAdmin(user: AuthUser): boolean {
  return user.role === "admin";
}

export function isStaff(user: AuthUser): boolean {
  return user.role === "staff";
}

export function isTechnician(user: AuthUser): boolean {
  return user.role === "technician";
}

export function isSuperuser(user: AuthUser): boolean {
  return user.role === "superuser";
}

export function canAccessToko(user: AuthUser, tokoId: string): boolean {
  return user.tokoIds.includes(tokoId);
}

export function getTargetTokoId(user: AuthUser, tokoId?: string): string | null {
  if (tokoId) return tokoId;
  if (user.tokoIds.length > 0) return user.tokoIds[0];
  return null;
}
