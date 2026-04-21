import {
  OverviewSectionHeader,
  OverviewStatsCardSkeleton,
} from "@/components/dashboard/shared/overview-cards";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RiCheckLine,
  RiStore2Line,
  RiTaskLine,
  RiToolsLine,
} from "@remixicon/react";

function TaskListSkeleton({ title, accentClass }: { title: string; accentClass: string }) {
  return (
    <Card className="overflow-hidden border-border/50 py-0 shadow-lg shadow-black/5">
      <CardHeader className="border-b border-border/50 bg-muted/30 pt-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-5 w-1 rounded-full ${accentClass}`} />
            <span className="text-lg font-bold">{title}</span>
          </div>
          <Badge variant="outline">...</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        <div className="rounded-xl border border-border/50 bg-card p-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-4 w-56" />
          <Skeleton className="mt-2 h-3 w-24" />
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-3">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-2 h-4 w-52" />
          <Skeleton className="mt-2 h-3 w-20" />
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-3">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="mt-2 h-4 w-48" />
          <Skeleton className="mt-2 h-3 w-28" />
        </div>
      </CardContent>
    </Card>
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

      <section className="grid gap-6 lg:grid-cols-2">
        <TaskListSkeleton title="Task Tersedia" accentClass="bg-primary" />
        <TaskListSkeleton title="My Tasks" accentClass="bg-sky-500" />
      </section>
    </div>
  );
}
