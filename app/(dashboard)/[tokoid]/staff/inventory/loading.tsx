import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RiAddLine, RiArchiveLine, RiStore2Line } from "@remixicon/react";

export default function StaffInventoryLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-black tracking-tight">Staff Inventory</h1>
          <div className="h-6 w-1 bg-primary rounded-full" />
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-muted">
              <RiStore2Line className="h-3 w-3 text-muted-foreground" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground/70">Kelola sparepart toko</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-5 w-1 rounded-full bg-primary" />
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Sparepart</h2>
              <Skeleton className="mt-1 h-4 w-52" />
            </div>
          </div>
          <Button disabled className="bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/20">
            <RiAddLine className="h-4 w-4 mr-1.5" />
            Add Sparepart
          </Button>
        </div>

        <div className="relative">
          <RiArchiveLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Skeleton className="h-10 w-full rounded-md pl-9" />
        </div>

        <Card className="overflow-hidden border-border/50 py-0 shadow-lg shadow-black/5">
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
      </div>
    </div>
  );
}
