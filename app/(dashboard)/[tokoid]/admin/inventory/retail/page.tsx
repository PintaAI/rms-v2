import Image from "next/image";
import { redirect } from "next/navigation";
import { FeaturePreview } from "@/components/dashboard/feature-preview";
import { RetailItemTable } from "@/components/dashboard/inventory/retail-item-table";
import { getPageFeatureCheck, getRequestScope } from "@/lib/auth/request-scope";
import { MOCK_RETAIL_ITEMS } from "@/lib/feature-preview-mocks";
import prisma from "@/lib/prisma";
import { RiStore2Line } from "@remixicon/react";

interface AdminRetailInventoryPageProps {
  params: Promise<{ tokoid: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
}

export default async function AdminRetailInventoryPage({ params, searchParams }: AdminRetailInventoryPageProps) {
  const { tokoid } = await params;
  const query = await searchParams;
  const initialSearchQuery = Array.isArray(query.q) ? query.q[0] ?? "" : query.q ?? "";
  const scope = await getRequestScope(tokoid);
  const access = getPageFeatureCheck(scope, "inventory.management");

  if (access.reason === "role_denied") redirect("/dashboard");
  if (access.reason === "disabled_by_toko") redirect(`/${tokoid}/admin`);

  if (access.reason === "plan_required") {
    return (
      <FeaturePreview featureKey="inventory.management" requiredPlan={access.metadata.minimumPlan}>
        <div className="space-y-8">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight">Barang Retail</h1>
              <div className="h-6 w-1 rounded-full bg-primary" />
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-muted">
                  <RiStore2Line className="h-3 w-3 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Toko Example</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground/70">
              Kelola barang yang dijual langsung seperti charger, kabel, casing, HP second, dan produk retail lain.
            </p>
          </div>
          <RetailItemTable
            key={initialSearchQuery}
            tokoId={tokoid}
            initialSearchQuery={initialSearchQuery}
            initialItems={MOCK_RETAIL_ITEMS}
            readOnly
          />
        </div>
      </FeaturePreview>
    );
  }

  const toko = await prisma.toko.findUnique({
    where: { id: tokoid },
    select: { id: true, name: true, logoUrl: true },
  });

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-black tracking-tight">Barang Retail</h1>
          <div className="h-6 w-1 rounded-full bg-primary" />
          <div className="flex items-center gap-2">
            {toko?.logoUrl ? (
              <Image src={toko.logoUrl} alt={toko.name} width={20} height={20} className="h-5 w-5 rounded-md object-cover" />
            ) : (
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-muted">
                <RiStore2Line className="h-3 w-3 text-muted-foreground" />
              </div>
            )}
            <span className="text-sm font-medium text-muted-foreground">{toko?.name || "Toko"}</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground/70">
          Kelola barang yang dijual langsung seperti charger, kabel, casing, HP second, dan produk retail lain.
        </p>
      </div>
      <RetailItemTable key={initialSearchQuery} tokoId={tokoid} initialSearchQuery={initialSearchQuery} />
    </div>
  );
}
