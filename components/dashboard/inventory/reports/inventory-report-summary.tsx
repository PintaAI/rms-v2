import type { InventoryReportResult } from "@/actions/inventory"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { RiArchiveLine, RiBarChartBoxLine, RiMoneyDollarCircleLine } from "@remixicon/react"

interface InventoryReportSummaryProps {
  report: InventoryReportResult
}

const reportSummaryCards = [
  {
    key: "items",
    title: "Jenis Sparepart",
    description: "Item yang masuk filter laporan",
    icon: RiArchiveLine,
    getValue: (report: InventoryReportResult) => report.totalSpareparts.toLocaleString("id-ID"),
    getFooter: (report: InventoryReportResult) => `${report.totalStockUnits.toLocaleString("id-ID")} unit stok`,
  },
  {
    key: "capital",
    title: "Nilai Modal",
    description: "Akumulasi harga beli stok",
    icon: RiMoneyDollarCircleLine,
    getValue: (report: InventoryReportResult) => formatCurrency(report.totalCapitalValue),
    getFooter: () => "Berdasarkan purchase price",
  },
  {
    key: "selling",
    title: "Nilai Jual",
    description: "Estimasi omzet bila stok terjual",
    icon: RiBarChartBoxLine,
    getValue: (report: InventoryReportResult) => formatCurrency(report.totalSellingValue),
    getFooter: () => "Berdasarkan default price",
  },
  {
    key: "margin",
    title: "Potensi Margin",
    description: "Selisih nilai jual dan modal",
    icon: RiBarChartBoxLine,
    getValue: (report: InventoryReportResult) => formatCurrency(report.potentialMargin),
    getFooter: (report: InventoryReportResult) => `${report.outOfStockCount} habis, ${report.criticalStockCount} kritis, ${report.safeStockCount} aman`,
  },
]

export function InventoryReportSummary({ report }: InventoryReportSummaryProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {reportSummaryCards.map((card) => {
        const Icon = card.icon

        return (
          <Card key={card.key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-muted-foreground">
                <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-foreground">
                  <Icon className="size-4" />
                </span>
                {card.title}
              </CardTitle>
              <CardDescription>{card.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black tabular-nums">{card.getValue(report)}</div>
              <p className="mt-1 text-xs text-muted-foreground">{card.getFooter(report)}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
