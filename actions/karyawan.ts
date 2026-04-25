"use server";

import prisma from "@/lib/prisma";
import { ensureFeatureAccess, ensurePlanLimit } from "@/lib/feature-enforcement";
import { canAccessToko, getAuthUser, isAdmin } from "@/lib/rbac";
import { getDisabledFeaturesForToko } from "@/actions/feature-settings";
import { createCredentialUserWithToko } from "@/lib/auth-helpers";
import { revalidateKaryawanPaths } from "@/lib/revalidation";
import { Prisma } from "@/prisma/generated/prisma/client";

export interface KaryawanPerformance {
  servicesCreated: number;
  servicesCompleted: number;
  servicesFailed: number;
}

export interface KaryawanItem {
  id: string;
  name: string;
  email: string;
  role: "staff" | "technician";
  createdAt: Date;
  performance?: KaryawanPerformance;
}

export interface KaryawanStats {
  staff: number;
  technician: number;
  total: number;
}

async function getKaryawanPerformanceMap(
  tokoId: string,
  assignments: Array<{
    user: {
      id: string;
      role: string;
    };
  }>
): Promise<Map<string, KaryawanPerformance>> {
  const performanceMap = new Map<string, KaryawanPerformance>();

  const staffIds = assignments
    .filter((assignment) => assignment.user.role === "staff")
    .map((assignment) => assignment.user.id);
  const technicianIds = assignments
    .filter((assignment) => assignment.user.role === "technician")
    .map((assignment) => assignment.user.id);

  const monthlyStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [staffCounts, technicianCounts] = await Promise.all([
    staffIds.length > 0
      ? prisma.service.groupBy({
          by: ["createdById"],
          where: {
            tokoId,
            createdById: { in: staffIds },
            checkinAt: { gte: monthlyStart },
          },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    technicianIds.length > 0
      ? prisma.service.groupBy({
          by: ["technicianId", "status"],
          where: {
            tokoId,
            technicianId: { in: technicianIds },
            status: { in: ["done", "failed"] },
            isPickedUp: true,
            doneAt: { gte: monthlyStart },
          },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ]);

  for (const staffId of staffIds) {
    performanceMap.set(staffId, {
      servicesCreated: 0,
      servicesCompleted: 0,
      servicesFailed: 0,
    });
  }

  for (const technicianId of technicianIds) {
    performanceMap.set(technicianId, {
      servicesCreated: 0,
      servicesCompleted: 0,
      servicesFailed: 0,
    });
  }

  for (const staffCount of staffCounts) {
    performanceMap.set(staffCount.createdById, {
      servicesCreated: staffCount._count._all,
      servicesCompleted: 0,
      servicesFailed: 0,
    });
  }

  for (const technicianCount of technicianCounts) {
    if (!technicianCount.technicianId) continue;

    const current = performanceMap.get(technicianCount.technicianId) ?? {
      servicesCreated: 0,
      servicesCompleted: 0,
      servicesFailed: 0,
    };

    if (technicianCount.status === "done") {
      current.servicesCompleted = technicianCount._count._all;
    }

    if (technicianCount.status === "failed") {
      current.servicesFailed = technicianCount._count._all;
    }

    performanceMap.set(technicianCount.technicianId, current);
  }

  return performanceMap;
}

export async function getKaryawanList(tokoId: string): Promise<{
  success: boolean;
  data?: KaryawanItem[];
  error?: string;
}> {
  const user = await getAuthUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  if (!canAccessToko(user, tokoId)) {
    return { success: false, error: "Access denied" };
  }

  const featureError = ensureFeatureAccess(user, "karyawan.management", await getDisabledFeaturesForToko(tokoId));
  if (featureError) return featureError;

  const assignments = await prisma.userToko.findMany({
    where: { tokoId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      },
    },
    take: 100,
  });

  const filteredAssignments = assignments.filter(
    (assignment) => assignment.user.role === "staff" || assignment.user.role === "technician"
  );

  const performanceMap = await getKaryawanPerformanceMap(tokoId, filteredAssignments);

  const karyawanWithPerformance = filteredAssignments.map((assignment) => ({
    id: assignment.user.id,
    name: assignment.user.name,
    email: assignment.user.email,
    role: assignment.user.role as "staff" | "technician",
    createdAt: assignment.user.createdAt,
    performance: performanceMap.get(assignment.user.id) ?? {
      servicesCreated: 0,
      servicesCompleted: 0,
      servicesFailed: 0,
    },
  }));

  return { success: true, data: karyawanWithPerformance };
}

export async function getKaryawanStats(tokoId: string): Promise<KaryawanStats> {
  const user = await getAuthUser();

  if (!user || !canAccessToko(user, tokoId)) {
    return { staff: 0, technician: 0, total: 0 };
  }

  const featureError = ensureFeatureAccess(user, "karyawan.management", await getDisabledFeaturesForToko(tokoId));
  if (featureError) {
    return { staff: 0, technician: 0, total: 0 };
  }

  const [staff, technician] = await Promise.all([
    prisma.userToko.count({
      where: {
        tokoId,
        user: { role: "staff" },
      },
    }),
    prisma.userToko.count({
      where: {
        tokoId,
        user: { role: "technician" },
      },
    }),
  ]);

  return { staff, technician, total: staff + technician };
}

export async function createKaryawan(
  tokoId: string,
  input: { name: string; email: string; password: string; role: "staff" | "technician" }
): Promise<{ success: boolean; data?: KaryawanItem; error?: string }> {
  const user = await getAuthUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  if (!isAdmin(user)) {
    return { success: false, error: "Only admins can add karyawan" };
  }

  if (!canAccessToko(user, tokoId)) {
    return { success: false, error: "Access denied" };
  }

  const featureError = ensureFeatureAccess(user, "karyawan.management", await getDisabledFeaturesForToko(tokoId));
  if (featureError) return featureError;

  if (!input.name.trim() || input.name.trim().length < 2) {
    return { success: false, error: "Name must be at least 2 characters" };
  }

  if (!input.email.trim()) {
    return { success: false, error: "Email is required" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(input.email)) {
    return { success: false, error: "Invalid email format" };
  }

  if (!input.password || input.password.length < 4) {
    return { success: false, error: "Password must be at least 4 characters" };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: input.email.trim() },
  });

  if (existingUser) {
    return { success: false, error: "Email already registered" };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const limitKey = input.role === "staff" ? "maxStaff" : "maxTechnicians";
      const currentCount = await tx.userToko.count({
        where: {
          tokoId,
          user: { role: input.role },
        },
      });
      const limitError = ensurePlanLimit(user, limitKey, currentCount);
      if (limitError) throw new Error(limitError.error);

      const createdUser = await createCredentialUserWithToko(tx, {
        name: input.name,
        email: input.email,
        password: input.password,
        role: input.role,
        tokoId: tokoId,
      });

      return createdUser;
    }, { timeout: 15000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    revalidateKaryawanPaths(tokoId);

    return {
      success: true,
      data: {
        id: result.id,
        name: result.name,
        email: result.email,
        role: result.role as "staff" | "technician",
        createdAt: result.createdAt,
        performance: {
          servicesCreated: 0,
          servicesCompleted: 0,
          servicesFailed: 0,
        },
      },
    };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Your ")) {
      return { success: false, error: error.message };
    }
    console.error("Failed to create karyawan:", error);
    return { success: false, error: "Failed to create karyawan" };
  }
}

export async function deleteKaryawan(
  tokoId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  if (!isAdmin(user)) {
    return { success: false, error: "Only admins can delete karyawan" };
  }

  if (!canAccessToko(user, tokoId)) {
    return { success: false, error: "Access denied" };
  }

  const featureError = ensureFeatureAccess(user, "karyawan.management", await getDisabledFeaturesForToko(tokoId));
  if (featureError) return featureError;

  if (userId === user.id) {
    return { success: false, error: "Cannot delete yourself" };
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!targetUser || (targetUser.role !== "staff" && targetUser.role !== "technician")) {
    return { success: false, error: "User not found or not a karyawan" };
  }

  const targetAssignment = await prisma.userToko.findFirst({
    where: { userId, tokoId },
  });

  if (!targetAssignment) {
    return { success: false, error: "User not assigned to this toko" };
  }

  try {
    await prisma.user.delete({
      where: { id: userId },
    });

    revalidateKaryawanPaths(tokoId);

    return { success: true };
  } catch (error) {
    console.error("Failed to delete karyawan:", error);
    return { success: false, error: "Failed to delete karyawan" };
  }
}
