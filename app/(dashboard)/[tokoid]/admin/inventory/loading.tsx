function TableRowSkeleton({ cols: count }: { cols: number }) {
  return (
    <tr className="border-b border-border/50">
      {Array.from({ length: count }).map((_, i) => (
        <td key={i} className="p-4">
          <div className="h-4 w-20 bg-muted animate-pulse rounded" />
        </td>
      ))}
    </tr>
  );
}

export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-black tracking-tight">Inventory</h1>
          <div className="h-6 w-1 bg-primary rounded-full" />
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 bg-muted animate-pulse rounded-md" />
            <div className="h-4 w-20 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground/70">Kelola sparepart dan jasa service</p>
      </div>

      <div className="w-full">
        <div className="mb-4 inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
          <button className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 gap-1.5 bg-background text-foreground shadow-sm">
            <div className="h-4 w-4 bg-muted animate-pulse rounded" />
            Sparepart
          </button>
          <button className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 gap-1.5">
            <div className="h-4 w-4 bg-muted animate-pulse rounded" />
            Jasa
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-5 w-1 bg-primary rounded-full" />
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Sparepart</h2>
            </div>
            <div className="h-9 w-28 bg-muted animate-pulse rounded-md" />
          </div>

          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 bg-muted animate-pulse rounded" />
            <div className="h-10 w-full bg-muted animate-pulse rounded-md pl-9" />
          </div>

          <div className="border-border/50 shadow-lg shadow-black/5 overflow-hidden rounded-xl border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-widest">Name</th>
                    <th className="p-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-widest">Price</th>
                    <th className="p-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-widest">Stock</th>
                    <th className="p-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-widest">Compatibility</th>
                    <th className="p-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-widest w-[80px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <TableRowSkeleton cols={5} />
                  <TableRowSkeleton cols={5} />
                  <TableRowSkeleton cols={5} />
                  <TableRowSkeleton cols={5} />
                  <TableRowSkeleton cols={5} />
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}