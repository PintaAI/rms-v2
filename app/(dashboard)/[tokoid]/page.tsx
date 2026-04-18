"use client";

import { useAuth } from "@/components/auth-provider";
import { getRoleRedirectPath } from "@/lib/redirect-by-role";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  const { tokoid } = useParams<{ tokoid: string }>();
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading || !user) return;

    router.replace(getRoleRedirectPath(tokoid, user.role));
  }, [user, isLoading, tokoid, router]);

  return null;
}