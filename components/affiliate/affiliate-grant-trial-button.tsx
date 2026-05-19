"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { grantReferralProTrialFromPortal } from "@/actions/affiliate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AffiliateGrantTrialButtonProps {
  code: string;
  token: string;
  referralId: string;
  canGrantProTrial: boolean;
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
  proTrialStartedAt: string | null;
}

export function AffiliateGrantTrialButton({
  code,
  token,
  referralId,
  canGrantProTrial,
  subscriptionStatus,
  trialEndsAt,
  proTrialStartedAt,
}: AffiliateGrantTrialButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const grantTrial = () => {
    startTransition(async () => {
      const result = await grantReferralProTrialFromPortal({ code, token, referralId });
      if (!result.success) {
        toast.error(result.error || "Gagal approve trial Pro");
        return;
      }

      toast.success("Trial Pro berhasil diaktifkan");
      router.refresh();
    });
  };

  if (subscriptionStatus === "trialing" && trialEndsAt) {
    return <Badge variant="warning">Trial sampai {new Date(trialEndsAt).toLocaleDateString("id-ID")}</Badge>;
  }

  if (proTrialStartedAt) {
    return <Badge variant="outline">Trial used</Badge>;
  }

  if (!canGrantProTrial) {
    return <span className="text-sm text-muted-foreground">Tidak eligible</span>;
  }

  return (
    <Button size="sm" variant="outline" onClick={grantTrial} disabled={isPending}>
      {isPending ? "Approving..." : "Approve Pro Trial"}
    </Button>
  );
}
