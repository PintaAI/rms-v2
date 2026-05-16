"use server";

import prisma from "@/lib/prisma";
import { withScope, type RequestScope } from "@/lib/auth/wrapper";
import { assertPermission, can } from "@/lib/auth/request-scope";
import { fuzzyScore } from "@/lib/fuzzy-search";
import { mapServiceToListItem, serviceSelectBase, technicianAvailableStatuses } from "./service-shared";
import type { ActionResultWithData, ServiceListItem } from "./service-types";

export type GlobalSearchResultType = "service" | "karyawan" | "sparepart" | "retail_item" | "jasa";

export interface GlobalSearchResult {
  id: string;
  type: GlobalSearchResultType;
  title: string;
  subtitle?: string;
  href: string;
  keywords: string[];
}

function resultHref(tokoId: string, type: GlobalSearchResultType, query: string) {
  const encodedQuery = encodeURIComponent(query);

  if (type === "service") return `/${tokoId}/service?q=${encodedQuery}`;
  if (type === "karyawan") return `/${tokoId}/karyawan?q=${encodedQuery}`;
  if (type === "jasa") return `/${tokoId}/inventory?tab=jasa&q=${encodedQuery}`;
  if (type === "retail_item") return `/${tokoId}/inventory?tab=retail&q=${encodedQuery}`;
  return `/${tokoId}/inventory?q=${encodedQuery}`;
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
  return can(scope, "service.view");
}

function canSearchInventory(scope: RequestScope) {
  return can(scope, "inventory.view");
}

function canSearchKaryawan(scope: RequestScope) {
  return can(scope, "karyawan.view");
}

function canSearchJasa(scope: RequestScope) {
  return can(scope, "inventory.manageServicePricelists");
}

function canSearchRetailItems(scope: RequestScope) {
  return can(scope, "inventory.manageRetail");
}

function mapServiceResult(tokoId: string, query: string, service: ServiceListItem): GlobalSearchResult {
  const deviceName = `${service.hpCatalog.brand.name} ${service.hpCatalog.modelName}`;
  const title = service.customerName || service.noWa || deviceName;
  const subtitle = `${deviceName} - ${service.status}`;

  return {
    id: service.id,
    type: "service",
    title,
    subtitle,
    href: resultHref(tokoId, "service", query),
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
    assertPermission(scope, "dashboard.search");

    const results: GlobalSearchResult[] = [];
    const shouldLimitToAssignedTasks = can(scope, "service.takeOverTask") && !can(scope, "service.create");

    if (canSearchServices(scope) && !shouldLimitToAssignedTasks) {
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

      results.push(...rankResults(trimmedQuery, services.map(mapServiceToListItem).map((service) => mapServiceResult(tokoId, trimmedQuery, service)), 6));
    }

    if (canSearchServices(scope) && shouldLimitToAssignedTasks) {
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

      results.push(...rankResults(trimmedQuery, services.map(mapServiceToListItem).map((service) => mapServiceResult(tokoId, trimmedQuery, service)), 6));
    }

    if (canSearchKaryawan(scope)) {
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
        href: resultHref(tokoId, "karyawan", trimmedQuery),
        keywords: [user.email, user.role, user.role === "technician" ? "teknisi" : "staff"],
      })), 5));
    }

    if (canSearchInventory(scope)) {
      const spareparts = await prisma.sparepart.findMany({
        where: {
          tokoId,
          kind: "sparepart",
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
        href: resultHref(tokoId, "sparepart", trimmedQuery),
        keywords: [sparepart.barcode, String(sparepart.defaultPrice)],
      })), 6));
    }

    if (canSearchRetailItems(scope)) {
      const retailItems = await prisma.sparepart.findMany({
        where: {
          tokoId,
          kind: "retail_item",
          OR: [
            { name: { contains: trimmedQuery, mode: "insensitive" } },
            { barcode: { contains: trimmedQuery, mode: "insensitive" } },
            { supplierName: { contains: trimmedQuery, mode: "insensitive" } },
            { category: { name: { contains: trimmedQuery, mode: "insensitive" } } },
          ],
        },
        select: { id: true, name: true, barcode: true, stock: true, defaultPrice: true, supplierName: true, category: { select: { name: true } } },
        orderBy: { name: "asc" },
        take: 8,
      });

      results.push(...rankResults(trimmedQuery, retailItems.map((item) => ({
        id: item.id,
        type: "retail_item" as const,
        title: item.name,
        subtitle: `${item.barcode} - Stok ${item.stock}`,
        href: resultHref(tokoId, "retail_item", trimmedQuery),
        keywords: [item.barcode, item.supplierName, item.category?.name, String(item.defaultPrice)].filter((value): value is string => Boolean(value)),
      })), 6));
    }

    if (canSearchJasa(scope)) {
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
        href: resultHref(tokoId, "jasa", trimmedQuery),
        keywords: [String(pricelist.defaultPrice), "jasa", "service pricelist"],
      })), 6));
    }

    return results;
  });
}
