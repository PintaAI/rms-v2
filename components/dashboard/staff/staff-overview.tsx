"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { ServiceTable } from "@/components/dashboard/services/service-table";
import {
  OverviewPeriodCard,
  OverviewSectionHeader,
  OverviewStatsCard,
} from "@/components/dashboard/shared/overview-cards";
import { useDashboardScope } from "@/components/dashboard/layout/dashboard-scope-context";
import type { StaffOverviewData } from "@/actions/overview";
import {
  RiArchiveLine,
  RiCheckDoubleLine,
  RiInboxLine,
  RiStore2Line,
  RiToolsLine,
} from "@remixicon/react";
import { StaffOverviewActions } from "./staff-overview-actions";

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

export function StaffOverview({ data, tokoId, currentToko }: StaffOverviewProps) {
  const { stats, recentServices } = data;
  const { featureAccess } = useDashboardScope();
  const technicianWorkflowEnabled = featureAccess["technician.workflow"] ?? false;

  const tableServices = recentServices.map((service) => ({
    id: service.id,
    hpCatalogId: service.hpCatalog.id,
    customerName: service.customerName,
    noWa: service.noWa,
    complaint: service.complaint,
    note: null,
    status: service.status,
    checkinAt: service.checkinAt,
    doneAt: service.doneAt,
    checkoutAt: service.checkoutAt,
    hpCatalog: service.hpCatalog,
    technician: service.technician,
    invoice: service.invoice,
    createdBy: undefined,
    passwordPattern: null,
    imei: null,
    isPickedUp: service.isPickedUp,
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight">Staff Overview</h1>
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
              <span className="text-sm font-medium text-muted-foreground">
                {currentToko?.name || "Toko"}
              </span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground/70">Ringkasan aktivitas toko secara real-time</p>
        </div>

        <StaffOverviewActions tokoId={tokoId} />
      </div>

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
              hideTechnicianColumn={!technicianWorkflowEnabled}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
