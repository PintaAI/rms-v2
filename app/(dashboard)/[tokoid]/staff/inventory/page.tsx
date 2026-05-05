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
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-black tracking-tight">Staff Inventory</h1>
          <div className="h-6 w-1 bg-primary rounded-full" />
          <div className="flex items-center gap-2">
            {toko?.logoUrl ? (
              <Image
                src={toko.logoUrl}
                alt={toko.name}
                width={20}
                height={20}
                className="h-5 w-5 rounded-md object-cover"
              />
            ) : (
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-muted">
                <RiStore2Line className="h-3 w-3 text-muted-foreground" />
              </div>
            )}
            <span className="text-sm font-medium text-muted-foreground">{toko?.name || "Toko"}</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground/70">Kelola sparepart toko</p>
      </div>
      <StaffSparepartTable key={initialSearchQuery} tokoId={tokoid} initialSearchQuery={initialSearchQuery} />
    </div>
  );
}
