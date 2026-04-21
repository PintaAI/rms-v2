import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { RiArrowRightLine, RiBarChartBoxLine } from "@remixicon/react";

export type OverviewCardVariant = "default" | "primary" | "success" | "warning" | "accent";

interface OverviewStatsCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  description?: string;
  variant?: OverviewCardVariant;
}

interface OverviewStatsCardSkeletonProps {
  title: string;
  icon: ReactNode;
  variant?: OverviewCardVariant;
}

interface OverviewPeriodCardProps {
  label: string;
  value: number;
  sub: string;
}

interface OverviewPeriodCardSkeletonProps {
  label: string;
}

interface OverviewSectionHeaderProps {
  title: string;
  colorClass: string;
}

const bgStyles: Record<OverviewCardVariant, string> = {
  default: "bg-card",
  primary: "bg-gradient-to-br from-primary/5 via-card to-primary/[0.02]",
  success: "bg-gradient-to-br from-chart-1/5 via-card to-chart-1/[0.02]",
  warning: "bg-gradient-to-br from-destructive/5 via-card to-destructive/[0.02]",
  accent: "bg-gradient-to-br from-sky-500/5 via-card to-sky-500/[0.02]",
};

const accentColors: Record<OverviewCardVariant, string> = {
  default: "bg-border",
  primary: "bg-primary",
  success: "bg-chart-1",
  warning: "bg-destructive",
  accent: "bg-sky-500",
};

const iconBgStyles: Record<OverviewCardVariant, string> = {
  default: "bg-muted",
  primary: "bg-primary/10",
  success: "bg-chart-1/10",
  warning: "bg-destructive/10",
  accent: "bg-sky-500/10",
};

const iconTextStyles: Record<OverviewCardVariant, string> = {
  default: "text-muted-foreground",
  primary: "text-primary",
  success: "text-chart-1",
  warning: "text-destructive",
  accent: "text-sky-500",
};

export function OverviewStatsCard({
  title,
  value,
  icon,
  description,
  variant = "default",
}: OverviewStatsCardProps) {
  return (
    <div className={`relative ${bgStyles[variant]} rounded-xl border border-border/50 overflow-hidden group`}>
      <div className={`absolute top-0 left-0 w-1 h-full ${accentColors[variant]} opacity-80`} />
      <div className={`absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-md ${iconBgStyles[variant]} ${iconTextStyles[variant]}`}>
        {icon}
      </div>
      <div className={`absolute top-0 right-0 h-20 w-20 ${accentColors[variant]}/5 rounded-full blur-2xl`} />
      <div className="pl-5 pr-4 pt-5 pb-5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{title}</p>
        <div className="mt-2 text-3xl font-black tracking-tight text-foreground tabular-nums">{value}</div>
        {description && (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground/80">
            <RiArrowRightLine className="h-3 w-3" />
            {description}
          </p>
        )}
      </div>
      <div className={`absolute bottom-0 left-0 right-0 h-px ${accentColors[variant]}/20`} />
    </div>
  );
}

export function OverviewStatsCardSkeleton({
  title,
  icon,
  variant = "default",
}: OverviewStatsCardSkeletonProps) {
  return (
    <div className={`relative ${bgStyles[variant]} rounded-xl border border-border/50 overflow-hidden group`}>
      <div className={`absolute top-0 left-0 w-1 h-full ${accentColors[variant]} opacity-80`} />
      <div className={`absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-md ${iconBgStyles[variant]} ${iconTextStyles[variant]}`}>
        {icon}
      </div>
      <div className={`absolute top-0 right-0 h-20 w-20 ${accentColors[variant]}/5 rounded-full blur-2xl`} />
      <div className="pl-5 pr-4 pt-5 pb-5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{title}</p>
        <Skeleton className="mt-2 h-8 w-20" />
        <Skeleton className="mt-2 h-3 w-28" />
      </div>
      <div className={`absolute bottom-0 left-0 right-0 h-px ${accentColors[variant]}/20`} />
    </div>
  );
}

export function OverviewPeriodCard({ label, value, sub }: OverviewPeriodCardProps) {
  return (
    <div className="relative flex items-center gap-4 overflow-hidden rounded-xl border border-border/50 bg-card px-5 py-4">
      <div className="absolute top-0 left-0 h-full w-1 bg-primary/60" />
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5">
        <RiBarChartBoxLine className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-black tracking-tight tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground/70">{sub}</p>
      </div>
      <div className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full bg-primary blur-xl" />
    </div>
  );
}

export function OverviewPeriodCardSkeleton({ label }: OverviewPeriodCardSkeletonProps) {
  return (
    <div className="relative flex items-center gap-4 overflow-hidden rounded-xl border border-border/50 bg-card px-5 py-4">
      <div className="absolute top-0 left-0 h-full w-1 bg-primary/60" />
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5">
        <RiBarChartBoxLine className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</p>
        <Skeleton className="mt-1 h-7 w-8" />
        <p className="mt-1 text-xs text-muted-foreground/70">service masuk</p>
      </div>
      <div className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full bg-primary blur-xl" />
    </div>
  );
}

export function OverviewSectionHeader({ title, colorClass }: OverviewSectionHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <div className={`h-5 w-1 rounded-full ${colorClass}`} />
      <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{title}</h2>
    </div>
  );
}
