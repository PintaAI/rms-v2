"use server";

import prisma from "@/lib/prisma";
import { ensureFeatureAccess } from "@/lib/feature-enforcement";
import { getEffectivePlanForToko } from "@/lib/rbac";
import { getDisabledFeaturesForToko } from "./feature-settings";
import type { ServiceStatus } from "@/prisma/generated/prisma/enums";
import {
  buildTimeFilter,
  getAvailableTaskRecords,
  getMyTaskRecords,
  getSessionAndTokos,
  hasTokoAccess,
  isStaffOrAdminRole,
  isTechnicianOrAdminRole,
  isTechnicianRole,
  mapServiceToListItem,
  serviceItemSelect,
  serviceSelectBase,
  technicianAvailableStatuses,
  technicianTaskListLimit,
} from "./service-shared";
import type {
  ActionResultWithData,
  PaginatedResult,
  ServiceDetail,
  ServiceListItem,
  ServiceStats,
  TechnicianDashboardData,
  TechnicianStats,
  TechnicianTaskStats,
  TimeFilter,
} from "./service-types";

export async function getServiceList(
  tokoId?: string,
  timeFilter?: TimeFilter,
  page: number = 1,
  pageSize: number = 15,
  statusFilter?: ServiceStatus[]
): Promise<ActionResultWithData<PaginatedResult<ServiceListItem>>> {
  try {
    const { user, tokoIds } = await getSessionAndTokos();
    if (!user) return { success: false, error: "Unauthorized" };

    const targetTokoId = tokoId ?? tokoIds[0];
    if (!targetTokoId) return { success: false, error: "No toko found" };
    if (!hasTokoAccess(tokoIds, targetTokoId) || !isStaffOrAdminRole(user.role)) {
      return { success: false, error: "Access denied" };
    }

    const timeFilterCondition = buildTimeFilter(timeFilter);
    const statusCondition =
      statusFilter && statusFilter.length > 0 ? { status: { in: statusFilter } } : {};

    const totalCount = await prisma.service.count({
      where: { tokoId: targetTokoId, ...timeFilterCondition, ...statusCondition },
    });

    const skip = (page - 1) * pageSize;
    const totalPages = Math.ceil(totalCount / pageSize);

    const services = await prisma.service.findMany({
      where: { tokoId: targetTokoId, ...timeFilterCondition, ...statusCondition },
      orderBy: { checkinAt: "desc" },
      skip,
      take: pageSize,
      select: serviceSelectBase,
    });

    return {
      success: true,
      data: {
        data: services.map(mapServiceToListItem),
        total: totalCount,
        page,
        pageSize,
        totalPages,
      },
    };
  } catch (error) {
    console.error("Error fetching service list:", error);
    return { success: false, error: "Failed to fetch service list" };
  }
}

export async function getService(
  serviceId: string
): Promise<ActionResultWithData<ServiceDetail>> {
  try {
    const { user, tokoIds } = await getSessionAndTokos();
    if (!user) return { success: false, error: "Unauthorized" };

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: {
        ...serviceSelectBase,
        tokoId: true,
        items: { select: serviceItemSelect },
      },
    });

    if (!service) return { success: false, error: "Service not found" };
    if (!hasTokoAccess(tokoIds, service.tokoId)) return { success: false, error: "Access denied" };

    if (isTechnicianRole(user.role)) {
      const canReadTask =
        service.technician?.id === user.id || technicianAvailableStatuses.includes(service.status);
      if (!canReadTask) return { success: false, error: "Access denied" };
    }

    return {
      success: true,
      data: {
        ...mapServiceToListItem(service),
        tokoId: service.tokoId,
        items: service.items,
      },
    };
  } catch (error) {
    console.error("Error fetching service:", error);
    return { success: false, error: "Failed to fetch service" };
  }
}

export async function getAvailableTasks(
  tokoId?: string
): Promise<ActionResultWithData<ServiceListItem[]>> {
  try {
    const { user, tokoIds } = await getSessionAndTokos();
    if (!user) return { success: false, error: "Unauthorized" };

    const targetTokoId = tokoId ?? tokoIds[0];
    if (!targetTokoId) return { success: false, error: "No toko found" };
    if (!hasTokoAccess(tokoIds, targetTokoId) || !isTechnicianOrAdminRole(user.role)) {
      return { success: false, error: "Access denied" };
    }

    const services = await getAvailableTaskRecords(targetTokoId, user.id, technicianTaskListLimit);

    return { success: true, data: services.map(mapServiceToListItem) };
  } catch (error) {
    console.error("Error fetching available tasks:", error);
    return { success: false, error: "Failed to fetch available tasks" };
  }
}

export async function getMyTasks(
  tokoId: string,
  statuses: ServiceStatus[] = technicianAvailableStatuses
): Promise<ActionResultWithData<ServiceListItem[]>> {
  try {
    const { user, tokoIds } = await getSessionAndTokos();
    if (!user) return { success: false, error: "Unauthorized" };
    if (!hasTokoAccess(tokoIds, tokoId) || !isTechnicianOrAdminRole(user.role)) {
      return { success: false, error: "Access denied" };
    }

    const services = await getMyTaskRecords(tokoId, user.id, statuses, technicianTaskListLimit);

    return { success: true, data: services.map(mapServiceToListItem) };
  } catch (error) {
    console.error("Error fetching my tasks:", error);
    return { success: false, error: "Failed to fetch tasks" };
  }
}

export async function getTechnicianDashboard(
  tokoId?: string
): Promise<ActionResultWithData<TechnicianDashboardData>> {
  try {
    const { user, tokoIds } = await getSessionAndTokos();
    if (!user) return { success: false, error: "Unauthorized" };

    const userTokoId = tokoId ?? tokoIds[0];
    if (!userTokoId) return { success: false, error: "No toko found" };
    if (!hasTokoAccess(tokoIds, userTokoId) || !isTechnicianOrAdminRole(user.role)) {
      return { success: false, error: "Access denied" };
    }

    const monthlyStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [monthlyAssigned, availableCount, inProgressCount, doneCount, availableServices, myTasks] =
      await Promise.all([
        prisma.service.count({
          where: {
            tokoId: userTokoId,
            technicianId: user.id,
            assignedAt: { gte: monthlyStart },
          },
        }),
        prisma.service.count({
          where: {
            tokoId: userTokoId,
            status: { in: technicianAvailableStatuses },
            OR: [{ technicianId: null }, { technicianId: { not: user.id } }],
          },
        }),
        prisma.service.count({ where: { tokoId: userTokoId, technicianId: user.id, status: "repairing" } }),
        prisma.service.count({
          where: { tokoId: userTokoId, technicianId: user.id, status: "done", isPickedUp: false },
        }),
        getAvailableTaskRecords(userTokoId, user.id, 10),
        getMyTaskRecords(userTokoId, user.id, technicianAvailableStatuses, 10, true),
      ]);

    const stats: TechnicianStats = {
      monthlyAssigned,
      availableCount,
      inProgressCount,
      doneCount,
    };

    return {
      success: true,
      data: {
        stats,
        availableServices: availableServices.map(mapServiceToListItem),
        myTasks: myTasks.map((service) => ({
          ...mapServiceToListItem(service),
          tokoId: userTokoId,
          items: service.items,
        })),
      },
    };
  } catch (error) {
    console.error("Error fetching technician dashboard:", error);
    return { success: false, error: "Failed to fetch dashboard data" };
  }
}

export async function getTechniciansByToko(
  tokoId: string
): Promise<ActionResultWithData<{ id: string; name: string; email: string }[]>> {
  try {
    const { user, tokoIds } = await getSessionAndTokos();
    if (!user) return { success: false, error: "Unauthorized" };
    if (!hasTokoAccess(tokoIds, tokoId) || !isStaffOrAdminRole(user.role)) {
      return { success: false, error: "Access denied" };
    }

    const assignmentError = ensureFeatureAccess(
      { role: user.role, plan: await getEffectivePlanForToko(user, tokoId) },
      "service.technicianAssignment",
      await getDisabledFeaturesForToko(tokoId)
    );
    if (assignmentError) return assignmentError;

    const technicians = await prisma.userToko.findMany({
      where: {
        tokoId,
        user: { role: "technician" },
      },
      select: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { user: { name: "asc" } },
    });

    return { success: true, data: technicians.map((t) => t.user) };
  } catch (error) {
    console.error("Error fetching technicians:", error);
    return { success: false, error: "Failed to fetch technicians" };
  }
}

export async function getServiceStats(tokoId: string): Promise<ActionResultWithData<ServiceStats>> {
  try {
    const { user, tokoIds } = await getSessionAndTokos();
    if (!user) return { success: false, error: "Unauthorized" };
    if (!hasTokoAccess(tokoIds, tokoId) || !isStaffOrAdminRole(user.role)) {
      return { success: false, error: "Access denied" };
    }

    const [serviceStatusCounts, pickedUp, total] = await Promise.all([
      prisma.service.groupBy({
        by: ["status"],
        where: { tokoId, isPickedUp: false },
        _count: { status: true },
      }),
      prisma.service.count({ where: { tokoId, isPickedUp: true } }),
      prisma.service.count({ where: { tokoId } }),
    ]);

    const statusMap: Partial<Record<ServiceStatus, number>> = {};
    for (const row of serviceStatusCounts) {
      statusMap[row.status] = row._count.status;
    }

    const received = statusMap.received ?? 0;
    const repairing = statusMap.repairing ?? 0;
    const done = statusMap.done ?? 0;
    const failed = statusMap.failed ?? 0;
    const history = done + failed + pickedUp;

    return {
      success: true,
      data: { received, repairing, done, pickedUp, failed, history, total },
    };
  } catch (error) {
    console.error("Error fetching nav badge stats:", error);
    return { success: false, error: "Failed to fetch stats" };
  }
}

export async function getTechnicianTaskStats(
  tokoId: string
): Promise<ActionResultWithData<TechnicianTaskStats>> {
  try {
    const { user, tokoIds } = await getSessionAndTokos();
    if (!user) return { success: false, error: "Unauthorized" };
    if (!isTechnicianOrAdminRole(user.role)) {
      return { success: false, error: "Access denied" };
    }
    if (!tokoIds.includes(tokoId)) return { success: false, error: "Access denied" };

    const [tersedia, repairing, selesai, gagal, history, total] = await Promise.all([
      prisma.service.count({
        where: {
          tokoId,
          status: { in: technicianAvailableStatuses },
          OR: [{ technicianId: null }, { technicianId: { not: user.id } }],
        },
      }),
      prisma.service.count({
        where: { tokoId, technicianId: user.id, status: "repairing" },
      }),
      prisma.service.count({
        where: { tokoId, technicianId: user.id, status: "done", isPickedUp: false },
      }),
      prisma.service.count({
        where: { tokoId, technicianId: user.id, status: "failed", isPickedUp: false },
      }),
      prisma.service.count({
        where: { tokoId, technicianId: user.id, status: { in: ["done", "failed"] } },
      }),
      prisma.service.count({
        where: { tokoId, technicianId: user.id },
      }),
    ]);

    return {
      success: true,
      data: { tersedia, repairing, selesai, gagal, history, total },
    };
  } catch (error) {
    console.error("Error fetching technician task stats:", error);
    return { success: false, error: "Failed to fetch stats" };
  }
}
