"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import {
  getTokoFeatureSettingsWithStatus,
  setTokoFeatureEnabled,
  type FeatureSettingsStatusData,
  type FeatureSettingRow,
} from "@/actions/feature-settings";
import type { FeatureKey } from "@/lib/features";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiCheckboxCircleLine, RiLoader4Line, RiLockLine, RiStore2Line, RiVipCrownLine } from "@remixicon/react";
import Image from "next/image";
import { toast } from "sonner";
import { FaArrowCircleUp } from "react-icons/fa";

const categoryLabels: Record<string, string> = {
  dashboard: "Dashboard",
  toko: "Toko",
  service: "Service",
  inventory: "Inventory",
  team: "Team",
  analytics: "Analytics",
  realtime: "Realtime",
  appearance: "Appearance",
};

const planLabels: Record<string, string> = {
  free: "Free",
  premium: "Pro",
  enterprise: "Enterprise",
};

interface FeatureSettingsTabProps {
  tokoId: string;
}

export function FeatureSettingsTab({ tokoId }: FeatureSettingsTabProps) {
  const { user, tokoList } = useAuth();
  const currentToko = tokoList.find((t) => t.id === tokoId);
  const [features, setFeatures] = useState<FeatureSettingRow[]>([]);
  const [settingsInfo, setSettingsInfo] = useState<Omit<FeatureSettingsStatusData, "features"> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingFeatures, setPendingFeatures] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchFeatures() {
      setIsLoading(true);
      const result = await getTokoFeatureSettingsWithStatus(tokoId);
      if (result.success && result.data) {
        setFeatures(result.data.features);
        setSettingsInfo({ tokoId: result.data.tokoId, tokoName: result.data.tokoName, plan: result.data.plan });
      } else {
        toast.error(result.error || "Failed to load feature settings");
      }
      setIsLoading(false);
    }
    fetchFeatures();
  }, [tokoId]);

  const loadFeatures = useCallback(async () => {
    setIsLoading(true);
    const result = await getTokoFeatureSettingsWithStatus(tokoId);
    if (result.success && result.data) {
      setFeatures(result.data.features);
      setSettingsInfo({ tokoId: result.data.tokoId, tokoName: result.data.tokoName, plan: result.data.plan });
    } else {
      toast.error(result.error || "Failed to load feature settings");
    }
    setIsLoading(false);
  }, [tokoId]);

  const handleToggle = useCallback(
    async (featureKey: FeatureKey, enabled: boolean) => {
      const feature = features.find((f) => f.key === featureKey);
      if (!feature) return;

      if (!feature.configurable) {
        toast.error(`${feature.label} cannot be disabled`);
        return;
      }

      if (feature.status === "plan_required") {
        toast.error(`${feature.label} requires ${feature.minimumPlan} plan`);
        return;
      }

      setPendingFeatures((prev) => new Set(prev).add(featureKey));

      const result = await setTokoFeatureEnabled(tokoId, featureKey, enabled);

      if (result.success && result.data) {
        setFeatures((prev) =>
          prev.map((f) => {
            if (f.key !== featureKey) return f;
            const isDisabledByToko = result.data!.disabledFeatures.includes(f.key);
            const newStatus = isDisabledByToko ? "disabled_by_toko" : "enabled";
            return { ...f, enabled: !isDisabledByToko, status: newStatus };
          })
        );
        toast.success(`${feature.label} ${enabled ? "enabled" : "disabled"}`);
      } else {
        toast.error(result.error || "Failed to update feature");
        loadFeatures();
      }

      setPendingFeatures((prev) => {
        const next = new Set(prev);
        next.delete(featureKey);
        return next;
      });
    },
    [tokoId, features, loadFeatures]
  );

  if (user?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <RiLockLine className="size-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">Only admins can manage feature settings.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {["Service", "Inventory", "Team", "Analytics"].map((category) => (
          <div key={category} className="space-y-4">
            <Skeleton className="h-6 w-24" />
            <div className="space-y-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const featuresByCategory = features.reduce<Record<string, FeatureSettingRow[]>>((acc, feature) => {
    const cat = feature.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(feature);
    return acc;
  }, {});

  const hasAnyFeatures = Object.keys(featuresByCategory).length > 0;

  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            {currentToko?.logoUrl ? (
              <Image
                src={currentToko.logoUrl}
                alt={currentToko.name}
                width={40}
                height={40}
                className="rounded-full object-cover"
              />
            ) : (
              <RiStore2Line className="size-10 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium">{settingsInfo?.tokoName ?? "Toko ini"}</p>
              <Badge variant="outline" className="gap-1">
                <RiVipCrownLine className="size-3" />
                {planLabels[settingsInfo?.plan ?? "free"]}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Pengaturan ini berlaku untuk semua user di toko {settingsInfo?.tokoName ?? "ini"}.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadFeatures} disabled={isLoading}>
          <FaArrowCircleUp />
          Refresh
        </Button>
      </div>

      {!hasAnyFeatures && (
        <Card>
          <CardContent className="py-8">
            <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground text-center">
              Tidak ada fitur yang tersedia untuk toko ini.
            </p>
          </CardContent>
        </Card>
      )}

      {hasAnyFeatures &&
        Object.entries(featuresByCategory).map(([category, categoryFeatures]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="text-base">{categoryLabels[category] || category}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {categoryFeatures.map((feature) => {
                const isPending = pendingFeatures.has(feature.key);
                const isLockedByPlan = feature.status === "plan_required";
                const isRequired = feature.status === "required";

                return (
                  <div
                    key={feature.key}
                    className={`flex items-center justify-between gap-4 p-4 rounded-lg border border-border/50 transition-colors ${
                      isRequired ? "bg-muted/20" : "bg-card/50 hover:bg-card"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-medium">{feature.label}</span>
                        <FeatureStatusBadge feature={feature} />
                      </div>
                      <p className="text-xs text-muted-foreground">{feature.description}</p>
                      {isLockedByPlan && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Butuh {planLabels[feature.minimumPlan]} plan.
                          <Link href={`/${tokoId}/admin?settings=premium`} className="text-primary underline ml-1">
                            Upgrade
                          </Link>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isRequired ? (
                        <RiCheckboxCircleLine className="size-5 shrink-0 text-green-600" />
                      ) : isPending ? (
                        <RiLoader4Line className="size-4 animate-spin text-muted-foreground" />
                      ) : (
                        <Switch
                          checked={feature.enabled}
                          disabled={isLockedByPlan}
                          onCheckedChange={(checked) => handleToggle(feature.key, checked)}
                          aria-label={`Toggle ${feature.label}`}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}

      <div className="pt-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground/70">
          Fitur dengan ikon ✓ wajib aktif karena merupakan bagian dari sistem inti. Fitur yang terkunci membutuhkan
          upgrade plan.
        </p>
      </div>
    </div>
  );
}

function FeatureStatusBadge({ feature }: { feature: FeatureSettingRow }) {
  if (feature.status === "plan_required") {
    return <Badge variant="secondary" className="text-xs">Requires {planLabels[feature.minimumPlan]}</Badge>;
  }

  if (feature.status === "required") {
    return <Badge variant="outline" className="text-xs">Required</Badge>;
  }

  return null;
}
