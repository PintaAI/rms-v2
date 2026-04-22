import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/layout/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { DynamicBreadcrumb } from "@/components/dashboard/layout/dynamic-breadcrumb";
import { UserInfo } from "@/components/shared/user-info";
import { LiveClock } from "@/components/shared/live-clock";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getServiceStats, getTechnicianTaskStats } from "@/actions/service";
import type { ServiceStats, TechnicianTaskStats } from "@/actions/service";

interface DashboardLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tokoid: string }>;
}

export default async function DashboardLayout({ children, params }: DashboardLayoutProps) {
  const { tokoid } = await params;
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  let serviceStats: ServiceStats | null = null;
  let technicianTaskStats: TechnicianTaskStats | null = null;

  if (session?.user) {
    if (session.user.role === "admin" || session.user.role === "staff") {
      const result = await getServiceStats(tokoid);
      if (result.success && result.data) {
        serviceStats = result.data;
      }
    } else if (session.user.role === "technician") {
      const result = await getTechnicianTaskStats(tokoid);
      if (result.success && result.data) {
        technicianTaskStats = result.data;
      }
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar tokoid={tokoid} serviceStats={serviceStats} technicianTaskStats={technicianTaskStats} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-start justify-between gap-2 pt-4 px-4 bg-background/95">
          <div className="flex gap-2">
            <SidebarTrigger data-tour="sidebar-trigger" />
            <Separator orientation="vertical" className="h-6" />
            <DynamicBreadcrumb />
          </div>
          <div className="flex items-center gap-4 self-center">
            <LiveClock />
            <UserInfo />
          </div>
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}