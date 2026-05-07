"use server";

import prisma from "@/lib/prisma";
import { withScope, type RequestScope } from "@/lib/auth/wrapper";
import { fuzzyScore } from "@/lib/fuzzy-search";
import { mapServiceToListItem, serviceSelectBase, technicianAvailableStatuses } from "./service-shared";
import type { ActionResultWithData, ServiceListItem } from "./service-types";

export type GlobalSearchResultType = "service" | "karyawan" | "sparepart" | "jasa";

export interface GlobalSearchResult {
  id: string;
  type: GlobalSearchResultType;
  title: string;
  subtitle?: string;
  href: string;
  keywords: string[];
}

function roleSegment(role: string) {
  return role === "technician" ? "teknisi" : role;
}

function resultHref(tokoId: string, role: string, type: GlobalSearchResultType, query: string) {
  const encodedQuery = encodeURIComponent(query);
  const segment = roleSegment(role);

  if (type === "service") {
    return role === "technician"
      ? `/${tokoId}/teknisi/task?q=${encodedQuery}`
      : `/${tokoId}/${segment}/service?q=${encodedQuery}`;
  }

  if (type === "karyawan") return `/${tokoId}/admin/karyawan?q=${encodedQuery}`;
  if (type === "jasa") return `/${tokoId}/admin/inventory?tab=jasa&q=${encodedQuery}`;
  return `/${tokoId}/${segment}/inventory?q=${encodedQuery}`;
}

function bestScore(query: string, targets: Array<string | null | undefined>) {
  return targets.reduce<number | null>((best, target) => {
    if (!target) return best;
    const score = fuzzyScore(query, target);
    if (score === null) return best;
    return best === null ? score : Math.max(best, score);
  }, null);
}

function rankResults(query: string, results: GlobalSearchResult[], limit = 8) {
  return results
    .map((result) => ({
      result,
      score: bestScore(query, [result.title, result.subtitle, ...result.keywords]) ?? 0,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.result);
}

function canSearchServices(scope: RequestScope) {
  if (scope.user.role === "admin") return scope.capabilities["service.management"];
  if (scope.user.role === "staff") {
    return scope.capabilities["service.management"] && scope.featureAccess["staff.workflow"] === true;
  }
  if (scope.user.role === "technician") return scope.featureAccess["technician.workflow"] === true;
  return false;
}

function canSearchInventory(scope: RequestScope) {
  if (scope.featureAccess["inventory.management"] !== true) return false;
  if (scope.user.role === "admin") return true;
  if (scope.user.role === "staff") return scope.featureAccess["staff.workflow"] === true;
  if (scope.user.role === "technician") return scope.featureAccess["technician.workflow"] === true;
  return false;
}

function mapServiceResult(tokoId: string, role: string, query: string, service: ServiceListItem): GlobalSearchResult {
  const deviceName = `${service.hpCatalog.brand.name} ${service.hpCatalog.modelName}`;
  const title = service.customerName || service.noWa || deviceName;
  const subtitle = `${deviceName} - ${service.status}`;

  return {
    id: service.id,
    type: "service",
    title,
    subtitle,
    href: resultHref(tokoId, role, "service", query),
    keywords: [
      service.noWa,
      service.complaint,
      service.handlingNote,
      service.imei,
      service.note,
      service.passwordPattern,
      deviceName,
      service.technician?.name,
      service.createdBy?.name,
      service.invoice?.id,
      ...(service.includedItems ?? []),
    ].filter((value): value is string => Boolean(value)),
  };
}

export async function searchDashboard(
  tokoId: string,
  query: string
): Promise<ActionResultWithData<GlobalSearchResult[]>> {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 2) return { success: true, data: [] };

  return withScope(tokoId, {}, async (scope) => {
    const role = scope.user.role;
    const results: GlobalSearchResult[] = [];

    if ((role === "admin" || role === "staff") && canSearchServices(scope)) {
      const services = await prisma.service.findMany({
        where: {
          tokoId,
          OR: [
            { customerName: { contains: trimmedQuery, mode: "insensitive" } },
            { noWa: { contains: trimmedQuery, mode: "insensitive" } },
            { complaint: { contains: trimmedQuery, mode: "insensitive" } },
            { handlingNote: { contains: trimmedQuery, mode: "insensitive" } },
            { imei: { contains: trimmedQuery, mode: "insensitive" } },
            { note: { contains: trimmedQuery, mode: "insensitive" } },
            { passwordPattern: { contains: trimmedQuery, mode: "insensitive" } },
            { hpCatalog: { modelName: { contains: trimmedQuery, mode: "insensitive" } } },
            { hpCatalog: { brand: { name: { contains: trimmedQuery, mode: "insensitive" } } } },
            { technician: { name: { contains: trimmedQuery, mode: "insensitive" } } },
            { createdBy: { name: { contains: trimmedQuery, mode: "insensitive" } } },
            { invoice: { id: { contains: trimmedQuery, mode: "insensitive" } } },
          ],
        },
        orderBy: { checkinAt: "desc" },
        take: 12,
        select: serviceSelectBase,
      });

      results.push(...rankResults(trimmedQuery, services.map(mapServiceToListItem).map((service) => mapServiceResult(tokoId, role, trimmedQuery, service)), 6));
    }

    if (role === "technician" && canSearchServices(scope)) {
      const services = await prisma.service.findMany({
        where: {
          tokoId,
          AND: [
            {
              OR: [
                { technicianId: scope.user.id },
                { status: { in: technicianAvailableStatuses }, OR: [{ technicianId: null }, { technicianId: { not: scope.user.id } }] },
              ],
            },
            {
              OR: [
                { customerName: { contains: trimmedQuery, mode: "insensitive" } },
                { noWa: { contains: trimmedQuery, mode: "insensitive" } },
                { complaint: { contains: trimmedQuery, mode: "insensitive" } },
                { handlingNote: { contains: trimmedQuery, mode: "insensitive" } },
                { imei: { contains: trimmedQuery, mode: "insensitive" } },
                { note: { contains: trimmedQuery, mode: "insensitive" } },
                { hpCatalog: { modelName: { contains: trimmedQuery, mode: "insensitive" } } },
                { hpCatalog: { brand: { name: { contains: trimmedQuery, mode: "insensitive" } } } },
                { invoice: { id: { contains: trimmedQuery, mode: "insensitive" } } },
              ],
            },
          ],
        },
        orderBy: { checkinAt: "desc" },
        take: 12,
        select: serviceSelectBase,
      });

      results.push(...rankResults(trimmedQuery, services.map(mapServiceToListItem).map((service) => mapServiceResult(tokoId, role, trimmedQuery, service)), 6));
    }

    if (role === "admin" && scope.featureAccess["karyawan.management"]) {
      const assignments = await prisma.userToko.findMany({
        where: {
          tokoId,
          user: {
            role: { in: ["staff", "technician"] },
            OR: [
              { name: { contains: trimmedQuery, mode: "insensitive" } },
              { email: { contains: trimmedQuery, mode: "insensitive" } },
            ],
          },
        },
        select: { user: { select: { id: true, name: true, email: true, role: true } } },
        take: 8,
      });

      results.push(...rankResults(trimmedQuery, assignments.map(({ user }) => ({
        id: user.id,
        type: "karyawan" as const,
        title: user.name,
        subtitle: `${user.role} - ${user.email}`,
        href: resultHref(tokoId, role, "karyawan", trimmedQuery),
        keywords: [user.email, user.role, user.role === "technician" ? "teknisi" : "staff"],
      })), 5));
    }

    if (canSearchInventory(scope)) {
      const spareparts = await prisma.sparepart.findMany({
        where: {
          tokoId,
          OR: [
            { name: { contains: trimmedQuery, mode: "insensitive" } },
            { barcode: { contains: trimmedQuery, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, barcode: true, stock: true, defaultPrice: true },
        orderBy: { name: "asc" },
        take: 8,
      });

      results.push(...rankResults(trimmedQuery, spareparts.map((sparepart) => ({
        id: sparepart.id,
        type: "sparepart" as const,
        title: sparepart.name,
        subtitle: `${sparepart.barcode} - Stok ${sparepart.stock}`,
        href: resultHref(tokoId, role, "sparepart", trimmedQuery),
        keywords: [sparepart.barcode, String(sparepart.defaultPrice)],
      })), 6));
    }

    if (role === "admin" && canSearchInventory(scope)) {
      const pricelists = await prisma.servicePricelist.findMany({
        where: { tokoId, title: { contains: trimmedQuery, mode: "insensitive" } },
        select: { id: true, title: true, defaultPrice: true },
        orderBy: { title: "asc" },
        take: 8,
      });

      results.push(...rankResults(trimmedQuery, pricelists.map((pricelist) => ({
        id: pricelist.id,
        type: "jasa" as const,
        title: pricelist.title,
        subtitle: `Jasa - Rp${pricelist.defaultPrice.toLocaleString("id-ID")}`,
        href: resultHref(tokoId, role, "jasa", trimmedQuery),
        keywords: [String(pricelist.defaultPrice), "jasa", "service pricelist"],
      })), 6));
    }

    return results;
  });
}
