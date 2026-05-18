import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/layout/app-sidebar";
import { UserInfo } from "@/components/shared/user-info";
import { LiveClock } from "@/components/shared/live-clock";
import { SettingsButton } from "@/components/shared/settings-button";
import { GlobalSearch } from "@/components/dashboard/layout/global-search";
import { DashboardScopeProvider } from "@/components/dashboard/layout/dashboard-scope-context";
import { DashboardRealtimeIndicator, DashboardRealtimeProvider } from "@/components/dashboard/layout/dashboard-realtime-provider";
import { WhatsappInboxPopover } from "@/components/dashboard/whatsapp/whatsapp-inbox-popover";
import { WhatsappRealtimeProvider } from "@/components/dashboard/whatsapp/whatsapp-realtime-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { getServiceStats, getTechnicianTaskStats } from "@/actions/service";
import type { ServiceStats, TechnicianTaskStats } from "@/actions/service";
import { getRequestScope } from "@/lib/auth/request-scope";
import { AuthError } from "@/lib/auth/authorization";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
          permissionAccess: scope.permissionAccess,
          capabilities: scope.capabilities,
          disabledFeatures: scope.disabledFeatures,
        }}
      >
        <QueryProvider>
          <DashboardRealtimeProvider>
            <WhatsappRealtimeProvider>
              <AppSidebar
                tokoid={tokoid}
                featureAccess={scope.featureAccess}
                permissionAccess={scope.permissionAccess}
                capabilities={scope.capabilities}
                disabledFeatures={scope.disabledFeatures}
                serviceStats={serviceStats}
                technicianTaskStats={technicianTaskStats}
              />
              <SidebarInset>
                <header className="flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/40 bg-background/95 px-3 py-2 sm:flex-nowrap sm:px-4 sm:py-3">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <SidebarTrigger data-tour="sidebar-trigger" />            
                    <DashboardRealtimeIndicator />
                  </div>
                  <div className="flex min-w-0 items-center gap-2 sm:gap-4">
                    <GlobalSearch />
                    <div className="hidden md:block">
                      <LiveClock />
                    </div>
                    <WhatsappInboxPopover />
                    <SettingsButton />
                    <UserInfo />
                  </div>
                </header>
                <main className="min-w-0 flex-1 p-3 sm:p-4 lg:p-6">
                  {scope.subscriptionStatus === "suspended" ? <SubscriptionSuspendedState tokoid={tokoid} role={scope.user.role} /> : children}
                </main>
              </SidebarInset>
            </WhatsappRealtimeProvider>
          </DashboardRealtimeProvider>
        </QueryProvider>
      </DashboardScopeProvider>
    </SidebarProvider>
  );
}

function SubscriptionSuspendedState({ tokoid, role }: { tokoid: string; role: string }) {
  const isAdmin = role === "admin";

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="max-w-xl border-warning/30 bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Subscription toko sedang suspended</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Akses operasional dibatasi karena masa trial/langganan owner sudah melewati grace period.
          </p>
          {isAdmin ? (
            <Button asChild>
              <Link href={`/${tokoid}/admin?settings=billing`}>Buka Billing</Link>
            </Button>
          ) : (
            <p>Hubungi admin toko untuk menyelesaikan pembayaran langganan.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
