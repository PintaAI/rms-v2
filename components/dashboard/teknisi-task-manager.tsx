"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ServiceTable } from "@/components/dashboard/service-table";
import { ServiceTaskCard } from "@/components/dashboard/service-task-card";
import { takeService, getService } from "@/actions";
import type { ServiceListItem, ServiceDetail } from "@/actions";
import type { ServiceTableItem } from "@/components/dashboard/service-table/types";
import {
  RiTaskLine,
  RiCheckLine,
  RiCloseCircleLine,
  RiFolderLine,
  RiLoader4Line,
  RiToolsLine,
  RiHistoryLine,
} from "@remixicon/react";

interface TechnicianTaskStats {
  tersedia: number;
  repairing: number;
  selesai: number;
  gagal: number;
  history: number;
  total: number;
}

interface TeknisiTaskManagerProps {
  myTasks: ServiceDetail[];
  availableTasks: ServiceListItem[];
  initialStats: TechnicianTaskStats;
  tokoId: string;
}

function StatsCard({
  title,
  value,
  icon,
  variant = "default",
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  variant?: "default" | "warning" | "success";
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-6 w-6 rounded-lg bg-muted flex items-center justify-center">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

export function TeknisiTaskManager({
  myTasks,
  availableTasks,
  initialStats,
  tokoId,
}: TeknisiTaskManagerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get("status");

  const [stats, setStats] = useState<TechnicianTaskStats>(initialStats);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ServiceDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isTakingTask, setIsTakingTask] = useState<string | null>(null);

  const pendingMutationsRef = useRef(0);

  useEffect(() => {
    if (pendingMutationsRef.current === 0) {
      setStats(initialStats);
    }
  }, [initialStats]);

  const handleTakeTask = useCallback(async (serviceId: string) => {
    setIsTakingTask(serviceId);
    const result = await takeService(serviceId);
    if (result.success) {
      router.refresh();
    }
    setIsTakingTask(null);
  }, [router]);

  const handleRowClick = useCallback(async (service: ServiceTableItem) => {
    setIsLoadingDetail(true);
    setDetailDialogOpen(true);

    const result = await getService(service.id);
    if (result.success && result.data) {
      setSelectedTask(result.data);
    }
    setIsLoadingDetail(false);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailDialogOpen(false);
    setSelectedTask(null);
  }, []);

  const handleRefreshDetail = useCallback(() => {
    if (selectedTask) {
      getService(selectedTask.id).then((result) => {
        if (result.success && result.data) {
          setSelectedTask(result.data);
        }
      });
    }
    router.refresh();
  }, [selectedTask, router]);

  const handleStatusChange = useCallback((newStatus: string) => {
    router.refresh();
  }, [router]);

  const tableItems: ServiceTableItem[] = useMemo(() => {
    if (status === "tersedia") {
      return availableTasks.map((s) => ({
        id: s.id,
        hpCatalogId: s.hpCatalogId,
        customerName: s.customerName,
        noWa: s.noWa,
        complaint: s.complaint,
        note: s.note,
        status: s.status,
        checkinAt: s.checkinAt,
        doneAt: s.doneAt,
        checkoutAt: s.checkoutAt,
        hpCatalog: s.hpCatalog,
        technician: s.technician,
        invoice: s.invoice,
        createdBy: s.createdBy,
        passwordPattern: s.passwordPattern,
        imei: s.imei,
      }));
    }
    
    const statusFilter = status === "repairing"
      ? ["repairing"]
      : status === "selesai"
        ? ["done", "picked_up"]
        : status === "gagal"
          ? ["failed"]
          : status === "history"
            ? ["done", "picked_up", "failed"]
            : null;
    
    const filteredTasks = statusFilter
      ? myTasks.filter((t) => statusFilter.includes(t.status))
      : myTasks;
    
    return filteredTasks.map((t) => ({
      id: t.id,
      hpCatalogId: t.hpCatalogId,
      customerName: t.customerName,
      noWa: t.noWa,
      complaint: t.complaint,
      note: t.note,
      status: t.status,
      checkinAt: t.checkinAt,
      doneAt: t.doneAt,
      checkoutAt: t.checkoutAt,
      hpCatalog: t.hpCatalog,
      technician: t.technician,
      invoice: t.invoice,
      createdBy: t.createdBy,
      passwordPattern: t.passwordPattern,
      imei: t.imei,
    }));
  }, [status, myTasks, availableTasks]);

  const getPageTitle = () => {
    if (!status) return "Semua Task";
    if (status === "tersedia") return "Task Tersedia";
    if (status === "repairing") return "Task Sedang Dikerjakan";
    if (status === "selesai") return "Task Selesai";
    if (status === "gagal") return "Task Gagal";
    if (status === "history") return "History Task";
    return "Task";
  };

  const preset = status === "tersedia" ? "technicianAvailable" : "technicianMyTasks";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{getPageTitle()}</h1>
        <p className="text-sm text-muted-foreground">
          {tableItems.length} task{status ? ` dengan status ${status}` : ""}
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <StatsCard
          title="Tersedia"
          value={stats.tersedia}
          icon={<RiTaskLine className="h-3 w-3" />}
        />
        <StatsCard
          title="Dikerjakan"
          value={stats.repairing}
          icon={<RiToolsLine className="h-3 w-3" />}
          variant={stats.repairing > 0 ? "warning" : "default"}
        />
        <StatsCard
          title="Selesai"
          value={stats.selesai}
          icon={<RiCheckLine className="h-3 w-3" />}
          variant="success"
        />
        <StatsCard
          title="Gagal"
          value={stats.gagal}
          icon={<RiCloseCircleLine className="h-3 w-3" />}
          variant={stats.gagal > 0 ? "warning" : "default"}
        />
        <StatsCard
          title="History"
          value={stats.history}
          icon={<RiHistoryLine className="h-3 w-3" />}
        />
        <StatsCard
          title="Total"
          value={stats.total}
          icon={<RiFolderLine className="h-3 w-3" />}
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          {status === "tersedia" && (
            <ServiceTable
              services={tableItems}
              preset="technicianAvailable"
              emptyMessage="Tidak ada task tersedia"
              onRowClick={handleRowClick}
              onTake={handleTakeTask}
            />
          )}
          {status !== "tersedia" && (
            <ServiceTable
              services={tableItems}
              preset="technicianMyTasks"
              emptyMessage={`Tidak ada task${status ? ` dengan status ${status}` : ""}`}
              onRowClick={handleRowClick}
            />
          )}
        </CardContent>
      </Card>

      <Sheet open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-lg p-2 max-w-4xl mx-auto overflow-y-auto">
          <SheetHeader className="p-2 flex items-center justify-between">
            <SheetTitle className="font-bold">Detail Task</SheetTitle>
            <p className="text-sm text-muted-foreground">kelola task servis</p>
          </SheetHeader>
          {isLoadingDetail && (
            <div className="flex items-center justify-center py-8">
              <RiLoader4Line className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoadingDetail && selectedTask && (
            <div className="space-y-4 p-2">
              {selectedTask.status === "received" && !selectedTask.technician && (
                <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm">Task ini masih tersedia. Ambil untuk mulai servis.</p>
                      <Button
                        onClick={() => handleTakeTask(selectedTask.id)}
                        disabled={isTakingTask === selectedTask.id}
                      >
                        {isTakingTask === selectedTask.id ? (
                          <RiLoader4Line className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <RiTaskLine className="h-4 w-4 mr-1" />
                        )}
                        Ambil Task
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              <ServiceTaskCard
                task={selectedTask as any}
                variant={["done", "picked_up", "failed"].includes(selectedTask.status) ? "completed" : "active"}
                onRefresh={handleRefreshDetail}
                onStatusChange={handleStatusChange}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}