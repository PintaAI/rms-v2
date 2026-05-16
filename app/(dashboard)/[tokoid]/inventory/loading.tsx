function TableRowSkeleton({ cols: count }: { cols: number }) {
  return (
    <tr className="border-b border-border/50">
      {Array.from({ length: count }).map((_, i) => (
        <td key={i} className="p-4">
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        </td>
      ))}
    </tr>
  );
}

export default function SharedInventoryLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-black tracking-tight">Inventory</h1>
          <div className="h-6 w-1 rounded-full bg-primary" />
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 animate-pulse rounded-md bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground/70">Kelola sparepart dan jasa service berdasarkan permission akun.</p>
      </div>

      <div className="w-full">
        <div className="mb-4 inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
          <button className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 gap-1.5 bg-background text-foreground shadow-sm">
            <div className="h-4 w-4 animate-pulse rounded bg-muted" />
            Sparepart
          </button>
          <button className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 gap-1.5">
            <div className="h-4 w-4 animate-pulse rounded bg-muted" />
            Jasa
          </button>
        </div>

        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-border/50">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Barcode</th>
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Nama</th>
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Kategori</th>
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Stok</th>
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Harga</th>
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Supplier</th>
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <TableRowSkeleton cols={7} />
                <TableRowSkeleton cols={7} />
                <TableRowSkeleton cols={7} />
                <TableRowSkeleton cols={7} />
                <TableRowSkeleton cols={7} />
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
