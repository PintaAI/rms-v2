import Image from "next/image"
import { redirect } from "next/navigation"
import { getRetailCheckoutItems } from "@/actions/retail"
import { FeaturePreview } from "@/components/dashboard/feature-preview"
import { RetailCheckout } from "@/components/dashboard/retail/retail-checkout"
import { getPageFeatureCheck, getRequestScope } from "@/lib/auth/request-scope"
import prisma from "@/lib/prisma"
import { RiStore2Line } from "@remixicon/react"

interface StaffRetailPageProps {
  params: Promise<{ tokoid: string }>
}

export default async function StaffRetailPage({ params }: StaffRetailPageProps) {
  const { tokoid } = await params
  const scope = await getRequestScope(tokoid)
  const workflowAccess = getPageFeatureCheck(scope, "staff.workflow")
  const inventoryAccess = getPageFeatureCheck(scope, "inventory.management")
  const retailAccess = getPageFeatureCheck(scope, "retail.sales")
  const blockingAccess = !workflowAccess.allowed ? workflowAccess : !inventoryAccess.allowed ? inventoryAccess : !retailAccess.allowed ? retailAccess : null

  if (blockingAccess?.reason === "role_denied") redirect("/dashboard")
  if (blockingAccess?.reason === "disabled_by_toko") redirect(`/${tokoid}/staff`)

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
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Retail Staff</h1>
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
              Checkout aktif
            </span>
          </div>
        </div>
      </div>
      <RetailCheckout tokoId={tokoId} initialItems={items ?? []} readOnly={readOnly} />
    </div>
  )
}
