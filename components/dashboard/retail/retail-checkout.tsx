"use client"

import { useDeferredValue, useEffect, useMemo, useRef, useState, type MouseEvent } from "react"
import { createRetailSale, getRetailCheckoutItems, getRetailSale, type RetailCheckoutItem, type RetailSaleDetail } from "@/actions/retail"
import { RetailSaleDetailDrawer } from "@/components/dashboard/retail/retail-sale-detail-drawer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Separator } from "@/components/ui/separator"
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerTitle } from "@/components/ui/drawer"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"
import {
  RiAddLine,
  RiBankCardLine,
  RiCashLine,
  RiDeleteBinLine,
  RiDiscountPercentLine,
  RiLoader4Line,
  RiMoneyDollarCircleLine,
  RiPriceTag3Line,
  RiQrCodeLine,
  RiRefund2Line,
  RiSearchLine,
  RiShoppingCartLine,
  RiSubtractLine,
  RiWallet3Line,
} from "@remixicon/react"
import { toast } from "sonner"

type CartLine = RetailCheckoutItem & { qty: number }
type DiscountType = "flat" | "percent"
type PaymentMethod = "cash" | "transfer" | "qris" | "debit"
type FlyingCartItem = {
  key: number
  name: string
  fromX: number
  fromY: number
  toX: number
  toY: number
  active: boolean
}

const AUTO_PRINT_RECEIPT_KEY = "retail-checkout-auto-print-receipt"

interface RetailCheckoutProps {
  tokoId: string
  initialItems: RetailCheckoutItem[]
  readOnly?: boolean
}

const paymentLabels: Record<PaymentMethod, string> = {
  cash: "Cash",
  transfer: "Transfer",
  qris: "QRIS",
  debit: "Debit",
}

function toNumber(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function FieldLabelIcon({ icon: Icon }: { icon: typeof RiWallet3Line }) {
  return <Icon className="size-3.5 text-muted-foreground" />
}

export function RetailCheckout({ tokoId, initialItems, readOnly = false }: RetailCheckoutProps) {
  const [items, setItems] = useState(initialItems)
  const [cart, setCart] = useState<CartLine[]>([])
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [isLoadingItems, setIsLoadingItems] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [discountType, setDiscountType] = useState<DiscountType>("flat")
  const [discountValue, setDiscountValue] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash")
  const [cashReceived, setCashReceived] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [selectedSale, setSelectedSale] = useState<RetailSaleDetail | null>(null)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(() => {
    if (typeof window === "undefined") return false
    return window.localStorage.getItem(AUTO_PRINT_RECEIPT_KEY) === "true"
  })
  const [autoPrintKey, setAutoPrintKey] = useState<string | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [flyingItem, setFlyingItem] = useState<FlyingCartItem | null>(null)
  const cartButtonRef = useRef<HTMLButtonElement>(null)
  const flyingItemKeyRef = useRef(0)

  useEffect(() => {
    let active = true

    const loadItems = async () => {
      setIsLoadingItems(true)
      const result = await getRetailCheckoutItems(tokoId, deferredSearch)
      if (!active) return
      if (result.success && result.data) setItems(result.data)
      setIsLoadingItems(false)
    }

    void loadItems()

    return () => {
      active = false
    }
  }, [deferredSearch, tokoId])

  const subtotal = useMemo(() => cart.reduce((total, item) => total + item.defaultPrice * item.qty, 0), [cart])
  const rawDiscount = toNumber(discountValue)
  const discountAmount = useMemo(() => {
    if (discountType === "percent") return Math.min(Math.floor(subtotal * (Math.min(rawDiscount, 100) / 100)), subtotal)
    return Math.min(rawDiscount, subtotal)
  }, [discountType, rawDiscount, subtotal])
  const grandTotal = subtotal - discountAmount
  const cashReceivedAmount = toNumber(cashReceived)
  const changeAmount = paymentMethod === "cash" ? Math.max(cashReceivedAmount - grandTotal, 0) : 0
  const cashIsInsufficient = paymentMethod === "cash" && cashReceivedAmount < grandTotal
  const totalQty = cart.reduce((total, item) => total + item.qty, 0)

  const animateToCart = (source: HTMLElement, item: RetailCheckoutItem) => {
    const sourceRect = source.getBoundingClientRect()
    const targetRect = cartButtonRef.current?.getBoundingClientRect()
    if (!targetRect) {
      return
    }

    flyingItemKeyRef.current += 1
    const nextItem = {
      key: flyingItemKeyRef.current,
      name: item.name,
      fromX: sourceRect.left + sourceRect.width / 2,
      fromY: sourceRect.top + sourceRect.height / 2,
      toX: targetRect.left + targetRect.width / 2,
      toY: targetRect.top + targetRect.height / 2,
      active: false,
    }

    setFlyingItem(nextItem)
    requestAnimationFrame(() => {
      setFlyingItem((current) => current?.key === nextItem.key ? { ...current, active: true } : current)
    })
  }

  const addToCart = (item: RetailCheckoutItem, source?: HTMLElement) => {
    if (readOnly) return
    const existing = cart.find((line) => line.id === item.id)
    if (existing && existing.qty >= item.stock) {
      toast.error(`Stok ${item.name} hanya tersedia ${item.stock}`)
      return
    }

    setCart((prev) => {
      const existingLine = prev.find((line) => line.id === item.id)
      if (!existingLine) return [...prev, { ...item, qty: 1 }]
      return prev.map((line) => line.id === item.id ? { ...line, qty: line.qty + 1 } : line)
    })
    if (source) animateToCart(source, item)
  }

  const handleAddToCart = (event: MouseEvent<HTMLButtonElement>, item: RetailCheckoutItem) => {
    addToCart(item, event.currentTarget)
  }

  const updateQty = (id: string, qty: number) => {
    setCart((prev) => prev.flatMap((line) => {
      if (line.id !== id) return [line]
      if (qty < 1) return []
      return [{ ...line, qty: Math.min(qty, line.stock) }]
    }))
  }

  const updateAutoPrintReceipt = (checked: boolean) => {
    setAutoPrintReceipt(checked)
    window.localStorage.setItem(AUTO_PRINT_RECEIPT_KEY, String(checked))
  }

  const handleCheckout = () => {
    if (readOnly || cart.length === 0) return
    if (cashIsInsufficient) {
      toast.error("Uang diterima kurang dari total belanja")
      return
    }

    setIsCheckingOut(true)
    void (async () => {
      const result = await createRetailSale({
        tokoId,
        customerName,
        customerPhone,
        items: cart.map((item) => ({ sparepartId: item.id, qty: item.qty })),
        discountType,
        discountAmount: discountType === "flat" ? toNumber(discountValue) : undefined,
        discountPercent: discountType === "percent" ? toNumber(discountValue) : undefined,
        paymentMethod,
        cashReceived: paymentMethod === "cash" ? cashReceivedAmount : null,
      })

      if (!result.success || !result.data) {
        toast.error(result.error || "Checkout gagal")
        setIsCheckingOut(false)
        return
      }

      const saleResult = await getRetailSale(result.data.id)
      if (saleResult.success && saleResult.data) {
        setSelectedSale(saleResult.data)
        setReceiptOpen(true)
        setAutoPrintKey(autoPrintReceipt ? `${saleResult.data.id}:${Date.now()}` : null)
      } else {
        toast.error(saleResult.error || "Receipt berhasil dibuat, tapi gagal memuat detail")
      }
      setCart([])
      setDiscountValue("")
      setCashReceived("")
      setCustomerName("")
      setCustomerPhone("")
      setCartOpen(false)
      const freshItems = await getRetailCheckoutItems(tokoId, deferredSearch)
      if (freshItems.success && freshItems.data) setItems(freshItems.data)
      toast.success("Penjualan retail berhasil")
      setIsCheckingOut(false)
    })()
  }

  return (
    <div className="pb-24">
      <div className="flex flex-col gap-4">
        <Card className="border-border/50 shadow-lg shadow-black/5">
          <CardHeader>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-5 w-1 shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <CardTitle className="truncate">Barang Dijual</CardTitle>
                      <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary shadow-sm shadow-primary/5">
                        {items.length} item tersedia
                      </span>
                    </div>
                    <CardDescription>Scan barcode atau cari item untuk transaksi kasir retail.</CardDescription>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 pl-4 text-xs">
                  {isLoadingItems ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/50 px-3 py-1 font-medium text-muted-foreground">
                      <RiLoader4Line className="size-3 animate-spin" />
                      Memuat item
                    </span>
                  ) : null}
                </div>
              </div>
              <Button
                ref={cartButtonRef}
                size="sm"
                className="w-full rounded-full sm:w-fit"
                onClick={() => setCartOpen(true)}
              >
                <RiShoppingCartLine data-icon="inline-start" />
                Keranjang
                {totalQty > 0 ? (
                  <span className="flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[0.625rem] font-bold leading-4 text-destructive-foreground">
                    {totalQty}
                  </span>
                ) : null}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <InputGroup>
              <InputGroupAddon>
                <RiSearchLine />
              </InputGroupAddon>
              <InputGroupInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Scan barcode atau cari barang..." />
            </InputGroup>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {items.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground sm:col-span-2 xl:col-span-3 2xl:col-span-4">
                  Tidak ada barang tersedia untuk dijual.
                </div>
              ) : items.map((item) => (
                <div
                  key={item.id}
                  className="flex min-h-40 flex-col justify-between rounded-xl border border-border/60 bg-card p-4 text-left shadow-sm transition hover:border-primary/40 hover:bg-muted/30 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.barcode}</div>
                    </div>
                    <Badge variant={item.kind === "retail_item" ? "secondary" : "outline"}>
                      {item.kind === "retail_item" ? "Retail" : "Sparepart"}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold">{formatCurrency(item.defaultPrice)}</span>
                    <span className="text-muted-foreground">Stok {item.stock}</span>
                  </div>
                  {item.warrantyDays ? <div className="mt-1 text-xs font-medium text-primary">Garansi {item.warrantyDays} hari</div> : null}
                  {item.categoryName ? <div className="mt-1 text-xs text-muted-foreground">{item.categoryName}</div> : null}
                  <Button className="mt-4 w-full" onClick={(event) => handleAddToCart(event, item)} disabled={readOnly || item.stock <= 0}>
                    <RiAddLine data-icon="inline-start" />
                    Tambah
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {flyingItem ? (
        <div
          className="pointer-events-none fixed z-[60] flex max-w-36 items-center gap-1.5 rounded-full border bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-2xl transition-[transform,opacity] duration-500 ease-out"
          style={{
            left: flyingItem.fromX,
            top: flyingItem.fromY,
            opacity: flyingItem.active ? 0 : 1,
            transform: flyingItem.active
              ? `translate(-50%, -50%) translate3d(${flyingItem.toX - flyingItem.fromX}px, ${flyingItem.toY - flyingItem.fromY}px, 0) scale(0.35)`
              : "translate(-50%, -50%) scale(1)",
          }}
          onTransitionEnd={() => {
            setFlyingItem(null)
          }}
        >
          <RiShoppingCartLine />
          <span className="truncate">{flyingItem.name}</span>
        </div>
      ) : null}

      <Drawer open={cartOpen} onOpenChange={setCartOpen}>
        <DrawerContent className="mx-auto flex h-dvh max-h-dvh w-full min-w-0 max-w-3xl flex-col overflow-hidden p-0 before:inset-0 before:rounded-t-2xl data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-dvh sm:h-auto sm:max-h-[85vh] sm:data-[vaul-drawer-direction=bottom]:mt-24 sm:data-[vaul-drawer-direction=bottom]:max-h-[85vh]">
          <div className="shrink-0 border-b bg-popover px-4 pb-4 pt-3 sm:px-6">
            <DrawerTitle className="flex items-center gap-2 text-base">
              Keranjang Kasir
              {totalQty > 0 ? <Badge variant="destructive">{totalQty}</Badge> : null}
            </DrawerTitle>
            <DrawerDescription>{cart.length} jenis barang siap checkout.</DrawerDescription>
          </div>

          <ScrollArea className="min-h-0 w-full max-w-full flex-1 overflow-x-hidden sm:flex-none [&>[data-slot=scroll-area-viewport]]:max-w-full [&>[data-slot=scroll-area-viewport]]:overflow-x-hidden">
            <div className="flex w-full max-w-full min-w-0 flex-col gap-5 p-4 sm:p-6">
            <div className="h-40 w-full max-w-[calc(100vw-2rem)] shrink-0 overflow-y-auto sm:h-auto sm:max-h-64 sm:max-w-full">
              <div className="flex w-full max-w-full min-w-0 flex-col gap-3">
                {cart.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Keranjang masih kosong.
                  </div>
                ) : (
                  <div className="w-full max-w-full min-w-0 overflow-x-auto rounded-md border">
                    <Table className="min-w-[720px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipe</TableHead>
                          <TableHead>Nama</TableHead>
                          <TableHead>Garansi</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Harga</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cart.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Badge variant="outline">{item.kind === "retail_item" ? "Retail" : "Sparepart"}</Badge>
                            </TableCell>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>{item.warrantyDays ? `${item.warrantyDays} hari` : "-"}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button variant="outline" size="icon-sm" onClick={() => updateQty(item.id, item.qty - 1)} disabled={readOnly}>
                                  <RiSubtractLine />
                                </Button>
                                <Input value={item.qty} onChange={(event) => updateQty(item.id, toNumber(event.target.value))} disabled={readOnly} className="h-7 w-14 text-center" />
                                <Button variant="outline" size="icon-sm" onClick={() => updateQty(item.id, item.qty + 1)} disabled={readOnly || item.qty >= item.stock}>
                                  <RiAddLine />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>{formatCurrency(item.defaultPrice)}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(item.defaultPrice * item.qty)}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => updateQty(item.id, 0)} disabled={readOnly}>
                                <RiDeleteBinLine className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>

            <div className="shrink-0">
              <FieldGroup>
                <div className="rounded-xl border bg-muted/30 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <RiPriceTag3Line className="size-4" />
                      Subtotal keranjang
                    </span>
                    <span className="text-lg font-bold tabular-nums">{formatCurrency(subtotal)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>Nama Customer</FieldLabel>
                    <Input value={customerName} onChange={(event) => setCustomerName(event.target.value)} disabled={readOnly} placeholder="Opsional" />
                  </Field>
                  <Field>
                    <FieldLabel>No. HP</FieldLabel>
                    <Input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} disabled={readOnly} placeholder="Opsional" />
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="retail-payment-method">
                      <FieldLabelIcon icon={RiWallet3Line} />
                      Metode pembayaran
                    </FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      {(Object.keys(paymentLabels) as PaymentMethod[]).map((method) => {
                        const icons = { cash: RiCashLine, transfer: RiBankCardLine, qris: RiQrCodeLine, debit: RiBankCardLine } as const
                        const Icon = icons[method]
                        return (
                          <Badge
                            key={method}
                            variant={paymentMethod === method ? "default" : "outline"}
                            className="flex cursor-pointer items-center gap-1.5 py-2 text-sm"
                            onClick={() => setPaymentMethod(method)}
                          >
                            <Icon className="size-4" />
                            {paymentLabels[method]}
                          </Badge>
                        )
                      })}
                    </div>
                  </Field>

                  <Field>
                    <div className="flex items-center justify-between gap-3">
                      <FieldLabel htmlFor="retail-discount">
                        <FieldLabelIcon icon={RiDiscountPercentLine} />
                        Diskon
                      </FieldLabel>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground" htmlFor="retail-discount-percent-toggle">
                        Nominal
                        <Switch
                          id="retail-discount-percent-toggle"
                          size="sm"
                          checked={discountType === "percent"}
                          disabled={readOnly}
                          onCheckedChange={(checked) => setDiscountType(checked ? "percent" : "flat")}
                        />
                        Persen
                      </label>
                    </div>
                    <div className="relative">
                      {discountType === "flat" && (
                        <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-xs font-medium text-muted-foreground">
                          Rp
                        </span>
                      )}
                      <Input
                        id="retail-discount"
                        value={discountValue}
                        onChange={(event) => setDiscountValue(event.target.value)}
                        disabled={readOnly}
                        inputMode="numeric"
                        min={0}
                        max={discountType === "percent" ? 100 : subtotal}
                        placeholder="0"
                        type="number"
                        className={discountType === "percent" ? "pr-8" : "pl-8"}
                      />
                      {discountType === "percent" && (
                        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground">
                          %
                        </span>
                      )}
                    </div>
                    {discountType === "percent" && discountValue ? (
                      <FieldDescription>
                        {Math.min(rawDiscount, 100)}% = {formatCurrency(discountAmount)}.
                      </FieldDescription>
                    ) : discountValue && rawDiscount > subtotal ? (
                      <FieldDescription>Diskon nominal dibatasi maksimal subtotal keranjang.</FieldDescription>
                    ) : null}
                  </Field>
                </div>

                {paymentMethod === "cash" ? (
                  <Field data-invalid={cashIsInsufficient || undefined}>
                    <FieldLabel htmlFor="retail-cash-received">
                      <FieldLabelIcon icon={RiCashLine} />
                      Uang diterima
                    </FieldLabel>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-xs font-medium text-muted-foreground">
                        Rp
                      </span>
                      <Input
                        id="retail-cash-received"
                        value={cashReceived}
                        onChange={(event) => setCashReceived(event.target.value)}
                        disabled={readOnly}
                        aria-invalid={cashIsInsufficient || undefined}
                        inputMode="numeric"
                        min={0}
                        placeholder="0"
                        type="number"
                        className="pl-8"
                      />
                    </div>
                    {cashIsInsufficient ? <FieldError>Uang diterima kurang dari total bayar.</FieldError> : null}
                  </Field>
                ) : null}
              </FieldGroup>
            </div>

            <div className="flex shrink-0 flex-col gap-3 rounded-xl border p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">Auto print</span>
                <Switch
                  id="retail-auto-print-receipt"
                  size="sm"
                  checked={autoPrintReceipt}
                  disabled={readOnly}
                  onCheckedChange={updateAutoPrintReceipt}
                />
              </div>

              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <RiPriceTag3Line className="size-3.5" />
                  Subtotal
                </span>
                <span className="font-medium tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <RiDiscountPercentLine className="size-3.5" />
                  Diskon{discountType === "percent" && rawDiscount > 0 ? ` (${Math.min(rawDiscount, 100)}%)` : ""}
                </span>
                <span className="font-medium tabular-nums">- {formatCurrency(discountAmount)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <RiBankCardLine className="size-3.5" />
                  Metode
                </span>
                <Badge variant="outline">{paymentLabels[paymentMethod]}</Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 font-medium">
                  <RiMoneyDollarCircleLine className="size-4 text-muted-foreground" />
                  Total bayar
                </span>
                <span className="text-xl font-bold tabular-nums">{formatCurrency(grandTotal)}</span>
              </div>
              {paymentMethod === "cash" ? (
                <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <RiRefund2Line className="size-3.5 text-muted-foreground" />
                    Kembalian
                  </span>
                  <span className="text-lg font-bold tabular-nums">{formatCurrency(changeAmount)}</span>
                </div>
              ) : null}
            </div>
            </div>
          </ScrollArea>

          <DrawerFooter className="shrink-0 border-t bg-popover/95 p-4 backdrop-blur sm:p-6">
            <Button size="lg" onClick={handleCheckout} disabled={readOnly || isCheckingOut || cart.length === 0 || cashIsInsufficient}>
              {isCheckingOut ? <RiLoader4Line data-icon="inline-start" className="animate-spin" /> : <RiCashLine data-icon="inline-start" />}
              Checkout {grandTotal > 0 ? formatCurrency(grandTotal) : ""}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <RetailSaleDetailDrawer
        sale={selectedSale}
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        autoPrintKey={autoPrintKey}
      />
    </div>
  )
}
