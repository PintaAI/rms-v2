"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { assignTechnician } from "@/actions";
import { Card, CardContent } from "@/components/ui/card";
import { ServiceTable } from "@/components/dashboard/services/service-table";
import type { ServiceTableItem } from "@/components/dashboard/services/service-table";
import type { TechnicianAssignmentOption } from "@/components/dashboard/services/service-table/technician-dropdown";
import {
  OverviewPeriodCard,
  OverviewSectionHeader,
  OverviewStatsCard,
} from "@/components/dashboard/shared/overview-cards";
import { TokoHeader } from "@/components/dashboard/shared/toko-header";
import { useDashboardScope } from "@/components/dashboard/layout/dashboard-scope-context";
import type { StaffOverviewData } from "@/actions/overview";
import {
  RiArchiveLine,
  RiCheckDoubleLine,
  RiInboxLine,
  RiMoneyDollarCircleLine,
  RiShoppingCartLine,
  RiStore2Line,
  RiToolsLine,
} from "@remixicon/react";
import { StaffOverviewActions } from "./staff-overview-actions";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface CurrentToko {
  id: string;
  name: string;
  logoUrl: string | null;
}

interface StaffOverviewProps {
  data: StaffOverviewData;
  tokoId: string;
  currentToko?: CurrentToko;
}

function mapRecentServiceToTableItem(service: StaffOverviewData["recentServices"][number]): ServiceTableItem {
  return {
    id: service.id,
    deviceModelId: service.deviceModel.id,
    customerName: service.customerName,
    noWa: service.noWa,
    complaint: service.complaint,
    handlingNote: null,
    note: null,
    status: service.status,
    checkinAt: service.checkinAt,
    doneAt: service.doneAt,
    warrantyUntil: service.warrantyUntil,
    checkoutAt: service.checkoutAt,
    deviceModel: service.deviceModel,
    technician: service.technician,
    invoice: service.invoice,
    createdBy: service.createdBy ?? undefined,
    passwordPattern: null,
    imei: null,
    isPickedUp: service.isPickedUp,
  };
}

export function StaffOverview({ data, tokoId, currentToko }: StaffOverviewProps) {
  const { stats, recentServices } = data;
  const router = useRouter();
  const { featureAccess, permissionAccess } = useDashboardScope();
  const canViewService = permissionAccess["service.view"]?.allowed === true;
  const canViewRetail = permissionAccess["retail.view"]?.allowed === true && featureAccess["retail.sales"] === true;
  const technicianAssignmentEnabled = featureAccess["service.technicianAssignment"] ?? false;

  const [tableServices, setTableServices] = useState<ServiceTableItem[]>(() => recentServices.map(mapRecentServiceToTableItem));

  const handleAssignTech = useCallback(async (
    service: ServiceTableItem,
    technician: TechnicianAssignmentOption | null
  ) => {
    const previousService = tableServices.find((item) => item.id === service.id);
    if (!previousService) return false;

    const patch: Partial<ServiceTableItem> = {
      technician: technician ? { id: technician.id, name: technician.name } : null,
    };

    if (technician && previousService.status === "received") {
      patch.status = "repairing";
    }

    setTableServices((current) => current.map((item) => (
      item.id === service.id ? { ...item, ...patch } : item
    )));

    const result = await assignTechnician(service.id, technician?.id ?? null);

    if (!result.success) {
      setTableServices((current) => current.map((item) => (
        item.id === previousService.id ? previousService : item
      )));
      toast.error(result.error || "Gagal mengubah teknisi");
      return false;
    }

    router.refresh();
    return true;
  }, [router, tableServices]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-start sm:justify-between">
        <TokoHeader role="Staff" tokoName={currentToko?.name} tokoLogoUrl={currentToko?.logoUrl} />

        {canViewService && <StaffOverviewActions tokoId={tokoId} />}
      </div>

      {canViewService ? (
        <>
          <section className="space-y-4">
            <OverviewSectionHeader title="Status Service" colorClass="bg-primary" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <OverviewStatsCard
                title="Total Service"
                value={stats.services.total}
                icon={<RiInboxLine className="h-4 w-4" />}
                description={`${stats.services.daily} masuk hari ini`}
                variant="primary"
              />
              <OverviewStatsCard
                title="Sedang Diperbaiki"
                value={stats.services.repairing}
                icon={<RiToolsLine className="h-4 w-4" />}
                variant="accent"
              />
              <OverviewStatsCard
                title="Selesai"
                value={stats.services.done}
                icon={<RiCheckDoubleLine className="h-4 w-4" />}
                variant="success"
              />
              <OverviewStatsCard
                title="Low Stock Items"
                value={stats.inventory.lowStockCount}
                icon={<RiArchiveLine className="h-4 w-4" />}
                variant={stats.inventory.lowStockCount > 0 ? "warning" : "default"}
              />
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <OverviewPeriodCard label="Hari Ini" value={stats.services.daily} sub="service masuk" />
            <OverviewPeriodCard label="7 Hari" value={stats.services.weekly} sub="service masuk" />
          </section>

          <section>
            <Card className="overflow-hidden border-border/50 py-0 shadow-lg shadow-black/5 transition-all duration-300 hover:shadow-xl hover:shadow-black/10">
              <CardContent className="p-0">
                <ServiceTable
                  services={tableServices}
                  role="staff"
                  headerTitle="Service Terbaru"
                  headerDescription="Service terbaru yang masuk ke toko"
                  headerBadge={tableServices.length}
                  emptyMessage="Tidak ada service"
                  tokoId={tokoId}
                  hideTechnicianColumn={!technicianAssignmentEnabled}
                  onAssignTech={technicianAssignmentEnabled ? handleAssignTech : undefined}
                />
              </CardContent>
            </Card>
          </section>
        </>
      ) : canViewRetail ? (
        <>
          <section className="space-y-4">
            <OverviewSectionHeader title="Overview Retail" colorClass="bg-primary" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <OverviewStatsCard
                title="Barang Retail"
                value={stats.retail.itemCount}
                icon={<RiStore2Line className="h-4 w-4" />}
                description="item tersedia untuk kasir"
                variant="primary"
              />
              <OverviewStatsCard
                title="Low Stock Retail"
                value={stats.retail.lowStockCount}
                icon={<RiArchiveLine className="h-4 w-4" />}
                variant={stats.retail.lowStockCount > 0 ? "warning" : "default"}
              />
              {stats.retail.canViewHistory && (
                <>
                  <OverviewStatsCard
                    title="Transaksi Hari Ini"
                    value={stats.retail.dailySales}
                    icon={<RiShoppingCartLine className="h-4 w-4" />}
                    description={formatCurrency(stats.retail.dailyRevenue)}
                    variant="accent"
                  />
                  <OverviewStatsCard
                    title="Revenue 7 Hari"
                    value={formatCurrency(stats.retail.weeklyRevenue)}
                    icon={<RiMoneyDollarCircleLine className="h-4 w-4" />}
                    description={`${stats.retail.weeklySales} transaksi`}
                    variant="success"
                  />
                </>
              )}
            </div>
          </section>

          {stats.retail.canViewHistory && (
            <section className="grid gap-4 md:grid-cols-2">
              <OverviewPeriodCard label="Hari Ini" value={stats.retail.dailySales} sub="transaksi retail" />
              <OverviewPeriodCard label="7 Hari" value={stats.retail.weeklySales} sub="transaksi retail" />
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}
