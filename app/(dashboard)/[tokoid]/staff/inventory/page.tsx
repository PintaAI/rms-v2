import { StaffSparepartTable } from "@/components/dashboard/inventory/staff-sparepart-table";
import prisma from "@/lib/prisma";
import Image from "next/image";
import { RiStore2Line } from "@remixicon/react";

export default async function StaffInventoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ tokoid: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { tokoid } = await params;
  const query = await searchParams;
  const initialSearchQuery = Array.isArray(query.q) ? query.q[0] ?? "" : query.q ?? "";
  const toko = await prisma.toko.findUnique({
    where: { id: tokoid },
    select: { id: true, name: true, logoUrl: true },
  });

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Staff Inventory</h1>
          <div className="h-5 w-1 shrink-0 rounded-full bg-primary sm:h-6" />
          <div className="flex min-w-0 items-center gap-2 rounded-lg bg-muted/40 px-2 py-1 sm:bg-transparent sm:px-0 sm:py-0">
            {toko?.logoUrl ? (
              <Image
                src={toko.logoUrl}
                alt={toko.name}
                width={20}
                height={20}
                className="h-5 w-5 shrink-0 rounded-md object-cover"
              />
            ) : (
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted">
                <RiStore2Line className="h-3 w-3 text-muted-foreground" />
              </div>
            )}
            <span className="min-w-0 truncate text-sm font-medium text-muted-foreground">{toko?.name || "Toko"}</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground/70">Kelola sparepart toko</p>
      </div>
      <StaffSparepartTable key={initialSearchQuery} tokoId={tokoid} initialSearchQuery={initialSearchQuery} />
    </div>
  );
}
