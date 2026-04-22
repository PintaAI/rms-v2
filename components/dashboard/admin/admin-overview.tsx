import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceTable } from "@/components/dashboard/services/service-table";
import {
  OverviewPeriodCard,
  OverviewSectionHeader,
  OverviewStatsCard,
} from "@/components/dashboard/shared/overview-cards";
import type { AdminOverviewData } from "@/actions/overview";
import {
  RiArchiveLine,
  RiCalendarCheckLine,
  RiCheckDoubleLine,
  RiCloseLine,
  RiInboxLine,
  RiMoneyDollarCircleLine,
  RiStore2Line,
  RiTimeLine,
  RiToolsLine,
} from "@remixicon/react";
import { ActivityLog } from "./activity-log";
import { AdminOverviewActions } from "./admin-overview-actions";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

interface CurrentToko {
  id: string;
  name: string;
  logoUrl: string | null;
}

interface AdminOverviewProps {
  data: AdminOverviewData;
  tokoId: string;
  currentToko?: CurrentToko;
}

export function AdminOverview({ data, tokoId, currentToko }: AdminOverviewProps) {
  const { stats, recentServices, recentActivities } = data;

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
            <h1 data-tour="overview-title" className="text-3xl font-black tracking-tight">
              Admin Overview
            </h1>
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

        <AdminOverviewActions tokoId={tokoId} />
      </div>

      <section data-tour="stats-services" className="space-y-4">
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
            title="Gagal"
            value={stats.services.failed}
            icon={<RiCloseLine className="h-4 w-4" />}
            variant={stats.services.failed > 0 ? "warning" : "default"}
          />
        </div>
      </section>

      <section data-tour="stats-revenue" className="space-y-4">
        <OverviewSectionHeader title="Pendapatan" colorClass="bg-chart-1" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <OverviewStatsCard
            title="Pendapatan Total"
            value={formatCurrency(stats.revenue.totalPaid)}
            icon={<RiMoneyDollarCircleLine className="h-4 w-4" />}
            variant="success"
          />
          <OverviewStatsCard
            title="Pendapatan Pending"
            value={formatCurrency(stats.revenue.totalPending)}
            icon={<RiTimeLine className="h-4 w-4" />}
            variant={stats.revenue.totalPending > 0 ? "warning" : "default"}
          />
          <OverviewStatsCard
            title="Pendapatan Hari Ini"
            value={formatCurrency(stats.revenue.dailyRevenue)}
            icon={<RiCalendarCheckLine className="h-4 w-4" />}
            variant="primary"
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
        <Card
          data-tour="service-table"
          className="overflow-hidden border-border/50 py-0 shadow-lg shadow-black/5 transition-all duration-300 hover:shadow-xl hover:shadow-black/10"
        >
          <CardHeader className="border-b border-border/50 bg-muted/30 pt-4">
            <div className="flex items-center gap-3">
              <div className="h-5 w-1 rounded-full bg-primary" />
              <CardTitle className="text-lg font-bold">Service Terbaru</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ServiceTable
              services={tableServices}
              preset="adminActive"
              emptyMessage="Tidak ada service"
              tokoId={tokoId}
              disableAssignment={true}
            />
          </CardContent>
        </Card>
      </section>

      <section>
        <ActivityLog activities={recentActivities} />
      </section>
    </div>
  );
}