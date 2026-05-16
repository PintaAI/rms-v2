"use server";

import prisma from "@/lib/prisma";
import { ensurePlanLimit } from "@/lib/auth/enforcement";
import { AuthError } from "@/lib/auth/authorization";
import { withScope } from "@/lib/auth/wrapper";
import { assertPermission } from "@/lib/auth/request-scope";
import { createCredentialUserWithToko } from "@/lib/auth-helpers";
import { revalidateKaryawanPaths } from "@/lib/revalidation";
import {
  getGrantablePermissionsInV1,
  getPermissionInactiveReason,
  getPermissionMetadata,
  getRoleDefaultPermissions,
  isPermissionKey,
  type PermissionCategory,
  type PermissionEffect,
  type PermissionKey,
} from "@/lib/permissions";
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

export interface TechnicianPerformanceServiceItem {
  id: string;
  customerName: string | null;
  noWa: string;
  complaint: string;
  status: "done" | "failed";
  checkinAt: Date;
  doneAt: Date | null;
  hpCatalog: {
    modelName: string;
    brand: { name: string };
  };
  invoice: {
    grandTotal: number;
    paymentStatus: string;
  } | null;
}

export interface TechnicianPerformanceDetail {
  technician: {
    id: string;
    name: string;
    email: string;
  };
  periodDays: number;
  summary: {
    servicesHandled: number;
    servicesCompleted: number;
    servicesFailed: number;
    successRate: number;
    paidRevenue: number;
  };
  services: TechnicianPerformanceServiceItem[];
}

export interface KaryawanPermissionCatalogItem {
  permissionKey: PermissionKey;
  label: string;
  description: string;
  inactiveReason: string;
  category: PermissionCategory;
  sensitivity: "operational" | "sensitive" | "ownership";
  requiredFeature: string | null;
  requiredFeatureAvailable: boolean;
  defaultAllowed: boolean;
}

export interface KaryawanPermissionSettings {
  user: {
    id: string;
    name: string;
    email: string;
    role: "staff" | "technician";
  };
  permissions: KaryawanPermissionCatalogItem[];
  overrides: Array<{
    permissionKey: PermissionKey;
    effect: PermissionEffect;
  }>;
}

export interface SaveKaryawanPermissionOverrideInput {
  permissionKey: PermissionKey;
  effect: PermissionEffect;
}

function isPermissionEffect(value: string): value is PermissionEffect {
  return value === "allow" || value === "deny";
}

async function getPermissionTarget(tokoId: string, userId: string) {
  const assignment = await prisma.userToko.findUnique({
    where: { userId_tokoId: { userId, tokoId } },
    select: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  if (!assignment || (assignment.user.role !== "staff" && assignment.user.role !== "technician")) {
    throw new AuthError("forbidden", "Karyawan tidak ditemukan di toko ini");
  }

  return {
    ...assignment.user,
    role: assignment.user.role as "staff" | "technician",
  };
}

async function buildKaryawanPermissionSettings(
  tokoId: string,
  userId: string,
  scopeFeatureAccess: Record<string, boolean | undefined>
): Promise<KaryawanPermissionSettings> {
  const targetUser = await getPermissionTarget(tokoId, userId);
  const grantablePermissions = getGrantablePermissionsInV1();
  const defaultPermissions = new Set(getRoleDefaultPermissions(targetUser.role));
  const overrides = await prisma.tokoUserPermission.findMany({
    where: { tokoId, userId, permissionKey: { in: grantablePermissions } },
    select: { permissionKey: true, effect: true },
    orderBy: { permissionKey: "asc" },
  });

  return {
    user: targetUser,
    permissions: grantablePermissions.map((permissionKey) => {
      const metadata = getPermissionMetadata(permissionKey);

      return {
        permissionKey,
        label: metadata.label,
        description: metadata.description,
        inactiveReason: getPermissionInactiveReason(permissionKey),
        category: metadata.category,
        sensitivity: metadata.sensitivity,
        requiredFeature: metadata.requiredFeature,
        requiredFeatureAvailable: metadata.requiredFeature === null
          || scopeFeatureAccess[metadata.requiredFeature] === true,
        defaultAllowed: defaultPermissions.has(permissionKey),
      };
    }),
    overrides: overrides.flatMap((override) => {
      if (!isPermissionKey(override.permissionKey)) return [];
      if (!isPermissionEffect(override.effect)) return [];

      return [{ permissionKey: override.permissionKey, effect: override.effect }];
    }),
  };
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
  return withScope(tokoId, {}, async (scope) => {
    assertPermission(scope, "karyawan.view");
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

    return filteredAssignments.map((assignment) => ({
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
  });
}

const emptyKaryawanStats: KaryawanStats = { staff: 0, technician: 0, total: 0 };

export async function getKaryawanStats(tokoId: string): Promise<KaryawanStats> {
  const result = await withScope(tokoId, {}, async (scope) => {
    assertPermission(scope, "karyawan.view");
    const [staff, technician] = await Promise.all([
      prisma.userToko.count({ where: { tokoId, user: { role: "staff" } } }),
      prisma.userToko.count({ where: { tokoId, user: { role: "technician" } } }),
    ]);

    return { staff, technician, total: staff + technician };
  });

  return result.success && result.data ? result.data : emptyKaryawanStats;
}

export async function getTechnicianPerformanceDetail(
  tokoId: string,
  technicianId: string
): Promise<{ success: boolean; data?: TechnicianPerformanceDetail; error?: string }> {
  return withScope(tokoId, {}, async (scope) => {
    assertPermission(scope, "karyawan.view");
    const assignment = await prisma.userToko.findFirst({
    where: {
      tokoId,
      userId: technicianId,
      user: { role: "technician" },
    },
    select: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

    if (!assignment) throw new AuthError("forbidden", "Technician not found");

  const periodDays = 30;
  const monthlyStart = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
  const serviceWhere: Prisma.ServiceWhereInput = {
    tokoId,
    technicianId,
    status: { in: ["done", "failed"] },
    doneAt: { gte: monthlyStart },
  };

  const [statusCounts, paidRevenue, services] = await Promise.all([
    prisma.service.groupBy({
      by: ["status"],
      where: serviceWhere,
      _count: { _all: true },
    }),
    prisma.invoice.aggregate({
      where: {
        paymentStatus: "paid",
        service: serviceWhere,
      },
      _sum: { grandTotal: true },
    }),
    prisma.service.findMany({
      where: serviceWhere,
      orderBy: [{ doneAt: "desc" }, { checkinAt: "desc" }],
      take: 50,
      select: {
        id: true,
        customerName: true,
        noWa: true,
        complaint: true,
        status: true,
        checkinAt: true,
        doneAt: true,
        hpCatalog: {
          select: {
            modelName: true,
            brand: { select: { name: true } },
          },
        },
        invoice: {
          select: {
            grandTotal: true,
            paymentStatus: true,
          },
        },
      },
    }),
  ]);

  const servicesCompleted = statusCounts.find((count) => count.status === "done")?._count._all ?? 0;
  const servicesFailed = statusCounts.find((count) => count.status === "failed")?._count._all ?? 0;
  const servicesHandled = servicesCompleted + servicesFailed;

    return {
      technician: assignment.user,
      periodDays,
      summary: {
        servicesHandled,
        servicesCompleted,
        servicesFailed,
        successRate: servicesHandled > 0 ? Math.round((servicesCompleted / servicesHandled) * 100) : 0,
        paidRevenue: paidRevenue._sum.grandTotal ?? 0,
      },
      services: services.map((service) => ({
        ...service,
        status: service.status as "done" | "failed",
      })),
    };
  });
}

export async function getKaryawanPermissionSettings(
  tokoId: string,
  userId: string
): Promise<{ success: boolean; data?: KaryawanPermissionSettings; error?: string }> {
  return withScope(tokoId, { feature: "karyawan.management" }, async (scope) => {
    assertPermission(scope, "karyawan.managePermissions");

    return buildKaryawanPermissionSettings(tokoId, userId, scope.featureAccess);
  });
}

export async function saveKaryawanPermissionOverrides(
  tokoId: string,
  userId: string,
  overrides: SaveKaryawanPermissionOverrideInput[]
): Promise<{ success: boolean; data?: KaryawanPermissionSettings; error?: string }> {
  return withScope(tokoId, { feature: "karyawan.management" }, async (scope) => {
    assertPermission(scope, "karyawan.managePermissions");

    await getPermissionTarget(tokoId, userId);
    const grantablePermissions = new Set(getGrantablePermissionsInV1());
    const normalizedOverrides = new Map<PermissionKey, PermissionEffect>();

    for (const override of overrides) {
      if (!isPermissionKey(override.permissionKey) || !grantablePermissions.has(override.permissionKey)) {
        throw new AuthError("forbidden", "Permission tidak dapat diubah");
      }
      if (!isPermissionEffect(override.effect)) {
        throw new AuthError("forbidden", "Effect permission tidak valid");
      }

      const metadata = getPermissionMetadata(override.permissionKey);
      if (metadata.requiredFeature && scope.featureAccess[metadata.requiredFeature] !== true) {
        throw new AuthError("feature_locked", "Permission ini tidak tersedia untuk toko ini");
      }

      normalizedOverrides.set(override.permissionKey, override.effect);
    }

    await prisma.$transaction(async (tx) => {
      await tx.tokoUserPermission.deleteMany({
        where: { tokoId, userId, permissionKey: { in: Array.from(grantablePermissions) } },
      });

      if (normalizedOverrides.size > 0) {
        await tx.tokoUserPermission.createMany({
          data: Array.from(normalizedOverrides.entries()).map(([permissionKey, effect]) => ({
            tokoId,
            userId,
            permissionKey,
            effect,
          })),
        });
      }
    });

    revalidateKaryawanPaths(tokoId);

    return buildKaryawanPermissionSettings(tokoId, userId, scope.featureAccess);
  });
}

export async function resetKaryawanPermissionOverrides(
  tokoId: string,
  userId: string
): Promise<{ success: boolean; data?: KaryawanPermissionSettings; error?: string }> {
  return withScope(tokoId, { feature: "karyawan.management" }, async (scope) => {
    assertPermission(scope, "karyawan.managePermissions");
    await getPermissionTarget(tokoId, userId);

    await prisma.tokoUserPermission.deleteMany({
      where: {
        tokoId,
        userId,
        permissionKey: { in: getGrantablePermissionsInV1() },
      },
    });

    revalidateKaryawanPaths(tokoId);

    return buildKaryawanPermissionSettings(tokoId, userId, scope.featureAccess);
  });
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sanitizeForEmail = (str: string) =>
  str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

async function generateKaryawanEmail(
  name: string,
  role: "staff" | "technician",
  tokoId: string
): Promise<{ email?: string; error?: string }> {
  const toko = await prisma.toko.findUnique({
    where: { id: tokoId },
    select: { name: true },
  });

  if (!toko) {
    return { error: "Toko not found" };
  }

  const localPart = sanitizeForEmail(name);
  const domainPart = sanitizeForEmail(toko.name);

  if (!localPart || !domainPart) {
    return { error: "Could not generate email from name and toko name" };
  }

  let generatedEmail = `${localPart}-${role}@${domainPart}.com`;
  let counter = 1;

  while (await prisma.user.findUnique({ where: { email: generatedEmail } })) {
    counter++;
    generatedEmail = `${localPart}-${role}-${counter}@${domainPart}.com`;
  }

  if (!EMAIL_REGEX.test(generatedEmail)) {
    return { error: "Could not generate a valid email from name and toko name" };
  }

  return { email: generatedEmail };
}

export async function createKaryawan(
  tokoId: string,
  input: { name: string; password: string; role: "staff" | "technician" }
): Promise<{ success: boolean; data?: KaryawanItem; error?: string }> {
  if (!input.name.trim() || input.name.trim().length < 2) {
    return { success: false, error: "Name must be at least 2 characters" };
  }

  if (!input.password || input.password.length < 4) {
    return { success: false, error: "Password must be at least 4 characters" };
  }

  return withScope(tokoId, {}, async (scope) => {
    assertPermission(scope, "karyawan.create");
    const { email: _generatedEmail, error: emailError } = await generateKaryawanEmail(input.name, input.role, tokoId);
    if (emailError || !_generatedEmail) {
      throw new AuthError("forbidden", emailError ?? "Could not generate email");
    }
    const generatedEmail: string = _generatedEmail;

    const result = await prisma.$transaction(async (tx) => {
      const limitKey = input.role === "staff" ? "maxStaff" : "maxTechnicians";
      const currentCount = await tx.userToko.count({
        where: {
          tokoId,
          user: { role: input.role },
        },
      });
      const limitError = ensurePlanLimit(scope.user, limitKey, currentCount);
      if (limitError) throw new AuthError("plan_limit", limitError.error);

      const createdUser = await createCredentialUserWithToko(tx, {
        name: input.name,
        email: generatedEmail,
        password: input.password,
        role: input.role,
        tokoId: tokoId,
      });

      return createdUser;
    }, { timeout: 15000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    revalidateKaryawanPaths(tokoId);

    return {
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
    };
  });
}

export async function deleteKaryawan(
  tokoId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  return withScope(tokoId, {}, async (scope) => {
    assertPermission(scope, "karyawan.deactivate");
    if (userId === scope.user.id) return { success: false, error: "Cannot delete yourself" };

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

    await prisma.user.delete({
      where: { id: userId },
    });

    revalidateKaryawanPaths(tokoId);

    return { success: true };
  });
}
