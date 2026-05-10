"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ServiceTable } from "@/components/dashboard/services/service-table";
import { ServicesForm } from "@/components/dashboard/services/services-form";
import { ServiceDetailCard } from "@/components/dashboard/services/service-detail-card";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { useDashboardScope } from "@/components/dashboard/layout/dashboard-scope-context";
import { assignTechnician, deleteService, getService } from "@/actions";
import type { ServiceDetail, ServiceListItem } from "@/actions";
import type { ServiceTableItem } from "@/components/dashboard/services/service-table";
import { toServiceTableItems } from "@/components/dashboard/services/service-table/utils";
import { getServiceSearchScore } from "@/lib/service-search";
import { useServiceOptimisticStore } from "@/lib/realtime/service-optimistic-store";
import { useDashboardRealtime } from "@/components/dashboard/layout/dashboard-realtime-provider";
import { getServiceRealtimeLabel, getServiceRealtimeMeta } from "@/lib/realtime/service-realtime-label";
import { RiAddLine, RiSearchLine } from "@remixicon/react";
import { toast } from "sonner";

interface StaffManageServiceProps {
  allServices: ServiceListItem[];
  tokoId: string;
  pageSize: number;
  initialSearchQuery?: string;
}

function matchesPaymentStatus(service: ServiceListItem, paymentStatusFilter: string): boolean {
  if (paymentStatusFilter === "paid") return service.invoice?.paymentStatus === "paid";
  if (paymentStatusFilter === "unpaid") return service.invoice?.paymentStatus === "unpaid" || service.invoice?.paymentStatus === "dp";
  return true;
}

export function StaffManageService({
  allServices,
  tokoId,
  pageSize,
  initialSearchQuery = "",
}: StaffManageServiceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") ?? undefined;
  const pickedUpFilter = searchParams.get("pickedup") === "true";

  const { featureAccess } = useDashboardScope();
  const technicianWorkflowEnabled = featureAccess["technician.workflow"] ?? false;

  const storeTokoId = useServiceOptimisticStore((state) => state.tokoId);
  const storeServices = useServiceOptimisticStore((state) => state.services);
  const isStoreHydrated = useServiceOptimisticStore((state) => state.isHydrated);
  const hydrateServices = useServiceOptimisticStore((state) => state.hydrateServices);
  const optimisticCreate = useServiceOptimisticStore((state) => state.optimisticCreate);
  const rollbackCreate = useServiceOptimisticStore((state) => state.rollbackCreate);
  const optimisticUpdate = useServiceOptimisticStore((state) => state.optimisticUpdate);
  const optimisticPatch = useServiceOptimisticStore((state) => state.optimisticPatch);
  const rollbackUpdate = useServiceOptimisticStore((state) => state.rollbackUpdate);
  const optimisticDelete = useServiceOptimisticStore((state) => state.optimisticDelete);
  const rollbackDelete = useServiceOptimisticStore((state) => state.rollbackDelete);
  const settleMutation = useServiceOptimisticStore((state) => state.settleMutation);
  const services = storeTokoId === tokoId && isStoreHydrated ? storeServices : allServices;
  const { publish } = useDashboardRealtime();
  const [currentPage, setCurrentPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState<ServiceListItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ServiceListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const statusSnapshotsRef = useRef(new Map<string, ServiceListItem>());
  const pendingPatchesRef = useRef(new Map<string, Partial<Omit<ServiceListItem, "id">>>());

  useEffect(() => {
    hydrateServices(tokoId, allServices);
  }, [allServices, hydrateServices, tokoId]);

  const filteredServices = useMemo(() => {
    const statusFilteredServices = (() => {
      if (pickedUpFilter) {
        return services.filter((s) => s.isPickedUp);
      }
      if (!statusFilter) return services;
      const filterStatuses = statusFilter.split(",");
      return services.filter((s) => filterStatuses.includes(s.status) && !s.isPickedUp);
    })();

    const paymentFilteredServices = statusFilteredServices.filter((service) => matchesPaymentStatus(service, paymentStatusFilter));

    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return paymentFilteredServices;

    return paymentFilteredServices
      .map((service) => ({
        service,
        score: getServiceSearchScore(trimmedQuery, service),
      }))
      .filter((item): item is { service: ServiceListItem; score: number } => item.score !== null)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(b.service.checkinAt).getTime() - new Date(a.service.checkinAt).getTime();
      })
      .map((item) => item.service);
  }, [services, statusFilter, pickedUpFilter, paymentStatusFilter, searchQuery]);

  const paginatedServices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredServices.slice(start, start + pageSize);
  }, [filteredServices, currentPage, pageSize]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredServices.length / pageSize);
  }, [filteredServices.length, pageSize]);

  const tableServices: ServiceTableItem[] = toServiceTableItems(paginatedServices);

  const patchSelectedService = useCallback((serviceId: string, patch: Partial<ServiceListItem>) => {
    setSelectedService((prev) => (prev?.id === serviceId ? { ...prev, ...patch } : prev));
  }, []);

  const handleOptimisticStatusChange = useCallback((serviceId: string, patch: Partial<Omit<ServiceListItem, "id">>) => {
    const originalService = services.find((service) => service.id === serviceId);
    if (!originalService) return;

    if (!statusSnapshotsRef.current.has(serviceId)) {
      statusSnapshotsRef.current.set(serviceId, originalService);
    }

    pendingPatchesRef.current.set(serviceId, patch);
    optimisticPatch(serviceId, patch);
    patchSelectedService(serviceId, patch);
  }, [optimisticPatch, patchSelectedService, services]);

  const handleOptimisticStatusSuccess = useCallback((serviceId: string, status: string) => {
    const service = services.find((item) => item.id === serviceId);
    statusSnapshotsRef.current.delete(serviceId);
    pendingPatchesRef.current.delete(serviceId);
    settleMutation();
    publish({ action: "status_changed", serviceId, ...getServiceRealtimeMeta(service), reason: status });
  }, [publish, services, settleMutation]);

  const handleOptimisticStatusError = useCallback((serviceId: string) => {
    const originalService = statusSnapshotsRef.current.get(serviceId);
    pendingPatchesRef.current.delete(serviceId);
    if (!originalService) return;

    statusSnapshotsRef.current.delete(serviceId);
    rollbackUpdate(originalService);
    patchSelectedService(serviceId, originalService);
  }, [patchSelectedService, rollbackUpdate]);

  const handleOptimisticCreate = useCallback((tempService: ServiceListItem) => {
    optimisticCreate(tempService);
  }, [optimisticCreate]);

  const handleRevertCreate = useCallback((tempId: string) => {
    rollbackCreate(tempId);
  }, [rollbackCreate]);

  const handleOptimisticUpdate = useCallback((updatedService: ServiceListItem) => {
    optimisticUpdate(updatedService);
  }, [optimisticUpdate]);

  const handleRevertUpdate = useCallback((originalService: ServiceListItem) => {
    rollbackUpdate(originalService);
  }, [rollbackUpdate]);

  const handleCreateSuccess = useCallback((result?: { serviceId?: string; action: "created" | "updated"; serviceLabel?: string; serviceBrand?: string; reason?: string }) => {
    settleMutation();
    publish({ action: result?.action ?? (editData ? "updated" : "created"), serviceId: result?.serviceId ?? editData?.id ?? "new-service", ...(editData ? getServiceRealtimeMeta(editData as ServiceListItem) : { serviceLabel: "Service baru" }), serviceLabel: result?.serviceLabel ?? (editData ? getServiceRealtimeLabel(editData as ServiceListItem) : "Service baru"), serviceBrand: result?.serviceBrand ?? (editData as ServiceListItem | null)?.hpCatalog?.brand.name, reason: result?.reason });
    router.refresh();
  }, [editData, publish, router, settleMutation]);

  const handleEdit = useCallback((service: ServiceTableItem) => {
    const fullService = services.find((s) => s.id === service.id);
    if (fullService) {
      setEditData(fullService);
      setFormOpen(true);
    }
  }, [services]);

  const handleDelete = useCallback((service: ServiceTableItem) => {
    const fullService = services.find((s) => s.id === service.id);
    if (fullService) {
      setDeleteTarget(fullService);
      setDeleteDialogOpen(true);
    }
  }, [services]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);

    const deletedService = deleteTarget;
    const tempId = deletedService.id;

    optimisticDelete(tempId);

    setDeleteDialogOpen(false);
    setDeleteTarget(null);

    const result = await deleteService(tempId);

    if (!result.success) {
      rollbackDelete(deletedService);
      setIsDeleting(false);
      router.refresh();
      return;
    }

    settleMutation();
    publish({ action: "deleted", serviceId: tempId, ...getServiceRealtimeMeta(deletedService) });
    setIsDeleting(false);
    router.refresh();
  }, [deleteTarget, optimisticDelete, publish, rollbackDelete, router, settleMutation]);

  const handleRowClick = useCallback(async (service: ServiceTableItem) => {
    setIsLoadingDetail(true);
    setDetailDialogOpen(true);

    const result = await getService(service.id);
    if (result.success && result.data) {
      setSelectedService(result.data);
    }
    setIsLoadingDetail(false);
  }, []);

  const handleRefreshDetail = useCallback(() => {
    if (selectedService) {
      getService(selectedService.id).then((result) => {
        if (result.success && result.data) {
          setSelectedService(result.data);
        }
      });
    }
    router.refresh();
  }, [selectedService, router]);

  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
  }, []);

  const handleAssignTech = useCallback(async (
    service: ServiceTableItem,
    technician: { id: string; name: string } | null
  ) => {
    const fullService = services.find((item) => item.id === service.id);
    if (!fullService) return false;

    const patch: Partial<Omit<ServiceListItem, "id">> = {
      technician: technician ? { id: technician.id, name: technician.name } : null,
    };

    if (technician && fullService.status === "received") {
      patch.status = "repairing" as ServiceListItem["status"];
    }

    optimisticPatch(fullService.id, patch);
    patchSelectedService(fullService.id, patch);

    const result = await assignTechnician(fullService.id, technician?.id ?? null);

    if (!result.success) {
      rollbackUpdate(fullService);
      patchSelectedService(fullService.id, fullService);
      toast.error(result.error || "Gagal mengubah teknisi");
      return false;
    }

    settleMutation();
    publish({ action: "assigned", serviceId: fullService.id, ...getServiceRealtimeMeta(fullService) });
    router.refresh();
    return true;
  }, [optimisticPatch, patchSelectedService, publish, rollbackUpdate, router, services, settleMutation]);

  const prevFilterRef = useRef(`${statusFilter ?? ""}|${pickedUpFilter}|${searchQuery}|${paymentStatusFilter}`);
  useEffect(() => {
    const nextFilterKey = `${statusFilter ?? ""}|${pickedUpFilter}|${searchQuery}|${paymentStatusFilter}`;
    if (prevFilterRef.current !== nextFilterKey) {
      prevFilterRef.current = nextFilterKey;
      setCurrentPage(1);
    }
  }, [statusFilter, pickedUpFilter, searchQuery, paymentStatusFilter]);

  const getPageTitle = () => {
    if (pickedUpFilter) return "Service Diambil";
    if (!statusFilter) return "Semua Service";
    if (statusFilter === "received") return "Service Masuk";
    if (statusFilter === "repairing") return "Service Proses";
    if (statusFilter === "done,failed" || statusFilter === "failed,done") return "Service Selesai & Gagal";
    return "Service";
  };

  const getEmptyMessage = () => {
    if (searchQuery.trim()) return "Tidak ada service yang cocok dengan pencarian";
    if (paymentStatusFilter !== "all") return "Tidak ada service yang cocok dengan filter pembayaran";
    if (pickedUpFilter) return "Tidak ada service yang sudah diambil";
    if (statusFilter === "done,failed" || statusFilter === "failed,done") {
      return "Tidak ada service selesai atau gagal yang belum diambil";
    }
    return `Tidak ada service${statusFilter ? ` dengan status ${statusFilter}` : ""}`;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid w-full gap-3 sm:max-w-xl sm:grid-cols-[minmax(0,1fr)_180px]">
          <div className="relative">
            <RiSearchLine className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Cari service..."
              className="pl-9"
            />
          </div>
          <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pembayaran" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua pembayaran</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="unpaid">Unpaid / DP</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() => { setEditData(null); setFormOpen(true); }}
          className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg shadow-primary/20 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30"
        >
          <RiAddLine className="h-4 w-4 mr-1.5" />
          New Service
        </Button>
      </div>

      <section>
        <Card className="border-border/50 shadow-lg py-0 shadow-black/5 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-black/10">
          <CardContent className="p-0">
            <ServiceTable
              services={tableServices}
              role="staff"
              headerTitle={getPageTitle()}
              headerDescription={`Halaman ${currentPage} dari ${totalPages || 1} (${filteredServices.length} dari ${services.length} total)`}
              headerBadge={filteredServices.length}
              statusFilter={statusFilter}
              emptyMessage={getEmptyMessage()}
              onEdit={statusFilter === "done,failed" || statusFilter === "failed,done" || pickedUpFilter ? undefined : handleEdit}
              onDelete={statusFilter === "done,failed" || statusFilter === "failed,done" || pickedUpFilter ? undefined : handleDelete}
              onRowClick={handleRowClick}
              tokoId={tokoId}
              hideTechnicianColumn={!technicianWorkflowEnabled}
              onAssignTech={technicianWorkflowEnabled ? handleAssignTech : undefined}
            />

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 px-6 py-4 border-t border-border/50 bg-muted/30">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          )}
          </CardContent>
        </Card>
      </section>

      <ServicesForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={handleCreateSuccess}
        editData={editData}
        tokoId={tokoId}
        onOptimisticCreate={handleOptimisticCreate}
        onOptimisticUpdate={handleOptimisticUpdate}
        onRevertCreate={handleRevertCreate}
        onRevertUpdate={handleRevertUpdate}
      />

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title="Delete Service"
        description={`Are you sure you want to delete service for ${deleteTarget?.customerName || "this customer"}?`}
        isLoading={isDeleting}
      />

      <Sheet open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-lg p-2 max-w-4xl mx-auto overflow-y-auto">
          <SheetHeader className="p-2">
            <SheetTitle className="font-bold">Detail servis</SheetTitle>
            <p className="text-sm text-muted-foreground">kelola pembayaran dan pengambilan</p>
          </SheetHeader>
          {isLoadingDetail && (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading service details...</p>
            </div>
          )}
          {!isLoadingDetail && selectedService && (
            <div className="p-2">
              <ServiceDetailCard
                service={selectedService}
                variant={["done", "failed"].includes(selectedService.status) ? "completed" : "active"}
                viewerRole="staff"
                showActions={false}
                onRefresh={handleRefreshDetail}
                onOptimisticStatusChange={handleOptimisticStatusChange}
                onOptimisticStatusSuccess={handleOptimisticStatusSuccess}
                onOptimisticStatusError={handleOptimisticStatusError}
                onStatusChange={() => {
                  setDetailDialogOpen(false);
                  router.refresh();
                }}
                onPickupSuccess={() => {
                  setDetailDialogOpen(false);
                  publish({ action: "picked_up", serviceId: selectedService.id, ...getServiceRealtimeMeta(selectedService) });
                  router.refresh();
                }}
                onRealtimeEvent={publish}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
