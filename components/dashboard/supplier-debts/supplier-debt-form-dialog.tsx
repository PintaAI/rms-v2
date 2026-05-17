"use client"

import { useState, useTransition } from "react"
import {
  createSupplier,
  createSupplierDebt,
  updateSupplierDebt,
  type SupplierDebtListItem,
  type SupplierOption,
} from "@/actions/supplier-debts"
import { Button } from "@/components/ui/button"
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
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrencyInput, getCurrencyInputDigits, parseCurrencyInput } from "@/lib/utils"
import { RiLoader4Line } from "@remixicon/react"

interface SupplierDebtFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tokoId: string
  suppliers: SupplierOption[]
  debt?: SupplierDebtListItem | null
  onSaved: (debt: SupplierDebtListItem, supplier?: SupplierOption) => void
}

function toInputDate(date: Date | null | undefined) {
  if (!date) return ""
  return new Date(date).toISOString().slice(0, 10)
}

function toDateValue(value: string) {
  return value ? new Date(`${value}T00:00:00`) : null
}

function parseAmount(value: string) {
  return value.trim() ? parseCurrencyInput(value) : Number.NaN
}

export function SupplierDebtFormDialog({ open, onOpenChange, tokoId, suppliers, debt, onSaved }: SupplierDebtFormDialogProps) {
  const [supplierId, setSupplierId] = useState(debt?.supplierId ?? "")
  const [newSupplierName, setNewSupplierName] = useState("")
  const [invoiceNumber, setInvoiceNumber] = useState(debt?.invoiceNumber ?? "")
  const [description, setDescription] = useState(debt?.description ?? "")
  const [totalAmount, setTotalAmount] = useState(debt ? String(debt.totalAmount) : "")
  const [paidAmount, setPaidAmount] = useState("")
  const [dueDate, setDueDate] = useState(toInputDate(debt?.dueDate))
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const isEdit = Boolean(debt)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const parsedTotal = parseAmount(totalAmount)
    const parsedPaid = paidAmount.trim() ? parseAmount(paidAmount) : 0

    if (!newSupplierName.trim() && !supplierId) {
      setError("Pilih supplier atau isi nama supplier baru")
      return
    }
    if (!Number.isFinite(parsedTotal) || parsedTotal <= 0) {
      setError("Total hutang harus lebih dari 0")
      return
    }
    if (!isEdit && (!Number.isFinite(parsedPaid) || parsedPaid < 0 || parsedPaid > parsedTotal)) {
      setError("Dibayar awal tidak valid")
      return
    }
    if (isEdit && debt && parsedTotal < debt.paidAmount) {
      setError("Total hutang tidak boleh lebih kecil dari jumlah yang sudah dibayar")
      return
    }

    startTransition(async () => {
      let finalSupplierId = supplierId
      let createdSupplier: SupplierOption | undefined

      if (newSupplierName.trim()) {
        const supplierResult = await createSupplier({ tokoId, name: newSupplierName.trim() })
        if (!supplierResult.success || !supplierResult.data) {
          setError(supplierResult.error || "Gagal membuat supplier")
          return
        }
        createdSupplier = supplierResult.data
        finalSupplierId = supplierResult.data.id
      }

      const result = debt
        ? await updateSupplierDebt({
            id: debt.id,
            supplierId: finalSupplierId,
            invoiceNumber: invoiceNumber || null,
            description: description || null,
            totalAmount: parsedTotal,
            dueDate: toDateValue(dueDate),
          })
        : await createSupplierDebt({
            tokoId,
            supplierId: finalSupplierId,
            invoiceNumber: invoiceNumber || null,
            description: description || null,
            totalAmount: parsedTotal,
            paidAmount: parsedPaid,
            dueDate: toDateValue(dueDate),
          })

      if (!result.success || !result.data) {
        setError(result.error || "Gagal menyimpan hutang supplier")
        return
      }

      onSaved(result.data, createdSupplier)
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Hutang Supplier" : "Tambah Hutang Supplier"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Perbarui informasi nota supplier." : "Catat nota supplier yang belum lunas beserta pembayaran awal jika ada."}
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel>Supplier</FieldLabel>
              <Select value={supplierId} onValueChange={setSupplierId} disabled={isPending || Boolean(newSupplierName.trim())}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="new-supplier-name">Nama supplier baru</FieldLabel>
              <Input
                id="new-supplier-name"
                value={newSupplierName}
                onChange={(event) => setNewSupplierName(event.target.value)}
                placeholder="Isi jika supplier belum ada"
                disabled={isPending}
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="supplier-invoice-number">No nota supplier</FieldLabel>
                <Input
                  id="supplier-invoice-number"
                  value={invoiceNumber}
                  onChange={(event) => setInvoiceNumber(event.target.value)}
                  placeholder="INV-001"
                  disabled={isPending}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="supplier-due-date">Jatuh tempo</FieldLabel>
                <Input id="supplier-due-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} disabled={isPending} />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="supplier-debt-description">Keterangan</FieldLabel>
              <Textarea
                id="supplier-debt-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Contoh: restock LCD dan baterai"
                disabled={isPending}
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="supplier-total-amount">Total hutang</FieldLabel>
                <Input
                  id="supplier-total-amount"
                  type="text"
                  min="1"
                  inputMode="numeric"
                  value={formatCurrencyInput(totalAmount)}
                  onChange={(event) => setTotalAmount(getCurrencyInputDigits(event.target.value))}
                  disabled={isPending}
                />
              </Field>
              {!isEdit ? (
                <Field>
                  <FieldLabel htmlFor="supplier-paid-amount">Dibayar awal</FieldLabel>
                  <Input
                    id="supplier-paid-amount"
                    type="text"
                    min="0"
                    inputMode="numeric"
                    value={formatCurrencyInput(paidAmount)}
                    onChange={(event) => setPaidAmount(getCurrencyInputDigits(event.target.value))}
                    placeholder="0"
                    disabled={isPending}
                  />
                </Field>
              ) : null}
            </div>

            <FieldError>{error}</FieldError>
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Batal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <RiLoader4Line data-icon="inline-start" className="animate-spin" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
