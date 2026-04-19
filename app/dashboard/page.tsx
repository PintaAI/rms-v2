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

    if (tokoList.length === 0) {
      return;
    }

    const firstToko = tokoList[0];
    router.replace(getRoleRedirectPath(firstToko.id, user.role));
  }, [user, tokoList, isLoading, router]);

  return null;
}