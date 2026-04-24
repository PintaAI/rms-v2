import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatDate } from "@/lib/utils"
import { getAuditSummary, toAuditDate, type InventoryAuditSession } from "./types"

type AuditHistoryListProps = {
  audits: InventoryAuditSession[]
}

export function AuditHistoryList({ audits }: AuditHistoryListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Riwayat Audit Terakhir</CardTitle>
      </CardHeader>
      <CardContent>
        {audits.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Belum ada riwayat audit gudang.
          </div>
        ) : (
          <div className="space-y-3">
            {audits.map((audit) => {
              const summary = getAuditSummary(audit.items ?? [])
              return (
                <div key={audit.id} className="rounded-lg border bg-muted/10 p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatDate(toAuditDate(audit.startedAt))}</span>
                        <Badge variant={audit.status === "completed" ? "success" : audit.status === "cancelled" ? "destructive" : "accent"}>
                          {audit.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {summary.totalItems} item, {summary.discrepancyItems} mismatch, potensi hilang {formatCurrency(summary.potentialLostValue)}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {audit.completedAt ? `Selesai ${formatDate(toAuditDate(audit.completedAt))}` : audit.cancelledAt ? `Dibatalkan ${formatDate(toAuditDate(audit.cancelledAt))}` : "Masih aktif"}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
