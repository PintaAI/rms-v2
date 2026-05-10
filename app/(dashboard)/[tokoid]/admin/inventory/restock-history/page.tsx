import Link from "next/link"
import Image from "next/image"
import { redirect } from "next/navigation"
import { getRestockHistory } from "@/actions/inventory"
import { FeatureLocked } from "@/components/dashboard/feature-locked"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getPageFeatureCheck, getRequestScope } from "@/lib/auth/request-scope"
import prisma from "@/lib/prisma"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  RiArrowLeftLine,
  RiHistoryLine,
  RiSearchLine,
  RiStackLine,
  RiStore2Line,
} from "@remixicon/react"

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

const buildHistoryHref = (
  tokoId: string,
  params: { q: string; userId: string; from: string; to: string; page?: number }
) => {
  const search = new URLSearchParams()
  if (params.q) search.set("q", params.q)
  if (params.userId) search.set("userId", params.userId)
  if (params.from) search.set("from", params.from)
  if (params.to) search.set("to", params.to)
  if (params.page && params.page > 1) search.set("page", String(params.page))
  const query = search.toString()
  return `/${tokoId}/admin/inventory/restock-history${query ? `?${query}` : ""}`
}

export default async function RestockHistoryPage({ params, searchParams }: RestockHistoryPageProps) {
  const { tokoid } = await params
  const query = await searchParams
  const q = getSingleParam(query.q)
  const userId = getSingleParam(query.userId)
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

  const history = historyResult.success && historyResult.data
    ? historyResult.data
    : { items: [], users: [], totalItems: 0, totalQty: 0, totalPrice: 0, page: 1, pageSize: 20, totalPages: 1 }
  const hasActiveFilter = Boolean(q || userId || from || to)

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Button asChild variant="ghost" className="-ml-2 w-fit">
          <Link href={`/${tokoid}/admin/inventory`}>
            <RiArrowLeftLine className="mr-1.5 size-4" />
            Kembali ke Inventory
          </Link>
        </Button>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight">Riwayat Restock</h1>
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
            Pantau semua restock sparepart, total qty masuk, dan total harga beli.
          </p>
          {!historyResult.success && (
            <p className="text-xs text-destructive">{historyResult.error ?? "Gagal memuat riwayat restock"}</p>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <RiHistoryLine className="size-4" />
              Total Transaksi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tabular-nums">{history.totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <RiStackLine className="size-4" />
              Total Qty Masuk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tabular-nums">{history.totalQty}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground">Total Harga Beli</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tabular-nums">{formatCurrency(history.totalPrice)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Filter Riwayat</CardTitle>
            {hasActiveFilter && <Badge variant="outline">Filter aktif</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_160px_160px_auto]">
            <div className="relative">
              <RiSearchLine className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Cari sparepart / user..."
                className="h-9 w-full rounded-md border border-input bg-background px-3 pl-9 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>
            <select
              name="userId"
              defaultValue={userId}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <option value="">Semua user</option>
              {history.users.map((user) => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
            <input
              type="date"
              name="to"
              defaultValue={to}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
            <div className="flex gap-2">
              <Button type="submit" className="flex-1 md:flex-none">Terapkan</Button>
              {hasActiveFilter && (
                <Button asChild variant="outline">
                  <Link href={`/${tokoid}/admin/inventory/restock-history`}>Reset</Link>
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Daftar Restock</CardTitle>
            <span className="text-xs text-muted-foreground">
              {history.totalItems} transaksi ditemukan
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {history.items.length === 0 ? (
            <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
              Belum ada riwayat restock yang cocok.
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Sparepart</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Harga Beli</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead>Stok</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{formatDate(new Date(item.createdAt))}</TableCell>
                      <TableCell>
                        <div className="font-medium">{item.sparepartName || "Sparepart"}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {item.sparepartBarcode || item.sparepartId}
                        </div>
                      </TableCell>
                      <TableCell>{item.userName}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          +{item.addedQty}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(item.purchasePrice)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(item.totalPrice)}</TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {item.previousStock} → {item.newStock}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {history.totalPages > 1 && (
                <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                  <span className="text-xs text-muted-foreground">
                    Halaman {history.page} dari {history.totalPages}
                  </span>
                  <div className="flex gap-2">
                    {history.page <= 1 ? (
                      <Button variant="outline" disabled>Sebelumnya</Button>
                    ) : (
                      <Button asChild variant="outline">
                        <Link href={buildHistoryHref(tokoid, { q, userId, from, to, page: history.page - 1 })}>Sebelumnya</Link>
                      </Button>
                    )}
                    {history.page >= history.totalPages ? (
                      <Button variant="outline" disabled>Berikutnya</Button>
                    ) : (
                      <Button asChild variant="outline">
                        <Link href={buildHistoryHref(tokoid, { q, userId, from, to, page: history.page + 1 })}>Berikutnya</Link>
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
