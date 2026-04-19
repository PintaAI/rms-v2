import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { DynamicBreadcrumb } from "@/components/dashboard/dynamic-breadcrumb";
import { UserInfo } from "@/components/user-info";
import { LiveClock } from "@/components/live-clock";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getNavBadgeStats, getTechnicianTaskBadgeStats } from "@/actions/service";
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
      const result = await getNavBadgeStats(tokoid);
      if (result.success && result.data) {
        serviceStats = result.data;
      }
    } else if (session.user.role === "technician") {
      const result = await getTechnicianTaskBadgeStats(tokoid);
      if (result.success && result.data) {
        technicianTaskStats = result.data;
      }
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar tokoid={tokoid} serviceStats={serviceStats} technicianTaskStats={technicianTaskStats} />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-6" />
            <DynamicBreadcrumb />
          </div>
          <div className="flex items-center gap-4">
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