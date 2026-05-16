import { getAvailableTasks, getMyTasks, getTechnicianTaskStats } from "@/actions/service";
import { TeknisiTaskManager } from "@/components/dashboard/services/teknisi-task-manager";
import { ServicePermissionLocked } from "@/components/dashboard/services/service-permission-locked";
import { assertFeature, can, getPermissionLockReason, getRequestScope } from "@/lib/auth/request-scope";
import prisma from "@/lib/prisma";
import type { ServiceStatus } from "@/prisma/generated/prisma/enums";
import { redirect } from "next/navigation";

const ALL_TASK_STATUSES: ServiceStatus[] = ["received", "repairing", "done", "failed"];
const taskPageSize = 1000;

function appendSearchParams(path: string, searchParams: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
    else if (value !== undefined) params.set(key, value);
  }
  const serialized = params.toString();
  return serialized ? `${path}?${serialized}` : path;
}

export default async function SharedServiceTasksPage({
  params,
  searchParams,
}: {
  params: Promise<{ tokoid: string }>;
  searchParams: Promise<{ status?: string | string[]; q?: string | string[] }>;
}) {
  const { tokoid } = await params;
  const query = await searchParams;
  const scope = await getRequestScope(tokoid);

  if (!can(scope, "service.view")) {
    return <ServicePermissionLocked reason={getPermissionLockReason(scope, "service.view")} />;
  }

  if (scope.user.role === "staff") {
    redirect(appendSearchParams(`/${tokoid}/service`, query));
  }

  assertFeature(scope, "technician.workflow");

  const status = Array.isArray(query.status) ? query.status[0] : query.status;
  const initialSearchQuery = Array.isArray(query.q) ? query.q[0] ?? "" : query.q ?? "";

  const [toko, statsResult, myTasksResult, availableResult] = await Promise.all([
    prisma.toko.findUnique({ where: { id: tokoid }, select: { id: true, name: true, logoUrl: true } }),
    getTechnicianTaskStats(tokoid),
    getMyTasks(tokoid, ALL_TASK_STATUSES, taskPageSize),
    getAvailableTasks(tokoid, taskPageSize),
  ]);

  const stats = statsResult.success && statsResult.data
    ? statsResult.data
    : { tersedia: 0, repairing: 0, selesai: 0, gagal: 0, history: 0, total: 0 };
  const myTasks = myTasksResult.success ? myTasksResult.data || [] : [];
  const availableTasks = availableResult.success ? availableResult.data || [] : [];
  const actionPermissions = {
    canView: can(scope, "service.view"),
    canCreate: can(scope, "service.create"),
    canUpdate: can(scope, "service.update"),
    canDelete: can(scope, "service.delete"),
    canUpdateStatus: can(scope, "service.updateStatus"),
    canPickup: can(scope, "service.pickup"),
    canAssignTechnician: can(scope, "service.assignTechnician"),
    canTakeOverTask: can(scope, "service.takeOverTask"),
    canCreateInvoice: can(scope, "service.createInvoice"),
    canManageItems: can(scope, "service.manageItems"),
    canManageInvoice: can(scope, "service.manageInvoice"),
  };

  return (
    <TeknisiTaskManager
      key={`${status ?? "all"}-${initialSearchQuery}`}
      myTasks={myTasks}
      availableTasks={availableTasks}
      initialStats={stats}
      tokoId={tokoid}
      currentToko={toko ?? undefined}
      initialSearchQuery={initialSearchQuery}
      actionPermissions={actionPermissions}
    />
  );
}
