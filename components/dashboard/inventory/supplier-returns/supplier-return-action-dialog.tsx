"use client"

import { useState, useTransition } from "react"
import type { ReactNode } from "react"
import { toast } from "sonner"
import {
  markSupplierReturnRefunded,
  markSupplierReturnRejected,
  markSupplierReturnReplaced,
  markSupplierReturnSent,
  type SupplierReturnRow,
} from "@/actions/supplier-returns"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency, formatDate } from "@/lib/utils"
import { RiLoader4Line } from "@remixicon/react"
import { SupplierReturnStatusBadge, supplierReturnStatusLabels } from "./supplier-return-status-badge"

type SupplierReturnAction = "detail" | "sent" | "replaced" | "refunded" | "rejected"

interface SupplierReturnActionDialogProps {
  item: SupplierReturnRow | null
  action: SupplierReturnAction | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SupplierReturnActionDialog({ item, action, open, onOpenChange }: SupplierReturnActionDialogProps) {
  const [refundAmount, setRefundAmount] = useState("")
  const [rejectedNote, setRejectedNote] = useState("")
  const [isPending, startTransition] = useTransition()

  if (!item || !action) return null

  const isMutation = action !== "detail"
  const title = action === "detail"
    ? "Detail Retur Supplier"
    : action === "sent"
      ? "Tandai Dikirim"
      : action === "replaced"
        ? "Tandai Diganti Supplier"
        : action === "refunded"
          ? "Tandai Refund Supplier"
          : "Tolak Retur"
  const refundValue = Number(refundAmount)
  const actionDisabled = isPending || (action === "refunded" && refundValue <= 0)

  const handleSubmit = () => {
    startTransition(async () => {
      const result = action === "sent"
        ? await markSupplierReturnSent(item.id)
        : action === "replaced"
          ? await markSupplierReturnReplaced(item.id)
          : action === "refunded"
            ? await markSupplierReturnRefunded(item.id, refundValue)
            : action === "rejected"
              ? await markSupplierReturnRejected(item.id, rejectedNote)
              : { success: true }

      if (!result.success) {
        toast.error(result.error ?? "Gagal memperbarui retur supplier")
        return
      }

      toast.success("Retur supplier diperbarui")
      setRefundAmount("")
      setRejectedNote("")
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {isMutation ? `Status saat ini: ${supplierReturnStatusLabels[item.status]}.` : "Informasi lengkap retur supplier."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <SupplierReturnStatusBadge status={item.status} />
            <span className="text-xs text-muted-foreground">ID: {item.id}</span>
          </div>
          <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 text-sm sm:grid-cols-2">
            <DetailItem label="Sparepart" value={item.sparepart.name} />
            <DetailItem label="Qty" value={item.qty} />
            <DetailItem label="Supplier" value={item.supplierName || "-"} />
            <DetailItem label="Dibuat" value={`${formatDate(item.createdAt)} oleh ${item.createdBy.name}`} />
            <DetailItem label="Alasan" value={item.reason} className="sm:col-span-2" />
            <DetailItem label="Catatan" value={item.note || "-"} className="sm:col-span-2" />
            <DetailItem label="Klaim Garansi" value={item.warrantyClaim ? `${item.warrantyClaim.customerName || "Customer"} - ${item.warrantyClaim.deviceName}` : "-"} />
            <DetailItem label="Status Klaim" value={item.warrantyClaim?.status ?? "-"} />
            <DetailItem label="Dikirim" value={formatDate(item.sentAt)} />
            <DetailItem label="Diselesaikan" value={item.resolvedAt && item.resolvedBy ? `${formatDate(item.resolvedAt)} oleh ${item.resolvedBy.name}` : "-"} />
            {item.status === "refunded" && <DetailItem label="Nominal Refund" value={formatCurrency(item.refundAmount)} />}
          </div>

          {action === "replaced" && (
            <p className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
              Konfirmasi ini akan menambah stok sparepart sebanyak {item.qty} unit. Server action hanya menerima status pending/dikirim sehingga stok tidak bertambah ulang untuk retur yang sudah selesai.
            </p>
          )}

          {action === "refunded" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="supplier-return-refund">Nominal refund supplier</Label>
              <Input id="supplier-return-refund" type="number" min={1} value={refundAmount} onChange={(event) => setRefundAmount(event.target.value)} placeholder="0" disabled={isPending} />
            </div>
          )}

          {action === "rejected" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="supplier-return-rejected-note">Catatan penolakan</Label>
              <Textarea id="supplier-return-rejected-note" value={rejectedNote} onChange={(event) => setRejectedNote(event.target.value)} placeholder="Alasan supplier menolak retur" disabled={isPending} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>{isMutation ? "Batal" : "Tutup"}</Button>
          {isMutation && (
            <Button type="button" variant={action === "rejected" ? "destructive" : "default"} onClick={handleSubmit} disabled={actionDisabled}>
              {isPending ? <RiLoader4Line data-icon="inline-start" className="animate-spin" /> : null}
              Konfirmasi
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DetailItem({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  )
}

export type { SupplierReturnAction }
