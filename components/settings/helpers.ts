import type { SubscriptionPlan } from "@/lib/features";

export const planLabels: Record<SubscriptionPlan, string> = {
  free: "Free",
  premium: "Pro",
  enterprise: "Enterprise",
};

export const RMS_WHATSAPP_NUMBER = "6285728212056";

export function formatLimit(limit: number | null) {
  return limit === null ? "Unlimited" : String(limit);
}

export function formatUsage(used: number, limit: number | null) {
  return `${used} / ${formatLimit(limit)}`;
}

export function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "Custom";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function getWhatsAppTrialRequestUrl(input: { email?: string | null; tokoName?: string | null }) {
  const message = [
    "Halo tim RMS, saya ingin request Trial Pro 1 bulan.",
    `Email: ${input.email || "-"}`,
    `Toko: ${input.tokoName || "-"}`,
    "Mohon dibantu review dan aktivasi trial jika memenuhi syarat.",
  ].join("\n");

  return `https://web.whatsapp.com/send?phone=${RMS_WHATSAPP_NUMBER}&text=${encodeURIComponent(message)}`;
}

export function getWhatsAppEnterpriseUrl(input: { email?: string | null; tokoName?: string | null }) {
  const message = [
    "Halo tim RMS, saya ingin konsultasi paket Enterprise.",
    `Email: ${input.email || "-"}`,
    `Toko: ${input.tokoName || "-"}`,
    "Mohon dibantu untuk custom deal, limit toko/tim, dan fitur Enterprise.",
  ].join("\n");

  return `https://web.whatsapp.com/send?phone=${RMS_WHATSAPP_NUMBER}&text=${encodeURIComponent(message)}`;
}
