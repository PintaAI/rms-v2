"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ServiceTable } from "@/components/dashboard/services/service-table";
import { ServicesForm } from "@/components/dashboard/services/services-form";
import { ServiceDetailCard, ServiceDetailCardSkeleton } from "@/components/dashboard/services/service-detail-card";
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
import { RiAddLine, RiCalendarLine, RiCloseLine, RiFilter3Line, RiSearchLine } from "@remixicon/react";
import { toast } from "sonner";

interface StaffManageServiceProps {
  allServices: ServiceListItem[];
  tokoId: string;
  pageSize: number;
  initialSearchQuery?: string;
}

function isSameDate(value: Date | string | null | undefined, date: Date | null): boolean {
  if (!date) return true;
  if (!value) return false;

  const valueDate = new Date(value);
  return valueDate.getFullYear() === date.getFullYear()
    && valueDate.getMonth() === date.getMonth()
    && valueDate.getDate() === date.getDate();
}

function formatFilterDate(date: Date | null): string {
  if (!date) return "Pilih tanggal";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
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
  const technicianAssignmentEnabled = featureAccess["service.technicianAssignment"] ?? false;

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
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [createdByFilter, setCreatedByFilter] = useState("all");
  const [technicianFilter, setTechnicianFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [checkinDateFilter, setCheckinDateFilter] = useState<Date | null>(null);
  const [checkoutDateFilter, setCheckoutDateFilter] = useState<Date | null>(null);
  const statusSnapshotsRef = useRef(new Map<string, ServiceListItem>());
  const pendingPatchesRef = useRef(new Map<string, Partial<Omit<ServiceListItem, "id">>>());

  useEffect(() => {
    hydrateServices(tokoId, allServices);
  }, [allServices, hydrateServices, tokoId]);

  const createdByOptions = useMemo(() => {
    const options = new Map<string, string>();
    for (const service of services) {
      if (service.createdBy?.name) {
        options.set(service.createdBy.name, service.createdBy.name);
      }
    }

    return Array.from(options, ([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [services]);

  const technicianOptions = useMemo(() => {
    const options = new Map<string, string>();
    for (const service of services) {
      if (service.technician?.name) {
        options.set(service.technician.name, service.technician.name);
      }
    }

    return Array.from(options, ([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [services]);

  const servicesFilteredWithoutSearch = useMemo(() => {
    const statusFilteredServices = (() => {
      if (pickedUpFilter) {
        return services.filter((s) => s.isPickedUp);
      }
      if (!statusFilter) return services;
      const filterStatuses = statusFilter.split(",");
      return services.filter((s) => filterStatuses.includes(s.status) && !s.isPickedUp);
    })();

    return statusFilteredServices.filter((service) => {
      if (createdByFilter !== "all" && service.createdBy?.name !== createdByFilter) return false;
      if (technicianAssignmentEnabled && technicianFilter !== "all" && service.technician?.name !== technicianFilter) return false;
      if (!matchesPaymentStatus(service, paymentStatusFilter)) return false;
      if (!isSameDate(service.checkinAt, checkinDateFilter)) return false;
      if (!isSameDate(service.checkoutAt, checkoutDateFilter)) return false;
      return true;
    });
  }, [services, statusFilter, pickedUpFilter, createdByFilter, technicianFilter, paymentStatusFilter, checkinDateFilter, checkoutDateFilter, technicianAssignmentEnabled]);

  const filteredServices = useMemo(() => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return servicesFilteredWithoutSearch;

    return servicesFilteredWithoutSearch
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
  }, [servicesFilteredWithoutSearch, searchQuery]);

  const hasAdvancedFilters = createdByFilter !== "all"
    || (technicianAssignmentEnabled && technicianFilter !== "all")
    || paymentStatusFilter !== "all"
    || checkinDateFilter !== null
    || checkoutDateFilter !== null;

  const activeFilterCount = [
    createdByFilter !== "all",
    technicianAssignmentEnabled && technicianFilter !== "all",
    paymentStatusFilter !== "all",
    checkinDateFilter !== null,
    checkoutDateFilter !== null,
  ].filter(Boolean).length;

  const resetAdvancedFilters = useCallback(() => {
    setCreatedByFilter("all");
    setTechnicianFilter("all");
    setPaymentStatusFilter("all");
    setCheckinDateFilter(null);
    setCheckoutDateFilter(null);
  }, []);

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

  const prevFilterRef = useRef(`${statusFilter ?? ""}|${pickedUpFilter}`);
  useEffect(() => {
    const nextFilterKey = `${statusFilter ?? ""}|${pickedUpFilter}|${searchQuery}|${createdByFilter}|${technicianFilter}|${paymentStatusFilter}|${checkinDateFilter?.toISOString() ?? ""}|${checkoutDateFilter?.toISOString() ?? ""}`;
    if (prevFilterRef.current !== nextFilterKey) {
      prevFilterRef.current = nextFilterKey;
      setCurrentPage(1);
    }
  }, [statusFilter, pickedUpFilter, searchQuery, createdByFilter, technicianFilter, paymentStatusFilter, checkinDateFilter, checkoutDateFilter]);

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
    if (hasAdvancedFilters) return "Tidak ada service yang cocok dengan filter";
    if (pickedUpFilter) return "Tidak ada service yang sudah diambil";
    if (statusFilter === "done,failed" || statusFilter === "failed,done") {
      return "Tidak ada service selesai atau gagal yang belum diambil";
    }
    return `Tidak ada service${statusFilter ? ` dengan status ${statusFilter}` : ""}`;
  };

  const renderAdvancedFilters = () => (
    <>
      <Select value={createdByFilter} onValueChange={setCreatedByFilter}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Created by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua pembuat</SelectItem>
          {createdByOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {technicianAssignmentEnabled && (
        <Select value={technicianFilter} onValueChange={setTechnicianFilter}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Teknisi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua teknisi</SelectItem>
            {technicianOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

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

      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="justify-start gap-2 font-normal">
            <RiCalendarLine className="size-4 text-muted-foreground" />
            <span className="truncate">Checkin: {formatFilterDate(checkinDateFilter)}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={checkinDateFilter ?? undefined}
            onSelect={(date) => setCheckinDateFilter(date ?? null)}
          />
          {checkinDateFilter && (
            <div className="border-t border-border/50 p-2">
              <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => setCheckinDateFilter(null)}>
                Hapus tanggal checkin
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="justify-start gap-2 font-normal">
            <RiCalendarLine className="size-4 text-muted-foreground" />
            <span className="truncate">Checkout: {formatFilterDate(checkoutDateFilter)}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={checkoutDateFilter ?? undefined}
            onSelect={(date) => setCheckoutDateFilter(date ?? null)}
          />
          {checkoutDateFilter && (
            <div className="border-t border-border/50 p-2">
              <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => setCheckoutDateFilter(null)}>
                Hapus tanggal checkout
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </>
  );

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-border/60 bg-card/70 p-3 shadow-sm md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="grid w-full gap-3 md:grid-cols-2 lg:max-w-6xl lg:grid-cols-6">
            <div className="relative md:col-span-2 lg:col-span-1">
              <RiSearchLine className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Cari service..."
                className="pl-9"
              />
            </div>
            <div className="hidden md:contents">
              {renderAdvancedFilters()}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 md:flex md:shrink-0">
            <Button type="button" variant="outline" className="md:hidden" onClick={() => setFilterSheetOpen(true)}>
              <RiFilter3Line className="h-4 w-4 mr-1.5" />
              Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </Button>
            {hasAdvancedFilters && (
              <Button type="button" variant="outline" className="hidden md:inline-flex" onClick={resetAdvancedFilters}>
                <RiCloseLine className="h-4 w-4 mr-1.5" />
                Reset Filter
              </Button>
            )}
            <Button
              onClick={() => { setEditData(null); setFormOpen(true); }}
              className="bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/20 transition-all duration-200 hover:from-primary/90 hover:to-primary/80 hover:shadow-xl hover:shadow-primary/30"
            >
              <RiAddLine className="h-4 w-4 mr-1.5" />
              New Service
            </Button>
          </div>
        </div>
      </div>

      <Drawer open={filterSheetOpen} onOpenChange={setFilterSheetOpen} direction="bottom">
        <DrawerContent className="max-h-[90dvh] overflow-hidden p-0 before:inset-0 before:rounded-t-2xl md:hidden">
          <div className="shrink-0 border-b bg-popover px-4 pb-4 pt-3">
            <DrawerTitle className="font-bold">Filter service</DrawerTitle>
            <DrawerDescription>Filter daftar service staff.</DrawerDescription>
          </div>
          <div className="p-4">
            <div className="grid gap-3">
              {renderAdvancedFilters()}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={resetAdvancedFilters} disabled={!hasAdvancedFilters}>
                <RiCloseLine className="h-4 w-4 mr-1.5" />
                Reset
              </Button>
              <Button type="button" onClick={() => setFilterSheetOpen(false)}>
                Terapkan
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <section>
        <Card className="border-border/50 shadow-lg py-0 shadow-black/5 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-black/10">
          <CardContent className="p-0">
            <ServiceTable
              services={tableServices}
              role="staff"
              headerTitle={getPageTitle()}
              headerDescription={`Halaman ${currentPage} dari ${totalPages || 1} (${filteredServices.length} dari ${servicesFilteredWithoutSearch.length} ditampilkan)`}
              headerBadge={filteredServices.length}
              statusFilter={statusFilter}
              emptyMessage={getEmptyMessage()}
              onEdit={statusFilter === "done,failed" || statusFilter === "failed,done" || pickedUpFilter ? undefined : handleEdit}
              onDelete={statusFilter === "done,failed" || statusFilter === "failed,done" || pickedUpFilter ? undefined : handleDelete}
              onRowClick={handleRowClick}
              tokoId={tokoId}
              hideTechnicianColumn={!technicianAssignmentEnabled}
              onAssignTech={technicianAssignmentEnabled ? handleAssignTech : undefined}
            />

            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-2 border-t border-border/50 bg-muted/30 px-4 py-4 sm:px-6">
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

      <Drawer open={detailDialogOpen} onOpenChange={setDetailDialogOpen} direction="bottom">
        <DrawerContent className="mx-auto h-dvh max-h-dvh w-full min-w-0 max-w-4xl overflow-hidden p-0 before:inset-0 before:rounded-t-xl before:rounded-b-none data-[vaul-drawer-direction=bottom]:h-dvh data-[vaul-drawer-direction=bottom]:max-h-dvh sm:h-[90dvh] sm:max-h-[90dvh] sm:data-[vaul-drawer-direction=bottom]:h-[90dvh] sm:data-[vaul-drawer-direction=bottom]:max-h-[90dvh]">
          <div className="shrink-0 border-b bg-popover px-4 pb-4 pt-3">
            <DrawerTitle className="font-bold">Detail servis</DrawerTitle>
            <DrawerDescription>kelola pembayaran dan pengambilan</DrawerDescription>
          </div>
          <ScrollArea className="h-[calc(100dvh-4.75rem)] min-w-0 overflow-hidden sm:h-[calc(90dvh-4.75rem)]">
            <div className="min-w-0 p-2">
              {isLoadingDetail && (
                <ServiceDetailCardSkeleton />
              )}
              {!isLoadingDetail && selectedService && (
                <ServiceDetailCard
                  service={selectedService}
                  variant={["done", "failed"].includes(selectedService.status) ? "completed" : "active"}
                  viewerRole="staff"
                  showActions={false}
                  showRepairItemActions
                  showCompletionActions
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
              )}
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
