import { getServiceList, getServiceStats } from "@/actions/service";
import { ManageService } from "@/components/dashboard/services/manage-service";
import prisma from "@/lib/prisma";
import Image from "next/image";
import { RiStore2Line } from "@remixicon/react";

interface AdminServicePageProps {
  params: Promise<{ tokoid: string }>;
}

export default async function AdminServicePage({ params }: AdminServicePageProps) {
  const { tokoid } = await params;
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
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight">Service</h1>
            <div className="h-6 w-1 bg-primary rounded-full" />
            <div className="flex items-center gap-2">
              {toko?.logoUrl ? (
                <Image
                  src={toko.logoUrl}
                  alt={toko.name}
                  width={20}
                  height={20}
                  className="h-5 w-5 rounded-md object-cover"
                />
              ) : (
                <div className="h-5 w-5 rounded-md bg-muted flex items-center justify-center">
                  <RiStore2Line className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
              <span className="text-sm font-medium text-muted-foreground">{toko?.name || "Toko"}</span>
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
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-black tracking-tight">Service</h1>
          <div className="h-6 w-1 bg-primary rounded-full" />
          <div className="flex items-center gap-2">
            {toko?.logoUrl ? (
              <Image
                src={toko.logoUrl}
                alt={toko.name}
                width={20}
                height={20}
                className="h-5 w-5 rounded-md object-cover"
              />
            ) : (
              <div className="h-5 w-5 rounded-md bg-muted flex items-center justify-center">
                <RiStore2Line className="h-3 w-3 text-muted-foreground" />
              </div>
            )}
            <span className="text-sm font-medium text-muted-foreground">{toko?.name || "Toko"}</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground/70">Kelola semua service di toko</p>
      </div>
      <ManageService
        allServices={servicesResult.data.data}
        initialStats={stats}
        tokoId={tokoid}
        pageSize={pageSize}
      />
    </div>
  );
}
