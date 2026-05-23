"use client";

import { RiArrowRightLine } from "@remixicon/react";
import type { StatsVariant } from "./types";

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  description?: string;
  variant?: StatsVariant;
}

export function StatsCard({ title, value, icon, description, variant = "default" }: StatsCardProps) {
  const bgStyles: Record<StatsVariant, string> = {
    default: "bg-card",
    primary: "bg-gradient-to-br from-primary/5 via-card to-primary/[0.02]",
    success: "bg-gradient-to-br from-chart-1/5 via-card to-chart-1/[0.02]",
    warning: "bg-gradient-to-br from-destructive/5 via-card to-destructive/[0.02]",
    accent: "bg-gradient-to-br from-sky-500/5 via-card to-sky-500/[0.02]",
  };

  const accentColors: Record<StatsVariant, string> = {
    default: "bg-border",
    primary: "bg-primary",
    success: "bg-chart-1",
    warning: "bg-destructive",
    accent: "bg-sky-500",
  };

  const iconBgStyles: Record<StatsVariant, string> = {
    default: "bg-muted",
    primary: "bg-primary/10",
    success: "bg-chart-1/10",
    warning: "bg-destructive/10",
    accent: "bg-sky-500/10",
  };

  const iconTextStyles: Record<StatsVariant, string> = {
    default: "text-muted-foreground",
    primary: "text-primary",
    success: "text-chart-1",
    warning: "text-destructive",
    accent: "text-sky-500",
  };

  return (
    <div
      className={`relative ${bgStyles[variant]} rounded-xl border border-border/50 overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/10 hover:border-border/80`}
    >
      <div className={`absolute top-0 left-0 w-1 h-full ${accentColors[variant]} transition-all duration-300 opacity-80 group-hover:w-1.5 group-hover:opacity-100`} />
      <div className={`absolute top-3 right-3 w-8 h-8 rounded-md ${iconBgStyles[variant]} flex items-center justify-center ${iconTextStyles[variant]} transition-all duration-300 group-hover:scale-115 group-hover:rounded-lg`}>
        {icon}
      </div>
      <div className={`absolute top-0 right-0 w-20 h-20 ${accentColors[variant]}/5 rounded-full blur-2xl transition-all duration-300 group-hover:w-28 group-hover:h-28 group-hover:opacity-80`} />
      <div className="pl-5 pr-4 pt-5 pb-5 relative z-10">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest transition-colors duration-300 group-hover:text-muted-foreground/90">{title}</p>
        <div className="mt-2 text-3xl font-black tracking-tight text-foreground tabular-nums transition-transform duration-300 group-hover:scale-[1.02]">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground/80 mt-1.5 flex items-center gap-1 transition-colors duration-300 group-hover:text-muted-foreground/90">
            <RiArrowRightLine className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5" />
            {description}
          </p>
        )}
      </div>
      <div className={`absolute bottom-0 left-0 right-0 h-px ${accentColors[variant]}/20 transition-all duration-300 group-hover:h-0.5 group-hover:opacity-40`} />
    </div>
  );
}
