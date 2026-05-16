import { Skeleton } from "@/components/ui/skeleton";
import { RiStore2Line } from "@remixicon/react";

function ChartSkeleton() {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 shadow-lg shadow-black/5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-1 h-3 w-44" />
        </div>
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
      <div className="flex h-56 items-end gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t-md"
            style={{ height: `${32 + (i % 5) * 18}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function SharedAnalyticsLoading() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Analytics</h1>
            <div className="h-5 w-1 shrink-0 rounded-full bg-primary sm:h-6" />
            <div className="flex min-w-0 items-center gap-2 rounded-lg bg-muted/40 px-2 py-1 sm:bg-transparent sm:px-0 sm:py-0">
              <div className="flex size-5 shrink-0 items-center justify-center rounded-md bg-muted">
                <RiStore2Line className="size-3 text-muted-foreground" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground/70">
            <span>Pantau revenue, service, teknisi, dan inventory toko.</span>
            <Skeleton className="h-5 w-28 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-10 w-44 rounded-md" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-4 rounded" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="mt-3 h-7 w-24" />
            <Skeleton className="mt-2 h-3 w-32" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <ChartSkeleton />
        <div className="rounded-xl border border-border/50 bg-card p-4 shadow-lg shadow-black/5">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-1 h-3 w-44" />
          <div className="mt-5 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-9 rounded-full" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="mt-1 h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-14" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
