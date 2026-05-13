import type { InventoryReportResult } from "@/actions/inventory"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"
import { RiArchiveLine, RiBarcodeLine } from "@remixicon/react"
import { InventoryReportStatusBadge } from "./inventory-report-status-badge"

interface InventoryReportListProps {
  report: InventoryReportResult
}

export function InventoryReportList({ report }: InventoryReportListProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Nilai Stok Sparepart</CardTitle>
            <CardDescription>{report.items.length} item ditampilkan berdasarkan filter aktif</CardDescription>
          </div>
          <Badge variant="outline" className="w-fit">
            {formatCurrency(report.totalSellingValue)} nilai jual
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {report.items.length === 0 ? (
          <InventoryReportEmptyState />
        ) : (
          <div className="flex flex-col gap-4">
            <InventoryReportDesktopTable report={report} />
            <InventoryReportMobileList report={report} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function InventoryReportEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 px-4 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-background ring-1 ring-border">
        <RiArchiveLine className="size-5 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-medium">Tidak ada sparepart yang cocok</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Coba ubah pencarian, kategori, atau status stok untuk melihat item lainnya.
        </p>
      </div>
    </div>
  )
}

function InventoryReportDesktopTable({ report }: InventoryReportListProps) {
  return (
    <div className="hidden overflow-x-auto rounded-lg border lg:block">
      <Table>
        <TableHeader className="bg-muted/40">
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
          {report.items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="min-w-56">
                <div className="font-medium">{item.name}</div>
                <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                  <RiBarcodeLine className="size-3" />
                  <span className="truncate">{item.barcode}</span>
                </div>
              </TableCell>
              <TableCell>{item.categoryName ?? "-"}</TableCell>
              <TableCell>{item.supplierName ?? "-"}</TableCell>
              <TableCell><InventoryReportStatusBadge status={item.status} /></TableCell>
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
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function InventoryReportMobileList({ report }: InventoryReportListProps) {
  return (
    <div className="flex flex-col gap-3 lg:hidden">
      {report.items.map((item) => (
        <div key={item.id} className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-medium">{item.name}</div>
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <RiBarcodeLine className="size-3" />
                <span className="truncate">{item.barcode}</span>
              </div>
            </div>
            <InventoryReportStatusBadge status={item.status} />
          </div>

          <div className="grid gap-2 rounded-md bg-background/70 p-2 text-xs sm:grid-cols-2">
            <div className="text-muted-foreground">Kategori: <span className="text-foreground">{item.categoryName ?? "-"}</span></div>
            <div className="text-muted-foreground">Supplier: <span className="text-foreground">{item.supplierName ?? "-"}</span></div>
            <div className="text-muted-foreground">Stok: <span className="text-foreground tabular-nums">{item.stock} / min {item.criticalStock}</span></div>
            <div className="text-muted-foreground">Harga jual: <span className="text-foreground tabular-nums">{formatCurrency(item.defaultPrice)}</span></div>
          </div>

          <div className="grid gap-2 border-t pt-2 text-xs sm:grid-cols-3">
            <div>
              <div className="text-muted-foreground">Nilai Modal</div>
              <div className="font-semibold tabular-nums">{formatCurrency(item.capitalValue)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Nilai Jual</div>
              <div className="font-semibold tabular-nums">{formatCurrency(item.sellingValue)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Margin</div>
              <div className="font-semibold tabular-nums">{formatCurrency(item.potentialMargin)}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
