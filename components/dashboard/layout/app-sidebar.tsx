"use client";

import {
  Sidebar,
  SidebarContent,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebarHeader } from "./app-sidebar-header";
import { AdminNav } from "../nav/admin-nav";
import { StaffNav } from "../nav/staff-nav";
import { TeknisiNav } from "../nav/teknisi-nav";
import { useAuth } from "@/components/auth/auth-provider";
import type { ServiceStats, TechnicianTaskStats } from "@/actions/service";

interface AppSidebarProps {
  tokoid: string;
  serviceStats?: ServiceStats | null;
  technicianTaskStats?: TechnicianTaskStats | null;
}

export function AppSidebar({ tokoid, serviceStats, technicianTaskStats }: AppSidebarProps) {
  const { user, tokoList } = useAuth();

  return (
    <TooltipProvider>
    <Sidebar collapsible="icon">
      <AppSidebarHeader
        tokoid={tokoid}
        userRole={user?.role || ""}
        tokoList={tokoList}
      />
      <SidebarContent data-tour="sidebar-nav" className="bg-gradient-to-b from-sidebar  to-background border-none border-border/70">
        {user?.role === "admin" && <AdminNav tokoid={tokoid} serviceStats={serviceStats} />}
        {user?.role === "staff" && <StaffNav tokoid={tokoid} serviceStats={serviceStats} />}
        {user?.role === "technician" && <TeknisiNav tokoid={tokoid} taskStats={technicianTaskStats} />}
      </SidebarContent>
    </Sidebar>
    </TooltipProvider>
  );
}