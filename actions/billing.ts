"use server";

import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireRequestUser } from "@/lib/auth/request-user";
import type { ActionResultWithData } from "@/lib/auth/authorization";
import {
  BILLING_INSTRUCTIONS,
  ensureOpenProInvoice,
  ensureUserSubscription,
} from "@/lib/subscription-billing";
import type {
  SubscriptionInvoiceStatus,
  SubscriptionPaymentMethod,
  SubscriptionPaymentStatus,
  SubscriptionStatus,
} from "@/prisma/generated/prisma/enums";
import type { SubscriptionPlan } from "@/lib/plans";

export type BillingPaymentRow = {
  id: string;
  amount: number;
  method: SubscriptionPaymentMethod;
  referenceNumber: string | null;
  proofUrl: string | null;
  note: string | null;
  status: SubscriptionPaymentStatus;
  rejectionReason: string | null;
  submittedAt: Date;
  reviewedAt: Date | null;
};

export type BillingInvoiceRow = {
  id: string;
  invoiceNumber: string;
  plan: SubscriptionPlan;
  amount: number;
  tokoCount: number;
  includedTokos: number | null;
  additionalTokos: number;
  additionalTokoPrice: number | null;
  status: SubscriptionInvoiceStatus;
  issuedAt: Date;
  dueAt: Date;
  paidAt: Date | null;
  payments: BillingPaymentRow[];
};

export type OwnerBillingSummary = {
  subscription: {
    id: string;
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    trialEndsAt: Date | null;
    proTrialStartedAt: Date | null;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    graceEndsAt: Date | null;
  };
  latestInvoice: BillingInvoiceRow | null;
  instructions: typeof BILLING_INSTRUCTIONS;
};

export async function getOwnerBillingSummary(): Promise<ActionResultWithData<OwnerBillingSummary>> {
  const user = await requireRequestUser();
  if (user.role !== "admin") return { success: false, error: "Only admin owners can access billing" };

  const subscription = await ensureUserSubscription(user.id);
  if (!subscription) return { success: false, error: "Subscription not found" };

  const latestInvoice = await prisma.subscriptionInvoice.findFirst({
    where: { userId: user.id },
    orderBy: { issuedAt: "desc" },
    include: { payments: { orderBy: { submittedAt: "desc" } } },
  });

  return {
    success: true,
    data: {
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        trialEndsAt: subscription.trialEndsAt,
        proTrialStartedAt: subscription.proTrialStartedAt,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        graceEndsAt: subscription.graceEndsAt,
      },
      latestInvoice: latestInvoice ? serializeInvoice(latestInvoice) : null,
      instructions: BILLING_INSTRUCTIONS,
    },
  };
}

export async function createProSubscriptionInvoice(): Promise<ActionResultWithData<BillingInvoiceRow>> {
  const user = await requireRequestUser();
  if (user.role !== "admin") return { success: false, error: "Only admin owners can create billing invoices" };

  const invoice = await ensureOpenProInvoice(user.id);

  revalidatePath("/dashboard");
  revalidatePath("/superuser");
  return { success: true, data: serializeInvoice(invoice) };
}

export async function submitSubscriptionPaymentProof(formData: FormData): Promise<ActionResultWithData<{ invoiceId: string }>> {
  const user = await requireRequestUser();
  if (user.role !== "admin") return { success: false, error: "Only admin owners can submit payment proof" };

  const invoiceId = String(formData.get("invoiceId") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const method = String(formData.get("method") ?? "bank_transfer") as SubscriptionPaymentMethod;
  const referenceNumber = String(formData.get("referenceNumber") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const file = formData.get("proof") as File | null;

  if (!invoiceId) return { success: false, error: "Invoice is required" };
  if (!Number.isFinite(amount) || amount <= 0) return { success: false, error: "Amount must be greater than zero" };
  if (!["bank_transfer", "qris", "ewallet", "other"].includes(method)) return { success: false, error: "Invalid payment method" };

  const invoice = await prisma.subscriptionInvoice.findFirst({
    where: { id: invoiceId, userId: user.id, status: { in: ["issued", "rejected", "overdue"] } },
    select: { id: true },
  });
  if (!invoice) return { success: false, error: "Invoice cannot accept payment proof" };

  let proofUrl: string | null = null;
  if (file && file.size > 0) {
    if (file.size > 5 * 1024 * 1024) return { success: false, error: "Proof file max size is 5MB" };
    const blob = await put(`billing/${user.id}/${invoiceId}/${Date.now()}-${file.name}`, file, { access: "public" });
    proofUrl = blob.url;
  }

  await prisma.$transaction([
    prisma.subscriptionPayment.create({
      data: {
        invoiceId,
        amount,
        method,
        referenceNumber,
        proofUrl,
        note,
        status: "pending_review",
      },
    }),
    prisma.subscriptionInvoice.update({
      where: { id: invoiceId },
      data: { status: "pending_review" },
    }),
  ]);

  revalidatePath("/dashboard");
  revalidatePath("/superuser");
  return { success: true, data: { invoiceId } };
}

function serializeInvoice(invoice: {
  id: string;
  invoiceNumber: string;
  plan: SubscriptionPlan;
  amount: number;
  tokoCount: number;
  includedTokos: number | null;
  additionalTokos: number;
  additionalTokoPrice: number | null;
  status: SubscriptionInvoiceStatus;
  issuedAt: Date;
  dueAt: Date;
  paidAt: Date | null;
  payments: Array<{
    id: string;
    amount: number;
    method: SubscriptionPaymentMethod;
    referenceNumber: string | null;
    proofUrl: string | null;
    note: string | null;
    status: SubscriptionPaymentStatus;
    rejectionReason: string | null;
    submittedAt: Date;
    reviewedAt: Date | null;
  }>;
}): BillingInvoiceRow {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    plan: invoice.plan,
    amount: invoice.amount,
    tokoCount: invoice.tokoCount,
    includedTokos: invoice.includedTokos,
    additionalTokos: invoice.additionalTokos,
    additionalTokoPrice: invoice.additionalTokoPrice,
    status: invoice.status,
    issuedAt: invoice.issuedAt,
    dueAt: invoice.dueAt,
    paidAt: invoice.paidAt,
    payments: invoice.payments.map((payment) => ({
      id: payment.id,
      amount: payment.amount,
      method: payment.method,
      referenceNumber: payment.referenceNumber,
      proofUrl: payment.proofUrl,
      note: payment.note,
      status: payment.status,
      rejectionReason: payment.rejectionReason,
      submittedAt: payment.submittedAt,
      reviewedAt: payment.reviewedAt,
    })),
  };
}
