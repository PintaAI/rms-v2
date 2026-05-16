import { Skeleton } from "@/components/ui/skeleton";
import { RiStore2Line, RiShoppingCartLine, RiSearchLine } from "@remixicon/react";

function ItemRowSkeleton() {
  return (
    <tr className="border-b border-border/50">
      <td className="p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-32" />
        </div>
      </td>
      <td className="p-4">
        <Skeleton className="h-4 w-16" />
      </td>
      <td className="p-4">
        <Skeleton className="h-4 w-16" />
      </td>
      <td className="p-4">
        <Skeleton className="h-4 w-24" />
      </td>
      <td className="p-4">
        <Skeleton className="h-8 w-8 rounded-full" />
      </td>
    </tr>
  );
}

export default function SharedRetailLoading() {
  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Retail</h1>
            <div className="h-5 w-1 shrink-0 rounded-full bg-primary sm:h-6" />
            <div className="flex min-w-0 items-center gap-2 rounded-lg bg-muted/40 px-2 py-1 sm:bg-transparent sm:px-0 sm:py-0">
              <div className="flex size-5 shrink-0 items-center justify-center rounded-md bg-muted">
                <RiStore2Line className="size-3 text-muted-foreground" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground/70">
            <span>Kasir penjualan langsung untuk sparepart dan barang retail.</span>
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        </div>
      </div>

      <div className="pb-24">
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border/50 bg-card shadow-lg shadow-black/5">
            <div className="border-b border-border/50 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-5 w-1 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <div className="flex items-center gap-2">
                          <RiShoppingCartLine className="size-4 text-muted-foreground" />
                          <Skeleton className="h-5 w-28" />
                        </div>
                        <Skeleton className="h-5 w-24 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative w-full lg:w-64">
                  <RiSearchLine className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <div className="h-9 w-full animate-pulse rounded-md bg-muted pl-9" />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-4 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Item</th>
                    <th className="p-4 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Stok</th>
                    <th className="p-4 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Harga</th>
                    <th className="p-4 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Kategori</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody>
                  <ItemRowSkeleton />
                  <ItemRowSkeleton />
                  <ItemRowSkeleton />
                  <ItemRowSkeleton />
                  <ItemRowSkeleton />
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
