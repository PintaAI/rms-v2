"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { OnboardingWizard } from "@/components/shared/onboarding-wizard";
import { UserInfo } from "@/components/shared/user-info";
import { attachPendingReferralToCurrentUser } from "@/actions/affiliate";

export default function OnboardPage() {
  const router = useRouter();
  const { user, tokoList, isLoading } = useAuth();
  const userId = user?.id ?? null;
  const userRole = user?.role ?? null;
  const firstTokoId = tokoList[0]?.id ?? null;

  useEffect(() => {
    if (isLoading) return;

    async function attachAndRedirect() {
      if (!userId) {
        router.replace("/auth");
        return;
      }

      await attachPendingReferralToCurrentUser();

      if (userRole !== "admin") {
        router.replace("/dashboard");
        return;
      }

      if (firstTokoId) {
        router.replace(`/${firstTokoId}/admin`);
      }
    }

    void attachAndRedirect();
  }, [firstTokoId, isLoading, router, userId, userRole]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user || user.role !== "admin" || tokoList.length > 0) {
    return null;
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4 pt-24 sm:pt-4">
      <div className="absolute right-4 top-4 z-10">
        <UserInfo />
      </div>
      <div className="w-full max-w-2xl">
        <OnboardingWizard />
      </div>
    </div>
  );
}
