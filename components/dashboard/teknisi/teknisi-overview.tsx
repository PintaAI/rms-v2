"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/components/auth/auth-provider";
import {
  OverviewSectionHeader,
  OverviewStatsCard,
} from "@/components/dashboard/shared/overview-cards";
import { ServiceTaskCard } from "@/components/dashboard/services/service-task-card";
import { TakeoverConfirmDialog } from "@/components/dashboard/services/takeover-confirm-dialog";
import { getService, takeService } from "@/actions";
import type { ServiceDetail, ServiceListItem, TechnicianStats } from "@/actions/service";
import {
  RiArrowRightLine,
  RiCheckLine,
  RiLoader4Line,
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

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  received: "secondary",
  repairing: "default",
  done: "outline",
  failed: "destructive",
  picked_up: "default",
};

const statusLabels: Record<string, string> = {
  received: "Masuk",
  repairing: "Proses",
  done: "Selesai",
  failed: "Gagal",
  picked_up: "Diambil",
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function TeknisiOverview({
  stats,
  availableServices,
  myTasks,
  tokoId,
}: TeknisiOverviewProps) {
  const router = useRouter();
  const { tokoList, user } = useAuth();
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ServiceDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isTakingTask, setIsTakingTask] = useState<string | null>(null);
  const [pendingTakeoverTask, setPendingTakeoverTask] = useState<ServiceListItem | null>(null);
  const currentToko = tokoList.find((t) => t.id === tokoId);

  const submitTakeTask = useCallback(async (serviceId: string) => {
    setIsTakingTask(serviceId);
    const result = await takeService(serviceId);
    setIsTakingTask(null);
    if (result.success) {
      router.refresh();
    }
    return result;
  }, [router]);

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
            title="Total Assigned"
            value={stats.totalAssigned}
            icon={<RiTaskLine className="h-4 w-4" />}
            description="Total task yang pernah diambil"
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden border-border/50 py-0 shadow-lg shadow-black/5 transition-all duration-300 hover:shadow-xl hover:shadow-black/10">
          <CardHeader className="border-b border-border/50 bg-muted/30 pt-4">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-5 w-1 rounded-full bg-primary" />
                <span className="text-lg font-bold">Task Tersedia</span>
              </div>
              <Badge variant="outline">{availableServices.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {availableServices.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada task yang bisa diambil atau takeover saat ini.</p>
            ) : (
              <div className="space-y-3">
                {availableServices.slice(0, 5).map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between rounded-xl border border-border/50 bg-card p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {service.hpCatalog.brand.name} {service.hpCatalog.modelName}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {service.customerName || "No name"} • {service.complaint.slice(0, 30)}...
                      </p>
                      {service.technician && (
                        <p className="text-xs text-muted-foreground">Ditangani {service.technician.name}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{formatDate(service.checkinAt)}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleTakeTask(service)}
                      disabled={isTakingTask === service.id}
                      className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80"
                    >
                      {isTakingTask === service.id ? (
                        <RiLoader4Line className="h-4 w-4 animate-spin" />
                      ) : (
                        <RiTaskLine className="mr-1 h-4 w-4" />
                      )}
                      {service.technician && service.technician.id !== user?.id ? "Takeover" : "Ambil"}
                    </Button>
                  </div>
                ))}
                {availableServices.length > 5 && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push(`/${tokoId}/teknisi/task?status=tersedia`)}
                  >
                    <RiArrowRightLine className="mr-1.5 h-4 w-4" />
                    Lihat semua ({availableServices.length})
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border/50 py-0 shadow-lg shadow-black/5 transition-all duration-300 hover:shadow-xl hover:shadow-black/10">
          <CardHeader className="border-b border-border/50 bg-muted/30 pt-4">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-5 w-1 rounded-full bg-sky-500" />
                <span className="text-lg font-bold">My Tasks</span>
              </div>
              <Badge variant="outline">{myTasks.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {myTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada task yang sedang dikerjakan.</p>
            ) : (
              <div className="space-y-3">
                {myTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex cursor-pointer items-center justify-between rounded-xl border border-border/50 bg-card p-3 transition-colors hover:bg-muted/30"
                    onClick={() => handleOpenTask(task.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 truncate font-medium">
                        {task.hpCatalog.brand.name} {task.hpCatalog.modelName}
                        <Badge variant={statusColors[task.status] || "outline"}>
                          {statusLabels[task.status] || task.status}
                        </Badge>
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {task.customerName || "No name"} • {task.complaint.slice(0, 30)}...
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      Open
                    </Button>
                  </div>
                ))}
                {myTasks.length > 5 && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push(`/${tokoId}/teknisi/task`)}
                  >
                    <RiArrowRightLine className="mr-1.5 h-4 w-4" />
                    Lihat semua ({myTasks.length})
                  </Button>
                )}
              </div>
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
                  selectedTask.status === "picked_up" ||
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
