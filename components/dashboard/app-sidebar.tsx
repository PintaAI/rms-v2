"use client";

import {
  Sidebar,
  SidebarContent,
} from "@/components/ui/sidebar";
import { AppSidebarHeader } from "./app-sidebar-header";
import { AppSidebarFooter } from "./app-sidebar-footer";
import { AdminNav } from "./nav/admin-nav";
import { StaffNav } from "./nav/staff-nav";
import { TeknisiNav } from "./nav/teknisi-nav";
import { useAuth } from "@/components/auth-provider";

interface AppSidebarProps {
  tokoid: string;
}

export function AppSidebar({ tokoid }: AppSidebarProps) {
  const { user, tokoList } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <AppSidebarHeader
        tokoid={tokoid}
        userRole={user?.role || ""}
        tokoList={tokoList}
      />
      <SidebarContent>
        {user?.role === "admin" && <AdminNav tokoid={tokoid} />}
        {user?.role === "staff" && <StaffNav tokoid={tokoid} />}
        {user?.role === "technician" && <TeknisiNav tokoid={tokoid} />}
      </SidebarContent>
      <AppSidebarFooter />
    </Sidebar>
  );
}