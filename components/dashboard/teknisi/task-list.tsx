"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ServiceTable } from "@/components/dashboard/services/service-table";
import type { ServiceDetail, ServiceListItem } from "@/actions/service";
import { getBrandIcon } from "@/lib/brand-icons";
import { formatDate } from "@/lib/utils";
import {
  RiArrowRightLine,
  RiLoader4Line,
  RiTimeLine,
  RiShieldUserLine,
  RiTaskLine,
} from "@remixicon/react";

interface TaskListProps {
  availableServices: ServiceListItem[];
  myTasks: ServiceDetail[];
  userId?: string;
  isTakingTask: string | null;
  onTakeTask: (service: ServiceListItem) => void;
  onOpenTask: (taskId: string) => void;
  onViewAllAvailable: () => void;
  onViewAllMyTasks: () => void;
}

export function TaskList({
  availableServices,
  myTasks,
  userId,
  isTakingTask,
  onTakeTask,
  onOpenTask,
  onViewAllAvailable,
  onViewAllMyTasks,
}: TaskListProps) {
  const availableTasks = availableServices.filter((service) => !service.technician || service.technician.id === userId);
  const takeoverTasks = availableServices.filter((service) => service.technician && service.technician.id !== userId);

  const renderServiceItem = (service: ServiceListItem, kind: "available" | "takeover") => (
    <div
      key={service.id}
      className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/90 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/70 via-primary/20 to-transparent" />

      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground ring-1 ring-inset ring-border/60">
              {getBrandIcon(service.hpCatalog.brand.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-semibold leading-tight">
                  {service.hpCatalog.brand.name} {service.hpCatalog.modelName}
                </p>
                <Badge
                  variant={kind === "takeover" ? "secondary" : "outline"}
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]"
                >
                  {kind === "takeover" ? "Takeover" : "Available"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {service.customerName || "No name"}
              </p>
            </div>
          </div>

          <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
            {service.complaint.slice(0, 72)}
          </p>

          {service.includedItems && service.includedItems.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {service.includedItems.slice(0, 2).map((item: string, i: number) => (
                <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">{item}</Badge>
              ))}
              {service.includedItems.length > 2 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">+{service.includedItems.length - 2}</Badge>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px] font-medium">
              <RiTimeLine className="mr-1 h-3 w-3" />
              {formatDate(service.checkinAt)}
            </Badge>
            {service.technician ? (
              <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                <RiShieldUserLine className="mr-1 h-3 w-3" />
                {kind === "takeover" ? "Ditangani" : "Teknisi"} {service.technician.name}
              </Badge>
            ) : (
              <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px] font-medium text-primary">
                Ready
              </Badge>
            )}
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => onTakeTask(service)}
          disabled={isTakingTask === service.id}
          className="h-11 shrink-0 rounded-full border border-primary/20 bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25"
        >
          {isTakingTask === service.id ? (
            <RiLoader4Line className="h-4 w-4 animate-spin" />
          ) : (
            <RiTaskLine className="mr-1.5 h-4 w-4" />
          )}
          {service.technician && service.technician.id !== userId ? "Takeover" : "Ambil"}
        </Button>
      </div>
    </div>
  );

  return (
    <section className="grid gap-6 lg:grid-cols-4">
      <Card className="overflow-hidden border-border/50 bg-card/90 py-0 shadow-lg shadow-black/5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/10 lg:col-span-1">
        <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/10 via-muted/20 to-transparent pt-4">
          <CardTitle className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
                <RiTaskLine className="h-4 w-4" />
              </div>
              <div>
                <span className="block text-lg font-bold leading-none">Task Tersedia</span>
                <span className="mt-1 block text-xs font-medium text-muted-foreground">Siap diambil atau takeover</span>
              </div>
            </div>
            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-semibold">
              {availableServices.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="mb-4">
          {availableServices.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-5 text-sm text-muted-foreground">
              Tidak ada task yang bisa diambil atau takeover saat ini.
            </div>
          ) : (
            <Tabs defaultValue="available" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 rounded-xl border border-border/50 bg-card p-1 shadow-sm">
              <TabsTrigger value="available" className="rounded-lg text-[11px] font-semibold uppercase tracking-[0.16em]">
                Available <span className="ml-1 text-[10px] opacity-70">({availableTasks.length})</span>
              </TabsTrigger>
              <TabsTrigger value="takeover" className="rounded-lg text-[11px] font-semibold uppercase tracking-[0.16em]">
                Takeover <span className="ml-1 text-[10px] opacity-70">({takeoverTasks.length})</span>
              </TabsTrigger>
            </TabsList>

              <TabsContent value="available" className="space-y-3">
                {availableTasks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-5 text-sm text-muted-foreground">
                    Tidak ada task available saat ini.
                  </div>
                ) : (
                  <>
                    {availableTasks.slice(0, 5).map((service) => renderServiceItem(service, "available"))}
                    {availableTasks.length > 5 && (
                      <Button variant="outline" className="w-full rounded-xl border-dashed bg-background/70" onClick={onViewAllAvailable}>
                        <RiArrowRightLine className="mr-1.5 h-4 w-4" />
                        Lihat semua ({availableTasks.length})
                      </Button>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="takeover" className="space-y-3">
                {takeoverTasks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-5 text-sm text-muted-foreground">
                    Tidak ada task takeover saat ini.
                  </div>
                ) : (
                  <>
                    {takeoverTasks.slice(0, 5).map((service) => renderServiceItem(service, "takeover"))}
                    {takeoverTasks.length > 5 && (
                      <Button variant="outline" className="w-full rounded-xl border-dashed bg-background/70" onClick={onViewAllAvailable}>
                        <RiArrowRightLine className="mr-1.5 h-4 w-4" />
                        Lihat semua ({takeoverTasks.length})
                      </Button>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/50 bg-card/90 py-0 shadow-lg shadow-black/5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/10 lg:col-span-3">
        <CardContent className="p-0">
          <div className="space-y-4">
            <ServiceTable
              services={myTasks.slice(0, 5)}
              role="technicianMyTasks"
              headerTitle="My Tasks"
              headerDescription="Task yang sedang kamu pegang"
              headerBadge={myTasks.length}
              emptyMessage="Tidak ada task yang sedang dikerjakan."
              onRowClick={(task) => onOpenTask(task.id)}
            />
            {myTasks.length > 5 && (
              <div className="px-4 pb-4">
                <Button variant="outline" className="w-full rounded-xl border-dashed bg-background/70" onClick={onViewAllMyTasks}>
                  <RiArrowRightLine className="mr-1.5 h-4 w-4" />
                  Lihat semua ({myTasks.length})
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
