"use client";

import type { PermissionCategory, PermissionEffect, PermissionKey } from "@/lib/permissions";
import type { KaryawanPermissionSettings } from "@/actions/karyawan";
import type { PermissionDraftEffect } from "./types";

export const permissionCategoryLabels: Record<PermissionCategory, string> = {
  inventory: "Inventory",
  service_catalog_item: "Service",
  retail: "Retail",
  karyawan: "Karyawan",
  analytics: "Analytics",
  whatsapp: "WhatsApp",
  toko: "Toko",
  features: "Features",
  supplier_returns: "Supplier Returns",
  supplier_debts: "Supplier Debts",
  warranty: "Warranty",
  dashboard: "Dashboard",
};

export function getPermissionGroupLabel(permission: { permissionKey: PermissionKey; category: PermissionCategory }) {
  if (["inventory.view", "inventory.create", "inventory.update", "inventory.delete", "inventory.restock", "inventory.import"].includes(permission.permissionKey)) {
    return "Inventory - Sparepart";
  }
  if (permission.permissionKey === "inventory.manageRetail") return "Inventory - Aksesoris";
  if (permission.permissionKey === "inventory.managePhoneUnits") return "Inventory - Katalog HP";
  if (["inventory.viewHistory", "inventory.report", "inventory.audit"].includes(permission.permissionKey)) {
    return "Inventory - Laporan & Audit";
  }
  if (permission.permissionKey === "inventory.manageServicePricelists") return "Service Catalog";
  if (["retail.view", "retail.sell", "retail.viewHistory"].includes(permission.permissionKey)) return "Retail Sales";

  return permissionCategoryLabels[permission.category];
}

export function buildPermissionDraft(settings: KaryawanPermissionSettings): Record<PermissionKey, PermissionDraftEffect> {
  const draft = Object.fromEntries(
    settings.permissions.map((permission) => [permission.permissionKey, "default"])
  ) as Record<PermissionKey, PermissionDraftEffect>;

  for (const override of settings.overrides) {
    draft[override.permissionKey] = override.effect;
  }

  return draft;
}

export function getEffectiveAllowed(defaultAllowed: boolean, effect: PermissionDraftEffect) {
  if (effect === "allow") return true;
  if (effect === "deny") return false;
  return defaultAllowed;
}

function lowerFirst(value: string) {
  return value ? value.charAt(0).toLowerCase() + value.slice(1) : value;
}

export function getPermissionHint(
  permission: KaryawanPermissionSettings["permissions"][number],
  effect: PermissionDraftEffect,
) {
  if (effect === "default") {
    return null;
  }

  if (effect === "allow") {
    return `Karyawan ini boleh ${lowerFirst(permission.label)}.`;
  }

  return `Jika dinonaktifkan, ${lowerFirst(permission.inactiveReason)}`;
}

export const sanitizeForEmail = (str: string) =>
  str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
