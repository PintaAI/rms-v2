import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import type { AuditSummary } from "./types"

type AuditSummaryCardsProps = {
  summary: AuditSummary
}

export function AuditSummaryCards({ summary }: AuditSummaryCardsProps) {
  const completion = summary.totalItems
    ? Math.round((summary.countedItems / summary.totalItems) * 100)
    : 0

  const cards = [
    {
      label: "Progress",
      value: `${completion}%`,
      detail: `${summary.countedItems}/${summary.totalItems} item dihitung`,
    },
    {
      label: "Mismatch",
      value: summary.discrepancyItems.toString(),
      detail: `${summary.matchedItems} cocok, ${summary.pendingItems} pending`,
    },
    {
      label: "Selisih Unit",
      value: `${summary.excessQty - summary.missingQty}`,
      detail: `${summary.excessQty} lebih, ${summary.missingQty} kurang`,
    },
    {
      label: "Potensi Hilang",
      value: formatCurrency(summary.potentialLostValue),
      detail: `Nilai selisih ${formatCurrency(summary.differenceValue)}`,
    },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="bg-gradient-to-br from-card to-muted/20">
          <CardHeader className="pb-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {card.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tracking-tight">{card.value}</div>
            <p className="mt-1 text-xs text-muted-foreground">{card.detail}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
