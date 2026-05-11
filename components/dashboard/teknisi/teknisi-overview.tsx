"use client";

import { useCallback, useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/components/auth/auth-provider";
import {
  OverviewSectionHeader,
  OverviewStatsCard,
} from "@/components/dashboard/shared/overview-cards";
import { TaskList } from "@/components/dashboard/teknisi/task-list";
import { ServiceDetailCard, ServiceDetailCardSkeleton } from "@/components/dashboard/services/service-detail-card";
import { TakeoverConfirmDialog } from "@/components/dashboard/services/takeover-confirm-dialog";
import { useDashboardRealtime } from "@/components/dashboard/layout/dashboard-realtime-provider";
import type { PublishServiceRealtimeEvent } from "@/lib/realtime/service-realtime-types";
import { getService, takeService } from "@/actions";
import type { ServiceDetail, ServiceListItem, TechnicianStats } from "@/actions/service";
import { useRealtimePolling } from "@/lib/use-idle-detection";
import { getServiceRealtimeMeta } from "@/lib/realtime/service-realtime-label";
import {
  RiArrowRightLine,
  RiCheckLine,
  RiStore2Line,
  RiTaskLine,
  RiToolsLine,
} from "@remixicon/react";

interface TeknisiOverviewProps {
  stats: TechnicianStats;
  availableServices: ServiceListItem[];
  myTasks: ServiceDetail[];
  tokoId: string;
}

export function TeknisiOverview({
  stats,
  availableServices,
  myTasks,
  tokoId,
}: TeknisiOverviewProps) {
  const router = useRouter();
  const { tokoList, user } = useAuth();
  const { publish } = useDashboardRealtime();
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ServiceDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isTakingTask, setIsTakingTask] = useState<string | null>(null);
  const [pendingTakeoverTask, setPendingTakeoverTask] = useState<ServiceListItem | null>(null);
  const currentToko = tokoList.find((t) => t.id === tokoId);

  const { shouldPoll, interval } = useRealtimePolling({
    interval: 15000,
  });

  useEffect(() => {
    if (!shouldPoll) return;

    const pollingInterval = setInterval(() => {
      router.refresh();
    }, interval);

    return () => clearInterval(pollingInterval);
  }, [shouldPoll, interval, router]);

  const submitTakeTask = useCallback(async (serviceId: string) => {
    const service = availableServices.find((item) => item.id === serviceId) ?? myTasks.find((item) => item.id === serviceId);

    setIsTakingTask(serviceId);
    const result = await takeService(serviceId);
    setIsTakingTask(null);
    if (result.success) {
      publish({ action: "taken", serviceId, ...getServiceRealtimeMeta(service) });
      router.refresh();
    }
    return result;
  }, [availableServices, myTasks, publish, router]);

  const handleTakeTask = useCallback((service: ServiceListItem) => {
    if (service.technician && service.technician.id !== user?.id) {
      setPendingTakeoverTask(service);
      return;
    }

    void submitTakeTask(service.id);
  }, [submitTakeTask, user?.id]);

  const handleConfirmTakeover = useCallback(async () => {
    if (!pendingTakeoverTask) {
      return;
    }

    const result = await submitTakeTask(pendingTakeoverTask.id);
    if (result.success) {
      setPendingTakeoverTask(null);
    }
  }, [pendingTakeoverTask, submitTakeTask]);

  const handleOpenTask = useCallback(async (taskId: string) => {
    setIsLoadingDetail(true);
    setDetailDialogOpen(true);
    const result = await getService(taskId);
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

  const handleOptimisticStatusSuccess = useCallback((serviceId: string, status: string) => {
    const service = selectedTask;
    if (!service) return;
    publish({ action: "status_changed", serviceId, ...getServiceRealtimeMeta(service), reason: status });
    router.refresh();
  }, [publish, router, selectedTask]);

  const handleRealtimeEvent = useCallback((event: PublishServiceRealtimeEvent) => {
    publish(event);
  }, [publish]);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight">Teknisi Overview</h1>
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
          <p className="text-sm text-muted-foreground/70">Ringkasan task teknisi dan antrian servis saat ini</p>
        </div>

        <Button
          variant="outline"
          onClick={() => router.push(`/${tokoId}/teknisi/task`)}
          className="shrink-0"
        >
          <RiArrowRightLine className="mr-1.5 h-4 w-4" />
          Task Manager
        </Button>
      </div>

      <section className="space-y-4">
        <OverviewSectionHeader title="Status Task" colorClass="bg-primary" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <OverviewStatsCard
            title="Task Tersedia"
            value={stats.availableCount}
            icon={<RiTaskLine className="h-4 w-4" />}
            description="Task yang bisa diambil atau takeover"
            variant="primary"
          />
          <OverviewStatsCard
            title="Sedang Proses"
            value={stats.inProgressCount}
            icon={<RiToolsLine className="h-4 w-4" />}
            description="Task yang sedang dikerjakan"
            variant="accent"
          />
          <OverviewStatsCard
            title="Selesai"
            value={stats.doneCount}
            icon={<RiCheckLine className="h-4 w-4" />}
            description="Task yang sudah selesai"
            variant="success"
          />
          <OverviewStatsCard
            title="Assigned Bulan Ini"
            value={stats.monthlyAssigned}
            icon={<RiTaskLine className="h-4 w-4" />}
            description="Task yang diambil dalam 30 hari"
          />
        </div>
      </section>

      <section className="w-full">
        <TaskList
          availableServices={availableServices}
          myTasks={myTasks}
          userId={user?.id}
          isTakingTask={isTakingTask}
          onTakeTask={handleTakeTask}
          onOpenTask={handleOpenTask}
          onViewAllAvailable={() => router.push(`/${tokoId}/teknisi/task?status=tersedia`)}
          onViewAllMyTasks={() => router.push(`/${tokoId}/teknisi/task`)}
        />
      </section>

      <Drawer open={detailDialogOpen} onOpenChange={setDetailDialogOpen} direction="bottom">
        <DrawerContent className="mx-auto h-dvh max-h-dvh w-full min-w-0 max-w-4xl overflow-hidden p-0 before:inset-0 before:rounded-t-xl before:rounded-b-none data-[vaul-drawer-direction=bottom]:h-dvh data-[vaul-drawer-direction=bottom]:max-h-dvh sm:h-auto sm:max-h-[90dvh] sm:data-[vaul-drawer-direction=bottom]:h-auto sm:data-[vaul-drawer-direction=bottom]:max-h-[90dvh]">
          <div className="shrink-0 border-b bg-popover px-4 pb-4 pt-3">
            <DrawerTitle className="font-bold">Detail Task</DrawerTitle>
            <DrawerDescription>kelola task servis</DrawerDescription>
          </div>
          <ScrollArea className="h-[calc(100dvh-4.75rem)] min-w-0 overflow-hidden sm:h-auto sm:max-h-[calc(90dvh-4.75rem)]">
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
                  onOptimisticStatusSuccess={handleOptimisticStatusSuccess}
                  onStatusChange={() => router.refresh()}
                  onRealtimeEvent={handleRealtimeEvent}
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
