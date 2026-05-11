"use client"

import { useState, useTransition } from "react"
import { addSupplierDebtPayment, type SupplierDebtListItem } from "@/actions/supplier-debts"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency } from "@/lib/utils"
import { RiLoader4Line } from "@remixicon/react"

interface SupplierPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  debt: SupplierDebtListItem | null
  onSaved: (debt: SupplierDebtListItem) => void
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10)
}

function parseAmount(value: string) {
  const parsed = Number.parseInt(value || "0", 10)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

export function SupplierPaymentDialog({ open, onOpenChange, debt, onSaved }: SupplierPaymentDialogProps) {
  const [amount, setAmount] = useState("")
  const [paymentDate, setPaymentDate] = useState(todayInputValue())
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const parsedAmount = parseAmount(amount)
  const remainingAmount = debt?.remainingAmount ?? 0
  const nextRemainingAmount = Number.isFinite(parsedAmount) ? Math.max(remainingAmount - parsedAmount, 0) : remainingAmount
  const isInvalidAmount = !Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > remainingAmount

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!debt) return
    setError(null)

    if (isInvalidAmount) {
      setError("Nominal pembayaran harus lebih dari 0 dan tidak melebihi sisa hutang")
      return
    }

    startTransition(async () => {
      const result = await addSupplierDebtPayment({
        debtId: debt.id,
        amount: parsedAmount,
        paymentDate: paymentDate ? new Date(`${paymentDate}T00:00:00`) : null,
        note: note || null,
      })

      if (!result.success || !result.data) {
        setError(result.error || "Gagal menyimpan pembayaran")
        return
      }

      onSaved(result.data)
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tambah Pembayaran</DialogTitle>
          <DialogDescription>{debt ? `Catat cicilan untuk ${debt.supplierName}.` : "Catat pembayaran hutang supplier."}</DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <Card size="sm">
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Sisa sekarang</span>
                <span className="font-semibold tabular-nums">{formatCurrency(remainingAmount)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Nominal bayar</span>
                <span className="font-semibold tabular-nums">{Number.isFinite(parsedAmount) ? formatCurrency(parsedAmount) : "-"}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Sisa setelah bayar</span>
                <span className="font-semibold tabular-nums">{formatCurrency(nextRemainingAmount)}</span>
              </div>
            </CardContent>
          </Card>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="supplier-payment-amount">Nominal pembayaran</FieldLabel>
              <Input
                id="supplier-payment-amount"
                type="number"
                min="1"
                max={remainingAmount}
                inputMode="numeric"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={isPending}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="supplier-payment-date">Tanggal pembayaran</FieldLabel>
              <Input id="supplier-payment-date" type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} disabled={isPending} />
            </Field>
            <Field>
              <FieldLabel htmlFor="supplier-payment-note">Catatan</FieldLabel>
              <Textarea id="supplier-payment-note" value={note} onChange={(event) => setNote(event.target.value)} disabled={isPending} />
            </Field>
            <FieldError>{error}</FieldError>
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Batal
            </Button>
            <Button type="submit" disabled={isPending || isInvalidAmount || !debt}>
              {isPending ? <RiLoader4Line data-icon="inline-start" className="animate-spin" /> : null}
              Simpan Pembayaran
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
