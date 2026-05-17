import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function getCurrencyInputDigits(value: string): string {
  return value.replace(/\D/g, "")
}

export function parseCurrencyInput(value: string): number {
  const digits = getCurrencyInputDigits(value)
  if (!digits) return 0

  const parsed = Number(digits)
  return Number.isFinite(parsed) ? parsed : 0
}

export function formatCurrencyInput(value: string | number): string {
  const amount = typeof value === "number" ? value : parseCurrencyInput(value)
  return amount > 0 ? new Intl.NumberFormat("id-ID").format(amount) : ""
}

export function formatDate(date: Date | null | undefined): string {
  if (!date) return "-"
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}
