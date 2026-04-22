import {
  OverviewSectionHeader,
  OverviewStatsCardSkeleton,
} from "@/components/dashboard/shared/overview-cards";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RiCheckLine,
  RiStore2Line,
  RiTaskLine,
  RiToolsLine,
  RiArrowRightLine,
} from "@remixicon/react";

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border/50 shadow-lg shadow-black/5">
      <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="h-5 w-1 rounded-full bg-primary" />
          <Skeleton className="h-5 w-28" />
        </div>
        <Skeleton className="h-5 w-10 rounded-full" />
      </div>
      <div className="space-y-3 p-4">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
        <div className="flex justify-end pt-1">
          <Skeleton className="h-9 w-40 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export default function TeknisiOverviewLoading() {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight">Teknisi Overview</h1>
            <div className="h-6 w-1 rounded-full bg-primary" />
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-muted">
                <RiStore2Line className="h-3 w-3 text-muted-foreground" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground/70">Ringkasan task teknisi dan antrian servis saat ini</p>
        </div>

        <div className="rounded-md border border-border/50 px-4 py-2 text-sm text-muted-foreground">
          <RiArrowRightLine className="mr-1.5 inline h-4 w-4" />
          Task Manager
        </div>
      </div>

      <section className="space-y-4">
        <OverviewSectionHeader title="Status Task" colorClass="bg-primary" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <OverviewStatsCardSkeleton title="Task Tersedia" icon={<RiTaskLine className="h-4 w-4" />} variant="primary" />
          <OverviewStatsCardSkeleton title="Sedang Proses" icon={<RiToolsLine className="h-4 w-4" />} variant="accent" />
          <OverviewStatsCardSkeleton title="Selesai" icon={<RiCheckLine className="h-4 w-4" />} variant="success" />
          <OverviewStatsCardSkeleton title="Total Assigned" icon={<RiTaskLine className="h-4 w-4" />} variant="default" />
        </div>
      </section>

      <section>
        <TableSkeleton />
      </section>
    </div>
  );
}
