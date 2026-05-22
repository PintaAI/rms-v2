import { getServiceList, getServiceStats } from "@/actions/service";
import { ManageService } from "@/components/dashboard/services/manage-service";
import { ServicePermissionLocked } from "@/components/dashboard/services/service-permission-locked";
import { AdminServiceOverviewStats } from "@/components/dashboard/services/service-overview-stats";
import { assertFeature, can, getPermissionLockReason, getRequestScope } from "@/lib/auth/request-scope";
import prisma from "@/lib/prisma";
import { RiStore2Line } from "@remixicon/react";
import Image from "next/image";
import { redirect } from "next/navigation";

interface SharedServicePageProps {
  params: Promise<{ tokoid: string }>;
  searchParams: Promise<{ q?: string | string[]; serviceId?: string | string[]; status?: string | string[]; pickedup?: string | string[] }>;
}

function appendSearchParams(path: string, searchParams: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
    else if (value !== undefined) params.set(key, value);
  }
  const serialized = params.toString();
  return serialized ? `${path}?${serialized}` : path;
}

export default async function SharedServicePage({ params, searchParams }: SharedServicePageProps) {
  const { tokoid } = await params;
  const query = await searchParams;
  const scope = await getRequestScope(tokoid);

  if (!can(scope, "service.view")) {
    return <ServicePermissionLocked reason={getPermissionLockReason(scope, "service.view")} />;
  }

  if (scope.user.role === "technician") {
    redirect(appendSearchParams(`/${tokoid}/service/tasks`, query));
  }

  if (scope.user.role === "staff") assertFeature(scope, "staff.workflow");

  const initialSearchQuery = Array.isArray(query.q) ? query.q[0] ?? "" : query.q ?? "";
  const initialServiceId = Array.isArray(query.serviceId) ? query.serviceId[0] ?? "" : query.serviceId ?? "";
  const statusFilter = Array.isArray(query.status) ? query.status[0] : query.status;
  const pickedUpFilter = Array.isArray(query.pickedup) ? query.pickedup[0] : query.pickedup;
  const isAllMenu = !statusFilter && pickedUpFilter !== "true";
  const pageSize = 15;

  const [toko, servicesResult, statsResult] = await Promise.all([
    prisma.store.findUnique({
      where: { id: tokoid },
      select: { id: true, name: true, logoUrl: true },
    }),
    getServiceList(tokoid, undefined, 1, 1000),
    getServiceStats(tokoid),
  ]);

  const stats = statsResult.success && statsResult.data
    ? statsResult.data
    : { received: 0, repairing: 0, done: 0, pickedUp: 0, failed: 0, history: 0, total: 0 };
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

  if (!servicesResult.success || !servicesResult.data) {
    return <ServiceErrorState tokoName={toko?.name} logoUrl={toko?.logoUrl} error={servicesResult.error || "Gagal memuat data"} />;
  }

  return (
    <div className="space-y-8">
      <ServiceHeader tokoName={toko?.name} logoUrl={toko?.logoUrl} />
      <AdminServiceOverviewStats tokoId={tokoid} stats={stats} className={`space-y-4 ${isAllMenu ? "" : "hidden md:block"}`} />

      <ManageService
        key={`${initialSearchQuery}-${initialServiceId}`}
        allServices={servicesResult.data.data}
        tokoId={tokoid}
        pageSize={pageSize}
        hideTechnicianColumn={!can(scope, "service.assignTechnician")}
        initialSearchQuery={initialSearchQuery}
        initialServiceId={initialServiceId}
        actionPermissions={actionPermissions}
      />
    </div>
  );
}

function ServiceErrorState({ tokoName, logoUrl, error }: { tokoName?: string | null; logoUrl?: string | null; error: string }) {
  return (
    <div className="space-y-8">
      <ServiceHeader tokoName={tokoName} logoUrl={logoUrl} />
      <p className="text-muted-foreground text-destructive">{error}</p>
    </div>
  );
}

function ServiceHeader({ tokoName, logoUrl }: { tokoName?: string | null; logoUrl?: string | null }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-black tracking-tight">Service</h1>
        <div className="h-6 w-1 rounded-full bg-primary" />
        <div className="flex items-center gap-2">
          {logoUrl ? (
            <Image src={logoUrl} alt={tokoName || "Toko"} width={20} height={20} className="h-5 w-5 rounded-md object-cover" />
          ) : (
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-muted">
              <RiStore2Line className="h-3 w-3 text-muted-foreground" />
            </div>
          )}
          <span className="text-sm font-medium text-muted-foreground">{tokoName || "Toko"}</span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground/70">Kelola semua service di toko</p>
    </div>
  );
}
