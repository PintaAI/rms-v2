"use client";

import type { KaryawanItem } from "@/actions/karyawan";
import {
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiFileListLine,
} from "@remixicon/react";

export function PerformanceBadge({
  performance,
  role,
  onClick,
}: {
  performance: KaryawanItem["performance"];
  role: "staff" | "technician";
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  if (!performance) {
    return <span className="text-muted-foreground text-xs">-</span>;
  }

  if (role === "staff") {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950">
          <RiFileListLine className="size-3 text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-medium text-blue-700 dark:text-blue-300">{performance.servicesCreated}</span>
        </div>
        <span className="text-xs text-muted-foreground">created (30d)</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg px-1 py-1 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
      title="Lihat detail performance teknisi"
    >
      <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-50 dark:bg-green-950">
        <RiCheckboxCircleLine className="size-3 text-green-600 dark:text-green-400" />
        <span className="text-xs font-medium text-green-700 dark:text-green-300">{performance.servicesCompleted}</span>
      </div>
      {performance.servicesFailed > 0 && (
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-950">
          <RiCloseCircleLine className="size-3 text-red-600 dark:text-red-400" />
          <span className="text-xs font-medium text-red-700 dark:text-red-300">{performance.servicesFailed}</span>
        </div>
      )}
      <span className="text-xs text-muted-foreground ml-1">Detail (30d)</span>
    </button>
  );
}
