import { getAuthUser, getEffectivePlanForToko } from "@/lib/rbac";
import { FeatureLocked } from "@/components/dashboard/feature-locked";
import { getDisabledFeaturesForToko } from "@/actions/feature-settings";
import { FEATURE_REGISTRY, getFeatureLockReason } from "@/lib/features";
import { getRoleRedirectPath } from "@/lib/redirect-by-role";
import { redirect } from "next/navigation";

interface StaffLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tokoid: string }>;
}

export default async function StaffLayout({ children, params }: StaffLayoutProps) {
  const { tokoid } = await params;
  const user = await getAuthUser();

  if (!user) {
    redirect("/auth");
  }

  if (!user.tokoIds.includes(tokoid)) {
    redirect("/dashboard");
  }

  if (user.role !== "staff") {
    redirect(getRoleRedirectPath(tokoid, user.role));
  }

  const plan = await getEffectivePlanForToko(user, tokoid);
  const disabledFeatures = await getDisabledFeaturesForToko(tokoid);
  const lockReason = getFeatureLockReason({ plan, role: user.role, feature: "staff.workflow", disabledFeatures });

  if (lockReason) {
    const feature = FEATURE_REGISTRY["staff.workflow"];
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
