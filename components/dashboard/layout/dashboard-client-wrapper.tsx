"use client";

import { TourProvider } from "@/lib/tour-context";
import type { ReactNode } from "react";

interface DashboardClientWrapperProps {
  children: ReactNode;
}

export function DashboardClientWrapper({ children }: DashboardClientWrapperProps) {
  return <TourProvider>{children}</TourProvider>;
}