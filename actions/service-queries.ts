"use server";

import prisma from "@/lib/prisma";
import { getRequestUser } from "@/lib/auth/request-user";
import type { RepairOrderStatus } from "@/prisma/generated/prisma/enums";
import { withScope } from "@/lib/auth/wrapper";
import { assertPermission } from "@/lib/auth/request-scope";
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
  storeId?: string,
  timeFilter?: TimeFilter,
  page: number = 1,
  pageSize: number = 15,
  statusFilter?: RepairOrderStatus[]
): Promise<ActionResultWithData<PaginatedResult<ServiceListItem>>> {
  if (!storeId) {
    const user = await getRequestUser();
    if (!user) return { success: false, error: "Tidak memiliki akses" };
    storeId = user.storeIds[0];
    if (!storeId) return { success: false, error: "Toko tidak ditemukan" };
  }

  return withScope(storeId, {}, async (scope) => {
    assertPermission(scope, "service.view");

    const timeFilterCondition = buildTimeFilter(timeFilter);
    const statusCondition = statusFilter?.length ? { status: { in: statusFilter } } : {};

    const [totalCount, services] = await Promise.all([
      prisma.repairOrder.count({ where: { storeId, ...timeFilterCondition, ...statusCondition } }),
      prisma.repairOrder.findMany({
        where: { storeId, ...timeFilterCondition, ...statusCondition },
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
  repairOrderId: string
): Promise<ActionResultWithData<ServiceDetail>> {
  const service = await prisma.repairOrder.findUnique({
    where: { id: repairOrderId },
    select: {
      ...serviceSelectBase,
      storeId: true,
      items: { select: serviceItemSelect },
    },
  });

  if (!service) return { success: false, error: "Service tidak ditemukan" };

  return withScope(service.storeId, {}, async (scope) => {
    assertPermission(scope, "service.view");

    if (isTechnicianRole(scope.user.role)) {
      const canReadTask =
        service.technician?.id === scope.user.id || technicianAvailableStatuses.includes(service.status);
      if (!canReadTask) throw new Error("Access denied");
    }

    return {
      ...mapServiceToListItem(service),
      storeId: service.storeId,
      items: service.items,
    };
  });
}

export async function getAvailableTasks(
  storeId?: string,
  limit: number = technicianTaskListLimit
): Promise<ActionResultWithData<ServiceListItem[]>> {
  if (!storeId) {
    const user = await getRequestUser();
    if (!user) return { success: false, error: "Tidak memiliki akses" };
    storeId = user.storeIds[0];
    if (!storeId) return { success: false, error: "Toko tidak ditemukan" };
  }

  return withScope(storeId, { feature: "technician.workflow" }, async (scope) => {
    assertPermission(scope, "service.view");

    const services = await getAvailableTaskRecords(storeId, scope.user.id, limit);
    return services.map(mapServiceToListItem);
  });
}

export async function getMyTasks(
  storeId: string,
  statuses: RepairOrderStatus[] = technicianAvailableStatuses,
  limit: number = technicianTaskListLimit
): Promise<ActionResultWithData<ServiceListItem[]>> {
  return withScope(storeId, { feature: "technician.workflow" }, async (scope) => {
    assertPermission(scope, "service.view");

    const services = await getMyTaskRecords(storeId, scope.user.id, statuses, limit);
    return services.map(mapServiceToListItem);
  });
}

export async function getTechnicianDashboard(
  storeId?: string
): Promise<ActionResultWithData<TechnicianDashboardData>> {
  if (!storeId) {
    const user = await getRequestUser();
    if (!user) return { success: false, error: "Tidak memiliki akses" };
    storeId = user.storeIds[0];
    if (!storeId) return { success: false, error: "Toko tidak ditemukan" };
  }

  return withScope(storeId, { feature: "technician.workflow" }, async (scope) => {
    assertPermission(scope, "service.view");

    const monthlyStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [monthlyAssigned, availableCount, inProgressCount, doneCount, availableServices, myTasks] =
      await Promise.all([
        prisma.repairOrder.count({
          where: { storeId, technicianId: scope.user.id, assignedAt: { gte: monthlyStart } },
        }),
        prisma.repairOrder.count({
          where: { storeId, status: { in: technicianAvailableStatuses }, OR: [{ technicianId: null }, { technicianId: { not: scope.user.id } }] },
        }),
        prisma.repairOrder.count({ where: { storeId, technicianId: scope.user.id, status: "repairing" } }),
        prisma.repairOrder.count({ where: { storeId, technicianId: scope.user.id, status: "done", isPickedUp: false } }),
        getAvailableTaskRecords(storeId, scope.user.id, 10),
        getMyTaskRecords(storeId, scope.user.id, technicianAvailableStatuses, 10, true),
      ]);

    return {
      stats: { monthlyAssigned, availableCount, inProgressCount, doneCount },
      availableServices: availableServices.map(mapServiceToListItem),
      myTasks: myTasks.map((service) => ({
        ...mapServiceToListItem(service),
        storeId,
        items: service.items,
      })),
    };
  });
}

export async function getTechniciansByToko(
  storeId: string
): Promise<ActionResultWithData<{ id: string; name: string; email: string }[]>> {
  return withScope(storeId, { feature: "service.technicianAssignment" }, async (scope) => {
    assertPermission(scope, "service.assignTechnician");

    const technicians = await prisma.userStore.findMany({
      where: { storeId, user: { role: "technician" } },
      select: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { user: { name: "asc" } },
    });
    return technicians.map((t) => t.user);
  });
}

export async function getServiceStats(storeId: string): Promise<ActionResultWithData<ServiceStats>> {
  return withScope(storeId, {}, async (scope) => {
    assertPermission(scope, "service.view");

    const [serviceStatusCounts, pickedUp, total] = await Promise.all([
      prisma.repairOrder.groupBy({
        by: ["status"],
        where: { storeId, isPickedUp: false },
        _count: { status: true },
      }),
      prisma.repairOrder.count({ where: { storeId, isPickedUp: true } }),
      prisma.repairOrder.count({ where: { storeId } }),
    ]);

    const statusMap: Partial<Record<RepairOrderStatus, number>> = {};
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
  storeId: string
): Promise<ActionResultWithData<TechnicianTaskStats>> {
  return withScope(storeId, {}, async (scope) => {
    assertPermission(scope, "service.view");

    const [tersedia, repairing, selesai, gagal, history, total] = await Promise.all([
      prisma.repairOrder.count({
        where: { storeId, status: { in: technicianAvailableStatuses }, OR: [{ technicianId: null }, { technicianId: { not: scope.user.id } }] },
      }),
      prisma.repairOrder.count({ where: { storeId, technicianId: scope.user.id, status: "repairing" } }),
      prisma.repairOrder.count({ where: { storeId, technicianId: scope.user.id, status: "done", isPickedUp: false } }),
      prisma.repairOrder.count({ where: { storeId, technicianId: scope.user.id, status: "failed", isPickedUp: false } }),
      prisma.repairOrder.count({ where: { storeId, technicianId: scope.user.id, status: { in: ["done", "failed"] } } }),
      prisma.repairOrder.count({ where: { storeId, technicianId: scope.user.id } }),
    ]);

    return { tersedia, repairing, selesai, gagal, history, total };
  });
}
