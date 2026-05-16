import { getAdminAnalytics } from "@/actions/analytics";
import { AdminAnalyticsDashboard } from "@/components/dashboard/admin/analytics-dashboard";
import { FeatureLocked } from "@/components/dashboard/feature-locked";
import { FeaturePreview } from "@/components/dashboard/feature-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { can, getPermissionLockReason, getPageFeatureCheck, getRequestScope } from "@/lib/auth/request-scope";
import { MOCK_ANALYTICS_DATA } from "@/lib/feature-preview-mocks";
import type { PermissionLockReason } from "@/lib/permissions";
import { RiLock2Line } from "@remixicon/react";
import Link from "next/link";

interface SharedAnalyticsPageProps {
  params: Promise<{ tokoid: string }>;
  searchParams: Promise<{ from?: string; to?: string; allTime?: string; status?: string }>;
}

const permissionLockLabels: Record<PermissionLockReason, string> = {
  missing_permission: "Akun ini belum memiliki permission analytics.view.",
  feature_unavailable: "Fitur analytics belum tersedia untuk toko ini.",
  unknown_permission: "Permission analytics.view tidak dikenali.",
};

function AnalyticsPermissionLocked({ reason }: { reason: PermissionLockReason | null }) {
  const lockReason = reason ?? "missing_permission";

  return (
    <div className="flex min-h-[55vh] items-center justify-center p-4">
      <Card className="max-w-xl border-primary/15 bg-gradient-to-br from-card via-card to-primary/5 shadow-sm">
        <CardHeader className="gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <RiLock2Line className="size-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-xl font-black tracking-tight">Analytics terkunci</CardTitle>
              <CardDescription>{permissionLockLabels[lockReason]}</CardDescription>
            </div>
          </div>
          <Badge variant="outline">Permission required: analytics.view</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Hubungi admin toko jika Anda membutuhkan akses analytics.
          </p>
          <Button asChild variant="outline">
            <Link href="/dashboard">Kembali ke dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function SharedAnalyticsPage({ params, searchParams }: SharedAnalyticsPageProps) {
  const { tokoid } = await params;
  const filters = await searchParams;
  const scope = await getRequestScope(tokoid);
  const access = getPageFeatureCheck(scope, "analytics.revenue");

  if (access.reason === "plan_required") {
    return (
      <FeaturePreview featureKey="analytics.revenue" requiredPlan={access.metadata.minimumPlan}>
        <AdminAnalyticsDashboard data={MOCK_ANALYTICS_DATA} />
      </FeaturePreview>
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

  if (!can(scope, "analytics.view")) {
    return <AnalyticsPermissionLocked reason={getPermissionLockReason(scope, "analytics.view")} />;
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
