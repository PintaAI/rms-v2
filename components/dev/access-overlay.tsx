"use client";

import { useState } from "react";
import { useDashboardScope } from "@/components/dashboard/layout/dashboard-scope-context";
import { FEATURE_REGISTRY, FEATURE_KEYS, getFeatureLockReason, type FeatureKey, type FeatureLockReason } from "@/lib/features";
import type { UserRole } from "@/lib/auth/request-user";
import { RiBugLine, RiCloseLine, RiShieldCheckLine, RiShieldCrossLine } from "@remixicon/react";

const REASON_LABELS: Record<FeatureLockReason, string> = {
  role_denied: "Role",
  plan_required: "Plan",
  disabled_by_toko: "Toko",
};

export function DevAccessOverlay() {
  const scope = useDashboardScope();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-3 right-3 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110"
        title="Dev: Access Debugger"
      >
        <RiBugLine className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed bottom-14 right-3 z-50 max-h-[75vh] w-80 overflow-auto rounded-lg border border-border bg-background p-4 shadow-2xl text-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-semibold text-xs">Dev: Access Debugger</span>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <RiCloseLine className="h-4 w-4" />
            </button>
          </div>

          <UserSection scope={scope} />
          <Separator />
          <FeatureSection scope={scope} />
        </div>
      )}
    </>
  );
}

function UserSection({ scope }: { scope: ReturnType<typeof useDashboardScope> }) {
  return (
    <div className="mb-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Role</span>
        <span className="rounded bg-accent px-1.5 py-0.5 font-mono text-xs font-medium">
          {scope.user.role}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Plan</span>
        <span className="rounded bg-accent px-1.5 py-0.5 font-mono text-xs font-medium">
          {scope.user.plan}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Toko</span>
        <span className="max-w-[160px] truncate rounded bg-accent px-1.5 py-0.5 font-mono text-xs font-medium">
          {scope.tokoId}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Name</span>
        <span className="max-w-[160px] truncate rounded bg-accent px-1.5 py-0.5 font-mono text-xs font-medium">
          {scope.user.name}
        </span>
      </div>
    </div>
  );
}

function FeatureSection({ scope }: { scope: ReturnType<typeof useDashboardScope> }) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-semibold text-muted-foreground">Features</span>
      {FEATURE_KEYS.map((key) => {
        const allowed = scope.featureAccess[key] ?? false;
        const reason = getFeatureLockReason({
          plan: scope.user.plan,
          role: scope.user.role,
          feature: key,
          disabledFeatures: scope.disabledFeatures,
        });
        const meta = FEATURE_REGISTRY[key];

        return (
          <div key={key} className="flex items-start justify-between gap-2 rounded px-1.5 py-1 hover:bg-accent/50">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                {allowed ? (
                  <RiShieldCheckLine className="h-3.5 w-3.5 shrink-0 text-green-500" />
                ) : (
                  <RiShieldCrossLine className="h-3.5 w-3.5 shrink-0 text-red-500" />
                )}
                <span className="truncate font-mono text-[11px]">{meta.label}</span>
              </div>
              {!allowed && reason && (
                <span className="ml-5 text-[10px] text-muted-foreground">
                  Locked: {REASON_LABELS[reason]}
                </span>
              )}
            </div>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {meta.minimumPlan}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Separator() {
  return <div className="my-3 border-t border-border" />;
}
