import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getRestockHistory } from "@/actions/inventory"
import { FeatureLocked } from "@/components/dashboard/feature-locked"
import { RestockHistoryFilter } from "@/components/dashboard/inventory/restock-history/restock-history-filter"
import { RestockHistoryList } from "@/components/dashboard/inventory/restock-history/restock-history-list"
import { RestockHistorySummary } from "@/components/dashboard/inventory/restock-history/restock-history-summary"
import type { RestockHistoryData } from "@/components/dashboard/inventory/restock-history/types"
import { Button } from "@/components/ui/button"
import { getPageFeatureCheck, getRequestScope } from "@/lib/auth/request-scope"
import prisma from "@/lib/prisma"
import { RiArrowLeftLine, RiStore2Line } from "@remixicon/react"

interface RestockHistoryPageProps {
  params: Promise<{ tokoid: string }>
  searchParams: Promise<{
    q?: string | string[]
    userId?: string | string[]
    from?: string | string[]
    to?: string | string[]
    page?: string | string[]
  }>
}

const getSingleParam = (value?: string | string[]) => Array.isArray(value) ? value[0] ?? "" : value ?? ""

export default async function RestockHistoryPage({ params, searchParams }: RestockHistoryPageProps) {
  const { tokoid } = await params
  const query = await searchParams
  const q = getSingleParam(query.q)
  const rawUserId = getSingleParam(query.userId)
  const userId = rawUserId === "all" ? "" : rawUserId
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

  const [toko, historyResult] = await Promise.all([
    prisma.toko.findUnique({
      where: { id: tokoid },
      select: { id: true, name: true, logoUrl: true },
    }),
    getRestockHistory(tokoid, { q, userId, from, to, page, pageSize: 20 }),
  ])

  const emptyHistory: RestockHistoryData = {
    items: [],
    users: [],
    totalItems: 0,
    totalQty: 0,
    totalPrice: 0,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  }
  const history: RestockHistoryData = historyResult.success && historyResult.data
    ? historyResult.data
    : emptyHistory
  const filters = { q, userId, from, to }
  const hasActiveFilter = Boolean(q || userId || from || to)

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
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Riwayat Restock</h1>
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
            Pantau stok masuk, nilai pembelian, user pencatat, dan perubahan stok sparepart.
          </p>
          {!historyResult.success && (
            <p className="text-xs text-destructive">{historyResult.error ?? "Gagal memuat riwayat restock"}</p>
          )}
        </div>
      </div>
      <RestockHistorySummary history={history} />
      <RestockHistoryFilter
        tokoId={tokoid}
        filters={filters}
        users={history.users}
        hasActiveFilter={hasActiveFilter}
      />
      <RestockHistoryList tokoId={tokoid} history={history} filters={filters} />
    </div>
  )
}
