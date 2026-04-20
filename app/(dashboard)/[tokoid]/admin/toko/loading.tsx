import { Skeleton } from "@/components/ui/skeleton";
import { RiStore2Line, RiAddLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";

function TokoCardSkeleton() {
  return (
    <div className="relative bg-card rounded-xl border border-border/50 overflow-hidden group">
      <div className="absolute top-0 left-0 w-1 h-full bg-border opacity-80" />
      <div className="absolute top-3 right-3 w-12 h-12 rounded-xl bg-muted border border-border/50 flex items-center justify-center">
        <Skeleton className="size-10 rounded-lg" />
      </div>
      <div className="absolute top-0 right-0 w-20 h-20 bg-border/5 rounded-full blur-2xl" />
      <div className="pl-5 pr-4 pt-5 pb-4 relative z-10">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Toko</p>
        <Skeleton className="h-7 w-32 mt-2" />
        <Skeleton className="h-4 w-48 mt-1" />
        <div className="mt-2 flex items-center gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="flex gap-2 mt-3">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-border/20" />
    </div>
  );
}

export default function AdminTokoLoading() {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight">Manage Toko</h1>
            <div className="h-6 w-1 bg-primary rounded-full" />
          </div>
          <p className="text-sm text-muted-foreground/70">Loading toko list...</p>
        </div>
        <Button disabled className="bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/20">
          <RiAddLine className="h-4 w-4 mr-1.5" />
          Add Toko
        </Button>
      </div>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <TokoCardSkeleton />
        <TokoCardSkeleton />
        <TokoCardSkeleton />
      </section>
    </div>
  );
}