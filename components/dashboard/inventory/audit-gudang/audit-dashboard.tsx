"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  cancelInventoryAudit,
  completeInventoryAudit,
  getInventoryAuditOverview,
  startInventoryAudit,
} from "@/actions/inventory-audit"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate } from "@/lib/utils"
import { RiCheckLine, RiCloseCircleLine, RiLoader4Line } from "@remixicon/react"
import { AuditHistoryList } from "./audit-history-list"
import { AuditItemTable } from "./audit-item-table"
import { AuditSummaryCards } from "./audit-summary-cards"
import { CompleteAuditDialog } from "./complete-audit-dialog"
import { StartAuditCard } from "./start-audit-card"
import { getAuditSummary, toAuditDate, type InventoryAuditItem, type InventoryAuditMismatchReason, type InventoryAuditOverview } from "./types"

type AuditDashboardProps = {
  tokoId: string
  initialOverview: InventoryAuditOverview
}

type ActionResult<T> = {
  success: boolean
  data?: T
  error?: string
}

function getOptimisticAuditItem(
  item: InventoryAuditItem,
  input: {
    physicalStock: number | null
    mismatchReason: InventoryAuditMismatchReason | null
    note: string | null
  }
): InventoryAuditItem {
  if (input.physicalStock === null) {
    return {
      ...item,
      physicalStock: null,
      status: "pending",
      mismatchReason: null,
      note: input.note,
      difference: 0,
      missingQty: 0,
      excessQty: 0,
      differenceValue: 0,
      potentialLostValue: 0,
    }
  }

  const difference = input.physicalStock - item.systemStock
  const missingQty = Math.max(-difference, 0)
  const excessQty = Math.max(difference, 0)
  const status = difference === 0 ? "matched" : "discrepancy"

  return {
    ...item,
    physicalStock: input.physicalStock,
    status,
    mismatchReason: status === "discrepancy" ? input.mismatchReason : null,
    note: input.note,
    difference,
    missingQty,
    excessQty,
    differenceValue: Math.abs(difference) * item.snapshotPrice,
    potentialLostValue: missingQty * item.snapshotPurchasePrice,
  }
}

export function AuditDashboard({ tokoId, initialOverview }: AuditDashboardProps) {
  const [overview, setOverview] = useState(initialOverview)
  const [isStarting, setIsStarting] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [completeOpen, setCompleteOpen] = useState(false)
  const [reviewAttempted, setReviewAttempted] = useState(false)
  const [localItems, setLocalItems] = useState(initialOverview.activeSession?.items ?? [])

  const activeAudit = overview.activeSession
  const summary = getAuditSummary(activeAudit ? localItems : [])
  const missingReasonItems = localItems.filter((item) => item.status === "discrepancy" && !item.mismatchReason).length
  const rowsNeedingAction = summary.pendingItems + missingReasonItems
  const completeBlocker = summary.pendingItems > 0
    ? `Masih ada ${summary.pendingItems} item belum dihitung. Lengkapi sebelum complete.`
    : missingReasonItems > 0
      ? `Masih ada ${missingReasonItems} item mismatch tanpa alasan.`
      : null
  const auditActionLabel = completeBlocker
    ? reviewAttempted
      ? "Tutup Cek Audit"
      : `Cek Audit (${rowsNeedingAction})`
    : "Complete Audit"

  async function refreshOverview() {
    const result = (await getInventoryAuditOverview(tokoId)) as ActionResult<InventoryAuditOverview>
    if (result.success && result.data) {
      setOverview(result.data)
      setLocalItems(result.data.activeSession?.items ?? [])
    }
  }

  async function handleStart() {
    setIsStarting(true)
    const result = (await startInventoryAudit(tokoId)) as ActionResult<unknown>
    setIsStarting(false)

    if (!result.success) {
      toast.error(result.error ?? "Gagal memulai audit")
      return
    }

    toast.success("Audit gudang dimulai")
    await refreshOverview()
  }

  function handleItemChange(input: {
    itemId: string
    physicalStock: number | null
    mismatchReason: InventoryAuditMismatchReason | null
    note: string | null
  }) {
    setLocalItems((current) =>
      current.map((item) => item.id === input.itemId ? getOptimisticAuditItem(item, input) : item)
    )
  }

  function handlePrimaryAuditAction() {
    if (completeBlocker) {
      setReviewAttempted((current) => !current)
      return
    }

    setCompleteOpen(true)
  }

  async function handleComplete() {
    if (!activeAudit) return

    setIsCompleting(true)
    const result = (await completeInventoryAudit({
      sessionId: activeAudit.id,
      items: localItems.map((item) => ({
        itemId: item.id,
        physicalStock: item.physicalStock,
        mismatchReason: item.mismatchReason,
        note: item.note,
      })),
    })) as ActionResult<unknown>
    setIsCompleting(false)

    if (!result.success) {
      toast.error(result.error ?? "Gagal complete audit")
      return
    }

    setCompleteOpen(false)
    toast.success("Audit gudang selesai")
    await refreshOverview()
  }

  async function handleCancel() {
    if (!activeAudit) return

    setIsCancelling(true)
    const result = (await cancelInventoryAudit(activeAudit.id)) as ActionResult<unknown>
    setIsCancelling(false)

    if (!result.success) {
      toast.error(result.error ?? "Gagal membatalkan audit")
      return
    }

    toast.success("Audit gudang dibatalkan")
    await refreshOverview()
  }

  if (!activeAudit) {
    return (
      <div className="space-y-4">
        <StartAuditCard isStarting={isStarting} onStart={handleStart} />
        <AuditHistoryList audits={overview.recentSessions} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary/20">
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="accent">Audit Aktif</Badge>
              <span className="text-xs text-muted-foreground">Dimulai {formatDate(toAuditDate(activeAudit.startedAt))}</span>
            </div>
            <CardTitle className="text-xl font-black tracking-tight">Hitung Stok Fisik Sparepart</CardTitle>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={handleCancel} disabled={isCancelling || isCompleting}>
              {isCancelling ? <RiLoader4Line className="animate-spin" /> : <RiCloseCircleLine />}
              Cancel Audit
            </Button>
            <Button
              variant={completeBlocker ? "destructive" : "default"}
              onClick={handlePrimaryAuditAction}
              disabled={isCompleting}
            >
              {completeBlocker ? <RiCheckLine /> : null}
              {auditActionLabel}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Isi stok fisik setiap sparepart. Item mismatch wajib memiliki alasan sebelum audit dapat diselesaikan.
          </p>
        </CardContent>
      </Card>

      <AuditSummaryCards summary={summary} />
      {reviewAttempted && completeBlocker && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {completeBlocker}
        </div>
      )}
      <AuditItemTable key={activeAudit.id} items={localItems} reviewAttempted={reviewAttempted} onItemChange={handleItemChange} />
      <AuditHistoryList audits={overview.recentSessions} />
      <CompleteAuditDialog open={completeOpen} onOpenChange={setCompleteOpen} summary={summary} blockerMessage={completeBlocker} isCompleting={isCompleting} onConfirm={handleComplete} />
    </div>
  )
}
