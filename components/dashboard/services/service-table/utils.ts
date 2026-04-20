import {
  RiInboxLine,
  RiToolsLine,
  RiCheckLine,
  RiLogoutBoxLine,
  RiCloseLine,
} from "@remixicon/react";
import type { StatusKey, PaymentStatusKey } from "./types";

export const statusIcons: Record<StatusKey, React.ComponentType<{ className?: string }>> = {
  received: RiInboxLine,
  repairing: RiToolsLine,
  done: RiCheckLine,
  picked_up: RiLogoutBoxLine,
  failed: RiCloseLine,
};

export type StatusColor = "secondary" | "accent" | "success" | "outline" | "destructive";

export const statusColors: Record<StatusKey, StatusColor> = {
  received: "secondary",
  repairing: "accent",
  done: "success",
  picked_up: "outline",
  failed: "destructive",
};

export const statusLabels: Record<StatusKey, string> = {
  received: "Diterima",
  repairing: "Sedang diperbaiki",
  done: "Done",
  picked_up: "Di ambil",
  failed: "gagal service",
};

export const paymentStatusColors: Record<PaymentStatusKey, "success" | "destructive"> = {
  unpaid: "destructive",
  paid: "success",
};

export function formatDate(date: Date | null | undefined): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function getStatusColor(status: string): StatusColor {
  return statusColors[status as StatusKey] || "outline";
}

export function getStatusLabel(status: string): string {
  return statusLabels[status as StatusKey] || status;
}

export function getStatusIcon(status: string): React.ComponentType<{ className?: string }> | null {
  return statusIcons[status as StatusKey] || null;
}

export function getPaymentStatusColor(status: string): "success" | "destructive" {
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