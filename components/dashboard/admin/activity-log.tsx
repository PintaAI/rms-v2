"use client";

import type { ComponentType } from "react";
import type { AdminOverviewActivityItem } from "@/actions/overview";
import type { Prisma } from "@/prisma/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  RiAddCircleLine,
  RiArchiveLine,
  RiArrowGoBackLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiDeleteBin6Line,
  RiEdit2Line,
  RiFileList3Line,
  RiLoader4Line,
  RiMoneyDollarCircleLine,
  RiPulseLine,
  RiShoppingBag3Line,
  RiStackLine,
  RiTimeLine,
  RiToolsLine,
  RiUser3Line,
  RiUserShared2Line,
} from "@remixicon/react";
import { cn, formatDate } from "@/lib/utils";
import { useDashboardRealtime } from "@/components/dashboard/layout/dashboard-realtime-provider";

interface ActivityLogProps {
  activities: AdminOverviewActivityItem[];
}

const activityTypeConfig: Record<
  string,
  {
    label: string;
    actionLabel: string;
    icon: ComponentType<{ className?: string }>;
    badgeVariant: "accent" | "default" | "success" | "warning" | "secondary";
    borderClass: string;
    backgroundClass: string;
  }
> = {
  service_created: {
    label: "Service Baru",
    actionLabel: "membuat service",
    icon: RiAddCircleLine,
    badgeVariant: "accent",
    borderClass: "border-sky-500/30",
    backgroundClass: "bg-sky-500/5",
  },
  service_updated: {
    label: "Update Service",
    actionLabel: "mengubah service",
    icon: RiEdit2Line,
    badgeVariant: "secondary",
    borderClass: "border-border/70",
    backgroundClass: "bg-muted/30",
  },
  service_deleted: {
    label: "Delete Service",
    actionLabel: "menghapus service",
    icon: RiDeleteBin6Line,
    badgeVariant: "warning",
    borderClass: "border-amber-500/30",
    backgroundClass: "bg-amber-500/5",
  },
  service_status_changed: {
    label: "Status",
    actionLabel: "mengubah status",
    icon: RiCheckboxCircleLine,
    badgeVariant: "warning",
    borderClass: "border-amber-500/30",
    backgroundClass: "bg-amber-500/5",
  },
  service_assigned: {
    label: "Assign",
    actionLabel: "assign teknisi",
    icon: RiUserShared2Line,
    badgeVariant: "accent",
    borderClass: "border-sky-500/30",
    backgroundClass: "bg-sky-500/5",
  },
  service_taken_over: {
    label: "Take Over",
    actionLabel: "mengambil task",
    icon: RiUserShared2Line,
    badgeVariant: "warning",
    borderClass: "border-amber-500/30",
    backgroundClass: "bg-amber-500/5",
  },
  invoice_created: {
    label: "Invoice",
    actionLabel: "membuat invoice",
    icon: RiFileList3Line,
    badgeVariant: "default",
    borderClass: "border-primary/25",
    backgroundClass: "bg-primary/5",
  },
  invoice_paid: {
    label: "Paid",
    actionLabel: "menerima pembayaran",
    icon: RiMoneyDollarCircleLine,
    badgeVariant: "success",
    borderClass: "border-green-500/30",
    backgroundClass: "bg-green-500/5",
  },
  sparepart_created: {
    label: "Sparepart Baru",
    actionLabel: "membuat sparepart",
    icon: RiAddCircleLine,
    badgeVariant: "accent",
    borderClass: "border-sky-500/30",
    backgroundClass: "bg-sky-500/5",
  },
  sparepart_updated: {
    label: "Update Sparepart",
    actionLabel: "mengubah sparepart",
    icon: RiEdit2Line,
    badgeVariant: "secondary",
    borderClass: "border-border/70",
    backgroundClass: "bg-muted/30",
  },
  sparepart_deleted: {
    label: "Delete",
    actionLabel: "menghapus sparepart",
    icon: RiDeleteBin6Line,
    badgeVariant: "warning",
    borderClass: "border-amber-500/30",
    backgroundClass: "bg-amber-500/5",
  },
  sparepart_stock_in: {
    label: "Stock In",
    actionLabel: "menambah stok",
    icon: RiStackLine,
    badgeVariant: "success",
    borderClass: "border-green-500/30",
    backgroundClass: "bg-green-500/5",
  },
  sparepart_stock_out: {
    label: "Stock Out",
    actionLabel: "mengurangi stok",
    icon: RiShoppingBag3Line,
    badgeVariant: "warning",
    borderClass: "border-amber-500/30",
    backgroundClass: "bg-amber-500/5",
  },
  supplier_return_created: {
    label: "Retur Supplier",
    actionLabel: "membuat retur supplier",
    icon: RiArrowGoBackLine,
    badgeVariant: "accent",
    borderClass: "border-sky-500/30",
    backgroundClass: "bg-sky-500/5",
  },
  inventory_audit_started: {
    label: "Audit Mulai",
    actionLabel: "memulai audit",
    icon: RiArchiveLine,
    badgeVariant: "accent",
    borderClass: "border-sky-500/30",
    backgroundClass: "bg-sky-500/5",
  },
  inventory_audit_completed: {
    label: "Audit Selesai",
    actionLabel: "menyelesaikan audit",
    icon: RiCheckboxCircleLine,
    badgeVariant: "success",
    borderClass: "border-green-500/30",
    backgroundClass: "bg-green-500/5",
  },
  inventory_audit_cancelled: {
    label: "Audit Batal",
    actionLabel: "membatalkan audit",
    icon: RiCloseCircleLine,
    badgeVariant: "secondary",
    borderClass: "border-border/70",
    backgroundClass: "bg-muted/30",
  },
  inventory_audit_stock_adjusted: {
    label: "Stok Audit",
    actionLabel: "menyesuaikan stok",
    icon: RiToolsLine,
    badgeVariant: "warning",
    borderClass: "border-amber-500/30",
    backgroundClass: "bg-amber-500/5",
  },
};

function getDeletedServiceSummary(payload: Prisma.JsonValue | null): {
  id: string;
  customerName: string | null;
  deviceName: string | null;
} | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const deletedService = (payload as Record<string, Prisma.JsonValue>).deletedService;
  if (!deletedService || typeof deletedService !== "object" || Array.isArray(deletedService)) {
    return null;
  }

  const summary = deletedService as Record<string, Prisma.JsonValue>;
  const deviceModel = summary.deviceModel;
  const deletedDevice = deviceModel && typeof deviceModel === "object" && !Array.isArray(deviceModel)
    ? deviceModel as Record<string, Prisma.JsonValue>
    : null;
  const brandName = typeof deletedDevice?.brandName === "string" ? deletedDevice.brandName : null;
  const modelName = typeof deletedDevice?.modelName === "string" ? deletedDevice.modelName : null;

  return {
    id: typeof summary.deletedServiceId === "string" ? summary.deletedServiceId : "",
    customerName: typeof summary.customerName === "string" ? summary.customerName : null,
    deviceName: brandName && modelName ? `${brandName} ${modelName}` : modelName,
  };
}

function getServiceTarget(
  activity: AdminOverviewActivityItem,
  serviceSummary: NonNullable<AdminOverviewActivityItem["repairOrder"]> | ReturnType<typeof getDeletedServiceSummary>
) {
  if (activity.repairOrder) {
    return `${activity.repairOrder.deviceModel.brand.name} ${activity.repairOrder.deviceModel.modelName}`;
  }

  return "deviceName" in (serviceSummary ?? {}) ? (serviceSummary as { deviceName: string | null }).deviceName : serviceSummary?.customerName ?? activity.title;
}

export function ActivityLog({ activities }: ActivityLogProps) {
  const { status, isRefreshing } = useDashboardRealtime();
  const isLive = status === "connected";

  return (
    <Card className="border-border/50 shadow-lg shadow-black/5 transition-all duration-300 hover:shadow-xl hover:shadow-black/10">
      <CardHeader className="border-b border-border/50 px-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
              <div className="h-5 w-1 shrink-0 rounded-full bg-primary" />
              <CardTitle className="text-lg font-bold">Activity Log</CardTitle>
              <Badge variant={isLive ? "success" : "secondary"} className="gap-1.5">
                {isRefreshing ? (
                  <RiLoader4Line className="h-3 w-3 animate-spin" />
                ) : (
                  <RiPulseLine className={isLive ? "h-3 w-3" : "h-3 w-3 text-muted-foreground"} />
                )}
                {isRefreshing ? "Syncing" : isLive ? "Live" : "Realtime off"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Pantau aktivitas terbaru toko. Data otomatis diperbarui saat ada event realtime.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-4">
        {activities.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 px-4 py-10 text-center text-sm text-muted-foreground">
            Belum ada aktivitas terbaru.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {activities.map((activity) => (
              (() => {
                const typeConfig = activityTypeConfig[activity.type] ?? {
                  label: activity.type.replaceAll("_", " "),
                  actionLabel: activity.type.replaceAll("_", " "),
                  icon: RiPulseLine,
                  badgeVariant: "secondary" as const,
                  borderClass: "border-border/70",
                  backgroundClass: "bg-muted/30",
                };
                const deletedService = getDeletedServiceSummary(activity.payload);
                const serviceSummary = activity.repairOrder ?? deletedService;
                const ActivityIcon = typeConfig.icon;
                const targetLabel = getServiceTarget(activity, serviceSummary);
                const ownerName = serviceSummary?.customerName;

                return (
                  <div
                    key={activity.id}
                    className={cn("rounded-lg border px-3 py-2", typeConfig.borderClass, typeConfig.backgroundClass)}
                  >
                    <div className="flex min-w-0 flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <Badge variant={typeConfig.badgeVariant} className="h-5 shrink-0 px-1.5">
                          {typeConfig.label}
                        </Badge>
                        <p className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-muted-foreground/90">
                          <span className="inline-flex min-w-0 items-center gap-1 font-medium text-foreground">
                            <RiUser3Line className="size-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate">{activity.user.name}</span>
                          </span>
                          <span className="inline-flex shrink-0 items-center gap-1 font-medium text-primary">
                            <ActivityIcon className="size-3.5 shrink-0" />
                            {typeConfig.actionLabel}
                          </span>
                          <span className="inline-flex min-w-0 items-center gap-1 font-medium text-foreground/90">
                            <span className="truncate">
                              {targetLabel}
                            </span>
                          </span>
                          {ownerName ? (
                            <span className="min-w-0 truncate text-muted-foreground">
                              milik {ownerName}
                            </span>
                          ) : null}
                        </p>
                      </div>
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground sm:shrink-0 sm:flex-nowrap">
                        {serviceSummary?.id ? (
                          <span className="font-mono text-[11px] uppercase tracking-wide">
                            #{serviceSummary.id.slice(0, 8)}
                          </span>
                        ) : null}
                        <span className="flex items-center gap-1">
                          <RiTimeLine className="size-3.5" />
                          {formatDate(activity.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
