"use client";

import { AuthCard } from "@/components/auth/auth-card";
import { Card, CardContent } from "@/components/ui/card";
import { useSession } from "@/lib/auth-client";
import {
  RiShieldCheckLine,
  RiSmartphoneLine,
  RiStore2Line,
  RiTeamLine,
} from "@remixicon/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const highlights = [
  {
    icon: RiSmartphoneLine,
    title: "Ticket servis terstruktur",
    description: "Keluhan, device, IMEI, DP, sparepart, dan invoice tersimpan dalam satu alur kerja.",
  },
  {
    icon: RiTeamLine,
    title: "Role tim jelas",
    description: "Admin, staff, dan teknisi punya dashboard sesuai tanggung jawab masing-masing.",
  },
  {
    icon: RiShieldCheckLine,
    title: "Operasional lebih aman",
    description: "Status servis, pembayaran, pickup, dan stok tercatat agar keputusan tidak bergantung pada chat.",
  },
];

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_36rem),linear-gradient(135deg,hsl(var(--background)),hsl(var(--muted)))] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-6xl items-center gap-6 lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[1.08fr_0.92fr] lg:gap-10">
        <Card className="overflow-hidden border-primary/15 bg-card/85 shadow-2xl shadow-primary/10 backdrop-blur">
          <CardContent className="relative p-6 sm:p-8 lg:p-10">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
                  <RiStore2Line className="size-4 text-primary" />
                  Repair Management System
                </div>
                <div className="space-y-3">
                  <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    Jalankan toko servis HP tanpa data tercecer.
                  </h1>
                  <p className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                    RMS membantu tim mencatat servis, mengatur teknisi, mengontrol stok sparepart, dan menutup invoice dari satu dashboard.
                  </p>
                </div>
              </div>

              <div className="grid gap-3">
                {highlights.map((item) => (
                  <div key={item.title} className="rounded-3xl border bg-background/65 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <item.icon className="size-5" />
                      </div>
                      <div className="space-y-1">
                        <h2 className="font-medium">{item.title}</h2>
                        <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="w-full max-w-md justify-self-center lg:justify-self-end">
          <AuthCard
            redirectAfterLogin="/dashboard"
            redirectAfterRegister="/dashboard"
            showGoogleAuth={true}
            className="shadow-2xl shadow-foreground/5"
          />
        </div>
      </div>
    </div>
  );
}
