import type { ReactNode } from "react";
import { RiVipCrownLine, RiUserLine, RiToolsLine, RiLineChartLine, RiClipboardLine, RiCheckboxCircleLine, RiWhatsappLine } from "@remixicon/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWhatsAppEnterpriseUrl, getWhatsAppProBetaRequestUrl } from "@/components/settings/helpers";
import type { FeatureKey, SubscriptionPlan } from "@/lib/features";
import { FEATURE_PREVIEW_INFO, planLabels } from "@/lib/feature-preview-mocks";

interface FeaturePreviewProps {
  featureKey: FeatureKey;
  requiredPlan: SubscriptionPlan;
  children: ReactNode;
}

export function FeaturePreview({ featureKey, requiredPlan, children }: FeaturePreviewProps) {
  const info = FEATURE_PREVIEW_INFO[featureKey];
  if (!info) return null;
  const upgradeUrl = requiredPlan === "enterprise"
    ? getWhatsAppEnterpriseUrl({})
    : getWhatsAppProBetaRequestUrl({ context: `Upgrade ${info.title} dari Feature Preview` });

  return (
    <div className="relative h-[60vh] overflow-hidden">
      <div className="pointer-events-none select-none opacity-70 blur-[0.5px]">
        {children}
      </div>

      <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/55 backdrop-blur-[1px]">
        <Card className="mx-4 w-full max-w-lg border-primary/20 bg-card/95 shadow-lg">
          <CardHeader className="gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <FeatureIcon type={info.previewType} />
              </div>
              <div className="min-w-0 space-y-1">
                <CardTitle className="text-xl font-black tracking-tight">{info.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{info.description}</p>
              </div>
            </div>
            <Badge variant="warning" className="gap-1">
              <RiVipCrownLine className="size-3" />
              Butuh {planLabels[requiredPlan]}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Keuntungan fitur ini:</p>
              <ul className="space-y-1">
                {info.benefits.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <RiCheckboxCircleLine className="size-4 mt-0.5 text-primary shrink-0" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
            <Button asChild className="w-full">
              <a href={upgradeUrl} target="_blank" rel="noreferrer">
                <RiWhatsappLine className="size-4" />
                Upgrade ke {planLabels[requiredPlan]}
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FeatureIcon({ type }: { type: string }) {
  switch (type) {
    case "staff":
      return <RiUserLine className="size-5" />;
    case "sparepart":
      return <RiToolsLine className="size-5" />;
    case "revenue":
      return <RiLineChartLine className="size-5" />;
    case "audit":
      return <RiClipboardLine className="size-5" />;
    default:
      return <RiVipCrownLine className="size-5" />;
  }
}
