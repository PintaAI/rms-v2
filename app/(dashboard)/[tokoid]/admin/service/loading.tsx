function StatsSkeleton() {
  return (
    <div className="relative bg-card rounded-xl border border-border/50 overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-border animate-pulse" />
      <div className="absolute top-3 right-3 w-8 h-8 rounded-md bg-muted animate-pulse" />
      <div className="pl-5 pr-4 pt-5 pb-5">
        <div className="h-3 w-20 bg-muted animate-pulse rounded" />
        <div className="mt-2 h-8 w-16 bg-muted animate-pulse rounded" />
        <div className="mt-1.5 h-3 w-24 bg-muted animate-pulse rounded" />
      </div>
    </div>
  );
}

function TableRowSkeleton() {
  return (
    <tr className="border-b border-border/50">
      <td className="p-4">
        <div className="h-4 w-20 bg-muted animate-pulse rounded" />
      </td>
      <td className="p-4">
        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
      </td>
      <td className="p-4">
        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
      </td>
      <td className="p-4">
        <div className="h-6 w-16 bg-muted animate-pulse rounded-full" />
      </td>
      <td className="p-4">
        <div className="h-4 w-20 bg-muted animate-pulse rounded" />
      </td>
      <td className="p-4">
        <div className="h-4 w-18 bg-muted animate-pulse rounded" />
      </td>
      <td className="p-4">
        <div className="flex gap-2">
          <div className="h-8 w-8 bg-muted animate-pulse rounded" />
          <div className="h-8 w-8 bg-muted animate-pulse rounded" />
        </div>
      </td>
    </tr>
  );
}

export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-black tracking-tight">Service</h1>
          <div className="h-6 w-1 bg-primary rounded-full" />
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 bg-muted animate-pulse rounded-md" />
            <div className="h-4 w-20 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground/70">Kelola semua service di toko</p>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-5 w-1 bg-primary rounded-full" />
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Semua Service</h2>
            <span className="text-xs text-muted-foreground/60">Loading...</span>
          </div>
          <div className="h-9 w-28 bg-muted animate-pulse rounded-md" />
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
        <div className="border-border/50 shadow-lg shadow-black/5 overflow-hidden rounded-xl border">
          <div className="border-b border-border/50 bg-muted/30 p-4">
            <div className="flex items-center gap-3">
              <div className="h-5 w-1 bg-primary rounded-full" />
              <h3 className="text-lg font-bold">Service Terbaru</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-widest">ID</th>
                  <th className="p-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-widest">Device</th>
                  <th className="p-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-widest">Customer</th>
                  <th className="p-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-widest">Status</th>
                  <th className="p-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-widest">Teknisi</th>
                  <th className="p-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-widest">Tanggal</th>
                  <th className="p-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-widest">Aksi</th>
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