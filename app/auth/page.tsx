"use client";

import { AuthCard } from "@/components/auth/auth-card";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (!isPending && session) {
      router.replace("/dashboard");
    }
  }, [session, isPending, router]);

  // Don't render auth card if already authenticated (will redirect)
  if (session) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md">
        <AuthCard
          redirectAfterLogin="/dashboard"
          redirectAfterRegister="/dashboard"
          showGoogleAuth={true}
        />
      </div>
    </div>
  );
}
