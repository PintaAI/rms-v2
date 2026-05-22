"use client";

import { Badge } from "@/components/ui/badge";
import type { InventoryItemWithCompatibilities } from "@/actions/inventory";

interface SparepartCompatibilityCellProps {
  sparepart: InventoryItemWithCompatibilities;
  maxVisible?: number;
}

export function SparepartCompatibilityCell({ sparepart, maxVisible = 3 }: SparepartCompatibilityCellProps) {
  if (sparepart.isUniversal) {
    return (
      <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
        Universal
      </Badge>
    );
  }

  if (sparepart.compatibilities.length > 0) {
    return (
      <div className="flex flex-wrap gap-1">
        {sparepart.compatibilities.slice(0, maxVisible).map((c) => (
          <Badge key={c.deviceModelId} variant="outline" className="text-xs">
            {c.deviceModel.brand.name} {c.deviceModel.modelName}
          </Badge>
        ))}
        {sparepart.compatibilities.length > maxVisible && (
          <Badge variant="outline" className="text-xs">
            +{sparepart.compatibilities.length - maxVisible} lainnya
          </Badge>
        )}
      </div>
    );
  }

  return <span className="text-muted-foreground text-sm">-</span>;
}
