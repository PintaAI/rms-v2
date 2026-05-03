import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/layout/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { DynamicBreadcrumb } from "@/components/dashboard/layout/dynamic-breadcrumb";
import { UserInfo } from "@/components/shared/user-info";
import { LiveClock } from "@/components/shared/live-clock";
import { SettingsButton } from "@/components/shared/settings-button";
import { DashboardScopeProvider } from "@/components/dashboard/layout/dashboard-scope-context";
import { getServiceStats, getTechnicianTaskStats } from "@/actions/service";
import type { ServiceStats, TechnicianTaskStats } from "@/actions/service";
import { getRequestScope } from "@/lib/auth/request-scope";
import { AuthError } from "@/lib/auth/authorization";
import { DevAccessOverlay } from "@/components/dev/access-overlay";

const DEV_MODE = process.env.DEV_MODE === "true";
interface DashboardLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tokoid: string }>;
}

export default async function DashboardLayout({ children, params }: DashboardLayoutProps) {
  const { tokoid } = await params;

  let scope: Awaited<ReturnType<typeof getRequestScope>>;

  try {
    scope = await getRequestScope(tokoid);
  } catch (error) {
    if (error instanceof AuthError && error.code === "unauthorized") {
      redirect("/auth");
    }
    throw error;
  }

  let serviceStats: ServiceStats | null = null;
  let technicianTaskStats: TechnicianTaskStats | null = null;

  if (scope.user.role === "admin" || scope.user.role === "staff") {
    const result = await getServiceStats(tokoid);
    if (result.success && result.data) {
      serviceStats = result.data;
    }
  } else if (scope.user.role === "technician") {
    const result = await getTechnicianTaskStats(tokoid);
    if (result.success && result.data) {
      technicianTaskStats = result.data;
    }
  }

  return (
    <SidebarProvider>
      <DashboardScopeProvider
        value={{
          user: {
            id: scope.user.id,
            name: scope.user.name,
            email: scope.user.email,
            role: scope.user.role,
            plan: scope.plan,
          },
          tokoId: tokoid,
          featureAccess: scope.featureAccess,
          capabilities: scope.capabilities,
          disabledFeatures: scope.disabledFeatures,
        }}
      >
        <AppSidebar
          tokoid={tokoid}
          featureAccess={scope.featureAccess}
          capabilities={scope.capabilities}
          disabledFeatures={scope.disabledFeatures}
          serviceStats={serviceStats}
          technicianTaskStats={technicianTaskStats}
        />
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
              <SettingsButton />
              <UserInfo />
            </div>
          </header>
          <main className="min-w-0 flex-1 p-3 sm:p-4 lg:p-6">
            {children}
          </main>
          {DEV_MODE && <DevAccessOverlay />}
        </SidebarInset>
      </DashboardScopeProvider>
    </SidebarProvider>
  );
}
