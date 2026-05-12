import { redirect } from "next/navigation"
import { getRetailSales, type RetailSalesFilters } from "@/actions/retail"
import { FeaturePreview } from "@/components/dashboard/feature-preview"
import { RetailSalesHistory } from "@/components/dashboard/retail/retail-sales-history"
import { getPageFeatureCheck, getRequestScope } from "@/lib/auth/request-scope"

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
  const salesResult = readOnly ? null : await getRetailSales(tokoId, filters)
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
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black tracking-tight">Riwayat Retail</h1>
        <p className="text-sm text-muted-foreground/70">Lihat transaksi retail, detail pembayaran, dan cetak ulang receipt.</p>
      </div>
      <RetailSalesHistory tokoId={tokoId} rolePath="staff" initialData={data} initialFilters={filters} />
    </div>
  )
}
