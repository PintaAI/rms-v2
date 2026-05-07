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
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center gap-3">
        <h1
          className="text-3xl font-black tracking-tight"
          {...(titleDataTour ? { "data-tour": titleDataTour } : {})}
        >
          {role} Overview
        </h1>
        <div className="h-6 w-1 rounded-full bg-primary" />
        {tokoName && (
          <div className="flex items-center gap-2">
            {tokoLogoUrl ? (
              <Image
                src={tokoLogoUrl}
                alt={tokoName}
                width={20}
                height={20}
                className="h-5 w-5 rounded-md object-cover"
              />
            ) : (
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-muted">
                <RiStore2Line className="h-3 w-3 text-muted-foreground" />
              </div>
            )}
            <span className="text-sm font-medium text-muted-foreground">{tokoName}</span>
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground/70">{subtitle}</p>
    </div>
  );
}
