import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getSupplierReturns } from "@/actions/supplier-returns"
import { FeatureLocked } from "@/components/dashboard/feature-locked"
import { SupplierReturnsFilter } from "@/components/dashboard/inventory/supplier-returns/supplier-returns-filter"
import { SupplierReturnsList } from "@/components/dashboard/inventory/supplier-returns/supplier-returns-list"
import { SupplierReturnsSummary } from "@/components/dashboard/inventory/supplier-returns/supplier-returns-summary"
import type { SupplierReturnsData } from "@/components/dashboard/inventory/supplier-returns/types"
import { Button } from "@/components/ui/button"
import { getPageFeatureCheck, getRequestScope } from "@/lib/auth/request-scope"
import prisma from "@/lib/prisma"
import type { SupplierReturnStatus } from "@/prisma/generated/prisma/enums"
import { RiArrowLeftLine, RiStore2Line } from "@remixicon/react"

interface SupplierReturnsPageProps {
  params: Promise<{ tokoid: string }>
  searchParams: Promise<{
    q?: string | string[]
    status?: string | string[]
    from?: string | string[]
    to?: string | string[]
    page?: string | string[]
  }>
}

const getSingleParam = (value?: string | string[]) => Array.isArray(value) ? value[0] ?? "" : value ?? ""
const allowedStatuses = new Set(["all", "pending", "sent", "replaced", "refunded", "rejected"])
type SupplierReturnStatusFilter = SupplierReturnStatus | "all"

export default async function SupplierReturnsPage({ params, searchParams }: SupplierReturnsPageProps) {
  const { tokoid } = await params
  const query = await searchParams
  const q = getSingleParam(query.q)
  const rawStatus = getSingleParam(query.status) || "all"
  const status = (allowedStatuses.has(rawStatus) ? rawStatus : "all") as SupplierReturnStatusFilter
  const from = getSingleParam(query.from)
  const to = getSingleParam(query.to)
  const page = Number.parseInt(getSingleParam(query.page), 10) || 1
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

  const [toko, returnsResult] = await Promise.all([
    prisma.toko.findUnique({
      where: { id: tokoid },
      select: { id: true, name: true, logoUrl: true },
    }),
    getSupplierReturns(tokoid, { status, query: q, from, to, page, pageSize: 20 }),
  ])

  const emptyReturns: SupplierReturnsData = {
    items: [],
    summary: { pendingCount: 0, sentCount: 0, replacedThisMonth: 0, refundedAmountThisMonth: 0 },
    totalItems: 0,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  }
  const data = returnsResult.success && returnsResult.data ? returnsResult.data : emptyReturns
  const filters = { status, query: q, from, to }
  const hasActiveFilter = Boolean(q || status !== "all" || from || to)

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="flex flex-col gap-4">
        <Button asChild variant="ghost" className="-ml-2 w-fit">
          <Link href={`/${tokoid}/admin/inventory`}>
            <RiArrowLeftLine className="mr-1.5 size-4" />
            Kembali ke Inventory
          </Link>
        </Button>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Retur Supplier</h1>
            <div className="h-6 w-1 rounded-full bg-primary" />
            <div className="flex min-w-0 items-center gap-2">
              {toko?.logoUrl ? (
                <Image src={toko.logoUrl} alt={toko.name} width={20} height={20} className="size-5 rounded-md object-cover" />
              ) : (
                <div className="flex size-5 items-center justify-center rounded-md bg-muted">
                  <RiStore2Line className="size-3 text-muted-foreground" />
                </div>
              )}
              <span className="truncate text-sm font-medium text-muted-foreground">{toko?.name || "Toko"}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground/70">
            Kelola retur supplier dari klaim garansi, progres pengiriman, penggantian stok, refund, dan penolakan.
          </p>
          {!returnsResult.success && <p className="text-xs text-destructive">{returnsResult.error ?? "Gagal memuat retur supplier"}</p>}
        </div>
      </div>
      <SupplierReturnsSummary summary={data.summary} />
      <SupplierReturnsFilter tokoId={tokoid} filters={filters} hasActiveFilter={hasActiveFilter} />
      <SupplierReturnsList tokoId={tokoid} data={data} filters={filters} />
    </div>
  )
}
