import { getAdminAnalytics } from "@/actions/analytics";
import { AdminAnalyticsDashboard } from "@/components/dashboard/admin/analytics-dashboard";
import { FeatureLocked } from "@/components/dashboard/feature-locked";
import { FeaturePreview } from "@/components/dashboard/feature-preview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPageFeatureCheck, getRequestScope } from "@/lib/auth/request-scope";
import { redirect } from "next/navigation";

interface AdminAnalyticsPageProps {
  params: Promise<{ tokoid: string }>;
  searchParams: Promise<{ from?: string; to?: string; allTime?: string; status?: string }>;
}

export default async function AdminAnalyticsPage({ params, searchParams }: AdminAnalyticsPageProps) {
  const { tokoid } = await params;
  const filters = await searchParams;
  const scope = await getRequestScope(tokoid);
  const access = getPageFeatureCheck(scope, "analytics.revenue");

  if (access.reason === "role_denied") redirect("/dashboard");
  if (access.reason === "disabled_by_toko") redirect(`/${tokoid}/admin`);

  if (access.reason === "plan_required") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground/70">
            Pantau revenue, service, teknisi, dan inventory dalam satu dashboard Enterprise.
          </p>
        </div>
        <FeaturePreview featureKey="analytics.revenue" requiredPlan={access.metadata.minimumPlan} tokoId={tokoid} />
      </div>
    );
  }

  if (!access.allowed) {
    return (
      <FeatureLocked
        featureLabel={access.metadata.label}
        featureDescription={access.metadata.description}
        requiredPlan={access.metadata.minimumPlan}
        reason={access.reason ?? "plan_required"}
        tokoId={tokoid}
      />
    );
  }

  const result = await getAdminAnalytics(tokoid, filters);

  if (!result.success || !result.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{result.error ?? "Gagal memuat analytics"}</p>
        </CardContent>
      </Card>
    );
  }

  return <AdminAnalyticsDashboard data={result.data} />;
}
