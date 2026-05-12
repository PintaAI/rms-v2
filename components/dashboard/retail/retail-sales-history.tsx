"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition, type FormEvent } from "react"
import { getRetailSale, type RetailSaleDetail, type RetailSalesFilters, type RetailSalesResult } from "@/actions/retail"
import { RetailSaleDetailDialog } from "@/components/dashboard/retail/retail-sale-detail-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, formatDate } from "@/lib/utils"
import { RiEyeLine, RiLoader4Line, RiSearchLine } from "@remixicon/react"
import { toast } from "sonner"

const paymentLabels: Record<NonNullable<RetailSalesFilters["paymentMethod"]>, string> = {
  all: "Semua metode",
  cash: "Cash",
  transfer: "Transfer",
  qris: "QRIS",
  debit: "Debit",
}

const statusLabels: Record<NonNullable<RetailSalesFilters["status"]>, string> = {
  all: "Semua status",
  paid: "Paid",
  void: "Void",
}

export function RetailSalesHistory({
  tokoId,
  rolePath,
  initialData,
  initialFilters,
}: {
  tokoId: string
  rolePath: "admin" | "staff"
  initialData: RetailSalesResult
  initialFilters: RetailSalesFilters
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedSale, setSelectedSale] = useState<RetailSaleDetail | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [loadingSaleId, setLoadingSaleId] = useState<string | null>(null)

  function navigateWithFilters(filters: RetailSalesFilters) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(filters)) {
      if (value && value !== "all" && value !== 1) params.set(key, String(value))
    }

    startTransition(() => {
      router.push(`/${tokoId}/${rolePath}/retail/history${params.size ? `?${params.toString()}` : ""}`)
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    navigateWithFilters({
      q: String(formData.get("q") || ""),
      from: String(formData.get("from") || ""),
      to: String(formData.get("to") || ""),
      cashierId: String(formData.get("cashierId") || "all"),
      paymentMethod: String(formData.get("paymentMethod") || "all") as RetailSalesFilters["paymentMethod"],
      status: String(formData.get("status") || "all") as RetailSalesFilters["status"],
      page: 1,
      pageSize: initialData.pageSize,
    })
  }

  function handlePageChange(page: number) {
    navigateWithFilters({ ...initialFilters, page, pageSize: initialData.pageSize })
  }

  async function handleOpenDetail(saleId: string) {
    setLoadingSaleId(saleId)
    const result = await getRetailSale(saleId)
    setLoadingSaleId(null)

    if (!result.success || !result.data) {
      toast.error(result.error || "Gagal memuat detail retail")
      return
    }

    setSelectedSale(result.data)
    setDetailOpen(true)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Transaksi</CardDescription>
            <CardTitle>{initialData.totalItems}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Gross paid</CardDescription>
            <CardTitle>{formatCurrency(initialData.totalGross)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Net paid</CardDescription>
            <CardTitle>{formatCurrency(initialData.totalNet)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Riwayat</CardTitle>
          <CardDescription>Cari sale ID, customer, nomor HP, atau nama item.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <FieldGroup className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
              <Field className="lg:col-span-2">
                <FieldLabel htmlFor="retail-history-q">Search</FieldLabel>
                <Input id="retail-history-q" name="q" defaultValue={initialFilters.q ?? ""} placeholder="Sale ID, customer, item..." />
              </Field>
              <Field>
                <FieldLabel htmlFor="retail-history-from">Dari</FieldLabel>
                <Input id="retail-history-from" name="from" type="date" defaultValue={initialFilters.from ?? ""} />
              </Field>
              <Field>
                <FieldLabel htmlFor="retail-history-to">Sampai</FieldLabel>
                <Input id="retail-history-to" name="to" type="date" defaultValue={initialFilters.to ?? ""} />
              </Field>
              <Field>
                <FieldLabel>Kasir</FieldLabel>
                <Select name="cashierId" defaultValue={initialFilters.cashierId || "all"}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Kasir" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">Semua kasir</SelectItem>
                      {initialData.cashiers.map((cashier) => (
                        <SelectItem key={cashier.id} value={cashier.id}>{cashier.name}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Pembayaran</FieldLabel>
                <Select name="paymentMethod" defaultValue={initialFilters.paymentMethod || "all"}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pembayaran" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {Object.entries(paymentLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Status</FieldLabel>
                <Select name="status" defaultValue={initialFilters.status || "all"}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => navigateWithFilters({ pageSize: initialData.pageSize })} disabled={isPending}>Reset</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <RiLoader4Line data-icon="inline-start" className="animate-spin" /> : <RiSearchLine data-icon="inline-start" />}
                Terapkan Filter
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Penjualan</CardTitle>
          <CardDescription>Halaman {initialData.page} dari {initialData.totalPages}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Kasir</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Pembayaran</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialData.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">Belum ada transaksi sesuai filter.</TableCell>
                  </TableRow>
                ) : initialData.items.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="min-w-36">{formatDate(sale.paidAt)}</TableCell>
                    <TableCell>{sale.cashier.name}</TableCell>
                    <TableCell>{sale.customerName || sale.customerPhone || "Walk-in"}</TableCell>
                    <TableCell>{sale.itemCount} item / {sale.totalQty} qty</TableCell>
                    <TableCell>{paymentLabels[sale.paymentMethod]}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatCurrency(sale.grandTotal)}</TableCell>
                    <TableCell><Badge variant={sale.status === "paid" ? "default" : "secondary"}>{sale.status === "paid" ? "Paid" : "Void"}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button type="button" size="sm" variant="outline" onClick={() => handleOpenDetail(sale.id)} disabled={loadingSaleId === sale.id}>
                        {loadingSaleId === sale.id ? <RiLoader4Line data-icon="inline-start" className="animate-spin" /> : <RiEyeLine data-icon="inline-start" />}
                        Detail
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between gap-3">
            <Button type="button" variant="outline" disabled={initialData.page <= 1 || isPending} onClick={() => handlePageChange(initialData.page - 1)}>Sebelumnya</Button>
            <p className="text-sm text-muted-foreground">{initialData.totalItems} transaksi</p>
            <Button type="button" variant="outline" disabled={initialData.page >= initialData.totalPages || isPending} onClick={() => handlePageChange(initialData.page + 1)}>Berikutnya</Button>
          </div>
        </CardContent>
      </Card>

      <RetailSaleDetailDialog sale={selectedSale} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  )
}
