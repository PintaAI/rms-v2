import { Skeleton } from "@/components/ui/skeleton";
import { RiStore2Line } from "@remixicon/react";

function TableRowSkeleton() {
  return (
    <tr className="border-b border-border/50">
      <td className="p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-4 w-28" />
        </div>
      </td>
      <td className="p-4">
        <Skeleton className="h-4 w-36" />
      </td>
      <td className="p-4">
        <Skeleton className="h-5 w-20 rounded-md" />
      </td>
      <td className="p-4">
        <Skeleton className="h-5 w-24 rounded-full" />
      </td>
      <td className="p-4">
        <div className="flex items-center gap-1">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="size-8 rounded-md" />
        </div>
      </td>
    </tr>
  );
}

export default function SharedKaryawanLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-black tracking-tight">Karyawan</h1>
          <div className="h-6 w-1 rounded-full bg-primary" />
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-muted">
              <RiStore2Line className="h-3 w-3 text-muted-foreground" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground/70">Kelola karyawan toko</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-4 rounded" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="mt-3 h-7 w-16" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
        ))}
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-10 w-full max-w-sm rounded-md" />
          <Skeleton className="h-10 w-36 rounded-md" />
        </div>

        <div className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-lg shadow-black/5">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-4 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Nama</th>
                <th className="p-4 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Email</th>
                <th className="p-4 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Role</th>
                <th className="p-4 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Performance</th>
                <th className="w-[112px] p-4 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Aksi</th>
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
      </section>
    </div>
  );
}
