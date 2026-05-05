"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { getRoleRedirectPath } from "@/lib/redirect-by-role";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { attachPendingReferralToCurrentUser } from "@/actions/affiliate";

export default function DashboardLandingPage() {
  const router = useRouter();
  const { user, tokoList, isLoading } = useAuth();
  const userId = user?.id ?? null;
  const userRole = user?.role ?? null;
  const firstTokoId = tokoList[0]?.id ?? null;

  useEffect(() => {
    if (isLoading || !userId || !userRole) return;

    async function attachAndRedirect() {
      await attachPendingReferralToCurrentUser();

      if (userRole === "superuser") {
        router.replace("/superuser");
        return;
      }

      if (!firstTokoId) {
        if (userRole === "admin") {
          router.replace("/onboard");
        }
        return;
      }

      router.replace(getRoleRedirectPath(firstTokoId, userRole));
    }

    void attachAndRedirect();
  }, [firstTokoId, isLoading, router, userId, userRole]);

  if (!isLoading && user && user.role === "superuser") {
    return null;
  }

  if (!isLoading && user && tokoList.length === 0 && user.role !== "admin") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-6 text-center">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">Belum ada toko yang bisa diakses</h1>
          <p className="text-sm text-muted-foreground">
            Akun ini belum punya assignment toko. Hubungi admin untuk mendapatkan akses.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
