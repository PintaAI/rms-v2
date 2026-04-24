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
        <header className="flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/40 bg-background/95 px-3 py-2 sm:flex-nowrap sm:px-4 sm:py-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <SidebarTrigger data-tour="sidebar-trigger" />
            <Separator orientation="vertical" className="h-6 shrink-0" />
            <div className="min-w-0 flex-1">
              <DynamicBreadcrumb />
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <div className="hidden md:block">
              <LiveClock />
            </div>
            <UserInfo />
          </div>
        </header>
        <main className="min-w-0 flex-1 p-3 sm:p-4 lg:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
