import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { RiHistoryLine, RiMoneyDollarCircleLine, RiStackLine } from "@remixicon/react"
import type { RestockHistoryData } from "./types"

interface RestockHistorySummaryProps {
  history: Pick<RestockHistoryData, "totalItems" | "totalQty" | "totalPrice">
}

export function RestockHistorySummary({ history }: RestockHistorySummaryProps) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-foreground">
              <RiHistoryLine className="size-4" />
            </span>
            Total Transaksi
          </CardTitle>
          <CardDescription>Jumlah aktivitas restock tercatat</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-black tabular-nums">{history.totalItems}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-foreground">
              <RiStackLine className="size-4" />
            </span>
            Total Qty Masuk
          </CardTitle>
          <CardDescription>Akumulasi unit stok masuk</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-black tabular-nums">{history.totalQty}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-foreground">
              <RiMoneyDollarCircleLine className="size-4" />
            </span>
            Total Harga Beli
          </CardTitle>
          <CardDescription>Total nilai pembelian stok</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-black tabular-nums">{formatCurrency(history.totalPrice)}</div>
        </CardContent>
      </Card>
    </div>
  )
}
