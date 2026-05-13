import type { InventoryReportStockStatus } from "@/actions/inventory"

export type InventoryReportToko = {
  id: string
  name: string
  logoUrl: string | null
}

export type InventoryReportFilters = {
  q: string
  categoryId: string
  status: InventoryReportStockStatus
}

export type ReportStockStatus = Exclude<InventoryReportStockStatus, "all">
