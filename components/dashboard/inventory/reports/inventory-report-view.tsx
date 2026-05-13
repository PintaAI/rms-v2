import type { InventoryReportResult } from "@/actions/inventory"
import { InventoryReportFilter } from "./inventory-report-filter"
import { InventoryReportHeader } from "./inventory-report-header"
import { InventoryReportList } from "./inventory-report-list"
import { InventoryReportSummary } from "./inventory-report-summary"
import { SupplierReturnReportSection } from "./supplier-return-report-section"
import type { InventoryReportFilters, InventoryReportToko } from "./types"

interface InventoryReportViewProps {
  tokoId: string
  toko: InventoryReportToko | null
  report: InventoryReportResult
  filters: InventoryReportFilters
  hasActiveFilter: boolean
  errorMessage?: string
}

export function InventoryReportView({
  tokoId,
  toko,
  report,
  filters,
  hasActiveFilter,
  errorMessage,
}: InventoryReportViewProps) {
  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <InventoryReportHeader tokoId={tokoId} toko={toko} errorMessage={errorMessage} />
      <InventoryReportSummary report={report} />
      <InventoryReportFilter
        tokoId={tokoId}
        filters={filters}
        categories={report.categories}
        hasActiveFilter={hasActiveFilter}
      />
      <InventoryReportList report={report} />
      <SupplierReturnReportSection report={report.supplierReturns} />
    </div>
  )
}
