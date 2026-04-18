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
import { ServicesForm } from "@/components/dashboard/services-form";
import { ServiceTaskCard } from "@/components/dashboard/service-task-card";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { deleteService, getService } from "@/actions";
import type { ServiceListItem, ServiceDetail } from "@/actions";
import type { ServiceTableItem } from "@/components/dashboard/service-table/types";
import {
  RiInboxLine,
  RiToolsLine,
  RiCheckLine,
  RiLogoutBoxLine,
  RiCloseLine,
  RiAddLine,
} from "@remixicon/react";

interface ServiceStats {
  received: number;
  repairing: number;
  done: number;
  picked_up: number;
  failed: number;
  total: number;
}

interface ManageServiceProps {
  allServices: ServiceListItem[];
  initialStats: ServiceStats;
  tokoId: string;
  pageSize: number;
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

export function ManageService({
  allServices,
  initialStats,
  tokoId,
  pageSize,
}: ManageServiceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status");

  const [services, setServices] = useState<ServiceListItem[]>(allServices);
  const [stats, setStats] = useState<ServiceStats>(initialStats);
  const [currentPage, setCurrentPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState<ServiceListItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ServiceListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const pendingMutationsRef = useRef(0);

  useEffect(() => {
    if (pendingMutationsRef.current === 0) {
      setServices(allServices);
      setStats(initialStats);
      setCurrentPage(1);
    }
  }, [allServices, initialStats]);

  const filteredServices = useMemo(() => {
    if (!statusFilter) return services;
    const filterStatuses = statusFilter.split(",");
    return services.filter((s) => filterStatuses.includes(s.status));
  }, [services, statusFilter]);

  const paginatedServices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredServices.slice(start, start + pageSize);
  }, [filteredServices, currentPage, pageSize]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredServices.length / pageSize);
  }, [filteredServices.length, pageSize]);

  const tableServices: ServiceTableItem[] = paginatedServices.map((s) => ({
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

  const incrementStat = useCallback((status: string) => {
    setStats((prev) => {
      const newStats = { ...prev, total: prev.total + 1 };
      if (status === "received") newStats.received = prev.received + 1;
      else if (status === "repairing") newStats.repairing = prev.repairing + 1;
      else if (status === "done") newStats.done = prev.done + 1;
      else if (status === "picked_up") newStats.picked_up = prev.picked_up + 1;
      else if (status === "failed") newStats.failed = prev.failed + 1;
      return newStats;
    });
  }, []);

  const decrementStat = useCallback((status: string) => {
    setStats((prev) => {
      const newStats = { ...prev, total: prev.total - 1 };
      if (status === "received") newStats.received = prev.received - 1;
      else if (status === "repairing") newStats.repairing = prev.repairing - 1;
      else if (status === "done") newStats.done = prev.done - 1;
      else if (status === "picked_up") newStats.picked_up = prev.picked_up - 1;
      else if (status === "failed") newStats.failed = prev.failed - 1;
      return newStats;
    });
  }, []);

  const matchesFilter = useCallback((service: ServiceListItem) => {
    if (!statusFilter) return true;
    const filterStatuses = statusFilter.split(",");
    return filterStatuses.includes(service.status);
  }, [statusFilter]);

  const handleOptimisticCreate = useCallback((tempService: ServiceListItem) => {
    pendingMutationsRef.current++;
    incrementStat(tempService.status);
    setServices((prev) => [tempService, ...prev]);
  }, [incrementStat]);

  const handleRevertCreate = useCallback((tempId: string) => {
    pendingMutationsRef.current--;
    setServices((prev) => {
      const tempService = prev.find((s) => s.id === tempId);
      if (tempService) {
        decrementStat(tempService.status);
      }
      return prev.filter((s) => s.id !== tempId);
    });
  }, [decrementStat]);

  const handleOptimisticUpdate = useCallback((updatedService: ServiceListItem) => {
    pendingMutationsRef.current++;
    setServices((prev) => {
      const oldService = prev.find((s) => s.id === updatedService.id);
      if (oldService && oldService.status !== updatedService.status) {
        decrementStat(oldService.status);
        incrementStat(updatedService.status);
      }
      return prev.map((s) => (s.id === updatedService.id ? updatedService : s));
    });
  }, [incrementStat, decrementStat]);

  const handleRevertUpdate = useCallback((originalService: ServiceListItem) => {
    pendingMutationsRef.current--;
    setServices((prev) => {
      const currentService = prev.find((s) => s.id === originalService.id);
      if (currentService && currentService.status !== originalService.status) {
        decrementStat(currentService.status);
        incrementStat(originalService.status);
      }
      return prev.map((s) => (s.id === originalService.id ? originalService : s));
    });
  }, [incrementStat, decrementStat]);

  const handleCreateSuccess = useCallback(() => {
    pendingMutationsRef.current--;
    router.refresh();
  }, [router]);

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
    const deletedStatus = deletedService.status;
    const tempId = deletedService.id;

    decrementStat(deletedStatus);
    setServices((prev) => prev.filter((s) => s.id !== tempId));

    setDeleteDialogOpen(false);
    setDeleteTarget(null);

    const result = await deleteService(tempId);

    if (!result.success) {
      incrementStat(deletedStatus);
      setServices((prev) => {
        const restored = [...prev, deletedService].sort(
          (a, b) => new Date(b.checkinAt).getTime() - new Date(a.checkinAt).getTime()
        );
        return restored;
      });
    }

    setIsDeleting(false);
    router.refresh();
  }, [deleteTarget, decrementStat, incrementStat, router]);

  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
  }, []);

  const handleAssignTech = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleRowClick = useCallback(async (service: ServiceTableItem) => {
    setIsLoadingDetail(true);
    setDetailDialogOpen(true);
    
    const result = await getService(service.id);
    if (result.success && result.data) {
      setSelectedService(result.data);
    }
    setIsLoadingDetail(false);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailDialogOpen(false);
    setSelectedService(null);
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

  // Reset to page 1 when filter changes
  const prevStatusFilterRef = useRef(statusFilter);
  useEffect(() => {
    if (prevStatusFilterRef.current !== statusFilter) {
      prevStatusFilterRef.current = statusFilter;
      setCurrentPage(1);
    }
  }, [statusFilter]);

  const getPageTitle = () => {
    if (!statusFilter) return "Semua Service";
    if (statusFilter === "received") return "Service Masuk";
    if (statusFilter === "repairing") return "Service Proses";
    if (statusFilter === "done,picked_up") return "Service Selesai";
    return "Service";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{getPageTitle()}</h1>
          <p className="text-sm text-muted-foreground">
            Halaman {currentPage} dari {totalPages || 1} ({filteredServices.length} dari {services.length} total)
          </p>
        </div>
        <Button onClick={() => { setEditData(null); setFormOpen(true); }}>
          <RiAddLine className="h-4 w-4 mr-1" />
          New Service
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <StatsCard
          title="Masuk"
          value={stats.received}
          icon={<RiInboxLine className="h-3 w-3" />}
        />
        <StatsCard
          title="Proses"
          value={stats.repairing}
          icon={<RiToolsLine className="h-3 w-3" />}
        />
        <StatsCard
          title="Selesai"
          value={stats.done}
          icon={<RiCheckLine className="h-3 w-3" />}
          variant="success"
        />
        <StatsCard
          title="Diambil"
          value={stats.picked_up}
          icon={<RiLogoutBoxLine className="h-3 w-3" />}
        />
        <StatsCard
          title="Gagal"
          value={stats.failed}
          icon={<RiCloseLine className="h-3 w-3" />}
          variant={stats.failed > 0 ? "warning" : "default"}
        />
        <StatsCard
          title="Total"
          value={stats.total}
          icon={<RiInboxLine className="h-3 w-3" />}
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <ServiceTable
            services={tableServices}
            preset="adminActive"
            emptyMessage={`Tidak ada service${statusFilter ? ` dengan status ${statusFilter}` : ""}`}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAssignTech={handleAssignTech}
            onRowClick={handleRowClick}
            tokoId={tokoId}
          />

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t">
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
          <SheetHeader className="p-2 flex items-center justify-between">
            <SheetTitle className="font-bold" >Detail servis</SheetTitle>
            <p className="text-sm text-muted-foreground">tambahkan detail servis</p>
          </SheetHeader>
          {isLoadingDetail && (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading service details...</p>
            </div>
          )}
          {!isLoadingDetail && selectedService && (
            <ServiceTaskCard
              task={selectedService as any}
              variant={["done", "picked_up", "failed"].includes(selectedService.status) ? "completed" : "active"}
              onRefresh={handleRefreshDetail}
              onStatusChange={(newStatus) => {
                router.refresh();
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}