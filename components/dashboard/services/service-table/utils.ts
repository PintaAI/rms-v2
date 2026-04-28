import {
  RiInboxLine,
  RiToolsLine,
  RiCheckLine,
  RiCloseLine,
} from "@remixicon/react";
import type { StatusKey, PaymentStatusKey } from "./types";
import { formatCurrency, formatDate } from "@/lib/utils";

export { formatCurrency, formatDate };

export const statusIcons: Record<StatusKey, React.ComponentType<{ className?: string }>> = {
  received: RiInboxLine,
  repairing: RiToolsLine,
  done: RiCheckLine,
  failed: RiCloseLine,
};

export type StatusColor = "secondary" | "accent" | "success" | "outline" | "destructive";

export const statusColors: Record<StatusKey, StatusColor> = {
  received: "secondary",
  repairing: "accent",
  done: "success",
  failed: "destructive",
};

export const statusLabels: Record<StatusKey, string> = {
  received: "Diterima",
  repairing: "Sedang diperbaiki",
  done: "Done",
  failed: "gagal service",
};

export const paymentStatusColors: Record<PaymentStatusKey, "success" | "destructive" | "accent"> = {
  unpaid: "destructive",
  dp: "accent",
  paid: "success",
};

export function getStatusColor(status: string): StatusColor {
  return statusColors[status as StatusKey] || "outline";
}

export function getStatusLabel(status: string): string {
  return statusLabels[status as StatusKey] || status;
}

export function getStatusIcon(status: string): React.ComponentType<{ className?: string }> | null {
  return statusIcons[status as StatusKey] || null;
}

export function getPaymentStatusColor(status: string): "success" | "destructive" | "accent" {
  return paymentStatusColors[status as PaymentStatusKey] || "destructive";
}

export function formatWhatsApp(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    return "62" + cleaned.slice(1);
  }
  if (cleaned.startsWith("62")) {
    return cleaned;
  }
  return cleaned;
}