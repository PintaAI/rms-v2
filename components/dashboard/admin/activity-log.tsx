"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminOverviewActivityItem } from "@/actions/overview";
import type { Prisma } from "@/prisma/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { RiLoader4Line, RiPulseLine, RiTimeLine } from "@remixicon/react";
import { formatDate } from "@/lib/utils";

interface ActivityLogProps {
  activities: AdminOverviewActivityItem[];
}

const activityTypeConfig: Record<
  string,
  {
    label: string;
    badgeVariant: "accent" | "default" | "success" | "warning" | "secondary";
    borderClass: string;
    backgroundClass: string;
  }
> = {
  service_created: {
    label: "Service Baru",
    badgeVariant: "accent",
    borderClass: "border-sky-500/30",
    backgroundClass: "bg-sky-500/5",
  },
  service_updated: {
    label: "Update Service",
    badgeVariant: "secondary",
    borderClass: "border-border/70",
    backgroundClass: "bg-muted/30",
  },
  service_status_changed: {
    label: "Status",
    badgeVariant: "warning",
    borderClass: "border-amber-500/30",
    backgroundClass: "bg-amber-500/5",
  },
  service_assigned: {
    label: "Assign",
    badgeVariant: "accent",
    borderClass: "border-sky-500/30",
    backgroundClass: "bg-sky-500/5",
  },
  service_taken_over: {
    label: "Take Over",
    badgeVariant: "warning",
    borderClass: "border-amber-500/30",
    backgroundClass: "bg-amber-500/5",
  },
  invoice_created: {
    label: "Invoice",
    badgeVariant: "default",
    borderClass: "border-primary/25",
    backgroundClass: "bg-primary/5",
  },
  invoice_paid: {
    label: "Paid",
    badgeVariant: "success",
    borderClass: "border-green-500/30",
    backgroundClass: "bg-green-500/5",
  },
  sparepart_created: {
    label: "Sparepart Baru",
    badgeVariant: "accent",
    borderClass: "border-sky-500/30",
    backgroundClass: "bg-sky-500/5",
  },
  sparepart_updated: {
    label: "Update Sparepart",
    badgeVariant: "secondary",
    borderClass: "border-border/70",
    backgroundClass: "bg-muted/30",
  },
  sparepart_deleted: {
    label: "Delete",
    badgeVariant: "warning",
    borderClass: "border-amber-500/30",
    backgroundClass: "bg-amber-500/5",
  },
  sparepart_stock_in: {
    label: "Stock In",
    badgeVariant: "success",
    borderClass: "border-green-500/30",
    backgroundClass: "bg-green-500/5",
  },
  sparepart_stock_out: {
    label: "Stock Out",
    badgeVariant: "warning",
    borderClass: "border-amber-500/30",
    backgroundClass: "bg-amber-500/5",
  },
  inventory_audit_started: {
    label: "Audit Mulai",
    badgeVariant: "accent",
    borderClass: "border-sky-500/30",
    backgroundClass: "bg-sky-500/5",
  },
  inventory_audit_completed: {
    label: "Audit Selesai",
    badgeVariant: "success",
    borderClass: "border-green-500/30",
    backgroundClass: "bg-green-500/5",
  },
  inventory_audit_cancelled: {
    label: "Audit Batal",
    badgeVariant: "secondary",
    borderClass: "border-border/70",
    backgroundClass: "bg-muted/30",
  },
  inventory_audit_stock_adjusted: {
    label: "Stok Audit",
    badgeVariant: "warning",
    borderClass: "border-amber-500/30",
    backgroundClass: "bg-amber-500/5",
  },
};

function getDeletedServiceSummary(payload: Prisma.JsonValue | null): {
  id: string;
  customerName: string | null;
} | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const deletedService = (payload as Record<string, Prisma.JsonValue>).deletedService;
  if (!deletedService || typeof deletedService !== "object" || Array.isArray(deletedService)) {
    return null;
  }

  const summary = deletedService as Record<string, Prisma.JsonValue>;

  return {
    id: typeof summary.deletedServiceId === "string" ? summary.deletedServiceId : "",
    customerName: typeof summary.customerName === "string" ? summary.customerName : null,
  };
}

export function ActivityLog({ activities }: ActivityLogProps) {
  const router = useRouter();
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  const [isPageActive, setIsPageActive] = useState(true);
  const [isPending, startRefreshTransition] = useTransition();

  useEffect(() => {
    const updatePageActivity = () => {
      setIsPageActive(document.visibilityState === "visible" && document.hasFocus());
    };

    updatePageActivity();
    window.addEventListener("focus", updatePageActivity);
    window.addEventListener("blur", updatePageActivity);
    document.addEventListener("visibilitychange", updatePageActivity);

    return () => {
      window.removeEventListener("focus", updatePageActivity);
      window.removeEventListener("blur", updatePageActivity);
      document.removeEventListener("visibilitychange", updatePageActivity);
    };
  }, []);

  useEffect(() => {
    if (!realtimeEnabled) {
      return;
    }

    const interval = window.setInterval(() => {
      if (!isPageActive) {
        return;
      }

      startRefreshTransition(() => {
        router.refresh();
      });
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isPageActive, realtimeEnabled, router]);

  useEffect(() => {
    if (!realtimeEnabled) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setRealtimeEnabled(false);
    }, 10 * 60 * 1000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [realtimeEnabled]);

  const isPollingActive = realtimeEnabled && isPageActive;

  return (
    <Card className="border-border/50 shadow-lg shadow-black/5 transition-all duration-300 hover:shadow-xl hover:shadow-black/10">
      <CardHeader className="border-b border-border/50 px-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
              <div className="h-5 w-1 shrink-0 rounded-full bg-primary" />
              <CardTitle className="text-lg font-bold">Activity Log</CardTitle>
              {realtimeEnabled ? (
                <Badge variant={isPollingActive ? "success" : "secondary"} className="gap-1.5">
                  {isPending ? (
                    <RiLoader4Line className="h-3 w-3 animate-spin" />
                  ) : (
                    <RiPulseLine className="h-3 w-3" />
                  )}
                  Live
                </Badge>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              Pantau aktivitas terbaru toko. Realtime akan refresh otomatis setiap 5 detik.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background px-3 py-2 sm:justify-start">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Realtime data</p>
            </div>
            <Switch checked={realtimeEnabled} onCheckedChange={setRealtimeEnabled} />
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
                  badgeVariant: "secondary" as const,
                  borderClass: "border-border/70",
                  backgroundClass: "bg-muted/30",
                };
                const deletedService = getDeletedServiceSummary(activity.payload);
                const serviceSummary = activity.service ?? deletedService;

                return (
                  <div
                    key={activity.id}
                    className={`rounded-lg border px-3 py-2 ${typeConfig.borderClass} ${typeConfig.backgroundClass}`}
                  >
                    <div className="flex min-w-0 flex-col gap-2 text-xs sm:flex-row sm:items-center">
                      <Badge variant={typeConfig.badgeVariant} className="shrink-0">
                        {typeConfig.label}
                      </Badge>
                      <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                        {activity.title}
                      </p>
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground sm:shrink-0 sm:flex-nowrap">
                        <span className="max-w-32 truncate">{activity.user.name}</span>
                        {serviceSummary?.customerName ? (
                          <span className="max-w-32 truncate">
                            {serviceSummary.customerName}
                          </span>
                        ) : null}
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
