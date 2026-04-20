import { Skeleton } from "@/components/ui/skeleton";
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
  RiStore2Line,
} from "@remixicon/react";
import { Button } from "@/components/ui/button";

type Variant = "default" | "primary" | "success" | "warning" | "accent";

function StatsCardSkeleton({ title, icon, variant = "default" }: { title: string; icon: React.ReactNode; variant?: Variant }) {
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
        <Skeleton className="h-8 w-20 mt-2" />
        <Skeleton className="h-3 w-28 mt-2" />
      </div>
      <div className={`absolute bottom-0 left-0 right-0 h-px ${accentColors[variant]}/20`} />
    </div>
  );
}

function PeriodCardSkeleton({ label }: { label: string }) {
  return (
    <div className="relative bg-card rounded-xl border border-border/50 px-5 py-4 flex items-center gap-4 overflow-hidden group">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary/60" />
      <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shrink-0">
        <RiBarChartBoxLine className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">{label}</p>
        <Skeleton className="h-7 w-8 mt-1" />
        <p className="text-xs text-muted-foreground/70 mt-1">service masuk</p>
      </div>
      <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-primary rounded-full blur-xl" />
    </div>
  );
}

function SectionHeader({ title, colorClass }: { title: string; colorClass: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`h-5 w-1 ${colorClass} rounded-full`} />
      <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{title}</h2>
    </div>
  );
}

export default function AdminOverviewLoading() {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight">Overview</h1>
            <div className="h-6 w-1 bg-primary rounded-full" />
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-md bg-muted flex items-center justify-center">
                <RiStore2Line className="h-3 w-3 text-muted-foreground" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground/70 mt-1">Ringkasan aktivitas toko secara real-time</p>
        </div>
        <Button disabled className="bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/20">
          <RiAddLine className="h-4 w-4 mr-1.5" />
          New Service
        </Button>
      </div>

      <section className="space-y-4">
        <SectionHeader title="Status Service" colorClass="bg-primary" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCardSkeleton title="Total Service" icon={<RiInboxLine className="h-4 w-4" />} variant="primary" />
          <StatsCardSkeleton title="Sedang Diperbaiki" icon={<RiToolsLine className="h-4 w-4" />} variant="accent" />
          <StatsCardSkeleton title="Selesai" icon={<RiCheckDoubleLine className="h-4 w-4" />} variant="success" />
          <StatsCardSkeleton title="Gagal" icon={<RiCloseLine className="h-4 w-4" />} variant="default" />
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader title="Pendapatan" colorClass="bg-chart-1" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCardSkeleton title="Pendapatan Total" icon={<RiMoneyDollarCircleLine className="h-4 w-4" />} variant="success" />
          <StatsCardSkeleton title="Pendapatan Pending" icon={<RiTimeLine className="h-4 w-4" />} variant="default" />
          <StatsCardSkeleton title="Pendapatan Hari Ini" icon={<RiCalendarCheckLine className="h-4 w-4" />} variant="primary" />
          <StatsCardSkeleton title="Low Stock Items" icon={<RiArchiveLine className="h-4 w-4" />} variant="default" />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        <div className="md:col-span-2 grid gap-4 grid-cols-2">
          <StatsCardSkeleton title="Teknisi" icon={<RiGroupLine className="h-4 w-4" />} variant="accent" />
          <StatsCardSkeleton title="Staff" icon={<RiGroupLine className="h-4 w-4" />} variant="default" />
        </div>
        <div className="md:col-span-3 grid gap-4 grid-cols-3">
          <PeriodCardSkeleton label="Hari Ini" />
          <PeriodCardSkeleton label="7 Hari" />
          <PeriodCardSkeleton label="30 Hari" />
        </div>
      </section>

      <section>
        <div className="border border-border/50 shadow-lg shadow-black/5 rounded-xl overflow-hidden">
          <div className="border-b border-border/50 bg-muted/30 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="h-5 w-1 bg-primary rounded-full" />
              <h3 className="text-lg font-bold">Service Terbaru</h3>
            </div>
          </div>
          <div className="p-0">
            <div className="space-y-0">
              <div className="border-b border-border/50 px-4 py-3 flex items-center gap-4">
                <Skeleton className="h-8 w-full" />
              </div>
              <div className="border-b border-border/50 px-4 py-3">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-6 w-20 rounded-md" />
                </div>
              </div>
              <div className="border-b border-border/50 px-4 py-3">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-6 w-20 rounded-md" />
                </div>
              </div>
              <div className="px-4 py-3">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-6 w-20 rounded-md" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}