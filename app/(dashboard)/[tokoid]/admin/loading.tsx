import {
  OverviewPeriodCardSkeleton,
  OverviewSectionHeader,
  OverviewStatsCardSkeleton,
} from "@/components/dashboard/shared/overview-cards";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RiInboxLine,
  RiToolsLine,
  RiCheckDoubleLine,
  RiCloseLine,
  RiMoneyDollarCircleLine,
  RiArchiveLine,
  RiCalendarCheckLine,
  RiAddLine,
  RiTimeLine,
  RiStore2Line,
} from "@remixicon/react";
import { Button } from "@/components/ui/button";

export default function AdminOverviewLoading() {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight">Admin Overview</h1>
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
        <OverviewSectionHeader title="Status Service" colorClass="bg-primary" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <OverviewStatsCardSkeleton title="Total Service" icon={<RiInboxLine className="h-4 w-4" />} variant="primary" />
          <OverviewStatsCardSkeleton title="Sedang Diperbaiki" icon={<RiToolsLine className="h-4 w-4" />} variant="accent" />
          <OverviewStatsCardSkeleton title="Selesai" icon={<RiCheckDoubleLine className="h-4 w-4" />} variant="success" />
          <OverviewStatsCardSkeleton title="Gagal" icon={<RiCloseLine className="h-4 w-4" />} variant="default" />
        </div>
      </section>

      <section className="space-y-4">
        <OverviewSectionHeader title="Pendapatan" colorClass="bg-chart-1" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <OverviewStatsCardSkeleton title="Pendapatan Total" icon={<RiMoneyDollarCircleLine className="h-4 w-4" />} variant="success" />
          <OverviewStatsCardSkeleton title="Pendapatan Pending" icon={<RiTimeLine className="h-4 w-4" />} variant="default" />
          <OverviewStatsCardSkeleton title="Pendapatan Hari Ini" icon={<RiCalendarCheckLine className="h-4 w-4" />} variant="primary" />
          <OverviewStatsCardSkeleton title="Low Stock Items" icon={<RiArchiveLine className="h-4 w-4" />} variant="default" />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <OverviewPeriodCardSkeleton label="Hari Ini" />
        <OverviewPeriodCardSkeleton label="7 Hari" />
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