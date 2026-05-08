"use client";

import type { ServiceStats } from "@/actions/service";
import { OverviewStatsCard } from "@/components/dashboard/shared/overview-cards";
import { useOptimisticServiceStats } from "@/components/dashboard/services/use-optimistic-service-stats";
import { RiCheckDoubleLine, RiCheckLine, RiInboxLine, RiLogoutBoxLine, RiToolsLine } from "@remixicon/react";

interface ServiceOverviewStatsProps {
  tokoId: string;
  stats: ServiceStats;
  className?: string;
}

export function AdminServiceOverviewStats({ tokoId, stats: fallbackStats, className }: ServiceOverviewStatsProps) {
  const stats = useOptimisticServiceStats(tokoId, fallbackStats);

  return (
    <section className={className ?? "space-y-4"}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <OverviewStatsCard title="Masuk" value={stats.received} icon={<RiInboxLine className="h-4 w-4" />} description="menunggu teknisi" variant="primary" />
        <OverviewStatsCard title="Proses" value={stats.repairing} icon={<RiToolsLine className="h-4 w-4" />} description="sedang diperbaiki" variant="accent" />
        <OverviewStatsCard title="Selesai & Gagal" value={stats.done + stats.failed} icon={<RiCheckDoubleLine className="h-4 w-4" />} description={`${stats.done} selesai, ${stats.failed} gagal`} variant={stats.failed > 0 ? "warning" : "success"} />
        <OverviewStatsCard title="Diambil" value={stats.pickedUp} icon={<RiLogoutBoxLine className="h-4 w-4" />} description="sudah selesai" />
        <OverviewStatsCard title="Total" value={stats.total} icon={<RiInboxLine className="h-4 w-4" />} description="semua service" />
      </div>
    </section>
  );
}

export function StaffServiceOverviewStats({ tokoId, stats: fallbackStats, className }: ServiceOverviewStatsProps) {
  const stats = useOptimisticServiceStats(tokoId, fallbackStats);

  return (
    <section className={className ?? "space-y-4"}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <OverviewStatsCard title="Masuk" value={stats.received} icon={<RiInboxLine className="h-4 w-4" />} description="menunggu teknisi" variant="primary" />
        <OverviewStatsCard title="Proses" value={stats.repairing} icon={<RiToolsLine className="h-4 w-4" />} description="sedang diperbaiki" variant="accent" />
        <OverviewStatsCard title="Selesai" value={stats.done} icon={<RiCheckLine className="h-4 w-4" />} description={`${stats.done} selesai`} variant="success" />
        <OverviewStatsCard title="Diambil" value={stats.pickedUp} icon={<RiLogoutBoxLine className="h-4 w-4" />} description="sudah selesai" />
        <OverviewStatsCard title="Total" value={stats.total} icon={<RiInboxLine className="h-4 w-4" />} description="semua service" />
      </div>
    </section>
  );
}
