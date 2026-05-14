"use client";

import Image from "next/image";
import { RiStore2Line } from "@remixicon/react";
import { cn } from "@/lib/utils";

interface TokoHeaderProps {
  role: string;
  tokoName?: string;
  tokoLogoUrl?: string | null;
  subtitle?: string;
  className?: string;
  titleDataTour?: string;
}

export function TokoHeader({
  role,
  tokoName,
  tokoLogoUrl,
  subtitle = "Ringkasan aktivitas toko secara real-time",
  className,
  titleDataTour,
}: TokoHeaderProps) {
  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
        <h1
          className="text-2xl font-black tracking-tight sm:text-3xl"
          {...(titleDataTour ? { "data-tour": titleDataTour } : {})}
        >
          {role} Overview
        </h1>
        <div className="h-5 w-1 shrink-0 rounded-full bg-primary sm:h-6" />
        {tokoName && (
          <div className="flex min-w-0 items-center gap-2 rounded-lg bg-muted/40 px-2 py-1 sm:bg-transparent sm:px-0 sm:py-0">
            {tokoLogoUrl ? (
              <Image
                src={tokoLogoUrl}
                alt={tokoName}
                width={20}
                height={20}
                className="h-5 w-5 shrink-0 rounded-md object-cover"
              />
            ) : (
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted">
                <RiStore2Line className="h-3 w-3 text-muted-foreground" />
              </div>
            )}
            <span className="min-w-0 truncate text-sm font-medium text-muted-foreground">{tokoName}</span>
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground/70">{subtitle}</p>
    </div>
  );
}
