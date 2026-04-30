"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import {
  RiBankCardLine,
  RiCashLine,
  RiDiscountPercentLine,
  RiMoneyDollarCircleLine,
  RiPriceTag3Line,
  RiRefund2Line,
  RiWallet3Line,
} from "@remixicon/react";

type PaymentMethod = "cash" | "transfer" | "qris" | "debit";

const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: "Cash",
  transfer: "Transfer",
  qris: "QRIS",
  debit: "Debit",
};

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceTotal: number;
  dpAmount?: number;
  isSubmitting?: boolean;
  onConfirm: () => Promise<boolean>;
}

function parseAmount(value: string) {
  const parsed = Number.parseInt(value || "0", 10);
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0;
}

function FieldLabelIcon({ icon: Icon }: { icon: typeof RiWallet3Line }) {
  return <Icon className="size-3.5 text-muted-foreground" />;
}

export function PaymentDialog({
  open,
  onOpenChange,
  invoiceTotal,
  dpAmount = 0,
  isSubmitting = false,
  onConfirm,
}: PaymentDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [usePercentDiscount, setUsePercentDiscount] = useState(false);
  const [discountInput, setDiscountInput] = useState("");
  const [cashInput, setCashInput] = useState("");

  const remainingTotal = Math.max(invoiceTotal - dpAmount, 0);
  const rawDiscount = parseAmount(discountInput);
  const discount = usePercentDiscount
    ? Math.min(Math.round(remainingTotal * (Math.min(rawDiscount, 100) / 100)), remainingTotal)
    : Math.min(rawDiscount, remainingTotal);
  const finalTotal = Math.max(remainingTotal - discount, 0);
  const cashReceived = parseAmount(cashInput);
  const change = Math.max(cashReceived - finalTotal, 0);
  const cashIsInsufficient = paymentMethod === "cash" && cashReceived < finalTotal;

  const confirmationDisabled = isSubmitting || cashIsInsufficient;

  const helperText = useMemo(() => {
    if (paymentMethod === "cash") {
      return "Masukkan uang diterima untuk menghitung kembalian seperti mesin kasir.";
    }
    return "Mockup saat ini hanya mencatat invoice sebagai lunas tanpa menyimpan metode pembayaran.";
  }, [paymentMethod]);

  async function handleConfirm() {
    if (confirmationDisabled) return;
    const success = await onConfirm();
    if (success) {
      onOpenChange(false);
      setPaymentMethod("cash");
      setUsePercentDiscount(false);
      setDiscountInput("");
      setCashInput("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pembayaran Invoice</DialogTitle>
          <DialogDescription>
            Pilih metode pembayaran, masukkan diskon, dan hitung kembalian untuk pembayaran cash.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <RiPriceTag3Line className="size-4" />
                Total invoice
              </span>
              <span className="text-lg font-bold tabular-nums">{formatCurrency(invoiceTotal)}</span>
            </div>
            {dpAmount > 0 && (
              <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3 text-sm">
                <span className="text-muted-foreground">DP dibayar</span>
                <span className="font-medium tabular-nums">- {formatCurrency(dpAmount)}</span>
              </div>
            )}
          </div>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="payment-method">
                <FieldLabelIcon icon={RiWallet3Line} />
                Metode pembayaran
              </FieldLabel>
              <Select
                value={paymentMethod}
                onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
              >
                <SelectTrigger id="payment-method" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {Object.entries(paymentMethodLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>{helperText}</FieldDescription>
            </Field>

            <Field>
              <div className="flex items-center justify-between gap-3">
                <FieldLabel htmlFor="payment-discount">
                  <FieldLabelIcon icon={RiDiscountPercentLine} />
                  Diskon
                </FieldLabel>
                <label className="flex items-center gap-2 text-xs text-muted-foreground" htmlFor="discount-percent-toggle">
                  Nominal
                  <Switch
                    id="discount-percent-toggle"
                    size="sm"
                    checked={usePercentDiscount}
                    onCheckedChange={setUsePercentDiscount}
                  />
                  Persen
                </label>
              </div>
              <div className="relative">
                {!usePercentDiscount && (
                  <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-xs font-medium text-muted-foreground">
                    Rp
                  </span>
                )}
                <Input
                  id="payment-discount"
                  inputMode="numeric"
                  min={0}
                  max={usePercentDiscount ? 100 : remainingTotal}
                  placeholder="0"
                  type="number"
                  value={discountInput}
                  className={usePercentDiscount ? "pr-8" : "pl-8"}
                  onChange={(event) => setDiscountInput(event.target.value)}
                />
                {usePercentDiscount && (
                  <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground">
                    %
                  </span>
                )}
              </div>
              {usePercentDiscount && discountInput ? (
                <FieldDescription>
                  {Math.min(rawDiscount, 100)}% = {formatCurrency(discount)}.
                </FieldDescription>
              ) : discountInput && rawDiscount > remainingTotal ? (
                <FieldDescription>Diskon nominal dibatasi maksimal total invoice.</FieldDescription>
              ) : null}
            </Field>

            {paymentMethod === "cash" && (
              <Field data-invalid={cashIsInsufficient || undefined}>
                <FieldLabel htmlFor="cash-received">
                  <FieldLabelIcon icon={RiCashLine} />
                  Uang diterima
                </FieldLabel>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-xs font-medium text-muted-foreground">
                    Rp
                  </span>
                  <Input
                    id="cash-received"
                    aria-invalid={cashIsInsufficient || undefined}
                    inputMode="numeric"
                    min={0}
                    placeholder="0"
                    type="number"
                    value={cashInput}
                    className="pl-8"
                    onChange={(event) => setCashInput(event.target.value)}
                  />
                </div>
                {cashIsInsufficient ? (
                  <FieldError>Uang diterima kurang dari total bayar.</FieldError>
                ) : null}
              </Field>
            )}
          </FieldGroup>

          <Separator />

          <div className="flex flex-col gap-3 rounded-xl border p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <RiPriceTag3Line className="size-3.5" />
                Subtotal
              </span>
              <span className="font-medium tabular-nums">{formatCurrency(invoiceTotal)}</span>
            </div>
            {dpAmount > 0 && (
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">DP dibayar</span>
                <span className="font-medium tabular-nums">- {formatCurrency(dpAmount)}</span>
              </div>
            )}
            {dpAmount > 0 && (
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Sisa tagihan</span>
                <span className="font-medium tabular-nums">{formatCurrency(remainingTotal)}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <RiDiscountPercentLine className="size-3.5" />
                Diskon{usePercentDiscount && rawDiscount > 0 ? ` (${Math.min(rawDiscount, 100)}%)` : ""}
              </span>
              <span className="font-medium tabular-nums">- {formatCurrency(discount)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <RiBankCardLine className="size-3.5" />
                Metode
              </span>
              <Badge variant="outline">{paymentMethodLabels[paymentMethod]}</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 font-medium">
                <RiMoneyDollarCircleLine className="size-4 text-muted-foreground" />
                Total bayar
              </span>
              <span className="text-xl font-bold tabular-nums">{formatCurrency(finalTotal)}</span>
            </div>
            {paymentMethod === "cash" && (
              <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <RiRefund2Line className="size-3.5 text-muted-foreground" />
                  Kembalian
                </span>
                <span className="text-lg font-bold tabular-nums">{formatCurrency(change)}</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Batal
          </Button>
          <Button onClick={handleConfirm} disabled={confirmationDisabled}>
            {isSubmitting ? "Memproses..." : "Konfirmasi Bayar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
