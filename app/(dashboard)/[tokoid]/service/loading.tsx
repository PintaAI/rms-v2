import { Skeleton } from "@/components/ui/skeleton";
import { RiStore2Line } from "@remixicon/react";

function StatsSkeleton() {
  return (
    <div className="relative rounded-xl border border-border/50 bg-card overflow-hidden">
      <div className="absolute left-0 top-0 h-full w-1 animate-pulse bg-border" />
      <div className="absolute right-3 top-3 h-8 w-8 animate-pulse rounded-md bg-muted" />
      <div className="pb-5 pl-5 pr-4 pt-5">
        <div className="h-3 w-20 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-8 w-16 animate-pulse rounded bg-muted" />
        <div className="mt-1.5 h-3 w-24 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

function TableRowSkeleton() {
  return (
    <tr className="border-b border-border/50">
      <td className="p-4">
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
      </td>
      <td className="p-4">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      </td>
      <td className="p-4">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      </td>
      <td className="p-4">
        <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
      </td>
      <td className="p-4">
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
      </td>
      <td className="p-4">
        <div className="h-4 w-18 animate-pulse rounded bg-muted" />
      </td>
      <td className="p-4">
        <div className="flex gap-2">
          <div className="h-8 w-8 animate-pulse rounded bg-muted" />
          <div className="h-8 w-8 animate-pulse rounded bg-muted" />
        </div>
      </td>
    </tr>
  );
}

export default function SharedServiceLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-black tracking-tight">Service</h1>
          <div className="h-6 w-1 rounded-full bg-primary" />
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-muted">
              <RiStore2Line className="h-3 w-3 text-muted-foreground" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground/70">Kelola semua service di toko</p>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-5 w-1 rounded-full bg-primary" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Semua Service</h2>
            <span className="text-xs text-muted-foreground/60">Loading...</span>
          </div>
          <div className="h-9 w-28 animate-pulse rounded-md bg-muted" />
        </div>
      </section>

      <section className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <StatsSkeleton />
          <StatsSkeleton />
          <StatsSkeleton />
          <StatsSkeleton />
          <StatsSkeleton />
          <StatsSkeleton />
        </div>
      </section>

      <section>
        <div className="overflow-hidden rounded-xl border border-border/50 shadow-lg shadow-black/5">
          <div className="border-b border-border/50 bg-muted/30 p-4">
            <div className="flex items-center gap-3">
              <div className="h-5 w-1 rounded-full bg-primary" />
              <h3 className="text-lg font-bold">Service Terbaru</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">ID</th>
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Device</th>
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Customer</th>
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Status</th>
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Teknisi</th>
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tanggal</th>
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <TableRowSkeleton />
                <TableRowSkeleton />
                <TableRowSkeleton />
                <TableRowSkeleton />
                <TableRowSkeleton />
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
