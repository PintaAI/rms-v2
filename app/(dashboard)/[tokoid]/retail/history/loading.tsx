import { Skeleton } from "@/components/ui/skeleton";
import { RiStore2Line } from "@remixicon/react";

function TableRowSkeleton() {
  return (
    <tr className="border-b border-border/50">
      <td className="p-4">
        <Skeleton className="h-4 w-24" />
      </td>
      <td className="p-4">
        <Skeleton className="h-4 w-28" />
      </td>
      <td className="p-4">
        <Skeleton className="h-4 w-20" />
      </td>
      <td className="p-4">
        <Skeleton className="h-4 w-10" />
      </td>
      <td className="p-4">
        <Skeleton className="h-4 w-16" />
      </td>
      <td className="p-4 text-right">
        <Skeleton className="ml-auto h-4 w-20" />
      </td>
      <td className="p-4">
        <Skeleton className="h-5 w-14 rounded-full" />
      </td>
    </tr>
  );
}

export default function SharedRetailHistoryLoading() {
  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Riwayat Retail</h1>
            <div className="h-5 w-1 shrink-0 rounded-full bg-primary sm:h-6" />
            <div className="flex min-w-0 items-center gap-2 rounded-lg bg-muted/40 px-2 py-1 sm:bg-transparent sm:px-0 sm:py-0">
              <div className="flex size-5 shrink-0 items-center justify-center rounded-md bg-muted">
                <RiStore2Line className="size-3 text-muted-foreground" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground/70">
            <span>Lihat transaksi retail, detail pembayaran, dan cetak ulang receipt.</span>
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="relative rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-4 rounded" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="mt-2 h-6 w-20" />
            <Skeleton className="mt-1 h-3 w-28" />
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-lg shadow-black/5">
        <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-4 py-4">
          <div className="min-w-0">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-1 h-3 w-32" />
          </div>
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-4 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tanggal</th>
                <th className="p-4 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Kasir</th>
                <th className="p-4 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Customer</th>
                <th className="p-4 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Items</th>
                <th className="p-4 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Pembayaran</th>
                <th className="p-4 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total</th>
                <th className="p-4 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Status</th>
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
    </div>
  );
}
