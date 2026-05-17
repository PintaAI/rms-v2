"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ServiceTable } from "@/components/dashboard/services/service-table";
import { ServiceDetailCard, ServiceDetailCardSkeleton } from "@/components/dashboard/services/service-detail-card";
import { defaultServiceActionPermissions, type ServiceActionPermissions } from "@/components/dashboard/services/service-action-permissions";
import { TakeoverConfirmDialog } from "@/components/dashboard/services/takeover-confirm-dialog";
import { getService, takeService } from "@/actions";
import type { ServiceListItem, ServiceDetail } from "@/actions";
import { useAuth } from "@/components/auth/auth-provider";
import type { ServiceTableItem } from "@/components/dashboard/services/service-table";
import { toServiceTableItems } from "@/components/dashboard/services/service-table/utils";
import {
  OverviewSectionHeader,
  OverviewStatsCard,
} from "@/components/dashboard/shared/overview-cards";
import { getServiceSearchScore } from "@/lib/service-search";
import { useServiceOptimisticStore } from "@/lib/realtime/service-optimistic-store";
import { useDashboardRealtime } from "@/components/dashboard/layout/dashboard-realtime-provider";
import { getServiceRealtimeMeta } from "@/lib/realtime/service-realtime-label";
import {
  deriveTechnicianTaskLists,
  deriveTechnicianTaskStats,
  mergeUniqueServices,
} from "@/lib/realtime/technician-service-selectors";
import { toast } from "sonner";
import {
  RiTaskLine,
  RiCheckLine,
  RiCloseCircleLine,
  RiFolderLine,
  RiToolsLine,
  RiHistoryLine,
  RiArrowRightLine,
  RiStore2Line,
  RiSearchLine,
} from "@remixicon/react";
import type { TechnicianTaskStats } from "@/actions/service";

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
  initialSearchQuery?: string;
  actionPermissions?: ServiceActionPermissions;
}

export function TeknisiTaskManager({
  myTasks,
  availableTasks,
  initialStats,
  tokoId,
  currentToko,
  initialSearchQuery = "",
  actionPermissions = defaultServiceActionPermissions,
}: TeknisiTaskManagerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const status = searchParams.get("status");
  const storeTokoId = useServiceOptimisticStore((state) => state.tokoId);
  const storeServices = useServiceOptimisticStore((state) => state.services);
  const isStoreHydrated = useServiceOptimisticStore((state) => state.isHydrated);
  const hydrateServices = useServiceOptimisticStore((state) => state.hydrateServices);
  const optimisticPatch = useServiceOptimisticStore((state) => state.optimisticPatch);
  const rollbackUpdate = useServiceOptimisticStore((state) => state.rollbackUpdate);
  const settleMutation = useServiceOptimisticStore((state) => state.settleMutation);
  const { publish } = useDashboardRealtime();

  const [isTakingTask, setIsTakingTask] = useState<string | null>(null);
  const [pendingTakeoverTask, setPendingTakeoverTask] = useState<ServiceListItem | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ServiceDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);

  const statusSnapshotsRef = useRef(new Map<string, ServiceListItem>());
  const pendingPatchesRef = useRef(new Map<string, Partial<Omit<ServiceListItem, "id">>>());
  const userId = user?.id;
  const initialServices = useMemo(
    () => mergeUniqueServices([...myTasks, ...availableTasks]),
    [myTasks, availableTasks]
  );
  const isUsingStore = storeTokoId === tokoId && isStoreHydrated && Boolean(userId);
  const sourceServices = isUsingStore ? storeServices : initialServices;
  const derivedTaskLists = useMemo(() => {
    if (!isUsingStore) {
      return { availableTasks, myTasks };
    }

    return deriveTechnicianTaskLists(sourceServices, userId);
  }, [availableTasks, isUsingStore, myTasks, sourceServices, userId]);
  const derivedAvailableTasks = derivedTaskLists.availableTasks;
  const derivedMyTasks = derivedTaskLists.myTasks;
  const stats = useMemo(() => {
    if (!isUsingStore) return initialStats;
    return deriveTechnicianTaskStats(derivedAvailableTasks, derivedMyTasks);
  }, [derivedAvailableTasks, derivedMyTasks, initialStats, isUsingStore]);

  useEffect(() => {
    hydrateServices(tokoId, initialServices);
  }, [hydrateServices, initialServices, tokoId]);

  const patchSelectedTask = useCallback((serviceId: string, patch: Partial<ServiceListItem>) => {
    setSelectedTask((prev) => (prev?.id === serviceId ? { ...prev, ...patch } : prev));
  }, []);

  const submitTakeTask = useCallback(async (serviceId: string) => {
    const originalTask = sourceServices.find((service) => service.id === serviceId);
    const shouldPatch = Boolean(originalTask && user);
    const patch: Partial<Omit<ServiceListItem, "id">> = {
      ...(user ? { technician: { id: user.id, name: user.name } } : {}),
      ...(originalTask?.status === "received" ? { status: "repairing" as ServiceListItem["status"] } : {}),
    };

    setIsTakingTask(serviceId);
    if (originalTask && shouldPatch) {
      optimisticPatch(serviceId, patch);
      patchSelectedTask(serviceId, patch);
    }

    const result = await takeService(serviceId);
    if (result.success) {
      if (shouldPatch) {
        settleMutation();
      }
      publish({ action: "taken", serviceId, ...getServiceRealtimeMeta(originalTask) });
      router.refresh();
    } else if (originalTask && shouldPatch) {
      rollbackUpdate(originalTask);
      patchSelectedTask(serviceId, originalTask);
      toast.error(result.error || "Gagal mengambil task");
    }
    setIsTakingTask(null);
    return result;
  }, [optimisticPatch, patchSelectedTask, publish, rollbackUpdate, router, settleMutation, sourceServices, user]);

  const handleTakeTask = useCallback((serviceId: string) => {
    const task = derivedAvailableTasks.find((item) => item.id === serviceId);
    if (task?.technician && task.technician.id !== userId) {
      setPendingTakeoverTask(task);
      return;
    }

    void submitTakeTask(serviceId);
  }, [derivedAvailableTasks, submitTakeTask, userId]);

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

  const handleOptimisticStatusChange = useCallback((serviceId: string, patch: Partial<Omit<ServiceListItem, "id">>) => {
    const originalService = sourceServices.find((service) => service.id === serviceId);
    if (!originalService) return;

    if (!statusSnapshotsRef.current.has(serviceId)) {
      statusSnapshotsRef.current.set(serviceId, originalService);
    }

    pendingPatchesRef.current.set(serviceId, patch);
    optimisticPatch(serviceId, patch);
    patchSelectedTask(serviceId, patch);
  }, [optimisticPatch, patchSelectedTask, sourceServices]);

  const handleOptimisticStatusSuccess = useCallback((serviceId: string, status: string) => {
    const service = sourceServices.find((item) => item.id === serviceId);
    statusSnapshotsRef.current.delete(serviceId);
    pendingPatchesRef.current.delete(serviceId);
    settleMutation();
    publish({ action: "status_changed", serviceId, ...getServiceRealtimeMeta(service), reason: status });
  }, [publish, settleMutation, sourceServices]);

  const handleOptimisticStatusError = useCallback((serviceId: string) => {
    const originalService = statusSnapshotsRef.current.get(serviceId);
    pendingPatchesRef.current.delete(serviceId);
    if (!originalService) return;

    statusSnapshotsRef.current.delete(serviceId);
    rollbackUpdate(originalService);
    patchSelectedTask(serviceId, originalService);
  }, [patchSelectedTask, rollbackUpdate]);

  const tableItems: ServiceTableItem[] = useMemo(() => {
    const searchTasks = (tasks: ServiceListItem[]) => {
      const trimmedQuery = searchQuery.trim();
      if (!trimmedQuery) return tasks;

      return tasks
        .map((task) => ({ task, score: getServiceSearchScore(trimmedQuery, task) }))
        .filter((item): item is { task: ServiceListItem; score: number } => item.score !== null)
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return new Date(b.task.checkinAt).getTime() - new Date(a.task.checkinAt).getTime();
        })
        .map((item) => item.task);
    };

    if (status === "tersedia") {
      return toServiceTableItems(searchTasks(derivedAvailableTasks));
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
      ? derivedMyTasks.filter((t) => statusFilter.includes(t.status))
      : derivedMyTasks;
    
    return toServiceTableItems(searchTasks(filteredTasks));
  }, [status, derivedMyTasks, derivedAvailableTasks, searchQuery]);

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

      <div className="relative w-full sm:max-w-sm">
        <RiSearchLine className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Cari task..."
          className="pl-9"
        />
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
          <CardContent className="p-0">
            {status === "tersedia" ? (
              <ServiceTable
                services={tableItems}
                role="technician"
                headerTitle={getPageTitle()}
                headerDescription="Task yang bisa diambil atau takeover"
                headerBadge={tableItems.length}
                emptyMessage={searchQuery.trim() ? "Tidak ada task yang cocok dengan pencarian" : "Tidak ada task yang bisa diambil atau takeover"}
                onTake={actionPermissions.canTakeOverTask ? handleTakeTask : undefined}
                onRowClick={handleOpenTask}
              />
            ) : (
              <ServiceTable
                services={tableItems}
                role="technicianMyTasks"
                headerTitle={getPageTitle()}
                headerDescription="Task yang sedang atau pernah kamu tangani"
                headerBadge={tableItems.length}
                emptyMessage={searchQuery.trim() ? "Tidak ada task yang cocok dengan pencarian" : `Tidak ada task${status ? ` dengan status ${status}` : ""}`}
                onRowClick={handleOpenTask}
              />
            )}
          </CardContent>
        </Card>
      </section>

      <Drawer open={detailDialogOpen} onOpenChange={setDetailDialogOpen} direction="bottom">
        <DrawerContent className="mx-auto flex h-dvh max-h-dvh w-full min-w-0 max-w-4xl flex-col overflow-hidden p-0 before:inset-0 before:rounded-t-xl before:rounded-b-none data-[vaul-drawer-direction=bottom]:h-dvh data-[vaul-drawer-direction=bottom]:max-h-dvh sm:h-[90dvh] sm:max-h-[90dvh] sm:data-[vaul-drawer-direction=bottom]:h-[90dvh] sm:data-[vaul-drawer-direction=bottom]:max-h-[90dvh]">
          <div className="shrink-0 border-b bg-popover px-4 pb-4 pt-3">
            <DrawerTitle className="font-bold">Detail Task</DrawerTitle>
            <DrawerDescription>kelola task servis</DrawerDescription>
          </div>
          <ScrollArea className="min-h-0 min-w-0 flex-1 overflow-hidden">
            <div className="min-w-0 p-2">
              {isLoadingDetail && (
                <ServiceDetailCardSkeleton />
              )}
              {!isLoadingDetail && selectedTask && (
                <ServiceDetailCard
                  service={selectedTask}
                  variant={
                    selectedTask.status === "done" ||
                    selectedTask.status === "failed"
                      ? "completed"
                      : "active"
                  }
                  viewerRole="technician"
                  onRefresh={handleRefreshDetail}
                  onOptimisticStatusChange={handleOptimisticStatusChange}
                  onOptimisticStatusSuccess={handleOptimisticStatusSuccess}
                  onOptimisticStatusError={handleOptimisticStatusError}
                  onStatusChange={() => {
                    setDetailDialogOpen(false);
                    router.refresh();
                  }}
                  onRealtimeEvent={publish}
                  actionPermissions={actionPermissions}
                />
              )}
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>

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
