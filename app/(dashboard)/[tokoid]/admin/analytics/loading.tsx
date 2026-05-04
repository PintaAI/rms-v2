function StatCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card">
      <div className="absolute left-0 top-0 h-full w-1 animate-pulse bg-border" />
      <div className="space-y-2 p-5">
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        <div className="h-8 w-28 animate-pulse rounded bg-muted" />
        <div className="h-3 w-32 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="rounded-xl border border-border/50 bg-card">
      <div className="border-b border-border/50 p-5">
        <div className="h-5 w-36 animate-pulse rounded bg-muted" />
      </div>
      <div className="p-5">
        <div className="h-48 w-full animate-pulse rounded bg-muted/60" />
      </div>
    </div>
  );
}

function TableRowSkeleton() {
  return (
    <tr className="border-b border-border/50">
      <td className="p-4">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      </td>
      <td className="p-4">
        <div className="h-4 w-16 animate-pulse rounded bg-muted" />
      </td>
      <td className="p-4">
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
      </td>
    </tr>
  );
}

export default function Loading() {
  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Analytics</h1>
            <div className="h-5 w-1 shrink-0 rounded-full bg-primary sm:h-6" />
            <div className="flex items-center gap-2">
              <div className="size-5 animate-pulse rounded-md bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-3 w-48 animate-pulse rounded bg-muted" />
            <div className="h-6 w-24 animate-pulse rounded-full bg-muted" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border/50 bg-card">
          <div className="border-b border-border/50 p-5">
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Teknisi</th>
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Selesai</th>
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Revenue</th>
                </tr>
              </thead>
              <tbody>
                <TableRowSkeleton />
                <TableRowSkeleton />
                <TableRowSkeleton />
              </tbody>
            </table>
          </div>
        </div>

        <ChartSkeleton />
      </div>
    </div>
  );
}
