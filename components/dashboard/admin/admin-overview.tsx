"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ServiceTable } from "@/components/dashboard/services/service-table";
import { ServicesForm } from "@/components/dashboard/services/services-form";
import { useAuth } from "@/components/auth/auth-provider";
import { useTour } from "@/lib/tour-context";
import type { AdminOverviewData } from "@/actions/overview";
import type { ServiceTableItem } from "@/components/dashboard/services/service-table/types";
import {
  RiInboxLine,
  RiToolsLine,
  RiCheckDoubleLine,
  RiCloseLine,
  RiMoneyDollarCircleLine,
  RiArchiveLine,
  RiGroupLine,
  RiCalendarCheckLine,
  RiAddLine,
  RiTimeLine,
  RiBarChartBoxLine,
  RiArrowRightLine,
  RiStore2Line,
} from "@remixicon/react";
import { TourGuide } from "@/components/shared/tour-guide";
import { adminTourSteps } from "@/lib/tour-steps";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

type Variant = "default" | "primary" | "success" | "warning" | "accent";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  description?: string;
  variant?: Variant;
}

function StatsCard({ title, value, icon, description, variant = "default" }: StatsCardProps) {
  const bgStyles: Record<Variant, string> = {
    default: "bg-card",
    primary: "bg-gradient-to-br from-primary/5 via-card to-primary/[0.02]",
    success: "bg-gradient-to-br from-chart-1/5 via-card to-chart-1/[0.02]",
    warning: "bg-gradient-to-br from-destructive/5 via-card to-destructive/[0.02]",
    accent: "bg-gradient-to-br from-sky-500/5 via-card to-sky-500/[0.02]",
  };

  const accentColors: Record<Variant, string> = {
    default: "bg-border",
    primary: "bg-primary",
    success: "bg-chart-1",
    warning: "bg-destructive",
    accent: "bg-sky-500",
  };

  const iconBgStyles: Record<Variant, string> = {
    default: "bg-muted",
    primary: "bg-primary/10",
    success: "bg-chart-1/10",
    warning: "bg-destructive/10",
    accent: "bg-sky-500/10",
  };

  const iconTextStyles: Record<Variant, string> = {
    default: "text-muted-foreground",
    primary: "text-primary",
    success: "text-chart-1",
    warning: "text-destructive",
    accent: "text-sky-500",
  };

  return (
    <div className={`relative ${bgStyles[variant]} rounded-xl border border-border/50 overflow-hidden group`}>
      <div className={`absolute top-0 left-0 w-1 h-full ${accentColors[variant]} opacity-80`} />
      <div className={`absolute top-3 right-3 h-8 w-8 rounded-md ${iconBgStyles[variant]} flex items-center justify-center ${iconTextStyles[variant]}`}>
        {icon}
      </div>
      <div className={`absolute top-0 right-0 w-20 h-20 ${accentColors[variant]}/5 rounded-full blur-2xl`} />
      <div className="pl-5 pr-4 pt-5 pb-5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{title}</p>
        <div className="mt-2 text-3xl font-black tracking-tight text-foreground tabular-nums">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground/80 mt-1.5 flex items-center gap-1">
            <RiArrowRightLine className="h-3 w-3" />
            {description}
          </p>
        )}
      </div>
      <div className={`absolute bottom-0 left-0 right-0 h-px ${accentColors[variant]}/20`} />
    </div>
  );
}

function PeriodCard({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="relative bg-card rounded-xl border border-border/50 px-5 py-4 flex items-center gap-4 overflow-hidden group">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary/60" />
      <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shrink-0">
        <RiBarChartBoxLine className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-black tracking-tight tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground/70">{sub}</p>
      </div>
      <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-primary rounded-full blur-xl" />
    </div>
  );
}

interface AdminOverviewClientProps {
  initialData: AdminOverviewData;
  tokoId: string;
}

export function AdminOverviewClient({ initialData, tokoId }: AdminOverviewClientProps) {
  const { stats, recentServices } = initialData;
  const { tokoList } = useAuth();
  const { tourRunning, startTour, stopTour } = useTour();
  const [servicesFormOpen, setServicesFormOpen] = useState(false);

  useEffect(() => {
    const onboardCompleted = localStorage.getItem("onboard_completed");
    const tourCompleted = localStorage.getItem("tour_completed");

    if (onboardCompleted === "true" && tourCompleted !== "true") {
      startTour();
    }
  }, [startTour]);

  const currentToko = tokoList.find((t) => t.id === tokoId);

  const tableServices: ServiceTableItem[] = recentServices.map((s) => ({
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

  return (
    <div className="space-y-8">
      <TourGuide run={tourRunning} steps={adminTourSteps} onComplete={stopTour} onSkip={stopTour} />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 data-tour="overview-title" className="text-3xl font-black tracking-tight">Overview</h1>
            <div className="h-6 w-1 bg-primary rounded-full" />
            <div className="flex items-center gap-2">
              {currentToko?.logoUrl ? (
                <img
                  src={currentToko.logoUrl}
                  alt={currentToko.name}
                  className="h-5 w-5 rounded-md object-cover"
                />
              ) : (
                <div className="h-5 w-5 rounded-md bg-muted flex items-center justify-center">
                  <RiStore2Line className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
              <span className="text-sm font-medium text-muted-foreground">{currentToko?.name || "Toko"}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground/70">Ringkasan aktivitas toko secara real-time</p>
        </div>
        <Button
          data-tour="new-service-btn"
          onClick={() => setServicesFormOpen(true)}
          className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg shadow-primary/20 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30"
        >
          <RiAddLine className="h-4 w-4 mr-1.5" />
          New Service
        </Button>
      </div>

      <ServicesForm
        open={servicesFormOpen}
        onOpenChange={setServicesFormOpen}
        onSuccess={() => setServicesFormOpen(false)}
        tokoId={tokoId}
      />

      <section data-tour="stats-services" className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-5 w-1 bg-primary rounded-full" />
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Status Service</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Service"
            value={stats.services.total}
            icon={<RiInboxLine className="h-4 w-4" />}
            description={`${stats.services.daily} masuk hari ini`}
            variant="primary"
          />
          <StatsCard
            title="Sedang Diperbaiki"
            value={stats.services.repairing}
            icon={<RiToolsLine className="h-4 w-4" />}
            description={`${stats.services.received} menunggu teknisi`}
            variant="accent"
          />
          <StatsCard
            title="Selesai"
            value={stats.services.done}
            icon={<RiCheckDoubleLine className="h-4 w-4" />}
            description={`${stats.services.pickedUp} sudah diambil`}
            variant="success"
          />
          <StatsCard
            title="Gagal"
            value={stats.services.failed}
            icon={<RiCloseLine className="h-4 w-4" />}
            variant={stats.services.failed > 0 ? "warning" : "default"}
          />
        </div>
      </section>

      <section data-tour="stats-revenue" className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-5 w-1 bg-chart-1 rounded-full" />
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Pendapatan</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Pendapatan Total"
            value={formatCurrency(stats.revenue.totalPaid)}
            icon={<RiMoneyDollarCircleLine className="h-4 w-4" />}
            variant="success"
          />
          <StatsCard
            title="Pendapatan Pending"
            value={formatCurrency(stats.revenue.totalPending)}
            icon={<RiTimeLine className="h-4 w-4" />}
            variant={stats.revenue.totalPending > 0 ? "warning" : "default"}
          />
          <StatsCard
            title="Pendapatan Hari Ini"
            value={formatCurrency(stats.revenue.dailyRevenue)}
            icon={<RiCalendarCheckLine className="h-4 w-4" />}
            variant="primary"
          />
          <StatsCard
            title="Low Stock Items"
            value={stats.inventory.lowStockCount}
            icon={<RiArchiveLine className="h-4 w-4" />}
            description={`${stats.inventory.totalSpareparts} total sparepart`}
            variant={stats.inventory.lowStockCount > 0 ? "warning" : "default"}
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        <div className="md:col-span-2 grid gap-4 grid-cols-2">
          <StatsCard
            title="Teknisi"
            value={stats.staff.totalTechnicians}
            icon={<RiGroupLine className="h-4 w-4" />}
            variant="accent"
          />
          <StatsCard
            title="Staff"
            value={stats.staff.totalStaff}
            icon={<RiGroupLine className="h-4 w-4" />}
          />
        </div>
        <div className="md:col-span-3 grid gap-4 grid-cols-3">
          <PeriodCard label="Hari Ini" value={stats.services.daily} sub="service masuk" />
          <PeriodCard label="7 Hari" value={stats.services.weekly} sub="service masuk" />
          <PeriodCard label="30 Hari" value={stats.services.monthly} sub="service masuk" />
        </div>
      </section>

      <section>
        <Card data-tour="service-table" className="border-border/50 shadow-lg py-0 shadow-black/5 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-black/10">
          <CardHeader className="border-b pt-4 border-border/50 bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="h-5 w-1 bg-primary rounded-full" />
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
    </div>
  );
}