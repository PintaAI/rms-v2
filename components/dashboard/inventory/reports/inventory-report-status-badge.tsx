import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ReportStockStatus } from "./types"

const stockStatusMeta: Record<ReportStockStatus, { label: string; className: string }> = {
  safe: {
    label: "Aman",
    className: "border-primary/20 bg-primary/10 text-primary",
  },
  critical: {
    label: "Kritis",
    className: "border-accent bg-accent text-accent-foreground",
  },
  out: {
    label: "Habis",
    className: "border-destructive/20 bg-destructive/10 text-destructive",
  },
}

export function InventoryReportStatusBadge({ status }: { status: ReportStockStatus }) {
  const meta = stockStatusMeta[status]

  return (
    <Badge variant="outline" className={cn("w-fit", meta.className)}>
      {meta.label}
    </Badge>
  )
}
