import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/layout/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { DynamicBreadcrumb } from "@/components/dashboard/layout/dynamic-breadcrumb";
import { UserInfo } from "@/components/shared/user-info";
import { LiveClock } from "@/components/shared/live-clock";
import { SettingsButton } from "@/components/shared/settings-button";
import { FeatureAccessProvider } from "@/components/dashboard/layout/feature-access-context";
import { getServiceStats, getTechnicianTaskStats } from "@/actions/service";
import { getDisabledFeaturesForToko } from "@/actions/feature-settings";
import type { ServiceStats, TechnicianTaskStats } from "@/actions/service";
import { canUseFeature, type FeatureAccessMap, type FeatureKey } from "@/lib/features";
import { getAuthUser, getEffectivePlanForToko } from "@/lib/rbac";

interface DashboardLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tokoid: string }>;
}

export default async function DashboardLayout({ children, params }: DashboardLayoutProps) {
  const { tokoid } = await params;
  const user = await getAuthUser();

  let serviceStats: ServiceStats | null = null;
  let technicianTaskStats: TechnicianTaskStats | null = null;
  const [plan, disabledFeatures] = user
    ? await Promise.all([getEffectivePlanForToko(user, tokoid), getDisabledFeaturesForToko(tokoid)])
    : [null, [] as FeatureKey[]];
  const featureAccess = getDashboardFeatureAccess(user, plan, disabledFeatures);

  if (user) {
    if (user.role === "admin" || user.role === "staff") {
      const result = await getServiceStats(tokoid);
      if (result.success && result.data) {
        serviceStats = result.data;
      }
    } else if (user.role === "technician") {
      const result = await getTechnicianTaskStats(tokoid);
      if (result.success && result.data) {
        technicianTaskStats = result.data;
      }
    }
  }

  return (
    <SidebarProvider>
      <FeatureAccessProvider featureAccess={featureAccess}>
        <AppSidebar
          tokoid={tokoid}
          featureAccess={featureAccess}
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
        </SidebarInset>
      </FeatureAccessProvider>
    </SidebarProvider>
  );
}

function getDashboardFeatureAccess(
  user: Awaited<ReturnType<typeof getAuthUser>>,
  plan: string | null,
  disabledFeatures: FeatureKey[]
): FeatureAccessMap {
  if (!user || !plan) return {};

  const features: FeatureKey[] = [
    "dashboard.overview",
    "toko.manage",
    "service.management",
    "inventory.management",
    "karyawan.management",
    "staff.workflow",
    "technician.workflow",
    "inventory.audit",
  ];

  return Object.fromEntries(
    features.map((feature) => [
      feature,
      canUseFeature({ plan, role: user.role, feature, disabledFeatures }),
    ])
  ) as FeatureAccessMap;
}
