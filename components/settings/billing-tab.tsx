"use client";

import * as React from "react";
import { toast } from "sonner";
import { createProSubscriptionInvoice, submitSubscriptionPaymentProof } from "@/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatUsage, getWhatsAppTrialRequestUrl, planLabels } from "./helpers";
import type { BillingTabProps } from "./types";

export function BillingSettingsTab({ summary, ownerBilling, isLoading, onChanged, userEmail, tokoName }: BillingTabProps) {
  const plan = summary?.plan ?? "free";
  const [isPending, startTransition] = React.useTransition();
  const [method, setMethod] = React.useState("bank_transfer");
  const invoice = ownerBilling?.latestInvoice ?? null;
  const trialRequestUrl = getWhatsAppTrialRequestUrl({ email: userEmail, tokoName });

  const handleCreateInvoice = () => {
    startTransition(async () => {
      const result = await createProSubscriptionInvoice();
      if (!result.success) { toast.error(result.error || "Gagal membuat invoice"); return; }
      toast.success("Invoice Pro siap dibayar");
      onChanged();
    });
  };

  const handleSubmitPayment = (formData: FormData) => {
    formData.set("method", method);
    startTransition(async () => {
      const result = await submitSubscriptionPaymentProof(formData);
      if (!result.success) { toast.error(result.error || "Gagal upload bukti bayar"); return; }
      toast.success("Bukti pembayaran dikirim untuk review");
      onChanged();
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Current Plan</p>
            <p className="text-xs text-muted-foreground">{isLoading ? "Loading plan usage..." : `${planLabels[plan]} plan`}</p>
          </div>
          <Badge variant={plan === "free" ? "outline" : "default"}>{planLabels[plan]}</Badge>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <UsageTile label="Toko" value={summary ? formatUsage(summary.usage.tokos, summary.limits.tokos) : "-"} />
        <UsageTile label="Staff" value={summary ? formatUsage(summary.usage.staff, summary.limits.staff) : "-"} />
        <UsageTile label="Teknisi" value={summary ? formatUsage(summary.usage.technicians, summary.limits.technicians) : "-"} />
      </div>

      <div className="rounded-lg border bg-muted/20 p-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Estimasi tagihan bulanan</span>
          <span className="font-semibold">{summary ? formatCurrency(summary.pricing.estimatedMonthlyAmount) : "-"}</span>
        </div>
        {summary?.plan === "premium" && <p className="mt-1 text-xs text-muted-foreground">Pro termasuk {summary.pricing.includedTokos ?? 2} toko. Tambahan toko {formatCurrency(summary.pricing.additionalTokoPrice)}/toko/bulan.</p>}
        {summary?.plan === "free" && <p className="mt-1 text-xs text-muted-foreground">Free permanen dengan 1 toko dan 20 service/bulan.</p>}
        {summary?.plan === "enterprise" && <p className="mt-1 text-xs text-muted-foreground">Enterprise memakai harga custom dan diaktifkan manual oleh super admin.</p>}
      </div>

      <Separator />
      <div className="space-y-2">
        <p className="font-medium">Status Subscription</p>
        <div className="rounded-lg border bg-card p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={ownerBilling?.subscription.status === "active" || ownerBilling?.subscription.status === "trialing" ? "success" : ownerBilling?.subscription.status === "past_due" ? "warning" : "outline"}>{ownerBilling?.subscription.status ?? "-"}</Badge>
          </div>
          <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
            {ownerBilling?.subscription.trialEndsAt && <span>Trial sampai {new Date(ownerBilling.subscription.trialEndsAt).toLocaleDateString("id-ID")}</span>}
            {ownerBilling?.subscription.currentPeriodEnd && <span>Aktif sampai {new Date(ownerBilling.subscription.currentPeriodEnd).toLocaleDateString("id-ID")}</span>}
            {ownerBilling?.subscription.graceEndsAt && <span>Grace period sampai {new Date(ownerBilling.subscription.graceEndsAt).toLocaleDateString("id-ID")}</span>}
          </div>
        </div>
      </div>

      <Separator />
      <div className="space-y-2">
        <p className="font-medium">Pembayaran Manual</p>
        {ownerBilling?.subscription.plan === "free" && !ownerBilling.subscription.proTrialStartedAt && (
          <div className="space-y-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
            <p>Trial Pro 1 bulan tersedia melalui approval superuser. Hubungi tim RMS untuk mengaktifkan trial.</p>
            <Button asChild variant="outline" size="sm" className="w-full"><a href={trialRequestUrl} target="_blank" rel="noreferrer">Request Trial Pro via WhatsApp</a></Button>
          </div>
        )}
        {!invoice || ["paid", "void"].includes(invoice.status) ? (
          <Button variant="outline" className="w-full" disabled={isPending || isLoading} onClick={handleCreateInvoice}>Buat invoice Pro Rp990.000</Button>
        ) : (
          <InvoicePaymentForm invoice={invoice} ownerBilling={ownerBilling} isPending={isPending} method={method} setMethod={setMethod} onSubmit={handleSubmitPayment} />
        )}
      </div>
    </div>
  );
}

function UsageTile({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold tabular-nums">{value}</p></div>;
}

function InvoicePaymentForm({ invoice, ownerBilling, isPending, method, setMethod, onSubmit }: { invoice: NonNullable<BillingTabProps["ownerBilling"]>["latestInvoice"]; ownerBilling: BillingTabProps["ownerBilling"]; isPending: boolean; method: string; setMethod: (method: string) => void; onSubmit: (formData: FormData) => void }) {
  if (!invoice) return null;

  return (
    <div className="space-y-3 rounded-lg border bg-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><p className="font-semibold">{invoice.invoiceNumber}</p><p className="text-xs text-muted-foreground">Jatuh tempo {new Date(invoice.dueAt).toLocaleDateString("id-ID")}</p></div>
        <Badge variant={invoice.status === "pending_review" ? "warning" : invoice.status === "rejected" ? "destructive" : "outline"}>{invoice.status}</Badge>
      </div>
      <div className="rounded-md bg-muted/30 p-3 text-sm"><div className="flex justify-between"><span>Total</span><strong>{formatCurrency(invoice.amount)}</strong></div><p className="mt-1 text-xs text-muted-foreground">{invoice.tokoCount} toko · {invoice.additionalTokos} toko tambahan</p></div>
      <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">Transfer ke {ownerBilling?.instructions.bankName} · {ownerBilling?.instructions.accountNumber} a.n. {ownerBilling?.instructions.accountName}, atau QRIS RMS.</div>
      {invoice.status !== "pending_review" && (
        <form action={onSubmit} className="space-y-3">
          <input type="hidden" name="invoiceId" value={invoice.id} />
          <div className="grid gap-2 sm:grid-cols-2"><div className="space-y-1"><Label>Nominal dibayar</Label><Input name="amount" inputMode="numeric" defaultValue={invoice.amount} /></div><div className="space-y-1"><Label>Metode</Label><Select value={method} onValueChange={setMethod}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="bank_transfer">Transfer Bank</SelectItem><SelectItem value="qris">QRIS</SelectItem><SelectItem value="ewallet">E-Wallet</SelectItem><SelectItem value="other">Lainnya</SelectItem></SelectContent></Select></div></div>
          <div className="space-y-1"><Label>Nomor referensi</Label><Input name="referenceNumber" placeholder="Opsional" /></div>
          <div className="space-y-1"><Label>Bukti pembayaran</Label><Input name="proof" type="file" accept="image/*,.pdf" /></div>
          <div className="space-y-1"><Label>Catatan</Label><Textarea name="note" placeholder="Opsional" /></div>
          <Button className="w-full" disabled={isPending}>{isPending ? "Mengirim..." : "Kirim bukti bayar"}</Button>
        </form>
      )}
      {invoice.payments.length > 0 && <div className="space-y-2 border-t pt-3"><p className="text-xs font-medium text-muted-foreground">Riwayat bukti bayar</p>{invoice.payments.map((payment) => <div key={payment.id} className="rounded-md bg-muted/20 p-2 text-xs"><div className="flex justify-between gap-2"><span>{formatCurrency(payment.amount)}</span><Badge variant="outline">{payment.status}</Badge></div>{payment.rejectionReason && <p className="mt-1 text-destructive">{payment.rejectionReason}</p>}{payment.proofUrl && <a href={payment.proofUrl} target="_blank" rel="noreferrer" className="text-primary underline">Lihat bukti</a>}</div>)}</div>}
    </div>
  );
}
