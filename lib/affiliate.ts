import { customAlphabet } from "nanoid";
import type { SubscriptionPlan } from "@/lib/plans";

export const DEFAULT_REGISTER_COMMISSION = 50_000;
export const DEFAULT_PREMIUM_COMMISSION = 100_000;
export const DEFAULT_ENTERPRISE_COMMISSION = 1_000_000;
export const AFFILIATE_PENDING_REFERRAL_COOKIE = "rms_pending_referral";

const codeSuffix = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 4);
const portalToken = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", 48);

export function normalizeReferralCode(code: string): string {
  return code.trim().toUpperCase();
}

export function generateAffiliatorCode(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 16) || "PARTNER";

  return `RMS-${slug}-${codeSuffix()}`;
}

export function generatePortalToken(): string {
  return portalToken();
}

export function getCommissionAmount(input: {
  plan: Exclude<SubscriptionPlan, "free">;
  commissionType: "fixed" | "percentage";
  premiumCommissionValue: number;
  enterpriseCommissionValue: number;
  subscriptionPrice?: number;
}): number {
  const value = input.plan === "premium" ? input.premiumCommissionValue : input.enterpriseCommissionValue;

  if (input.commissionType === "percentage") {
    return Math.floor(((input.subscriptionPrice ?? 0) * value) / 100);
  }

  return value;
}

export function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return "Customer";

  const visible = localPart.slice(0, Math.min(2, localPart.length));
  return `${visible}***@${domain}`;
}

export function maskPhone(phone: string): string {
  const cleaned = phone.replace(/\s+/g, "");
  if (cleaned.length <= 8) return "Customer";

  return `${cleaned.slice(0, 4)}****${cleaned.slice(-4)}`;
}

export function getPublicAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function getReferralLink(code: string): string {
  return `${getPublicAppUrl()}/auth?ref=${encodeURIComponent(code)}`;
}

export function getTrackingLink(code: string, token: string): string {
  return `${getPublicAppUrl()}/affiliate/portal/${encodeURIComponent(code)}?token=${encodeURIComponent(token)}`;
}

export function buildAffiliateLinks(code: string, portalToken: string) {
  return {
    referralLink: getReferralLink(code),
    trackingLink: getTrackingLink(code, portalToken),
  };
}
