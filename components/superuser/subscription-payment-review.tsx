"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { approveSubscriptionPayment, rejectSubscriptionPayment, type PendingSubscriptionPaymentRow } from "@/actions/superuser";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface SubscriptionPaymentReviewProps {
  payments: PendingSubscriptionPaymentRow[];
}

export function SubscriptionPaymentReview({ payments }: SubscriptionPaymentReviewProps) {
  const [isPending, startTransition] = useTransition();
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});

  const approve = (paymentId: string) => {
    startTransition(async () => {
      const result = await approveSubscriptionPayment(paymentId);
      if (!result.success) {
        toast.error(result.error || "Gagal approve pembayaran");
        return;
      }
      toast.success("Pembayaran disetujui");
    });
  };

  const reject = (paymentId: string) => {
    startTransition(async () => {
      const result = await rejectSubscriptionPayment(paymentId, rejectionReasons[paymentId] ?? "");
      if (!result.success) {
        toast.error(result.error || "Gagal reject pembayaran");
        return;
      }
      toast.success("Pembayaran ditolak");
    });
  };

  return (
    <Card className="overflow-hidden border-border/50 shadow-lg shadow-black/5">
      <CardHeader>
        <CardTitle className="text-lg">Review Pembayaran Subscription</CardTitle>
        <p className="text-sm text-muted-foreground">Approve bukti pembayaran manual dari admin toko.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {payments.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Tidak ada pembayaran yang menunggu review.</div>
        ) : (
          payments.map((payment) => (
            <div key={payment.paymentId} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{payment.invoiceNumber}</p>
                    <Badge variant="warning">pending review</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{payment.ownerName} · {payment.ownerEmail}</p>
                  <p className="text-sm text-muted-foreground">Submitted {new Date(payment.submittedAt).toLocaleString("id-ID")}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{formatCurrency(payment.amount)}</p>
                  <p className="text-xs text-muted-foreground">Invoice {formatCurrency(payment.invoiceAmount)}</p>
                </div>
              </div>

              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div><span className="text-muted-foreground">Method:</span> {payment.method}</div>
                <div><span className="text-muted-foreground">Reference:</span> {payment.referenceNumber || "-"}</div>
                <div className="sm:col-span-2"><span className="text-muted-foreground">Note:</span> {payment.note || "-"}</div>
                {payment.proofUrl && (
                  <a href={payment.proofUrl} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">
                    Lihat bukti pembayaran
                  </a>
                )}
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                <Textarea
                  value={rejectionReasons[payment.paymentId] ?? ""}
                  onChange={(event) => setRejectionReasons((prev) => ({ ...prev, [payment.paymentId]: event.target.value }))}
                  placeholder="Alasan reject jika bukti belum valid"
                  className="min-h-10"
                />
                <Button variant="outline" disabled={isPending} onClick={() => reject(payment.paymentId)}>Reject</Button>
                <Button disabled={isPending} onClick={() => approve(payment.paymentId)}>Approve</Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
