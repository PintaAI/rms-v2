import type { BillingPlanSummary, OwnerBillingSummary } from "@/actions";

export type SettingsTab = "profile" | "features" | "whatsapp" | "password" | "billing" | "premium" | "appearance" | "affiliate";

export interface SettingsUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string | null;
}

export interface BillingTabProps {
  summary: BillingPlanSummary | null;
  ownerBilling: OwnerBillingSummary | null;
  isLoading: boolean;
  onChanged: () => void;
  userEmail?: string | null;
  tokoName?: string | null;
}

export interface PlanTabProps extends BillingTabProps {
  currentTokoId?: string;
}
