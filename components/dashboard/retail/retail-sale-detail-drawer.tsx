"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { RetailSaleDetail } from "@/actions/retail"
import { RetailReceipt } from "@/components/dashboard/retail/retail-receipt"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, formatDate } from "@/lib/utils"
import { RiLoader4Line, RiPrinterLine } from "@remixicon/react"
import { toast } from "sonner"

const paymentLabels: Record<RetailSaleDetail["paymentMethod"], string> = {
  cash: "Cash",
  transfer: "Transfer",
  qris: "QRIS",
  debit: "Debit",
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

export function RetailSaleDetailDrawer({
  sale,
  open,
  onOpenChange,
  autoPrintKey,
  isLoading = false,
}: {
  sale: RetailSaleDetail | null
  open: boolean
  onOpenChange: (open: boolean) => void
  autoPrintKey?: string | null
  isLoading?: boolean
}) {
  const [isPrinting, setIsPrinting] = useState(false)
  const printedKeyRef = useRef<string | null>(null)

  const handlePrint = useCallback(() => {
    if (!sale) return

    setIsPrinting(true)
    const printWindow = window.open("", "_blank", "width=420,height=720")
    if (!printWindow) {
      toast.error("Popup print diblokir browser")
      setIsPrinting(false)
      return
    }

    const itemRows = sale.items.map((item) => `
      <div class="item">
        <div class="line"><strong>${escapeHtml(item.name)}</strong><strong>${formatCurrency(item.lineTotal)}</strong></div>
        <div class="muted line"><span>${item.qty} x ${formatCurrency(item.unitPrice)}</span><span>${escapeHtml(item.barcode || "")}</span></div>
      </div>`).join("")
    const cashRows = sale.paymentMethod === "cash" ? `
      <div class="line"><span>Diterima</span><strong>${formatCurrency(sale.cashReceived ?? 0)}</strong></div>
      <div class="line"><span>Kembali</span><strong>${formatCurrency(sale.changeAmount ?? 0)}</strong></div>` : ""

    printWindow.document.write(`<!doctype html>
      <html>
        <head>
          <title>Receipt ${sale.id.slice(0, 8).toUpperCase()}</title>
          <style>
            body { margin: 0; font-family: Arial, sans-serif; color: #111827; }
            .receipt { max-width: 360px; margin: 0 auto; padding: 20px; font-size: 13px; }
            .center { text-align: center; }
            .muted { color: #6b7280; font-size: 12px; }
            .line { display: flex; justify-content: space-between; gap: 16px; }
            .item { margin-bottom: 10px; }
            .divider { border-top: 1px solid #e5e7eb; margin: 14px 0; }
            .total { font-size: 16px; font-weight: 700; }
            .terms { white-space: pre-line; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <main class="receipt">
            <section class="center">
              <h2>${escapeHtml(sale.toko.name)}</h2>
              ${sale.toko.address ? `<p class="muted">${escapeHtml(sale.toko.address)}</p>` : ""}
              ${sale.toko.phone ? `<p class="muted">${escapeHtml(sale.toko.phone)}</p>` : ""}
            </section>
            <div class="divider"></div>
            <section>
              <div class="line"><span class="muted">Sale ID</span><strong>${sale.id.slice(0, 8).toUpperCase()}</strong></div>
              <div class="line"><span class="muted">Tanggal</span><strong>${formatDate(sale.paidAt)}</strong></div>
              <div class="line"><span class="muted">Kasir</span><strong>${escapeHtml(sale.cashier.name)}</strong></div>
              ${(sale.customerName || sale.customerPhone) ? `<div class="line"><span class="muted">Customer</span><strong>${escapeHtml(sale.customerName || sale.customerPhone || "")}</strong></div>` : ""}
            </section>
            <div class="divider"></div>
            <section>${itemRows}</section>
            <div class="divider"></div>
            <section>
              <div class="line"><span>Subtotal</span><strong>${formatCurrency(sale.subtotal)}</strong></div>
              ${sale.discountAmount > 0 ? `<div class="line"><span>Diskon</span><strong>- ${formatCurrency(sale.discountAmount)}</strong></div>` : ""}
              <div class="line total"><span>Total</span><span>${formatCurrency(sale.grandTotal)}</span></div>
              <div class="line"><span>Pembayaran</span><strong>${paymentLabels[sale.paymentMethod]}</strong></div>
              ${cashRows}
            </section>
            ${sale.toko.invoiceTerms ? `<div class="divider"></div><p class="center muted terms">${escapeHtml(sale.toko.invoiceTerms)}</p>` : ""}
          </main>
        </body>
      </html>`)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    setIsPrinting(false)
  }, [sale])

  useEffect(() => {
    if (!open || !sale || !autoPrintKey || printedKeyRef.current === autoPrintKey) return

    printedKeyRef.current = autoPrintKey
    const timeoutId = window.setTimeout(() => {
      handlePrint()
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [autoPrintKey, handlePrint, open, sale])

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto flex h-dvh max-h-dvh w-full min-w-0 max-w-5xl flex-col overflow-hidden p-0 before:inset-0 before:rounded-t-2xl before:rounded-b-none data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-dvh sm:h-auto sm:max-h-[90vh] sm:data-[vaul-drawer-direction=bottom]:mt-16 sm:data-[vaul-drawer-direction=bottom]:max-h-[90vh]">
        {sale ? (
          <>
            <div className="shrink-0 border-b bg-popover px-4 pb-4 pt-3 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <DrawerHeader className="items-start p-0 text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
                  <DrawerTitle>Receipt {sale.id.slice(0, 8).toUpperCase()}</DrawerTitle>
                  <DrawerDescription>Detail transaksi retail dan preview receipt untuk cetak ulang.</DrawerDescription>
                </DrawerHeader>
                <Button type="button" size="sm" onClick={handlePrint} disabled={isPrinting}>
                  <RiPrinterLine data-icon="inline-start" />
                  Cetak Receipt
                </Button>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_380px]">
              <div className="flex min-h-0 flex-col gap-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Tanggal</p>
                    <p className="mt-1 font-medium">{formatDate(sale.paidAt)}</p>
                  </div>
                  <div className="rounded-xl border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Kasir</p>
                    <p className="mt-1 font-medium">{sale.cashier.name}</p>
                  </div>
                  <div className="rounded-xl border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge className="mt-1" variant={sale.status === "paid" ? "default" : "secondary"}>{sale.status === "paid" ? "Paid" : "Void"}</Badge>
                  </div>
                </div>

                <ScrollArea className="min-h-0 rounded-xl border lg:flex-1 [&>[data-slot=scroll-area-viewport]]:max-h-[260px] lg:[&>[data-slot=scroll-area-viewport]]:max-h-none">
                  <div className="min-w-[720px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Barcode</TableHead>
                          <TableHead className="text-center">Qty</TableHead>
                          <TableHead className="text-right">Harga</TableHead>
                          <TableHead className="text-right">Cost</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sale.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>{item.barcode || "-"}</TableCell>
                            <TableCell className="text-center">{item.qty}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatCurrency(item.unitPrice)}</TableCell>
                            <TableCell className="text-right tabular-nums">{item.unitCostSnapshot === null ? "-" : formatCurrency(item.unitCostSnapshot)}</TableCell>
                            <TableCell className="text-right font-medium tabular-nums">{formatCurrency(item.lineTotal)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>

                <div className="rounded-xl border bg-card p-4">
                  <div className="flex flex-col gap-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Customer</span>
                      <span className="font-medium">{sale.customerName || sale.customerPhone || "Walk-in"}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Pembayaran</span>
                      <span className="font-medium">{paymentLabels[sale.paymentMethod]}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium tabular-nums">{formatCurrency(sale.subtotal)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Diskon</span>
                      <span className="font-medium tabular-nums">- {formatCurrency(sale.discountAmount)}</span>
                    </div>
                    <div className="flex justify-between gap-4 text-lg font-bold">
                      <span>Total</span>
                      <span className="tabular-nums">{formatCurrency(sale.grandTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <ScrollArea className="min-h-0 rounded-xl border bg-card lg:h-full [&>[data-slot=scroll-area-viewport]]:max-h-[360px] lg:[&>[data-slot=scroll-area-viewport]]:max-h-none">
                <div className="p-3">
                  <RetailReceipt sale={sale} />
                </div>
              </ScrollArea>
            </div>
          </>
        ) : (
          <div className="flex min-h-72 flex-col items-center justify-center gap-3 p-6 text-center">
            {isLoading ? <RiLoader4Line className="animate-spin" /> : null}
            <DrawerHeader className="p-0 text-center">
              <DrawerTitle>Detail Receipt</DrawerTitle>
              <DrawerDescription>{isLoading ? "Memuat detail transaksi retail." : "Detail transaksi belum dipilih."}</DrawerDescription>
            </DrawerHeader>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  )
}
