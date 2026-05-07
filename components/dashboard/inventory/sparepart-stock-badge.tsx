"use client";

import { Badge } from "@/components/ui/badge";
import type { SparepartWithCompatibilities } from "@/actions/inventory";

export type StockVariant = "out" | "critical" | "safe";

const STOCK_BADGE_CLASSES: Record<StockVariant, string> = {
  out: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-200",
  critical: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300 border-yellow-200",
  safe: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 border-green-200",
};

const STOCK_LABELS: Record<StockVariant, string> = {
  out: "Habis",
  critical: "Kritis",
  safe: "Aman",
};

export function getSparepartStockVariant(sparepart: SparepartWithCompatibilities): StockVariant {
  if (sparepart.stock <= 0) return "out";
  if (sparepart.stock <= sparepart.criticalStock) return "critical";
  return "safe";
}

export function getSparepartStockBadgeClass(sparepart: SparepartWithCompatibilities) {
  return STOCK_BADGE_CLASSES[getSparepartStockVariant(sparepart)];
}

export function getSparepartStockLabel(sparepart: SparepartWithCompatibilities) {
  return STOCK_LABELS[getSparepartStockVariant(sparepart)];
}

interface SparepartStockBadgeProps {
  sparepart: SparepartWithCompatibilities;
  showLabel?: boolean;
}

export function SparepartStockBadge({ sparepart, showLabel = true }: SparepartStockBadgeProps) {
  const variant = getSparepartStockVariant(sparepart);
  return (
    <Badge variant="outline" className={STOCK_BADGE_CLASSES[variant]}>
      {sparepart.stock}
      {showLabel ? ` - ${STOCK_LABELS[variant]}` : ""}
    </Badge>
  );
}
