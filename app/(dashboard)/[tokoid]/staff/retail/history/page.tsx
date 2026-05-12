import Image from "next/image"
import { redirect } from "next/navigation"
import { getRetailSales, type RetailSalesFilters } from "@/actions/retail"
import { FeaturePreview } from "@/components/dashboard/feature-preview"
import { RetailSalesHistory } from "@/components/dashboard/retail/retail-sales-history"
import { getPageFeatureCheck, getRequestScope } from "@/lib/auth/request-scope"
import prisma from "@/lib/prisma"
import { RiStore2Line } from "@remixicon/react"

interface StaffRetailHistoryPageProps {
  params: Promise<{ tokoid: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function parseFilters(searchParams: Record<string, string | string[] | undefined>): RetailSalesFilters {
  return {
    q: firstParam(searchParams.q),
    cashierId: firstParam(searchParams.cashierId),
    paymentMethod: firstParam(searchParams.paymentMethod) as RetailSalesFilters["paymentMethod"],
    status: firstParam(searchParams.status) as RetailSalesFilters["status"],
    from: firstParam(searchParams.from),
    to: firstParam(searchParams.to),
    page: Number(firstParam(searchParams.page) || 1),
    pageSize: Number(firstParam(searchParams.pageSize) || 20),
  }
}

export default async function StaffRetailHistoryPage({ params, searchParams }: StaffRetailHistoryPageProps) {
  const { tokoid } = await params
  const scope = await getRequestScope(tokoid)
  const workflowAccess = getPageFeatureCheck(scope, "staff.workflow")
  const inventoryAccess = getPageFeatureCheck(scope, "inventory.management")
  const retailAccess = getPageFeatureCheck(scope, "retail.sales")
  const blockingAccess = !workflowAccess.allowed ? workflowAccess : !inventoryAccess.allowed ? inventoryAccess : !retailAccess.allowed ? retailAccess : null

  if (blockingAccess?.reason === "role_denied") redirect("/dashboard")
  if (blockingAccess?.reason === "disabled_by_toko") redirect(`/${tokoid}/staff`)

  const filters = parseFilters(await searchParams)

  if (blockingAccess?.reason === "plan_required") {
    return (
      <FeaturePreview featureKey={blockingAccess.metadata.key} requiredPlan={blockingAccess.metadata.minimumPlan}>
        <RetailHistoryShell tokoId={tokoid} filters={filters} readOnly />
      </FeaturePreview>
    )
  }

  return <RetailHistoryShell tokoId={tokoid} filters={filters} />
}

async function RetailHistoryShell({ tokoId, filters, readOnly = false }: { tokoId: string; filters: RetailSalesFilters; readOnly?: boolean }) {
  const [toko, salesResult] = await Promise.all([
    prisma.toko.findUnique({ where: { id: tokoId }, select: { name: true, logoUrl: true } }),
    readOnly ? Promise.resolve(null) : getRetailSales(tokoId, filters),
  ])
  const data = salesResult?.data ?? {
    items: [],
    cashiers: [],
    totalItems: 0,
    totalGross: 0,
    totalDiscount: 0,
    totalNet: 0,
    page: 1,
    pageSize: filters.pageSize ?? 20,
    totalPages: 1,
  }

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Riwayat Retail</h1>
            <div className="h-5 w-1 shrink-0 rounded-full bg-primary sm:h-6" />
            <div className="flex min-w-0 items-center gap-2 rounded-lg bg-muted/40 px-2 py-1 sm:bg-transparent sm:px-0 sm:py-0">
              {toko?.logoUrl ? (
                <Image src={toko.logoUrl} alt={toko.name} width={20} height={20} className="size-5 shrink-0 rounded-md object-cover" />
              ) : (
                <div className="flex size-5 shrink-0 items-center justify-center rounded-md bg-muted">
                  <RiStore2Line className="size-3 text-muted-foreground" />
                </div>
              )}
              <span className="min-w-0 truncate text-sm font-medium text-muted-foreground">{toko?.name ?? "Toko"}</span>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground/70">
            <span>Lihat transaksi retail, detail pembayaran, dan cetak ulang receipt.</span>
            <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary shadow-sm shadow-primary/5">
              {data.totalItems} transaksi
            </span>
          </div>
        </div>
      </div>
      <RetailSalesHistory tokoId={tokoId} rolePath="staff" initialData={data} initialFilters={filters} />
    </div>
  )
}
