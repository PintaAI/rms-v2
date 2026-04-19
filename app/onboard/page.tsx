"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { OnboardingWizard } from "@/components/shared/onboarding-wizard";

export default function OnboardPage() {
  const router = useRouter();
  const { user, tokoList, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace("/auth");
      return;
    }

    if (user.role !== "admin") {
      router.replace("/dashboard");
      return;
    }

    if (tokoList.length > 0) {
      const onboardCompleted = localStorage.getItem("onboard_completed");
      if (!onboardCompleted) {
        localStorage.setItem("onboard_completed", "true");
      }
      const firstToko = tokoList[0];
      router.replace(`/${firstToko.id}/admin`);
      return;
    }

    const onboardCompleted = localStorage.getItem("onboard_completed");
    if (onboardCompleted) {
      router.replace("/dashboard");
      return;
    }
  }, [user, tokoList, isLoading, router]);

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-2xl">
        <OnboardingWizard />
      </div>
    </div>
  );
}