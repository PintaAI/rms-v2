"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { hashPassword } from "@better-auth/utils/password";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";

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

  const [staffCounts, technicianCounts] = await Promise.all([
    staffIds.length > 0
      ? prisma.service.groupBy({
          by: ["createdById"],
          where: {
            tokoId,
            createdById: { in: staffIds },
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
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  const userToko = await prisma.userToko.findFirst({
    where: { userId: session.user.id, tokoId },
  });

  if (!userToko) {
    return { success: false, error: "Access denied" };
  }

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
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user) {
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
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  if (session.user.role !== "admin") {
    return { success: false, error: "Only admins can add karyawan" };
  }

  const userToko = await prisma.userToko.findFirst({
    where: { userId: session.user.id, tokoId },
  });

  if (!userToko) {
    return { success: false, error: "Access denied" };
  }

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
    const hashedPassword = await hashPassword(input.password);
    const userId = nanoid();

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          id: userId,
          name: input.name.trim(),
          email: input.email.trim(),
          role: input.role,
          emailVerified: false,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      await tx.account.create({
        data: {
          id: nanoid(),
          accountId: userId,
          providerId: "credential",
          userId: userId,
          password: hashedPassword,
        },
      });

      await tx.userToko.create({
        data: {
          userId: userId,
          tokoId: tokoId,
          role: "owner",
        },
      });

      return user;
    }, { timeout: 15000 });

    revalidatePath(`/${tokoId}/admin/karyawan`);

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
    console.error("Failed to create karyawan:", error);
    return { success: false, error: "Failed to create karyawan" };
  }
}

export async function deleteKaryawan(
  tokoId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  if (session.user.role !== "admin") {
    return { success: false, error: "Only admins can delete karyawan" };
  }

  const userToko = await prisma.userToko.findFirst({
    where: { userId: session.user.id, tokoId },
  });

  if (!userToko) {
    return { success: false, error: "Access denied" };
  }

  if (userId === session.user.id) {
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

    revalidatePath(`/${tokoId}/admin/karyawan`);

    return { success: true };
  } catch (error) {
    console.error("Failed to delete karyawan:", error);
    return { success: false, error: "Failed to delete karyawan" };
  }
}
