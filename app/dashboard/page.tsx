"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { getRoleRedirectPath } from "@/lib/redirect-by-role";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLandingPage() {
  const router = useRouter();
  const { user, tokoList, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading || !user) return;

    if (user.role === "superuser") {
      router.replace("/superuser");
      return;
    }

    if (tokoList.length === 0) {
      if (user.role === "admin") {
        router.replace("/onboard");
      }
      return;
    }

    const firstToko = tokoList[0];
    router.replace(getRoleRedirectPath(firstToko.id, user.role));
  }, [user, tokoList, isLoading, router]);

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
