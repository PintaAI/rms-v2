import Image from "next/image"
import type { RetailSaleDetail } from "@/actions/retail"
import { Separator } from "@/components/ui/separator"
import { formatCurrency, formatDate } from "@/lib/utils"

const paymentLabels: Record<RetailSaleDetail["paymentMethod"], string> = {
  cash: "Cash",
  transfer: "Transfer",
  qris: "QRIS",
  debit: "Debit",
}

function formatWarrantyDate(date: Date | string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date))
}

export function RetailReceipt({ sale }: { sale: RetailSaleDetail }) {
  return (
    <div className="mx-auto w-full max-w-sm bg-background p-5 text-sm text-foreground" data-retail-receipt>
      <div className="flex flex-col items-center gap-2 text-center">
        {sale.toko.logoUrl ? (
          <Image src={sale.toko.logoUrl} alt={sale.toko.name} width={48} height={48} className="size-12 rounded-xl object-cover" unoptimized />
        ) : null}
        <div>
          <h2 className="text-lg font-bold tracking-tight">{sale.toko.name}</h2>
          {sale.toko.address ? <p className="text-xs text-muted-foreground">{sale.toko.address}</p> : null}
          {sale.toko.phone ? <p className="text-xs text-muted-foreground">{sale.toko.phone}</p> : null}
        </div>
      </div>

      <Separator className="my-4" />

      <div className="flex flex-col gap-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Sale ID</span>
          <span className="font-medium">{sale.id.slice(0, 8).toUpperCase()}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Tanggal</span>
          <span className="text-right font-medium">{formatDate(sale.paidAt)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Kasir</span>
          <span className="font-medium">{sale.cashier.name}</span>
        </div>
        {(sale.customerName || sale.customerPhone) ? (
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Customer</span>
            <span className="text-right font-medium">{sale.customerName || sale.customerPhone}</span>
          </div>
        ) : null}
      </div>

      <Separator className="my-4" />

      <div className="flex flex-col gap-3">
        {sale.items.map((item) => (
          <div key={item.id} className="flex flex-col gap-1">
            <div className="flex justify-between gap-4">
              <span className="font-medium">{item.name}</span>
              <span className="font-medium tabular-nums">{formatCurrency(item.lineTotal)}</span>
            </div>
            <div className="flex justify-between gap-4 text-xs text-muted-foreground">
              <span>{item.qty} x {formatCurrency(item.unitPrice)}</span>
              {item.barcode ? <span>{item.barcode}</span> : null}
            </div>
            {item.warrantyUntil ? (
              <div className="text-xs font-medium text-foreground">Garansi sampai {formatWarrantyDate(item.warrantyUntil)}</div>
            ) : null}
          </div>
        ))}
      </div>

      <Separator className="my-4" />

      <div className="flex flex-col gap-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium tabular-nums">{formatCurrency(sale.subtotal)}</span>
        </div>
        {sale.discountAmount > 0 ? (
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Diskon</span>
            <span className="font-medium tabular-nums">- {formatCurrency(sale.discountAmount)}</span>
          </div>
        ) : null}
        <div className="flex justify-between gap-4 pt-2 text-base font-bold">
          <span>Total</span>
          <span className="tabular-nums">{formatCurrency(sale.grandTotal)}</span>
        </div>
        <div className="flex justify-between gap-4 pt-2">
          <span className="text-muted-foreground">Pembayaran</span>
          <span className="font-medium">{paymentLabels[sale.paymentMethod]}</span>
        </div>
        {sale.paymentMethod === "cash" ? (
          <>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Diterima</span>
              <span className="font-medium tabular-nums">{formatCurrency(sale.cashReceived ?? 0)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Kembali</span>
              <span className="font-medium tabular-nums">{formatCurrency(sale.changeAmount ?? 0)}</span>
            </div>
          </>
        ) : null}
      </div>

      {sale.toko.invoiceTerms ? (
        <>
          <Separator className="my-4" />
          <p className="whitespace-pre-line text-center text-xs text-muted-foreground">{sale.toko.invoiceTerms}</p>
        </>
      ) : null}
    </div>
  )
}
