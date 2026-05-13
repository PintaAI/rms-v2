import { Badge } from "@/components/ui/badge"
import type { SupplierReturnStatus } from "@/prisma/generated/prisma/enums"

export const supplierReturnStatusLabels: Record<SupplierReturnStatus, string> = {
  pending: "Pending",
  sent: "Dikirim",
  replaced: "Diganti supplier",
  refunded: "Refund supplier",
  rejected: "Ditolak",
}

export function SupplierReturnStatusBadge({ status }: { status: SupplierReturnStatus }) {
  const variant = status === "pending" ? "accent" : status === "sent" ? "secondary" : status === "rejected" ? "destructive" : "success"
  return <Badge variant={variant}>{supplierReturnStatusLabels[status]}</Badge>
}
