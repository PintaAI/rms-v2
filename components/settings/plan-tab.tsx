"use client";

import * as React from "react";
import { toast } from "sonner";
import { RiAddLine, RiCheckboxCircleLine, RiLoader4Line, RiLock2Line, RiVipCrownLine, RiWhatsappLine } from "@remixicon/react";
import { createProSubscriptionInvoice } from "@/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { BillingPlanSummary } from "@/actions";
import { getWhatsAppEnterpriseUrl, getWhatsAppProBetaRequestUrl, planLabels } from "./helpers";
import type { PlanTabProps } from "./types";

export function PlanSettingsTab({ summary, ownerBilling, isLoading, onChanged, userEmail, tokoName }: PlanTabProps) {
  const plan = summary?.plan ?? "free";
  const [isCreatingInvoice, startCreateInvoice] = React.useTransition();
  const proBetaRequestUrl = getWhatsAppProBetaRequestUrl({ email: userEmail, tokoName, context: "Upgrade ke Pro dari User Settings" });
  const enterpriseContactUrl = getWhatsAppEnterpriseUrl({ email: userEmail, tokoName });
  const latestInvoice = ownerBilling?.latestInvoice ?? null;
  const hasOpenProInvoice = latestInvoice?.plan === "premium" && !["paid", "void"].includes(latestInvoice.status);
  const allFeatures = [...(summary?.includedFeatures ?? []), ...(summary?.lockedFeatures ?? [])];

  const handleCreateProInvoice = () => {
    startCreateInvoice(async () => {
      const result = await createProSubscriptionInvoice();
      if (!result.success) {
        toast.error(result.error || "Gagal membuat invoice Pro");
        return;
      }
      toast.success("Invoice Pro siap dibayar");
      onChanged();
    });
  };

  return (
    <div className="space-y-4">
      {plan === "free" ? (
        <>
          <ProUpgradeCard isLoading={isLoading} isCreatingInvoice={isCreatingInvoice} hasOpenProInvoice={Boolean(hasOpenProInvoice)} latestInvoice={latestInvoice} proBetaRequestUrl={proBetaRequestUrl} onCreateInvoice={handleCreateProInvoice} />
          <EnterpriseCard contactUrl={enterpriseContactUrl} />
        </>
      ) : plan === "premium" ? (
        <CurrentPlanCard plan="premium" />
      ) : (
        <CurrentPlanCard plan="enterprise" />
      )}

      <Separator />
      <div className="space-y-2">
        <p className="font-medium">Fitur Pro</p>
        <FeatureList features={allFeatures.filter((feature) => feature.minimumPlan === "premium")} emptyLabel={isLoading ? "Loading feature access..." : "Plan ini belum membuka fitur Pro baru."} included={plan !== "free"} />
      </div>
      <div className="space-y-2">
        <p className="font-medium">{plan === "enterprise" ? "Fitur Enterprise" : "Masih Enterprise"}</p>
        <FeatureList features={allFeatures.filter((feature) => feature.minimumPlan === "enterprise")} emptyLabel={plan === "enterprise" ? "Tidak ada fitur Enterprise." : "Tidak ada fitur Enterprise yang terkunci."} included={plan === "enterprise"} />
      </div>
    </div>
  );
}

function ProUpgradeCard({ isLoading, isCreatingInvoice, hasOpenProInvoice, latestInvoice, proBetaRequestUrl, onCreateInvoice }: { isLoading: boolean; isCreatingInvoice: boolean; hasOpenProInvoice: boolean; latestInvoice: PlanTabProps["ownerBilling"] extends infer T ? T extends { latestInvoice: infer I } ? I : never : never; proBetaRequestUrl: string; onCreateInvoice: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-[radial-gradient(circle_at_8%_0%,hsl(var(--primary)/0.28),transparent_34%),radial-gradient(circle_at_100%_8%,hsl(var(--primary)/0.16),transparent_28%),linear-gradient(145deg,hsl(var(--card))_0%,hsl(var(--background))_58%,hsl(var(--primary)/0.08)_100%)] p-4 shadow-sm sm:p-5">
      <div className="pointer-events-none absolute -right-5 top-4 hidden h-28 w-28 bg-[radial-gradient(circle,hsl(var(--primary)/0.34)_1px,transparent_1px)] [background-size:9px_9px] opacity-45 sm:block" />
      <div className="relative space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-primary/10 text-primary shadow-sm"><RiVipCrownLine className="size-4.5" /></div>
          <div className="min-w-0 space-y-1"><p className="text-xl font-black tracking-tight sm:text-2xl">Upgrade ke <span className="text-primary">Pro</span></p><p className="max-w-md text-sm text-muted-foreground">Fitur operasional lengkap untuk manajemen toko servis yang lebih efisien dan terorganisir.</p></div>
        </div>
        <div className="grid gap-3 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-xl border border-primary/15 bg-background/55 p-4 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-primary">Paket Pro</p><div className="mt-3 flex flex-wrap items-baseline gap-1"><span className="text-sm font-bold text-muted-foreground">Rp</span><span className="text-5xl font-black leading-none tracking-tighter sm:text-6xl">990</span><span className="text-2xl font-black leading-none tracking-tight">.000</span></div><p className="mt-1.5 text-sm text-muted-foreground">/ bulan</p><div className="my-4 h-px bg-primary/20" /><Badge variant="success">Termasuk 2 toko</Badge></div>
          <div className="rounded-xl border bg-background/45 p-4 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Paket ini termasuk</p><div className="mt-3 divide-y divide-border/50"><ProBenefitItem title="2 toko included" description="Kelola hingga 2 toko dalam 1 akun" /><ProBenefitItem title="Staff + Teknisi" description="3 staff + 2 teknisi dengan akses penuh" /><ProBenefitItem title="Service / bulan" description="Hingga 100 service setiap bulan" /></div></div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/45 p-3.5"><div className="flex items-center gap-3"><div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><RiAddLine className="size-4.5" /></div><div><p className="text-sm font-semibold">Tambahan toko</p><p className="text-xs text-muted-foreground">Setelah 2 toko included</p></div></div><p className="font-bold tabular-nums">Rp499.000/toko/bulan</p></div>
        <div className="grid gap-2.5 sm:grid-cols-2"><Button asChild variant="outline" disabled={isLoading} className="h-12"><a href={proBetaRequestUrl} target="_blank" rel="noreferrer"><RiWhatsappLine data-icon="inline-start" />Request fitur Pro / join beta</a></Button><Button className="h-12" disabled={isCreatingInvoice || hasOpenProInvoice} onClick={onCreateInvoice}>{isCreatingInvoice ? <RiLoader4Line className="size-4 animate-spin" /> : hasOpenProInvoice ? "Invoice Pro sudah aktif" : "Upgrade ke Pro"}</Button></div>
        {hasOpenProInvoice && latestInvoice ? <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">Invoice {latestInvoice.invoiceNumber} masih berstatus {latestInvoice.status}. Lanjutkan pembayaran di tab Billing.</div> : <p className="text-center text-xs text-muted-foreground">Aman, mudah, dan bisa dibatalkan kapan saja.</p>}
      </div>
    </div>
  );
}

function CurrentPlanCard({ plan }: { plan: "premium" | "enterprise" }) {
  return (
    <div className="overflow-hidden rounded-xl border border-primary/15 bg-gradient-to-br from-primary/5 via-card to-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-primary/10 text-primary shadow-sm"><RiVipCrownLine className="size-4.5" /></div>
        <div className="min-w-0 space-y-1">
          <p className="text-lg font-black tracking-tight">Paket {planLabels[plan]} aktif</p>
          <p className="max-w-md text-sm text-muted-foreground">Semua fitur dalam paket ini sudah aktif dan bisa digunakan.</p>
        </div>
      </div>
    </div>
  );
}

function EnterpriseCard({ contactUrl }: { contactUrl: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-card to-card p-4 shadow-sm">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4"><div className="space-y-2"><div className="flex items-center gap-2.5"><div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600"><RiVipCrownLine className="size-4.5" /></div><p className="text-lg font-black tracking-tight">Enterprise</p></div><p className="max-w-lg text-sm text-muted-foreground">Untuk bisnis multi-cabang yang butuh semua fitur, limit custom, prioritas support, dan penyesuaian operasional.</p></div><div className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">Custom Deal</div></div>
        <div className="grid gap-2 sm:grid-cols-3"><EnterpriseBenefit label="Fitur" value="Semua unlocked" /><EnterpriseBenefit label="Limit" value="Custom / unlimited" /><EnterpriseBenefit label="Support" value="Prioritas" /></div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background/60 p-3"><div><p className="text-sm font-semibold">Butuh limit khusus?</p><p className="text-xs text-muted-foreground">Konsultasi paket Enterprise langsung via WhatsApp.</p></div><Button asChild variant="outline"><a href={contactUrl} target="_blank" rel="noreferrer">Hubungi Kami</a></Button></div>
      </div>
    </div>
  );
}

function EnterpriseBenefit({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border bg-background/60 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>;
}

function ProBenefitItem({ title, description }: { title: string; description: string }) {
  return <div className="flex gap-3 py-2.5 first:pt-0 last:pb-0"><div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><RiCheckboxCircleLine className="size-3.5" /></div><div className="min-w-0"><p className="text-sm font-semibold">{title}</p><p className="mt-0.5 text-xs text-muted-foreground">{description}</p></div></div>;
}

function FeatureList({ features, emptyLabel, included = false }: { features: BillingPlanSummary["includedFeatures"]; emptyLabel: string; included?: boolean }) {
  if (features.length === 0) return <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">{emptyLabel}</p>;
  return <div className="space-y-2">{features.map((feature) => <div key={feature.key} className="flex gap-3 rounded-lg border bg-card p-3">{included ? <RiCheckboxCircleLine className="mt-0.5 size-4 shrink-0 text-green-600" /> : <RiLock2Line className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{feature.label}</p><Badge variant={included ? "success" : "outline"}>{planLabels[feature.minimumPlan]}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{feature.description}</p></div></div>)}</div>;
}
