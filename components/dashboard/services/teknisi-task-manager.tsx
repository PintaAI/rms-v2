"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ServiceTable } from "@/components/dashboard/services/service-table";
import { ServiceTaskCard } from "@/components/dashboard/services/service-task-card";
import { TakeoverConfirmDialog } from "@/components/dashboard/services/takeover-confirm-dialog";
import { getService, takeService } from "@/actions";
import type { ServiceListItem, ServiceDetail } from "@/actions";
import { useAuth } from "@/components/auth/auth-provider";
import type { ServiceTableItem } from "@/components/dashboard/services/service-table/types";
import {
  OverviewSectionHeader,
  OverviewStatsCard,
} from "@/components/dashboard/shared/overview-cards";
import {
  RiTaskLine,
  RiCheckLine,
  RiCloseCircleLine,
  RiFolderLine,
  RiToolsLine,
  RiHistoryLine,
  RiArrowRightLine,
  RiLoader4Line,
  RiStore2Line,
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
  myTasks: ServiceListItem[];
  availableTasks: ServiceListItem[];
  initialStats: TechnicianTaskStats;
  tokoId: string;
  currentToko?: {
    id: string;
    name: string;
    logoUrl: string | null;
  };
}

export function TeknisiTaskManager({
  myTasks,
  availableTasks,
  initialStats,
  tokoId,
  currentToko,
}: TeknisiTaskManagerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const status = searchParams.get("status");

  const [stats, setStats] = useState<TechnicianTaskStats>(initialStats);
  const [isTakingTask, setIsTakingTask] = useState<string | null>(null);
  const [pendingTakeoverTask, setPendingTakeoverTask] = useState<ServiceListItem | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ServiceDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const pendingMutationsRef = useRef(0);
  const userId = user?.id;

  useEffect(() => {
    if (pendingMutationsRef.current === 0) {
      setStats(initialStats);
    }
  }, [initialStats]);

  const submitTakeTask = useCallback(async (serviceId: string) => {
    setIsTakingTask(serviceId);
    const result = await takeService(serviceId);
    if (result.success) {
      router.refresh();
    }
    setIsTakingTask(null);
    return result;
  }, [router]);

  const handleTakeTask = useCallback((serviceId: string) => {
    const task = availableTasks.find((item) => item.id === serviceId);
    if (task?.technician && task.technician.id !== userId) {
      setPendingTakeoverTask(task);
      return;
    }

    void submitTakeTask(serviceId);
  }, [availableTasks, submitTakeTask, userId]);

  const handleConfirmTakeover = useCallback(async () => {
    if (!pendingTakeoverTask) {
      return;
    }

    const result = await submitTakeTask(pendingTakeoverTask.id);
    if (result.success) {
      setPendingTakeoverTask(null);
    }
  }, [pendingTakeoverTask, submitTakeTask]);

  const handleOpenTask = useCallback(async (service: ServiceTableItem) => {
    setIsLoadingDetail(true);
    setDetailDialogOpen(true);
    const result = await getService(service.id);
    if (result.success && result.data) {
      setSelectedTask(result.data);
    }
    setIsLoadingDetail(false);
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
        isPickedUp: s.isPickedUp,
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
        ? ["done"]
        : status === "gagal"
          ? ["failed"]
          : status === "history"
            ? ["done", "failed"]
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
        isPickedUp: t.isPickedUp,
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

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight">Task</h1>
            <div className="h-6 w-1 rounded-full bg-primary" />
            <div className="flex items-center gap-2">
              {currentToko?.logoUrl ? (
                <Image
                  src={currentToko.logoUrl}
                  alt={currentToko.name}
                  width={20}
                  height={20}
                  className="h-5 w-5 rounded-md object-cover"
                />
              ) : (
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-muted">
                  <RiStore2Line className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
              <span className="text-sm font-medium text-muted-foreground">{currentToko?.name || "Toko"}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground/70">
            {tableItems.length} task{status ? ` dengan status ${status}` : ""}
          </p>
        </div>

        <Button variant="outline" onClick={() => router.push(`/${tokoId}/teknisi`)} className="shrink-0">
          <RiArrowRightLine className="mr-1.5 h-4 w-4" />
          Overview
        </Button>
      </div>

      <section className="space-y-4">
        <OverviewSectionHeader title="Status Task" colorClass="bg-primary" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <OverviewStatsCard
            title="Tersedia"
            value={stats.tersedia}
            icon={<RiTaskLine className="h-4 w-4" />}
            description="Task yang bisa diambil atau takeover"
            variant="primary"
          />
          <OverviewStatsCard
            title="Dikerjakan"
            value={stats.repairing}
            icon={<RiToolsLine className="h-4 w-4" />}
            description="Task yang sedang diproses"
            variant={stats.repairing > 0 ? "warning" : "default"}
          />
          <OverviewStatsCard
            title="Selesai"
            value={stats.selesai}
            icon={<RiCheckLine className="h-4 w-4" />}
            description="Task yang sudah selesai"
            variant="success"
          />
          <OverviewStatsCard
            title="Gagal"
            value={stats.gagal}
            icon={<RiCloseCircleLine className="h-4 w-4" />}
            description="Task yang dibatalkan"
            variant={stats.gagal > 0 ? "warning" : "default"}
          />
          <OverviewStatsCard
            title="History"
            value={stats.history}
            icon={<RiHistoryLine className="h-4 w-4" />}
            description="Riwayat task teknisi"
            variant="accent"
          />
          <OverviewStatsCard
            title="Total"
            value={stats.total}
            icon={<RiFolderLine className="h-4 w-4" />}
            description="Semua task yang pernah diambil"
          />
        </div>
      </section>

      <section>
        <Card className="overflow-hidden border-border/50 py-0 shadow-lg shadow-black/5 transition-all duration-300 hover:shadow-xl hover:shadow-black/10">
          <CardHeader className="border-b border-border/50 bg-muted/30 pt-4">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-5 w-1 rounded-full bg-primary" />
                <span className="text-lg font-bold">{getPageTitle()}</span>
              </div>
              <span className="rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {tableItems.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {status === "tersedia" ? (
              <ServiceTable
                services={tableItems}
                preset="technicianAvailable"
                emptyMessage="Tidak ada task yang bisa diambil atau takeover"
                onTake={handleTakeTask}
                onRowClick={handleOpenTask}
              />
            ) : (
              <ServiceTable
                services={tableItems}
                preset="technicianMyTasks"
                emptyMessage={`Tidak ada task${status ? ` dengan status ${status}` : ""}`}
                onRowClick={handleOpenTask}
              />
            )}
          </CardContent>
        </Card>
      </section>

      <Sheet open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <SheetContent side="bottom" className="mx-auto h-[90vh] max-w-4xl overflow-y-auto rounded-t-lg p-2">
          <SheetHeader className="flex items-center justify-between p-2">
            <SheetTitle className="font-bold">Detail Task</SheetTitle>
            <p className="text-sm text-muted-foreground">kelola task servis</p>
          </SheetHeader>
          {isLoadingDetail && (
            <div className="flex items-center justify-center py-8">
              <RiLoader4Line className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoadingDetail && selectedTask && (
            <div className="p-2">
              <ServiceTaskCard
                task={selectedTask}
                variant={
                  selectedTask.status === "done" ||
                  selectedTask.status === "failed"
                    ? "completed"
                    : "active"
                }
                onRefresh={handleRefreshDetail}
                onStatusChange={() => router.refresh()}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      <TakeoverConfirmDialog
        open={Boolean(pendingTakeoverTask)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingTakeoverTask(null);
          }
        }}
        onConfirm={handleConfirmTakeover}
        technicianName={pendingTakeoverTask?.technician?.name || "teknisi lain"}
        serviceLabel={pendingTakeoverTask
          ? `${pendingTakeoverTask.hpCatalog.brand.name} ${pendingTakeoverTask.hpCatalog.modelName}`
          : "Task ini"}
        isLoading={pendingTakeoverTask ? isTakingTask === pendingTakeoverTask.id : false}
      />
    </div>
  );
}
