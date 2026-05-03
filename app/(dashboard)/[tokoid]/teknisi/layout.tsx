import { redirect } from "next/navigation";
import { FeatureLocked } from "@/components/dashboard/feature-locked";
import { FEATURE_REGISTRY, getFeatureLockReason } from "@/lib/features";
import { getRoleRedirectPath } from "@/lib/redirect-by-role";
import { getRequestScope } from "@/lib/auth/request-scope";

interface TeknisiLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tokoid: string }>;
}

export default async function TeknisiLayout({ children, params }: TeknisiLayoutProps) {
  const { tokoid } = await params;

  let scope: Awaited<ReturnType<typeof getRequestScope>>;
  try {
    scope = await getRequestScope(tokoid);
  } catch {
    redirect("/auth");
  }

  if (scope.user.role !== "technician") {
    redirect(getRoleRedirectPath(tokoid, scope.user.role));
  }

  const lockReason = getFeatureLockReason({
    plan: scope.plan,
    role: scope.user.role,
    feature: "technician.workflow",
    disabledFeatures: scope.disabledFeatures,
  });

  if (lockReason) {
    const feature = FEATURE_REGISTRY["technician.workflow"];
    return (
      <FeatureLocked
        featureLabel={feature.label}
        featureDescription={feature.description}
        requiredPlan={feature.minimumPlan}
        reason={lockReason}
        tokoId={tokoid}
      />
    );
  }

  return <>{children}</>;
}
