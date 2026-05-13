import { redirect } from "next/navigation"
import { getInventoryReport, type InventoryReportStockStatus } from "@/actions/inventory"
import { FeatureLocked } from "@/components/dashboard/feature-locked"
import { InventoryReportView } from "@/components/dashboard/inventory/reports/inventory-report-view"
import { getPageFeatureCheck, getRequestScope } from "@/lib/auth/request-scope"
import prisma from "@/lib/prisma"

interface InventoryReportsPageProps {
  params: Promise<{ tokoid: string }>
  searchParams: Promise<{
    q?: string | string[]
    categoryId?: string | string[]
    status?: string | string[]
  }>
}

const getSingleParam = (value?: string | string[]) => Array.isArray(value) ? value[0] ?? "" : value ?? ""

const normalizeStatus = (value: string): InventoryReportStockStatus => {
  if (value === "safe" || value === "critical" || value === "out") return value
  return "all"
}

export default async function InventoryReportsPage({ params, searchParams }: InventoryReportsPageProps) {
  const { tokoid } = await params
  const query = await searchParams
  const q = getSingleParam(query.q)
  const rawCategoryId = getSingleParam(query.categoryId)
  const categoryId = rawCategoryId === "all" ? "" : rawCategoryId
  const status = normalizeStatus(getSingleParam(query.status))
  const scope = await getRequestScope(tokoid)
  const access = getPageFeatureCheck(scope, "inventory.management")

  if (access.reason === "role_denied") redirect("/dashboard")
  if (access.reason === "disabled_by_toko") redirect(`/${tokoid}/admin`)

  if (!access.allowed) {
    return (
      <FeatureLocked
        featureLabel={access.metadata.label}
        featureDescription={access.metadata.description}
        requiredPlan={access.metadata.minimumPlan}
        reason={access.reason ?? "plan_required"}
        tokoId={tokoid}
      />
    )
  }

  const [toko, reportResult] = await Promise.all([
    prisma.toko.findUnique({
      where: { id: tokoid },
      select: { id: true, name: true, logoUrl: true },
    }),
    getInventoryReport(tokoid, { q, categoryId, status }),
  ])

  const report = reportResult.success && reportResult.data
    ? reportResult.data
    : {
        items: [],
        categories: [],
        supplierReturns: {
          supplierReports: [],
          mostReturnedSpareparts: [],
          totalPendingValue: 0,
          averageResolutionDays: null,
        },
        totalSpareparts: 0,
        totalStockUnits: 0,
        totalCapitalValue: 0,
        totalSellingValue: 0,
        potentialMargin: 0,
        outOfStockCount: 0,
        criticalStockCount: 0,
        safeStockCount: 0,
      }
  const hasActiveFilter = Boolean(q || categoryId || status !== "all")

  return (
    <InventoryReportView
      tokoId={tokoid}
      toko={toko}
      report={report}
      filters={{ q, categoryId, status }}
      hasActiveFilter={hasActiveFilter}
      errorMessage={!reportResult.success ? reportResult.error ?? "Gagal memuat laporan inventory" : undefined}
    />
  )
}
