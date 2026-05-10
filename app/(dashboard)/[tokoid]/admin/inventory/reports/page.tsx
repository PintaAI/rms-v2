import Link from "next/link"
import Image from "next/image"
import { redirect } from "next/navigation"
import { getInventoryReport, type InventoryReportStockStatus } from "@/actions/inventory"
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
import { cn, formatCurrency } from "@/lib/utils"
import {
  RiArchiveLine,
  RiArrowLeftLine,
  RiBarChartBoxLine,
  RiMoneyDollarCircleLine,
  RiSearchLine,
  RiStore2Line,
} from "@remixicon/react"

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

const stockStatusMeta = {
  safe: {
    label: "Aman",
    className: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 border-green-200",
  },
  critical: {
    label: "Kritis",
    className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300 border-yellow-200",
  },
  out: {
    label: "Habis",
    className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-200",
  },
}

export default async function InventoryReportsPage({ params, searchParams }: InventoryReportsPageProps) {
  const { tokoid } = await params
  const query = await searchParams
  const q = getSingleParam(query.q)
  const categoryId = getSingleParam(query.categoryId)
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
            <h1 className="text-3xl font-black tracking-tight">Laporan Inventory</h1>
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
            Ringkasan nilai stok, potensi margin, dan status kesehatan sparepart.
          </p>
          {!reportResult.success && (
            <p className="text-xs text-destructive">{reportResult.error ?? "Gagal memuat laporan inventory"}</p>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <RiArchiveLine className="size-4" />
              Jenis Sparepart
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tabular-nums">{report.totalSpareparts}</div>
            <p className="text-xs text-muted-foreground">{report.totalStockUnits} unit stok</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <RiMoneyDollarCircleLine className="size-4" />
              Nilai Modal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tabular-nums">{formatCurrency(report.totalCapitalValue)}</div>
            <p className="text-xs text-muted-foreground">Berdasarkan harga beli</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <RiBarChartBoxLine className="size-4" />
              Nilai Jual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tabular-nums">{formatCurrency(report.totalSellingValue)}</div>
            <p className="text-xs text-muted-foreground">Berdasarkan harga jual</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground">Potensi Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tabular-nums">{formatCurrency(report.potentialMargin)}</div>
            <p className="text-xs text-muted-foreground">
              {report.outOfStockCount} habis, {report.criticalStockCount} kritis, {report.safeStockCount} aman
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Filter Laporan</CardTitle>
            {hasActiveFilter && <Badge variant="outline">Filter aktif</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_180px_auto]">
            <div className="relative">
              <RiSearchLine className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Cari sparepart, barcode, supplier..."
                className="h-9 w-full rounded-md border border-input bg-background px-3 pl-9 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>
            <select
              name="categoryId"
              defaultValue={categoryId}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <option value="">Semua kategori</option>
              {report.categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <select
              name="status"
              defaultValue={status}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <option value="all">Semua status</option>
              <option value="safe">Stok aman</option>
              <option value="critical">Stok kritis</option>
              <option value="out">Stok habis</option>
            </select>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1 md:flex-none">Terapkan</Button>
              {hasActiveFilter && (
                <Button asChild variant="outline">
                  <Link href={`/${tokoid}/admin/inventory/reports`}>Reset</Link>
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Nilai Stok Sparepart</CardTitle>
            <span className="text-xs text-muted-foreground">{report.items.length} item ditampilkan</span>
          </div>
        </CardHeader>
        <CardContent>
          {report.items.length === 0 ? (
            <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
              Tidak ada sparepart yang cocok dengan filter.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sparepart</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Stok</TableHead>
                  <TableHead className="text-right">Harga Beli</TableHead>
                  <TableHead className="text-right">Harga Jual</TableHead>
                  <TableHead className="text-right">Nilai Modal</TableHead>
                  <TableHead className="text-right">Nilai Jual</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.items.map((item) => {
                  const statusMeta = stockStatusMeta[item.status]
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-[10px] text-muted-foreground">{item.barcode}</div>
                      </TableCell>
                      <TableCell>{item.categoryName ?? "-"}</TableCell>
                      <TableCell>{item.supplierName ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(statusMeta.className)}>{statusMeta.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.stock}
                        <span className="ml-1 text-[10px] text-muted-foreground">/ min {item.criticalStock}</span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(item.purchasePrice)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(item.defaultPrice)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(item.capitalValue)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(item.sellingValue)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(item.potentialMargin)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
