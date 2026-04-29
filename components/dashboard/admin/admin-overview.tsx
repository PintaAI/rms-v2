import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { ServiceTable } from "@/components/dashboard/services/service-table";
import {
  OverviewMobileGroupCard,
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
import { formatCurrency } from "@/lib/utils";

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
  const { stats, recentServices, recentActivities, featureAccess } = data;

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
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
            <h1 data-tour="overview-title" className="text-2xl font-black tracking-tight sm:text-3xl">
              Admin Overview
            </h1>
            <div className="h-5 w-1 shrink-0 rounded-full bg-primary sm:h-6" />
            <div className="flex min-w-0 items-center gap-2 rounded-lg bg-muted/40 px-2 py-1 sm:bg-transparent sm:px-0 sm:py-0">
              {currentToko?.logoUrl ? (
                <Image
                  src={currentToko.logoUrl}
                  alt={currentToko.name}
                  width={20}
                  height={20}
                  className="size-5 shrink-0 rounded-md object-cover"
                />
              ) : (
                <div className="flex size-5 shrink-0 items-center justify-center rounded-md bg-muted">
                  <RiStore2Line className="size-3 text-muted-foreground" />
                </div>
              )}
              <span className="min-w-0 truncate text-sm font-medium text-muted-foreground">
                {currentToko?.name || "Toko"}
              </span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground/70">Ringkasan aktivitas toko secara real-time</p>
        </div>

        <AdminOverviewActions tokoId={tokoId} />
      </div>

      <section data-tour="stats-services" className="flex flex-col gap-3 sm:gap-4">
        <OverviewSectionHeader title="Status Service" colorClass="bg-primary" />
        <div className="md:hidden">
          <OverviewMobileGroupCard
            title="Service Status"
            variant="primary"
            items={[
              {
                label: "Total Service",
                value: stats.services.total,
                icon: <RiInboxLine className="size-4" />,
                variant: "primary",
              },
              {
                label: "Masuk Hari Ini",
                value: stats.services.daily,
                icon: <RiCalendarCheckLine className="size-4" />,
                variant: "primary",
              },
              {
                label: "Sedang Diperbaiki",
                value: stats.services.repairing,
                icon: <RiToolsLine className="size-4" />,
                variant: "accent",
              },
              {
                label: "Selesai",
                value: stats.services.done,
                icon: <RiCheckDoubleLine className="size-4" />,
                variant: "success",
              },
              {
                label: "Gagal",
                value: stats.services.failed,
                icon: <RiCloseLine className="size-4" />,
                variant: stats.services.failed > 0 ? "warning" : "default",
              },
            ]}
          />
        </div>
        <div className="hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-4">
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

      {featureAccess.revenueAnalytics && (
        <section data-tour="stats-revenue" className="flex flex-col gap-3 sm:gap-4">
          <OverviewSectionHeader title="Pendapatan" colorClass="bg-chart-1" />
          <div className="md:hidden">
            <OverviewMobileGroupCard
              title="Pendapatan"
              variant="success"
              items={[
                {
                  label: "Bulan Ini",
                  value: formatCurrency(stats.revenue.monthlyPaid),
                  icon: <RiMoneyDollarCircleLine className="size-4" />,
                  variant: "success",
                },
                {
                  label: "Pending Bulan Ini",
                  value: formatCurrency(stats.revenue.monthlyPending),
                  icon: <RiTimeLine className="size-4" />,
                  variant: stats.revenue.monthlyPending > 0 ? "warning" : "default",
                },
                {
                  label: "Hari Ini",
                  value: formatCurrency(stats.revenue.dailyRevenue),
                  icon: <RiCalendarCheckLine className="size-4" />,
                  variant: "primary",
                },
              ]}
            />
          </div>
          <div className="hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-4">
            <OverviewStatsCard
              title="Pendapatan Bulan Ini"
              value={formatCurrency(stats.revenue.monthlyPaid)}
              icon={<RiMoneyDollarCircleLine className="h-4 w-4" />}
              variant="success"
            />
            <OverviewStatsCard
              title="Pending Bulan Ini"
              value={formatCurrency(stats.revenue.monthlyPending)}
              icon={<RiTimeLine className="h-4 w-4" />}
              variant={stats.revenue.monthlyPending > 0 ? "warning" : "default"}
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
      )}

      <section className="grid gap-3 md:hidden">
        <OverviewMobileGroupCard
          title="Inventory"
          variant={stats.inventory.lowStockCount > 0 ? "warning" : "default"}
          items={[
            {
              label: "Low Stock Items",
              value: stats.inventory.lowStockCount,
              icon: <RiArchiveLine className="size-4" />,
              variant: stats.inventory.lowStockCount > 0 ? "warning" : "default",
            },
          ]}
        />
        <OverviewMobileGroupCard
          title="Periode"
          variant="primary"
          items={[
            {
              label: "Hari Ini",
              value: stats.services.daily,
              icon: <RiCalendarCheckLine className="size-4" />,
              variant: "primary",
            },
            {
              label: "7 Hari",
              value: stats.services.weekly,
              icon: <RiCalendarCheckLine className="size-4" />,
              variant: "primary",
            },
          ]}
        />
      </section>

      <section className="hidden gap-4 md:grid md:grid-cols-2">
        <OverviewPeriodCard label="Hari Ini" value={stats.services.daily} sub="service masuk" />
        <OverviewPeriodCard label="7 Hari" value={stats.services.weekly} sub="service masuk" />
      </section>

      <section>
        <Card
          data-tour="service-table"
          className="overflow-hidden border-border/50 py-0 shadow-lg shadow-black/5 transition-all duration-300 hover:shadow-xl hover:shadow-black/10"
        >
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <div className="min-w-[48rem]">
                <ServiceTable
                  services={tableServices}
                  role="admin"
                  headerTitle="Service Terbaru"
                  headerDescription="Service terbaru dari toko ini"
                  headerBadge={tableServices.length}
                  emptyMessage="Tidak ada service"
                  tokoId={tokoId}
                  disableAssignment={true}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {featureAccess.activityLog && (
        <section>
          <ActivityLog activities={recentActivities} />
        </section>
      )}
    </div>
  );
}
