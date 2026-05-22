import type { SupplierReturnReport } from "@/actions/inventory"
import type { ComponentType } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"
import { RiExchangeBoxLine, RiRefund2Line, RiShieldCheckLine, RiTimeLine } from "@remixicon/react"

interface SupplierReturnReportSectionProps {
  report: SupplierReturnReport
}

const formatDays = (value: number | null) => value === null ? "-" : `${value.toLocaleString("id-ID")} hari`

export function SupplierReturnReportSection({ report }: SupplierReturnReportSectionProps) {
  const totalReplacedQty = report.supplierReports.reduce((total, item) => total + item.replacedQty, 0)
  const totalRefundedAmount = report.supplierReports.reduce((total, item) => total + item.refundedAmount, 0)
  const totalRejectedCount = report.supplierReports.reduce((total, item) => total + item.rejectedCount, 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ReportMetricCard title="Nilai Pending" description="Estimasi modal retur pending" value={formatCurrency(report.totalPendingValue)} icon={RiExchangeBoxLine} />
        <ReportMetricCard title="Rata-rata Selesai" description="Durasi retur sampai resolved" value={formatDays(report.averageResolutionDays)} icon={RiTimeLine} />
        <ReportMetricCard title="Qty Diganti" description="Total unit diganti supplier" value={totalReplacedQty.toLocaleString("id-ID")} icon={RiShieldCheckLine} />
        <ReportMetricCard title="Refund Supplier" description={`${totalRejectedCount} retur ditolak supplier`} value={formatCurrency(totalRefundedAmount)} icon={RiRefund2Line} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Laporan Retur Supplier</CardTitle>
              <CardDescription>Nilai pending, durasi resolusi, penggantian, refund, dan penolakan per supplier.</CardDescription>
            </div>
            <Badge variant="outline" className="w-fit">{report.supplierReports.length} supplier</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {report.supplierReports.length === 0 ? (
            <EmptyReport message="Belum ada data retur supplier untuk laporan." />
          ) : (
            <div className="flex flex-col gap-4">
              <div className="hidden overflow-x-auto rounded-lg border lg:block">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead>Supplier</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                      <TableHead className="text-right">Nilai Pending</TableHead>
                      <TableHead className="text-right">Avg Resolusi</TableHead>
                      <TableHead className="text-right">Qty Diganti</TableHead>
                      <TableHead className="text-right">Refund</TableHead>
                      <TableHead className="text-right">Ditolak</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.supplierReports.map((item) => (
                      <TableRow key={item.supplierName}>
                        <TableCell className="font-medium">{item.supplierName}</TableCell>
                        <TableCell className="text-right tabular-nums">{item.pendingCount} retur / {item.pendingQty} unit</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(item.pendingValue)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatDays(item.averageResolutionDays)}</TableCell>
                        <TableCell className="text-right tabular-nums">{item.replacedQty}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(item.refundedAmount)}</TableCell>
                        <TableCell className="text-right tabular-nums">{item.rejectedCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-3 lg:hidden">
                {report.supplierReports.map((item) => (
                  <div key={item.supplierName} className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-medium">{item.supplierName}</div>
                      <Badge variant="outline">{formatCurrency(item.pendingValue)}</Badge>
                    </div>
                    <div className="grid gap-2 rounded-md bg-background/70 p-2 text-xs sm:grid-cols-2">
                      <Metric label="Pending" value={`${item.pendingCount} retur / ${item.pendingQty} unit`} />
                      <Metric label="Avg resolusi" value={formatDays(item.averageResolutionDays)} />
                      <Metric label="Qty diganti" value={item.replacedQty.toLocaleString("id-ID")} />
                      <Metric label="Refund" value={formatCurrency(item.refundedAmount)} />
                      <Metric label="Ditolak" value={item.rejectedCount.toLocaleString("id-ID")} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Sparepart Paling Sering Diretur</CardTitle>
              <CardDescription>Top 10 sparepart berdasarkan total qty retur.</CardDescription>
            </div>
            <Badge variant="outline" className="w-fit">Quality signal</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {report.mostReturnedSpareparts.length === 0 ? (
            <EmptyReport message="Belum ada sparepart yang pernah diretur." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {report.mostReturnedSpareparts.map((item) => (
                <div key={item.inventoryItemId} className="rounded-lg border bg-muted/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{item.inventoryItemName}</div>
                      <div className="mt-1 text-xs text-muted-foreground">Supplier: {item.supplierName || "-"}</div>
                    </div>
                    <Badge variant="secondary">{item.returnedQty} unit</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{item.returnCount} retur tercatat.</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ReportMetricCard({ title, description, value, icon: Icon }: { title: string; description: string; value: string; icon: ComponentType<{ className?: string }> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-muted-foreground">
          <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-foreground">
            <Icon className="size-4" />
          </span>
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-black tabular-nums">{value}</div>
      </CardContent>
    </Card>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="text-muted-foreground">{label}: <span className="text-foreground tabular-nums">{value}</span></div>
}

function EmptyReport({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  )
}
