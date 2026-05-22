"use client"

import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition, type KeyboardEvent } from "react"
import type { DateRange } from "react-day-picker"
import { getSalesOrder, type SalesOrderDetail, type SalesOrdersFilters, type SalesOrdersResult } from "@/actions/retail"
import { RetailSaleDetailDrawer } from "@/components/dashboard/retail/retail-sale-detail-drawer"
import { OverviewStatsCard } from "@/components/dashboard/shared/overview-cards"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, formatDate } from "@/lib/utils"
import { RiCalendarLine, RiFilter3Line, RiLoader4Line, RiMoneyDollarCircleLine, RiReceiptLine, RiSearchLine, RiWallet3Line } from "@remixicon/react"
import { toast } from "sonner"

const paymentLabels: Record<NonNullable<SalesOrdersFilters["paymentMethod"]>, string> = {
  all: "Semua metode",
  cash: "Cash",
  transfer: "Transfer",
  qris: "QRIS",
  debit: "Debit",
}

const statusLabels: Record<NonNullable<SalesOrdersFilters["status"]>, string> = {
  all: "Semua status",
  paid: "Paid",
  void: "Void",
}

type FilterDraft = {
  q: string
  range: DateRange
  cashierId: string
  paymentMethod: NonNullable<SalesOrdersFilters["paymentMethod"]>
  status: NonNullable<SalesOrdersFilters["status"]>
}

const presetOptions = [
  { key: "today", label: "Hari ini", getRange: () => ({ from: startOfToday(), to: startOfToday() }) },
  { key: "last-7-days", label: "7 hari", getRange: () => ({ from: addDays(startOfToday(), -6), to: startOfToday() }) },
  { key: "this-month", label: "Bulan ini", getRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { key: "last-month", label: "Bulan lalu", getRange: () => {
    const previousMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
    return { from: startOfMonth(previousMonth), to: endOfMonth(previousMonth) }
  } },
  { key: "last-3-months", label: "3 bulan", getRange: () => ({ from: startOfMonth(addMonths(new Date(), -2)), to: endOfMonth(new Date()) }) },
]

export function RetailSalesHistory({
  tokoId,
  rolePath,
  initialData,
  initialFilters,
}: {
  tokoId: string
  rolePath: "admin" | "staff" | "shared"
  initialData: SalesOrdersResult
  initialFilters: SalesOrdersFilters
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedSale, setSelectedSale] = useState<SalesOrderDetail | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [loadingSaleId, setLoadingSaleId] = useState<string | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const initialDraft = useMemo(() => getDraftFromFilters(initialFilters), [initialFilters])
  const [draft, setDraft] = useState<FilterDraft>(initialDraft)
  const [calendarMonth, setCalendarMonth] = useState(() => initialDraft.range.from ?? new Date())

  const activePreset = getActivePreset(draft.range)
  const canApply = !draft.range.from || Boolean(draft.range.to)
  const calendarKey = `${draft.range.from ? toDateKey(draft.range.from) : "open"}-${draft.range.to ? toDateKey(draft.range.to) : "open"}`

  function navigateWithFilters(filters: SalesOrdersFilters) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(filters)) {
      if (value && value !== "all" && value !== 1) params.set(key, String(value))
    }

    startTransition(() => {
      const pathname = rolePath === "shared" ? `/${tokoId}/retail/history` : `/${tokoId}/${rolePath}/retail/history`
      router.push(`${pathname}${params.size ? `?${params.toString()}` : ""}`)
    })
  }

  function applyFilters() {
    if (!canApply) return
    navigateWithFilters({
      q: draft.q,
      from: draft.range.from ? toDateKey(draft.range.from) : "",
      to: draft.range.to ? toDateKey(draft.range.to) : "",
      cashierId: draft.cashierId,
      paymentMethod: draft.paymentMethod,
      status: draft.status,
      page: 1,
      pageSize: initialData.pageSize,
    })
    setFilterOpen(false)
  }

  function handleFilterOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setDraft(initialDraft)
      setCalendarMonth(initialDraft.range.from ?? new Date())
    }
    setFilterOpen(nextOpen)
  }

  function selectPreset(range: DateRange) {
    setDraft((current) => ({ ...current, range }))
    if (range.from) setCalendarMonth(range.from)
  }

  function resetDraft() {
    const range = { from: undefined, to: undefined }
    setDraft({ q: "", range, cashierId: "all", paymentMethod: "all", status: "all" })
    if (range.from) setCalendarMonth(range.from)
  }

  function selectRangeDate(date: Date) {
    setDraft((current) => {
      if (!current.range.from || current.range.to) return { ...current, range: { from: date } }
      if (date < current.range.from) return { ...current, range: { from: date, to: current.range.from } }
      return { ...current, range: { from: current.range.from, to: date } }
    })
  }

  function handlePageChange(page: number) {
    navigateWithFilters({ ...initialFilters, page, pageSize: initialData.pageSize })
  }

  async function handleOpenDetail(saleId: string) {
    if (loadingSaleId) return
    setSelectedSale(null)
    setDetailOpen(true)
    setLoadingSaleId(saleId)
    const result = await getSalesOrder(saleId)
    setLoadingSaleId(null)

    if (!result.success || !result.data) {
      toast.error(result.error || "Gagal memuat detail retail")
      return
    }

    setSelectedSale(result.data)
    setDetailOpen(true)
  }

  function handleRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, saleId: string) {
    if (event.key !== "Enter" && event.key !== " ") return
    event.preventDefault()
    void handleOpenDetail(saleId)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <OverviewStatsCard
          title="Transaksi"
          value={initialData.totalItems}
          description={`${initialData.items.length} tampil di halaman ini`}
          icon={<RiReceiptLine className="size-4" />}
          variant="primary"
        />
        <OverviewStatsCard
          title="Gross Paid"
          value={formatCurrency(initialData.totalGross)}
          description="Sebelum potongan transaksi"
          icon={<RiMoneyDollarCircleLine className="size-4" />}
          variant="success"
        />
        <OverviewStatsCard
          title="Net Paid"
          value={formatCurrency(initialData.totalNet)}
          description={`${formatCurrency(initialData.totalDiscount)} total diskon`}
          icon={<RiWallet3Line className="size-4" />}
          variant="accent"
        />
      </div>

      <Card className="border-border/50 shadow-lg shadow-black/5">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <CardTitle>Riwayat Penjualan</CardTitle>
              <CardDescription>
                {getRangeLabel(initialDraft.range)} / Halaman {initialData.page} dari {initialData.totalPages}
              </CardDescription>
            </div>
            <Popover open={filterOpen} onOpenChange={handleFilterOpenChange}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full gap-1 sm:w-fit">
                  <RiFilter3Line data-icon="inline-start" />
                  Filter Riwayat
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[min(calc(100vw-2rem),42rem)] gap-4 p-4">
                <PopoverHeader>
                  <PopoverTitle>Filter Riwayat Retail</PopoverTitle>
                  <PopoverDescription>Pilih periode, kasir, pembayaran, status, atau kata kunci transaksi.</PopoverDescription>
                </PopoverHeader>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
                  <div className="flex flex-col gap-4">
                    <section className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        <RiCalendarLine className="size-3" />
                        Preset periode
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {presetOptions.map((preset) => (
                          <Button key={preset.key} type="button" variant={activePreset === preset.key ? "secondary" : "outline"} size="sm" onClick={() => selectPreset(preset.getRange())}>
                            {preset.label}
                          </Button>
                        ))}
                      </div>
                    </section>
                    <section className="flex flex-col gap-2">
                      <div className="flex flex-col gap-1">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Custom range</p>
                        <p className="text-xs text-muted-foreground">Klik tanggal mulai, lalu tanggal akhir.</p>
                      </div>
                      <div className="flex justify-center">
                        <Calendar key={calendarKey} mode="range" selected={draft.range} onDayClick={selectRangeDate} month={calendarMonth} onMonthChange={setCalendarMonth} numberOfMonths={1} />
                      </div>
                      <p className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{getRangeLabel(draft.range)}</p>
                    </section>
                  </div>
                  <FieldGroup className="gap-3">
                    <Field>
                      <FieldLabel htmlFor="retail-history-q">Search</FieldLabel>
                      <Input id="retail-history-q" value={draft.q} onChange={(event) => setDraft((current) => ({ ...current, q: event.target.value }))} placeholder="Sale ID, customer, item..." />
                    </Field>
                    <Field>
                      <FieldLabel>Kasir</FieldLabel>
                      <Select value={draft.cashierId} onValueChange={(value) => setDraft((current) => ({ ...current, cashierId: value }))}>
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
                      <Select value={draft.paymentMethod} onValueChange={(value) => setDraft((current) => ({ ...current, paymentMethod: value as FilterDraft["paymentMethod"] }))}>
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
                      <Select value={draft.status} onValueChange={(value) => setDraft((current) => ({ ...current, status: value as FilterDraft["status"] }))}>
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
                </div>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                  <Button type="button" variant="ghost" onClick={resetDraft} disabled={isPending}>Reset</Button>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setFilterOpen(false)} disabled={isPending}>Batal</Button>
                    <Button type="button" onClick={applyFilters} disabled={isPending || !canApply}>
                      {isPending ? <RiLoader4Line data-icon="inline-start" className="animate-spin" /> : <RiSearchLine data-icon="inline-start" />}
                      Terapkan
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialData.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Belum ada transaksi sesuai filter.</TableCell>
                  </TableRow>
                ) : initialData.items.map((sale) => (
                  <TableRow
                    key={sale.id}
                    tabIndex={0}
                    className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    onClick={() => void handleOpenDetail(sale.id)}
                    onKeyDown={(event) => handleRowKeyDown(event, sale.id)}
                  >
                    <TableCell className="min-w-36">{formatDate(sale.paidAt)}</TableCell>
                    <TableCell>{sale.cashier.name}</TableCell>
                    <TableCell>{sale.customerName || sale.customerPhone || "Walk-in"}</TableCell>
                    <TableCell>{sale.itemCount} item / {sale.totalQty} qty</TableCell>
                    <TableCell>{paymentLabels[sale.paymentMethod]}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatCurrency(sale.grandTotal)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={sale.status === "paid" ? "default" : "secondary"}>{sale.status === "paid" ? "Paid" : "Void"}</Badge>
                      </div>
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

      <RetailSaleDetailDrawer sale={selectedSale} open={detailOpen} onOpenChange={setDetailOpen} isLoading={Boolean(loadingSaleId)} />
    </div>
  )
}

function getDraftFromFilters(filters: SalesOrdersFilters): FilterDraft {
  return {
    q: filters.q ?? "",
    range: { from: parseDateKey(filters.from), to: parseDateKey(filters.to) },
    cashierId: filters.cashierId || "all",
    paymentMethod: filters.paymentMethod || "all",
    status: filters.status || "all",
  }
}

function getActivePreset(range: DateRange) {
  if (!range.from || !range.to) return null
  return presetOptions.find((preset) => {
    const presetRange = preset.getRange()
    return presetRange.from && presetRange.to && sameDay(presetRange.from, range.from!) && sameDay(presetRange.to, range.to!)
  })?.key ?? null
}

function getRangeLabel(range: DateRange) {
  if (range.from && range.to) return `${formatDate(range.from)} - ${formatDate(range.to)}`
  if (range.from) return `${formatDate(range.from)} - pilih tanggal akhir`
  return "Semua periode"
}

function startOfToday() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, date.getDate())
}

function parseDateKey(value?: string) {
  if (!value) return undefined
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return undefined
  return new Date(year, month - 1, day)
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function sameDay(a: Date, b: Date) {
  return toDateKey(a) === toDateKey(b)
}
