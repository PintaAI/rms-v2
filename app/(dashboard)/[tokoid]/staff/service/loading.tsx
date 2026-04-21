import { OverviewStatsCardSkeleton } from "@/components/dashboard/shared/overview-cards";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RiAddLine,
  RiCheckLine,
  RiInboxLine,
  RiLogoutBoxLine,
  RiStore2Line,
  RiToolsLine,
} from "@remixicon/react";

export default function StaffServiceLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-black tracking-tight">Service</h1>
          <div className="h-6 w-1 bg-primary rounded-full" />
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-md bg-muted flex items-center justify-center">
              <RiStore2Line className="h-3 w-3 text-muted-foreground" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground/70">Kelola semua service di toko</p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-5 w-1 bg-primary rounded-full" />
          <div>
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Semua Service</h2>
            <Skeleton className="mt-1 h-4 w-56" />
          </div>
        </div>
        <Button disabled className="bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/20">
          <RiAddLine className="h-4 w-4 mr-1.5" />
          New Service
        </Button>
      </div>

      <section className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <OverviewStatsCardSkeleton title="Masuk" icon={<RiInboxLine className="h-4 w-4" />} variant="primary" />
          <OverviewStatsCardSkeleton title="Proses" icon={<RiToolsLine className="h-4 w-4" />} variant="accent" />
          <OverviewStatsCardSkeleton title="Selesai & Gagal" icon={<RiCheckLine className="h-4 w-4" />} variant="success" />
          <OverviewStatsCardSkeleton title="Diambil" icon={<RiLogoutBoxLine className="h-4 w-4" />} variant="default" />
          <OverviewStatsCardSkeleton title="Total" icon={<RiInboxLine className="h-4 w-4" />} variant="default" />
        </div>
      </section>

      <section>
        <Card className="border-border/50 shadow-lg py-0 shadow-black/5 overflow-hidden">
          <CardHeader className="border-b pt-4 border-border/50 bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="h-5 w-1 bg-primary rounded-full" />
              <CardTitle className="text-lg font-bold">Daftar Service</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
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
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
