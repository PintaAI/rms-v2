import {
  OverviewMobileGroupCardSkeleton,
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
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Admin Overview</h1>
            <div className="h-5 w-1 shrink-0 rounded-full bg-primary sm:h-6" />
            <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-2 py-1 sm:bg-transparent sm:px-0 sm:py-0">
              <div className="flex size-5 items-center justify-center rounded-md bg-muted">
                <RiStore2Line className="size-3 text-muted-foreground" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground/70 mt-1">Ringkasan aktivitas toko secara real-time</p>
        </div>
        <Button disabled className="w-full bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/20 sm:w-auto">
          <RiAddLine data-icon="inline-start" />
          New Service
        </Button>
      </div>

      <section className="flex flex-col gap-3 sm:gap-4">
        <OverviewSectionHeader title="Status Service" colorClass="bg-primary" />
        <div className="md:hidden">
          <OverviewMobileGroupCardSkeleton title="Service Status" count={5} variant="primary" />
        </div>
        <div className="hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-4">
          <OverviewStatsCardSkeleton title="Total Service" icon={<RiInboxLine className="h-4 w-4" />} variant="primary" />
          <OverviewStatsCardSkeleton title="Sedang Diperbaiki" icon={<RiToolsLine className="h-4 w-4" />} variant="accent" />
          <OverviewStatsCardSkeleton title="Selesai" icon={<RiCheckDoubleLine className="h-4 w-4" />} variant="success" />
          <OverviewStatsCardSkeleton title="Gagal" icon={<RiCloseLine className="h-4 w-4" />} variant="default" />
        </div>
      </section>

      <section className="flex flex-col gap-3 sm:gap-4">
        <OverviewSectionHeader title="Pendapatan" colorClass="bg-chart-1" />
        <div className="md:hidden">
          <OverviewMobileGroupCardSkeleton title="Pendapatan" count={3} variant="success" />
        </div>
        <div className="hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-4">
          <OverviewStatsCardSkeleton title="Pendapatan Total" icon={<RiMoneyDollarCircleLine className="h-4 w-4" />} variant="success" />
          <OverviewStatsCardSkeleton title="Pendapatan Pending" icon={<RiTimeLine className="h-4 w-4" />} variant="default" />
          <OverviewStatsCardSkeleton title="Pendapatan Hari Ini" icon={<RiCalendarCheckLine className="h-4 w-4" />} variant="primary" />
          <OverviewStatsCardSkeleton title="Low Stock Items" icon={<RiArchiveLine className="h-4 w-4" />} variant="default" />
        </div>
      </section>

      <section className="grid gap-3 md:hidden">
        <OverviewMobileGroupCardSkeleton title="Inventory" count={1} variant="default" />
        <OverviewMobileGroupCardSkeleton title="Periode" count={2} variant="primary" />
      </section>

      <section className="hidden gap-4 md:grid md:grid-cols-2">
        <OverviewPeriodCardSkeleton label="Hari Ini" />
        <OverviewPeriodCardSkeleton label="7 Hari" />
      </section>

      <section>
        <div className="border border-border/50 shadow-lg shadow-black/5 rounded-xl overflow-hidden">
          <div className="border-b border-border/50 bg-muted/30 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="h-5 w-1 shrink-0 rounded-full bg-primary" />
              <h3 className="text-lg font-bold">Service Terbaru</h3>
            </div>
          </div>
          <div className="overflow-x-auto p-0">
            <div className="min-w-[48rem]">
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
