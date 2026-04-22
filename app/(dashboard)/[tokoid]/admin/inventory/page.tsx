import { InventoryTabs } from "@/components/dashboard/inventory/inventory-tabs";
import prisma from "@/lib/prisma";
import Image from "next/image";
import { RiStore2Line } from "@remixicon/react";

interface AdminInventoryPageProps {
  params: Promise<{ tokoid: string }>;
}

export default async function AdminInventoryPage({ params }: AdminInventoryPageProps) {
  const { tokoid } = await params;

  const toko = await prisma.toko.findUnique({
    where: { id: tokoid },
    select: { id: true, name: true, logoUrl: true },
  });

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-black tracking-tight">Inventory</h1>
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
              <div className="h-5 w-5 rounded-md bg-muted flex items-center justify-center">
                <RiStore2Line className="h-3 w-3 text-muted-foreground" />
              </div>
            )}
            <span className="text-sm font-medium text-muted-foreground">{toko?.name || "Toko"}</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground/70">Kelola sparepart dan jasa service</p>
      </div>
      <InventoryTabs tokoId={tokoid} readOnly={false} />
    </div>
  );
}
