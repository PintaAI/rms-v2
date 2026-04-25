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
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RiCheckboxCircleLine, RiLoader4Line, RiLockLine, RiSettings4Line, RiStore2Line, RiVipCrownLine } from "@remixicon/react";
import { toast } from "sonner";

const categoryLabels: Record<string, string> = {
  dashboard: "Dashboard",
  toko: "Toko",
  service: "Service",
  inventory: "Inventory",
  team: "Team",
  analytics: "Analytics",
  appearance: "Appearance",
};

const planLabels: Record<string, string> = {
  free: "Free",
  premium: "Premium",
  enterprise: "Enterprise",
};

interface FeatureSettingsTabProps {
  tokoId: string;
}

export function FeatureSettingsTab({ tokoId }: FeatureSettingsTabProps) {
  const { user } = useAuth();
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

  const fixedFeatures = features.filter((feature) => !feature.configurable);
  const configurableFeatures = features.filter((feature) => feature.configurable);
  const enabledConfigurableCount = configurableFeatures.filter((feature) => feature.enabled).length;

  console.group("[feature-settings-tab] render decision");
  console.log("Toko:", settingsInfo ?? { tokoId });
  console.table(
    features.map((feature) => ({
      key: feature.key,
      label: feature.label,
      configurable: feature.configurable,
      enabled: feature.enabled,
      status: feature.status,
      section: feature.configurable ? "Fitur yang Bisa Diatur" : "Required",
      switchDisabled: feature.status === "plan_required",
      decision: feature.configurable
        ? feature.status === "plan_required"
          ? "render in configurable list, disabled by plan"
          : "render in configurable list, can toggle"
        : "render in required list, cannot toggle",
    }))
  );
  console.groupEnd();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <RiStore2Line className="size-5 text-muted-foreground" />
            <p className="font-medium">{settingsInfo?.tokoName ?? "Toko ini"}</p>
            <Badge variant="outline" className="gap-1">
              <RiVipCrownLine className="size-3" />
              {planLabels[settingsInfo?.plan ?? "free"]} plan
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <RiSettings4Line className="size-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Pengaturan ini berlaku untuk semua user di toko {settingsInfo?.tokoName ?? "ini"}.
            </p>
          </div>
          <p className="text-xs text-muted-foreground/70">
            Fitur yang wajib aktif mengikuti sistem inti dan plan aktif toko.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadFeatures} disabled={isLoading}>
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fitur</CardTitle>
          <CardDescription>
            Fitur dasar dan fitur opsional yang berlaku untuk {settingsInfo?.tokoName ?? "toko ini"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Required</p>
            <p className="text-xs text-muted-foreground">Fitur inti yang selalu aktif dan tidak bisa dimatikan.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {fixedFeatures.map((feature) => (
              <FeatureRequiredChip key={feature.key} feature={feature} />
            ))}
          </div>

          <Separator />

          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Fitur yang Bisa Diatur</p>
              <p className="text-xs text-muted-foreground">
                {enabledConfigurableCount} dari {configurableFeatures.length} fitur opsional aktif. Fitur yang tidak terkunci plan bisa dimatikan atau dinyalakan.
              </p>
            </div>
            <Badge variant="secondary">Admin only</Badge>
          </div>

          <div className="space-y-2">
            {configurableFeatures.length === 0 ? (
              <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                Tidak ada fitur opsional yang bisa diatur untuk toko ini.
              </p>
            ) : (
              configurableFeatures.map((feature) => {
                const isPending = pendingFeatures.has(feature.key);
                const isLockedByPlan = feature.status === "plan_required";

                return (
                  <div
                    key={feature.key}
                    className="flex items-center justify-between gap-4 p-4 rounded-lg border border-border/50 bg-card/50 hover:bg-card transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-medium">{feature.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {categoryLabels[feature.category] || feature.category}
                        </Badge>
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
                      {isPending ? (
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
              })
            )}
          </div>
        </CardContent>
      </Card>

      <div className="pt-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground/70">
          Fitur yang terkunci membutuhkan upgrade plan. Fitur wajib tidak bisa dimatikan karena dipakai operasi dasar aplikasi.
        </p>
      </div>
    </div>
  );
}

function FeatureRequiredChip({ feature }: { feature: FeatureSettingRow }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2">
      <RiCheckboxCircleLine className="size-4 shrink-0 text-green-600" />
      <p className="min-w-0 flex-1 truncate text-sm font-medium">{feature.label}</p>
      <Badge variant="outline" className="text-xs">Required</Badge>
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

  if (feature.status === "disabled_by_toko") {
    return <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground">Off</Badge>;
  }

  return <Badge variant="success" className="text-xs">On</Badge>;
}
