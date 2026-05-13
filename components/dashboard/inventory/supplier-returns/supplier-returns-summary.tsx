import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { RiExchangeBoxLine, RiInboxArchiveLine, RiRefund2Line, RiTruckLine } from "@remixicon/react"
import type { SupplierReturnsData } from "./types"

interface SupplierReturnsSummaryProps {
  summary: SupplierReturnsData["summary"]
}

export function SupplierReturnsSummary({ summary }: SupplierReturnsSummaryProps) {
  const items = [
    { label: "Pending", description: "Retur belum dikirim", value: summary.pendingCount, icon: RiInboxArchiveLine },
    { label: "Dikirim", description: "Menunggu supplier", value: summary.sentCount, icon: RiTruckLine },
    { label: "Diganti Bulan Ini", description: "Stok kembali masuk", value: summary.replacedThisMonth, icon: RiExchangeBoxLine },
    { label: "Refund Bulan Ini", description: "Nominal refund supplier", value: formatCurrency(summary.refundedAmountThisMonth), icon: RiRefund2Line },
  ]

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-foreground">
                <item.icon className="size-4" />
              </span>
              {item.label}
            </CardTitle>
            <CardDescription>{item.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tabular-nums">{item.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
