import Image from "next/image";
import { getPhoneUnitsForCheckout, getRetailCheckoutItems, type PhoneUnitCheckoutItem, type RetailCheckoutItem } from "@/actions/retail";
import { RetailCheckout } from "@/components/dashboard/retail/retail-checkout";
import { assertPermission, can, getRequestScope } from "@/lib/auth/request-scope";
import prisma from "@/lib/prisma";
import { RiStore2Line } from "@remixicon/react";

interface SharedRetailPageProps {
  params: Promise<{ tokoid: string }>;
}

export default async function SharedRetailPage({ params }: SharedRetailPageProps) {
  const { tokoid } = await params;
  const scope = await getRequestScope(tokoid);
  assertPermission(scope, "retail.view");

  const [toko, itemsResult, phoneUnitsResult] = await Promise.all([
    prisma.store.findUnique({ where: { id: tokoid }, select: { id: true, name: true, logoUrl: true } }),
    getRetailCheckoutItems(tokoid),
    getPhoneUnitsForCheckout(tokoid),
  ]);

  const phoneItems = (phoneUnitsResult.data ?? []).map(phoneUnitToCheckoutItem);

  return (
    <RetailPageShell
      tokoId={tokoid}
      tokoName={toko?.name ?? "Toko"}
      logoUrl={toko?.logoUrl}
      items={[...(itemsResult.data ?? []), ...phoneItems]}
      readOnly={!can(scope, "retail.sell")}
    />
  );
}

function phoneUnitToCheckoutItem(unit: PhoneUnitCheckoutItem): RetailCheckoutItem {
  return {
    id: unit.id,
    barcode: unit.imei || unit.serialNumber || unit.id,
    name: `${unit.deviceBrandName} ${unit.deviceModelName}`,
    kind: "phone_unit",
    defaultPrice: unit.sellingPrice,
    purchasePrice: unit.purchasePrice,
    warrantyDays: unit.warrantyDays,
    stock: 1,
    categoryName: unit.categoryName ?? unit.condition,
    deviceBrandName: unit.deviceBrandName,
    deviceImageB64: unit.deviceImageB64,
  };
}

function RetailPageShell({
  tokoId,
  tokoName,
  logoUrl,
  items,
  readOnly = false,
}: {
  tokoId: string;
  tokoName: string;
  logoUrl?: string | null;
  items: Awaited<ReturnType<typeof getRetailCheckoutItems>>["data"];
  readOnly?: boolean;
}) {
  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Retail</h1>
            <div className="h-5 w-1 shrink-0 rounded-full bg-primary sm:h-6" />
            <div className="flex min-w-0 items-center gap-2 rounded-lg bg-muted/40 px-2 py-1 sm:bg-transparent sm:px-0 sm:py-0">
              {logoUrl ? (
                <Image src={logoUrl} alt={tokoName} width={20} height={20} className="size-5 shrink-0 rounded-md object-cover" />
              ) : (
                <div className="flex size-5 shrink-0 items-center justify-center rounded-md bg-muted">
                  <RiStore2Line className="size-3 text-muted-foreground" />
                </div>
              )}
              <span className="min-w-0 truncate text-sm font-medium text-muted-foreground">{tokoName}</span>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground/70">
            <span>Kasir penjualan langsung untuk sparepart dan barang retail.</span>
            <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary shadow-sm shadow-primary/5">
              {readOnly ? "Mode lihat" : "Checkout aktif"}
            </span>
          </div>
        </div>
      </div>
      <RetailCheckout tokoId={tokoId} initialItems={items ?? []} readOnly={readOnly} />
    </div>
  );
}
