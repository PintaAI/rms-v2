import { InventoryTabs } from "@/components/dashboard/inventory/inventory-tabs";
import { FeaturePreview } from "@/components/dashboard/feature-preview";
import { getRequestScope, getPageFeatureCheck } from "@/lib/auth/request-scope";
import { MOCK_SPAREPARTS, MOCK_PRICELISTS } from "@/lib/feature-preview-mocks";
import prisma from "@/lib/prisma";
import Image from "next/image";
import { RiStore2Line } from "@remixicon/react";
import { redirect } from "next/navigation";

interface AdminInventoryPageProps {
  params: Promise<{ tokoid: string }>;
  searchParams: Promise<{ tab?: string | string[]; q?: string | string[] }>;
}

export default async function AdminInventoryPage({ params, searchParams }: AdminInventoryPageProps) {
  const { tokoid } = await params;
  const query = await searchParams;
  const tab = Array.isArray(query.tab) ? query.tab[0] : query.tab;
  const initialTab = tab === "jasa" ? "jasa" : "sparepart";
  const initialSearchQuery = Array.isArray(query.q) ? query.q[0] ?? "" : query.q ?? "";
  const scope = await getRequestScope(tokoid);
  const access = getPageFeatureCheck(scope, "inventory.management");

  if (access.reason === "role_denied") redirect("/dashboard");
  if (access.reason === "disabled_by_toko") redirect(`/${tokoid}/admin`);

  if (access.reason === "plan_required") {
    return (
      <FeaturePreview
        featureKey="inventory.management"
        requiredPlan={access.metadata.minimumPlan}
        tokoId={tokoid}
      >
        <div className="space-y-8">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight">Inventory</h1>
              <div className="h-6 w-1 bg-primary rounded-full" />
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-muted">
                  <RiStore2Line className="h-3 w-3 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Toko Example</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground/70">Kelola sparepart dan jasa service</p>
          </div>
          <InventoryTabs
            key={`${initialTab}-${initialSearchQuery}`}
            tokoId={tokoid}
            readOnly
            initialSpareparts={MOCK_SPAREPARTS}
            initialPricelists={MOCK_PRICELISTS}
            initialTab={initialTab}
            initialSearchQuery={initialSearchQuery}
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
      <InventoryTabs key={`${initialTab}-${initialSearchQuery}`} tokoId={tokoid} readOnly={false} initialTab={initialTab} initialSearchQuery={initialSearchQuery} />
    </div>
  );
}
