import Link from "next/link";
import { RiLock2Line, RiVipCrownLine } from "@remixicon/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { FeatureLockReason, SubscriptionPlan } from "@/lib/features";

const planLabels: Record<SubscriptionPlan, string> = {
  free: "Free",
  premium: "Premium",
  enterprise: "Enterprise",
};

const reasonLabels: Record<FeatureLockReason, string> = {
  role_denied: "Role akun ini tidak memiliki akses ke fitur ini.",
  plan_required: "Fitur ini belum termasuk di paket toko saat ini.",
  disabled_by_toko: "Fitur ini sedang dimatikan untuk toko ini.",
};

interface FeatureLockedProps {
  featureLabel: string;
  featureDescription?: string;
  requiredPlan: SubscriptionPlan;
  reason: FeatureLockReason;
  tokoId?: string;
}

export function FeatureLocked({ featureLabel, featureDescription, requiredPlan, reason, tokoId }: FeatureLockedProps) {
  const showUpgradeCTA = reason === "plan_required" && tokoId;

  return (
    <div className="flex min-h-[55vh] items-center justify-center p-4">
      <Card className="max-w-xl border-primary/15 bg-gradient-to-br from-card via-card to-primary/5 shadow-sm">
        <CardHeader className="gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <RiLock2Line className="size-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-xl font-black tracking-tight">{featureLabel} terkunci</CardTitle>
              <CardDescription>{featureDescription ?? reasonLabels[reason]}</CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {showUpgradeCTA && <Badge variant="warning">Butuh {planLabels[requiredPlan]}</Badge>}
            <Badge variant="outline">{reasonLabels[reason]}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showUpgradeCTA ? (
            <>
              <p className="text-sm text-muted-foreground">
                Upgrade ke {planLabels[requiredPlan]} untuk mengakses fitur ini.
              </p>
              <Button asChild>
                <Link href={`/${tokoId}/admin?settings=premium`}>
                  <RiVipCrownLine className="size-4" />
                  Upgrade ke {planLabels[requiredPlan]}
                </Link>
              </Button>
            </>
          ) : reason === "role_denied" ? (
            <>
              <p className="text-sm text-muted-foreground">
                Hubungi admin toko jika Anda membutuhkan akses ke fitur ini.
              </p>
              <Button asChild variant="outline">
                <Link href="/dashboard">Kembali ke dashboard</Link>
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Admin toko dapat mengaktifkan fitur ini di Pengaturan Fitur.
              </p>
              <Button asChild variant="outline">
                <Link href="/dashboard">Kembali ke dashboard</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}