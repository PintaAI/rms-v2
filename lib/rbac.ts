import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";

export type UserRole = "admin" | "staff" | "technician";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
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

  const userToko = await prisma.userToko.findMany({
    where: { userId: session.user.id },
    select: { tokoId: true },
  });

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role as UserRole,
    tokoIds: userToko.map((t) => t.tokoId),
  };
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireRole(role: UserRole): Promise<AuthUser> {
  const user = await requireAuth();
  if (user.role !== role && user.role !== "admin") {
    throw new Error("Access denied");
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

export function canAccessToko(user: AuthUser, tokoId: string): boolean {
  if (isAdmin(user)) return true;
  return user.tokoIds.includes(tokoId);
}

export function getTargetTokoId(user: AuthUser, tokoId?: string): string | null {
  if (tokoId) return tokoId;
  if (user.tokoIds.length > 0) return user.tokoIds[0];
  return null;
}
