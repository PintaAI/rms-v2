import { getStaffOverview } from "@/actions/overview";
import { getAuthProviderData } from "@/actions/user";
import { StaffOverview } from "@/components/dashboard/staff/staff-overview";
import { getRequestScope, getPageFeatureCheck } from "@/lib/auth/request-scope";
import { FeaturePreview } from "@/components/dashboard/feature-preview";
import { redirect } from "next/navigation";

export default async function StaffOverviewPage({
  params,
}: {
  params: Promise<{ tokoid: string }>;
}) {
  const { tokoid } = await params;

  const scope = await getRequestScope(tokoid);
  const access = getPageFeatureCheck(scope, "staff.workflow");

  if (access.reason === "role_denied") redirect("/dashboard");
  if (access.reason === "disabled_by_toko") redirect("/dashboard");

  if (access.reason === "plan_required") {
    return (
      <FeaturePreview
        featureKey="staff.workflow"
        requiredPlan={access.metadata.minimumPlan}
        tokoId={tokoid}
      />
    );
  }

  if (!access.allowed) {
    redirect("/dashboard");
  }

  const [result, { tokoList }] = await Promise.all([
    getStaffOverview(tokoid),
    getAuthProviderData(),
  ]);

  if (!result.success || !result.data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-muted-foreground text-destructive">
          {result.error || "Gagal memuat data"}
        </p>
      </div>
    );
  }

  const currentToko = tokoList.find((toko) => toko.id === tokoid);

  return <StaffOverview data={result.data} tokoId={tokoid} currentToko={currentToko} />;
}
