import { getServiceList, getServiceStats } from "@/actions/service";
import { StaffManageService } from "@/components/dashboard/services/staff-manage-service";
import { StaffServiceOverviewStats } from "@/components/dashboard/services/service-overview-stats";
import prisma from "@/lib/prisma";
import Image from "next/image";
import { RiStore2Line } from "@remixicon/react";

export default async function StaffServicePage({
  params,
  searchParams,
}: {
  params: Promise<{ tokoid: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { tokoid } = await params;
  const query = await searchParams;
  const initialSearchQuery = Array.isArray(query.q) ? query.q[0] ?? "" : query.q ?? "";
  const pageSize = 15;

  const toko = await prisma.toko.findUnique({
    where: { id: tokoid },
    select: { id: true, name: true, logoUrl: true },
  });

  const [servicesResult, statsResult] = await Promise.all([
    getServiceList(tokoid, undefined, 1, 1000),
    getServiceStats(tokoid),
  ]);

  const stats = statsResult.success && statsResult.data
    ? statsResult.data
    : { received: 0, repairing: 0, done: 0, pickedUp: 0, failed: 0, history: 0, total: 0 };

  if (!servicesResult.success || !servicesResult.data) {
    return (
      <div className="space-y-8">
        <div className="space-y-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Service</h1>
            <div className="h-5 w-1 shrink-0 rounded-full bg-primary sm:h-6" />
            <div className="flex min-w-0 items-center gap-2 rounded-lg bg-muted/40 px-2 py-1 sm:bg-transparent sm:px-0 sm:py-0">
              {toko?.logoUrl ? (
                <Image
                  src={toko.logoUrl}
                  alt={toko.name}
                  width={20}
                  height={20}
                  className="h-5 w-5 shrink-0 rounded-md object-cover"
                />
              ) : (
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted">
                  <RiStore2Line className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
              <span className="min-w-0 truncate text-sm font-medium text-muted-foreground">{toko?.name || "Toko"}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground/70">Kelola semua service di toko</p>
        </div>
        <p className="text-muted-foreground text-destructive">
          {servicesResult.error || "Gagal memuat data"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Service</h1>
          <div className="h-5 w-1 shrink-0 rounded-full bg-primary sm:h-6" />
          <div className="flex min-w-0 items-center gap-2 rounded-lg bg-muted/40 px-2 py-1 sm:bg-transparent sm:px-0 sm:py-0">
            {toko?.logoUrl ? (
              <Image
                src={toko.logoUrl}
                alt={toko.name}
                width={20}
                height={20}
                className="h-5 w-5 shrink-0 rounded-md object-cover"
              />
            ) : (
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted">
                <RiStore2Line className="h-3 w-3 text-muted-foreground" />
              </div>
            )}
            <span className="min-w-0 truncate text-sm font-medium text-muted-foreground">{toko?.name || "Toko"}</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground/70">Kelola semua service di toko</p>
      </div>
      <StaffServiceOverviewStats tokoId={tokoid} stats={stats} />

      <StaffManageService
        key={initialSearchQuery}
        allServices={servicesResult.data.data}
        tokoId={tokoid}
        pageSize={pageSize}
        initialSearchQuery={initialSearchQuery}
      />
    </div>
  );
}
