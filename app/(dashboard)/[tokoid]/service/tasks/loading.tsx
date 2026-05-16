import {
  OverviewSectionHeader,
} from "@/components/dashboard/shared/overview-cards";
import { Skeleton } from "@/components/ui/skeleton";
import { RiStore2Line, RiSearchLine, RiArrowRightLine } from "@remixicon/react";

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

export default function SharedServiceTasksLoading() {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight">Task</h1>
            <div className="h-6 w-1 rounded-full bg-primary" />
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-muted">
                <RiStore2Line className="h-3 w-3 text-muted-foreground" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground/70">
            <Skeleton className="h-4 w-48" />
          </p>
        </div>

        <button className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm">
          <RiArrowRightLine className="h-4 w-4" />
          Overview
        </button>
      </div>

      <div className="relative w-full sm:max-w-sm">
        <RiSearchLine className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <div className="h-9 w-full animate-pulse rounded-md bg-muted pl-9" />
      </div>

      <section className="space-y-4">
        <OverviewSectionHeader title="Status Task" colorClass="bg-primary" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="relative rounded-xl border border-border/50 bg-card p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="size-4 rounded" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="mt-2 h-6 w-12" />
              <Skeleton className="mt-1 h-3 w-24" />
            </div>
          ))}
        </div>
      </section>

      <section>
        <TableSkeleton />
      </section>
    </div>
  );
}
