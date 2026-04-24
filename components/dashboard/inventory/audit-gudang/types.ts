export type InventoryAuditMismatchReason =
  | "used_in_service_not_recorded"
  | "lost"
  | "damaged"
  | "incoming_stock_not_recorded"
  | "previous_stock_error"
  | "physical_count_error"
  | "other"

export type InventoryAuditItemStatus = "pending" | "matched" | "discrepancy"
export type InventoryAuditStatus = "active" | "completed" | "cancelled"

export type InventoryAuditItem = {
  id: string
  sessionId: string
  sparepartId: string
  sparepartName: string
  systemStock: number
  physicalStock: number | null
  difference: number
  missingQty: number
  excessQty: number
  differenceValue: number
  potentialLostValue: number
  snapshotPrice: number
  status: InventoryAuditItemStatus
  mismatchReason: InventoryAuditMismatchReason | null
  note: string | null
}

export type InventoryAuditSession = {
  id: string
  tokoId: string
  createdById: string
  status: InventoryAuditStatus
  startedAt: string | Date
  completedAt: string | Date | null
  cancelledAt: string | Date | null
  createdBy: { id: string; name: string }
  items: InventoryAuditItem[]
}

export type InventoryAuditOverview = {
  activeSession: InventoryAuditSession | null
  recentSessions: InventoryAuditSession[]
}

export type AuditSummary = {
  totalItems: number
  countedItems: number
  pendingItems: number
  matchedItems: number
  discrepancyItems: number
  missingQty: number
  excessQty: number
  differenceValue: number
  potentialLostValue: number
}

export const mismatchReasonLabels: Record<InventoryAuditMismatchReason, string> = {
  used_in_service_not_recorded: "Dipakai service, belum dicatat",
  lost: "Hilang",
  damaged: "Rusak",
  incoming_stock_not_recorded: "Stok masuk belum dicatat",
  previous_stock_error: "Error stok sebelumnya",
  physical_count_error: "Salah hitung fisik",
  other: "Lainnya",
}

export const mismatchReasons = Object.keys(
  mismatchReasonLabels
) as InventoryAuditMismatchReason[]

export function toAuditDate(date: string | Date | null): Date | null {
  return date ? new Date(date) : null
}

export function getAuditSummary(items: InventoryAuditItem[]): AuditSummary {
  return items.reduce(
    (summary, item) => {
      summary.totalItems += 1

      if (item.physicalStock === null) {
        summary.pendingItems += 1
      } else {
        summary.countedItems += 1
      }

      if (item.status === "matched") summary.matchedItems += 1
      if (item.status === "discrepancy") summary.discrepancyItems += 1

      summary.missingQty += Math.max(item.missingQty, 0)
      summary.excessQty += Math.max(item.excessQty, 0)
      summary.differenceValue += item.differenceValue
      summary.potentialLostValue += item.potentialLostValue

      return summary
    },
    {
      totalItems: 0,
      countedItems: 0,
      pendingItems: 0,
      matchedItems: 0,
      discrepancyItems: 0,
      missingQty: 0,
      excessQty: 0,
      differenceValue: 0,
      potentialLostValue: 0,
    }
  )
}
