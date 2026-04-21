import { getTechnicianDashboard } from "@/actions/service";
import { TeknisiOverview } from "@/components/dashboard/teknisi/teknisi-overview";
import prisma from "@/lib/prisma";
import Image from "next/image";
import { RiStore2Line } from "@remixicon/react";

export default async function TeknisiOverviewPage({
  params,
}: {
  params: Promise<{ tokoid: string }>;
}) {
  const { tokoid } = await params;
  const toko = await prisma.toko.findUnique({
    where: { id: tokoid },
    select: { id: true, name: true, logoUrl: true },
  });
  const result = await getTechnicianDashboard(tokoid);

  if (!result.success || !result.data) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight">Teknisi Overview</h1>
              <div className="h-6 w-1 rounded-full bg-primary" />
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
                  <div className="flex h-5 w-5 items-center justify-center rounded-md bg-muted">
                    <RiStore2Line className="h-3 w-3 text-muted-foreground" />
                  </div>
                )}
                <span className="text-sm font-medium text-muted-foreground">{toko?.name || "Toko"}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground/70">Ringkasan task teknisi dan antrian servis saat ini</p>
          </div>
        </div>
        <p className="text-muted-foreground text-destructive">
          {result.error || "Gagal memuat data"}
        </p>
      </div>
    );
  }

  return (
    <TeknisiOverview
      stats={result.data.stats}
      availableServices={result.data.availableServices}
      myTasks={result.data.myTasks}
      tokoId={tokoid}
    />
  );
}
