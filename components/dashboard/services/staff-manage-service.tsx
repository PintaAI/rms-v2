"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OverviewStatsCard } from "@/components/dashboard/shared/overview-cards";
import { ServiceTable } from "@/components/dashboard/services/service-table";
import { ServicesForm } from "@/components/dashboard/services/services-form";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { deleteService, payInvoice, pickupService } from "@/actions";
import type { ServiceListItem } from "@/actions";
import type { ServiceTableItem } from "@/components/dashboard/services/service-table/types";
import {
  RiInboxLine,
  RiToolsLine,
  RiCheckLine,
  RiLogoutBoxLine,
  RiAddLine,
} from "@remixicon/react";

interface ServiceStats {
  received: number;
  repairing: number;
  done: number;
  pickedUp: number;
  failed: number;
  history: number;
  total: number;
}

interface StaffManageServiceProps {
  allServices: ServiceListItem[];
  initialStats: ServiceStats;
  tokoId: string;
  pageSize: number;
}

export function StaffManageService({
  allServices,
  initialStats,
  tokoId,
  pageSize,
}: StaffManageServiceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") ?? undefined;
  const pickedUpFilter = searchParams.get("pickedup") === "true";

  const [services, setServices] = useState<ServiceListItem[]>(allServices);
  const [stats, setStats] = useState<ServiceStats>(initialStats);
  const [currentPage, setCurrentPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState<ServiceListItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ServiceListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const pendingMutationsRef = useRef(0);

  useEffect(() => {
    if (pendingMutationsRef.current === 0) {
      setServices(allServices);
      setStats(initialStats);
      setCurrentPage(1);
    }
  }, [allServices, initialStats]);

  const filteredServices = useMemo(() => {
    if (pickedUpFilter) {
      return services.filter((s) => s.isPickedUp);
    }
    if (!statusFilter) return services;
    const filterStatuses = statusFilter.split(",");
    return services.filter((s) => filterStatuses.includes(s.status) && !s.isPickedUp);
  }, [services, statusFilter, pickedUpFilter]);

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

  const incrementStat = useCallback((status: string) => {
    setStats((prev) => {
      const newStats = { ...prev, total: prev.total + 1 };
      if (status === "received") newStats.received = prev.received + 1;
      else if (status === "repairing") newStats.repairing = prev.repairing + 1;
      else if (status === "done") newStats.done = prev.done + 1;
      else if (status === "pickedUp") newStats.pickedUp = prev.pickedUp + 1;
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
      else if (status === "pickedUp") newStats.pickedUp = prev.pickedUp - 1;
      else if (status === "failed") newStats.failed = prev.failed - 1;
      return newStats;
    });
  }, []);

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

  const handleMarkPaid = useCallback(async (invoiceId: string, serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    if (!service || !service.invoice) return;

    setServices((prev) =>
      prev.map((s) =>
        s.id === serviceId && s.invoice
          ? { ...s, invoice: { ...s.invoice, paymentStatus: "paid" } }
          : s
      )
    );

    const result = await payInvoice(invoiceId);
    if (!result.success) {
      setServices((prev) =>
        prev.map((s) =>
          s.id === serviceId && s.invoice
            ? { ...s, invoice: { ...s.invoice, paymentStatus: "unpaid" } }
            : s
        )
      );
    }
    router.refresh();
  }, [services, router]);

  const handlePickup = useCallback(async (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return;

    decrementStat(service.status);
    incrementStat("pickedUp");
    setServices((prev) =>
      prev.map((s) =>
        s.id === serviceId
          ? { ...s, isPickedUp: true, checkoutAt: new Date() }
          : s
      )
    );

    const result = await pickupService(serviceId);
    if (!result.success) {
      incrementStat(service.status);
      decrementStat("pickedUp");
      setServices((prev) =>
        prev.map((s) =>
          s.id === serviceId
            ? { ...s, isPickedUp: service.isPickedUp, checkoutAt: service.checkoutAt }
            : s
        )
      );
    }
    router.refresh();
  }, [services, decrementStat, incrementStat, router]);

  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
  }, []);

  const prevFilterRef = useRef(`${statusFilter ?? ""}|${pickedUpFilter}`);
  useEffect(() => {
    const nextFilterKey = `${statusFilter ?? ""}|${pickedUpFilter}`;
    if (prevFilterRef.current !== nextFilterKey) {
      prevFilterRef.current = nextFilterKey;
      setCurrentPage(1);
    }
  }, [statusFilter, pickedUpFilter]);

  const getPageTitle = () => {
    if (pickedUpFilter) return "Service Diambil";
    if (!statusFilter) return "Semua Service";
    if (statusFilter === "received") return "Service Masuk";
    if (statusFilter === "repairing") return "Service Proses";
    if (statusFilter === "done,failed" || statusFilter === "failed,done") return "Service Selesai & Gagal";
    return "Service";
  };

  const getEmptyMessage = () => {
    if (pickedUpFilter) return "Tidak ada service yang sudah diambil";
    if (statusFilter === "done,failed" || statusFilter === "failed,done") {
      return "Tidak ada service selesai atau gagal yang belum diambil";
    }
    return `Tidak ada service${statusFilter ? ` dengan status ${statusFilter}` : ""}`;
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-5 w-1 bg-primary rounded-full" />
          <div>
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{getPageTitle()}</h2>
            <p className="text-sm text-muted-foreground/70">
            Halaman {currentPage} dari {totalPages || 1} ({filteredServices.length} dari {services.length} total)
            </p>
          </div>
        </div>
        <Button
          onClick={() => { setEditData(null); setFormOpen(true); }}
          className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg shadow-primary/20 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30"
        >
          <RiAddLine className="h-4 w-4 mr-1.5" />
          New Service
        </Button>
      </div>

      <section className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <OverviewStatsCard
          title="Masuk"
          value={stats.received}
          icon={<RiInboxLine className="h-4 w-4" />}
          description="menunggu teknisi"
          variant="primary"
        />
        <OverviewStatsCard
          title="Proses"
          value={stats.repairing}
          icon={<RiToolsLine className="h-4 w-4" />}
          description="sedang diperbaiki"
          variant="accent"
        />
        <OverviewStatsCard
          title="Selesai & Gagal"
          value={stats.done + stats.failed}
          icon={<RiCheckLine className="h-4 w-4" />}
          description={`${stats.done} selesai, ${stats.failed} gagal`}
          variant={stats.failed > 0 ? "warning" : "success"}
        />
        <OverviewStatsCard
          title="Diambil"
          value={stats.pickedUp}
          icon={<RiLogoutBoxLine className="h-4 w-4" />}
          description="sudah selesai"
        />
        <OverviewStatsCard
          title="Total"
          value={stats.total}
          icon={<RiInboxLine className="h-4 w-4" />}
          description="semua service"
        />
        </div>
      </section>

      <section>
        <Card className="border-border/50 shadow-lg py-0 shadow-black/5 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-black/10">
          <CardHeader className="border-b pt-4 border-border/50 bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="h-5 w-1 bg-primary rounded-full" />
              <CardTitle className="text-lg font-bold">Daftar Service</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
          <ServiceTable
            services={tableServices}
            preset="staffActive"
            statusFilter={statusFilter}
            pickedUpFilter={pickedUpFilter}
            emptyMessage={getEmptyMessage()}
            onEdit={statusFilter === "done,failed" || statusFilter === "failed,done" || pickedUpFilter ? undefined : handleEdit}
            onDelete={statusFilter === "done,failed" || statusFilter === "failed,done" || pickedUpFilter ? undefined : handleDelete}
            onMarkPaid={!statusFilter ? undefined : handleMarkPaid}
            onPickup={!pickedUpFilter && statusFilter ? handlePickup : undefined}
              onCall={undefined}
              tokoId={tokoId}
              disableAssignment={true}
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
    </div>
  );
}
