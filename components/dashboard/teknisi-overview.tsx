"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ServiceTaskCard } from "@/components/dashboard/service-task-card";
import { takeService, getService } from "@/actions";
import type { TechnicianStats, ServiceListItem, ServiceDetail } from "@/actions/service";
import {
  RiTaskLine,
  RiCheckLine,
  RiCloseCircleLine,
  RiLoader4Line,
  RiToolsLine,
} from "@remixicon/react";

interface TeknisiOverviewProps {
  stats: TechnicianStats;
  availableServices: ServiceListItem[];
  myTasks: ServiceDetail[];
  tokoId: string;
}

function StatsCard({
  title,
  value,
  icon,
  description,
  variant = "default",
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  description?: string;
  variant?: "default" | "warning" | "success" | "info";
}) {
  const bgColors = {
    default: "bg-muted",
    warning: "bg-red-100 dark:bg-red-950",
    success: "bg-green-100 dark:bg-green-950",
    info: "bg-blue-100 dark:bg-blue-950",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`h-6 w-6 rounded-lg ${bgColors[variant]} flex items-center justify-center`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
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
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ServiceDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isTakingTask, setIsTakingTask] = useState<string | null>(null);

  const handleTakeTask = useCallback(async (serviceId: string) => {
    setIsTakingTask(serviceId);
    const result = await takeService(serviceId);
    setIsTakingTask(null);
    if (result.success) {
      router.refresh();
    }
  }, [router]);

  const handleOpenTask = useCallback(async (taskId: string) => {
    setIsLoadingDetail(true);
    setDetailDialogOpen(true);
    const result = await getService(taskId);
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Teknisi Overview</h1>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <StatsCard
          title="Task Tersedia"
          value={stats.availableCount}
          icon={<RiTaskLine className="h-3 w-3" />}
          description="Task yang bisa diambil"
          variant="info"
        />
        <StatsCard
          title="Sedang Proses"
          value={stats.inProgressCount}
          icon={<RiToolsLine className="h-3 w-3" />}
          description="Task yang sedang dikerjakan"
        />
        <StatsCard
          title="Selesai"
          value={stats.doneCount}
          icon={<RiCheckLine className="h-3 w-3" />}
          description="Task yang sudah selesai"
          variant="success"
        />
        <StatsCard
          title="Total Assigned"
          value={stats.totalAssigned}
          icon={<RiTaskLine className="h-3 w-3" />}
          description="Total task yang pernah diambil"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Task Tersedia</span>
              <Badge variant="outline">{availableServices.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {availableServices.length === 0 ? (
              <p className="text-muted-foreground text-sm">Tidak ada task tersedia saat ini.</p>
            ) : (
              <div className="space-y-3">
                {availableServices.slice(0, 5).map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {service.hpCatalog.brand.name} {service.hpCatalog.modelName}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {service.customerName || "No name"} • {service.complaint.slice(0, 30)}...
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(service.checkinAt)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleTakeTask(service.id)}
                      disabled={isTakingTask === service.id}
                    >
                      {isTakingTask === service.id ? (
                        <RiLoader4Line className="h-4 w-4 animate-spin" />
                      ) : (
                        <RiTaskLine className="h-4 w-4 mr-1" />
                      )}
                      Ambil
                    </Button>
                  </div>
                ))}
                {availableServices.length > 5 && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push(`/${tokoId}/teknisi/task?status=tersedia`)}
                  >
                    Lihat semua ({availableServices.length})
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>My Tasks</span>
              <Badge variant="outline">{myTasks.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myTasks.length === 0 ? (
              <p className="text-muted-foreground text-sm">Tidak ada task yang sedang dikerjakan.</p>
            ) : (
              <div className="space-y-3">
                {myTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 cursor-pointer hover:bg-muted/50"
                    onClick={() => handleOpenTask(task.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate flex items-center gap-2">
                        {task.hpCatalog.brand.name} {task.hpCatalog.modelName}
                        <Badge variant={statusColors[task.status] || "outline"}>
                          {statusLabels[task.status] || task.status}
                        </Badge>
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
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
                    Lihat semua ({myTasks.length})
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
            <div className="p-2">
              <ServiceTaskCard
                task={selectedTask as any}
                variant={["done", "picked_up", "failed"].includes(selectedTask.status) ? "completed" : "active"}
                onRefresh={handleRefreshDetail}
                onStatusChange={() => router.refresh()}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}