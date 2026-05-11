import Image from "next/image"
import { redirect } from "next/navigation"
import { getRetailCheckoutItems } from "@/actions/retail"
import { FeaturePreview } from "@/components/dashboard/feature-preview"
import { RetailCheckout } from "@/components/dashboard/retail/retail-checkout"
import { getPageFeatureCheck, getRequestScope } from "@/lib/auth/request-scope"
import prisma from "@/lib/prisma"
import { RiStore2Line } from "@remixicon/react"

interface AdminRetailPageProps {
  params: Promise<{ tokoid: string }>
}

export default async function AdminRetailPage({ params }: AdminRetailPageProps) {
  const { tokoid } = await params
  const scope = await getRequestScope(tokoid)
  const inventoryAccess = getPageFeatureCheck(scope, "inventory.management")
  const retailAccess = getPageFeatureCheck(scope, "retail.sales")
  const blockingAccess = !inventoryAccess.allowed ? inventoryAccess : !retailAccess.allowed ? retailAccess : null

  if (blockingAccess?.reason === "role_denied") redirect("/dashboard")
  if (blockingAccess?.reason === "disabled_by_toko") redirect(`/${tokoid}/admin`)

  if (blockingAccess?.reason === "plan_required") {
    return (
      <FeaturePreview featureKey={blockingAccess.metadata.key} requiredPlan={blockingAccess.metadata.minimumPlan}>
        <RetailPageShell tokoId={tokoid} tokoName="Toko Example" items={[]} readOnly />
      </FeaturePreview>
    )
  }

  const [toko, itemsResult] = await Promise.all([
    prisma.toko.findUnique({ where: { id: tokoid }, select: { id: true, name: true, logoUrl: true } }),
    getRetailCheckoutItems(tokoid),
  ])

  return <RetailPageShell tokoId={tokoid} tokoName={toko?.name ?? "Toko"} logoUrl={toko?.logoUrl} items={itemsResult.data ?? []} />
}

function RetailPageShell({
  tokoId,
  tokoName,
  logoUrl,
  items,
  readOnly = false,
}: {
  tokoId: string
  tokoName: string
  logoUrl?: string | null
  items: Awaited<ReturnType<typeof getRetailCheckoutItems>>["data"]
  readOnly?: boolean
}) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-black tracking-tight">Retail</h1>
          <div className="h-6 w-1 rounded-full bg-primary" />
          <div className="flex items-center gap-2">
            {logoUrl ? (
              <Image src={logoUrl} alt={tokoName} width={20} height={20} className="size-5 rounded-md object-cover" />
            ) : (
              <div className="flex size-5 items-center justify-center rounded-md bg-muted">
                <RiStore2Line className="size-3 text-muted-foreground" />
              </div>
            )}
            <span className="text-sm font-medium text-muted-foreground">{tokoName}</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground/70">Kasir penjualan langsung untuk sparepart dan barang retail.</p>
      </div>
      <RetailCheckout tokoId={tokoId} initialItems={items ?? []} readOnly={readOnly} />
    </div>
  )
}
