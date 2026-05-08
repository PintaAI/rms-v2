"use server";

import prisma from "@/lib/prisma";
import { getRequestUser } from "@/lib/auth/request-user";
import type { ServiceStatus } from "@/prisma/generated/prisma/enums";
import { withScope } from "@/lib/auth/wrapper";
import {
  buildTimeFilter,
  getAvailableTaskRecords,
  getMyTaskRecords,
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
  if (!tokoId) {
    const user = await getRequestUser();
    if (!user) return { success: false, error: "Unauthorized" };
    tokoId = user.tokoIds[0];
    if (!tokoId) return { success: false, error: "No toko found" };
  }

  return withScope(tokoId, { role: ["admin", "staff"] }, async () => {
    const timeFilterCondition = buildTimeFilter(timeFilter);
    const statusCondition = statusFilter?.length ? { status: { in: statusFilter } } : {};

    const [totalCount, services] = await Promise.all([
      prisma.service.count({ where: { tokoId, ...timeFilterCondition, ...statusCondition } }),
      prisma.service.findMany({
        where: { tokoId, ...timeFilterCondition, ...statusCondition },
        orderBy: { checkinAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: serviceSelectBase,
      }),
    ]);

    return {
      data: services.map(mapServiceToListItem),
      total: totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  });
}

export async function getService(
  serviceId: string
): Promise<ActionResultWithData<ServiceDetail>> {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: {
      ...serviceSelectBase,
      tokoId: true,
      items: { select: serviceItemSelect },
    },
  });

  if (!service) return { success: false, error: "Service not found" };

  return withScope(service.tokoId, {}, async (scope) => {
    if (isTechnicianRole(scope.user.role)) {
      const canReadTask =
        service.technician?.id === scope.user.id || technicianAvailableStatuses.includes(service.status);
      if (!canReadTask) throw new Error("Access denied");
    }

    return {
      ...mapServiceToListItem(service),
      tokoId: service.tokoId,
      items: service.items,
    };
  });
}

export async function getAvailableTasks(
  tokoId?: string,
  limit: number = technicianTaskListLimit
): Promise<ActionResultWithData<ServiceListItem[]>> {
  if (!tokoId) {
    const user = await getRequestUser();
    if (!user) return { success: false, error: "Unauthorized" };
    tokoId = user.tokoIds[0];
    if (!tokoId) return { success: false, error: "No toko found" };
  }

  return withScope(tokoId, { role: ["admin", "technician"], feature: "technician.workflow" }, async (scope) => {
    const services = await getAvailableTaskRecords(tokoId, scope.user.id, limit);
    return services.map(mapServiceToListItem);
  });
}

export async function getMyTasks(
  tokoId: string,
  statuses: ServiceStatus[] = technicianAvailableStatuses,
  limit: number = technicianTaskListLimit
): Promise<ActionResultWithData<ServiceListItem[]>> {
  return withScope(tokoId, { role: ["admin", "technician"], feature: "technician.workflow" }, async (scope) => {
    const services = await getMyTaskRecords(tokoId, scope.user.id, statuses, limit);
    return services.map(mapServiceToListItem);
  });
}

export async function getTechnicianDashboard(
  tokoId?: string
): Promise<ActionResultWithData<TechnicianDashboardData>> {
  if (!tokoId) {
    const user = await getRequestUser();
    if (!user) return { success: false, error: "Unauthorized" };
    tokoId = user.tokoIds[0];
    if (!tokoId) return { success: false, error: "No toko found" };
  }

  return withScope(tokoId, { role: ["admin", "technician"], feature: "technician.workflow" }, async (scope) => {
    const monthlyStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [monthlyAssigned, availableCount, inProgressCount, doneCount, availableServices, myTasks] =
      await Promise.all([
        prisma.service.count({
          where: { tokoId, technicianId: scope.user.id, assignedAt: { gte: monthlyStart } },
        }),
        prisma.service.count({
          where: { tokoId, status: { in: technicianAvailableStatuses }, OR: [{ technicianId: null }, { technicianId: { not: scope.user.id } }] },
        }),
        prisma.service.count({ where: { tokoId, technicianId: scope.user.id, status: "repairing" } }),
        prisma.service.count({ where: { tokoId, technicianId: scope.user.id, status: "done", isPickedUp: false } }),
        getAvailableTaskRecords(tokoId, scope.user.id, 10),
        getMyTaskRecords(tokoId, scope.user.id, technicianAvailableStatuses, 10, true),
      ]);

    return {
      stats: { monthlyAssigned, availableCount, inProgressCount, doneCount },
      availableServices: availableServices.map(mapServiceToListItem),
      myTasks: myTasks.map((service) => ({
        ...mapServiceToListItem(service),
        tokoId,
        items: service.items,
      })),
    };
  });
}

export async function getTechniciansByToko(
  tokoId: string
): Promise<ActionResultWithData<{ id: string; name: string; email: string }[]>> {
  return withScope(tokoId, { role: ["admin", "staff"], feature: "technician.workflow" }, async () => {
    const technicians = await prisma.userToko.findMany({
      where: { tokoId, user: { role: "technician" } },
      select: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { user: { name: "asc" } },
    });
    return technicians.map((t) => t.user);
  });
}

export async function getServiceStats(tokoId: string): Promise<ActionResultWithData<ServiceStats>> {
  return withScope(tokoId, { role: ["admin", "staff"] }, async () => {
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
    for (const row of serviceStatusCounts) statusMap[row.status] = row._count.status;

    const received = statusMap.received ?? 0;
    const repairing = statusMap.repairing ?? 0;
    const done = statusMap.done ?? 0;
    const failed = statusMap.failed ?? 0;
    const history = done + failed + pickedUp;

    return { received, repairing, done, pickedUp, failed, history, total };
  });
}

export async function getTechnicianTaskStats(
  tokoId: string
): Promise<ActionResultWithData<TechnicianTaskStats>> {
  return withScope(tokoId, { role: ["admin", "technician"] }, async (scope) => {
    const [tersedia, repairing, selesai, gagal, history, total] = await Promise.all([
      prisma.service.count({
        where: { tokoId, status: { in: technicianAvailableStatuses }, OR: [{ technicianId: null }, { technicianId: { not: scope.user.id } }] },
      }),
      prisma.service.count({ where: { tokoId, technicianId: scope.user.id, status: "repairing" } }),
      prisma.service.count({ where: { tokoId, technicianId: scope.user.id, status: "done", isPickedUp: false } }),
      prisma.service.count({ where: { tokoId, technicianId: scope.user.id, status: "failed", isPickedUp: false } }),
      prisma.service.count({ where: { tokoId, technicianId: scope.user.id, status: { in: ["done", "failed"] } } }),
      prisma.service.count({ where: { tokoId, technicianId: scope.user.id } }),
    ]);

    return { tersedia, repairing, selesai, gagal, history, total };
  });
}
