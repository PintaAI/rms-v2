"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatCurrency } from "@/lib/utils"
import { RiLoader4Line } from "@remixicon/react"
import type { AuditSummary } from "./types"

type CompleteAuditDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  summary: AuditSummary
  isCompleting: boolean
  onConfirm: () => void
}

export function CompleteAuditDialog({
  open,
  onOpenChange,
  summary,
  isCompleting,
  onConfirm,
}: CompleteAuditDialogProps) {
  const hasBlocker = summary.pendingItems > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete audit gudang?</DialogTitle>
          <DialogDescription>
            Stok sparepart akan disesuaikan ke stok fisik untuk semua item audit.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border bg-muted/20 p-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <span className="text-muted-foreground">Item dihitung</span>
            <span className="text-right font-medium">{summary.countedItems}/{summary.totalItems}</span>
            <span className="text-muted-foreground">Mismatch</span>
            <span className="text-right font-medium">{summary.discrepancyItems}</span>
            <span className="text-muted-foreground">Potensi hilang</span>
            <span className="text-right font-medium">{formatCurrency(summary.potentialLostValue)}</span>
          </div>
          {hasBlocker && (
            <p className="mt-3 rounded-md bg-destructive/10 p-2 text-destructive">
              Masih ada {summary.pendingItems} item belum dihitung. Lengkapi sebelum complete.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCompleting}>
            Batal
          </Button>
          <Button onClick={onConfirm} disabled={isCompleting || hasBlocker}>
            {isCompleting && <RiLoader4Line className="animate-spin" />}
            Complete Audit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
