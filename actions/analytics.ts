"use server";

import prisma from "@/lib/prisma";
import { withScope, type ActionResultWithData } from "@/lib/auth/wrapper";
import type { ServiceStatus } from "@/prisma/generated/prisma/enums";

const STATUS_LABELS: Record<ServiceStatus, string> = {
  received: "Masuk",
  repairing: "Proses",
  done: "Selesai",
  failed: "Gagal",
};

export interface AdminAnalyticsTrendPoint {
  key: string;
  label: string;
  revenue: number;
  pending: number;
  services: number;
  completed: number;
}

export interface AdminAnalyticsStatusPoint {
  status: ServiceStatus;
  label: string;
  count: number;
}

export interface AdminAnalyticsTechnicianPoint {
  id: string;
  name: string;
  completedServices: number;
  revenue: number;
}

export interface AdminAnalyticsTopSparepartPoint {
  id: string;
  name: string;
  qty: number;
  revenue: number;
}

export interface AdminRetailAnalyticsTrendPoint {
  key: string;
  label: string;
  revenue: number;
  transactions: number;
}

export interface AdminRetailAnalyticsTopItemPoint {
  id: string;
  name: string;
  kind: "sparepart" | "retail_item";
  qty: number;
  revenue: number;
  grossMargin: number;
}

export interface AdminRetailAnalyticsPaymentPoint {
  method: "cash" | "transfer" | "qris" | "debit";
  label: string;
  count: number;
  revenue: number;
}

export interface AdminRetailAnalyticsData {
  enabled: boolean;
  summary: {
    revenue: number;
    transactions: number;
    averageTransaction: number;
    grossMargin: number;
    totalQty: number;
  };
  trend: AdminRetailAnalyticsTrendPoint[];
  topItemsByQty: AdminRetailAnalyticsTopItemPoint[];
  topItemsByRevenue: AdminRetailAnalyticsTopItemPoint[];
  paymentBreakdown: AdminRetailAnalyticsPaymentPoint[];
}

export interface AdminAnalyticsData {
  toko: {
    id: string;
    name: string;
    logoUrl: string | null;
  };
  filters: AdminAnalyticsFilters;
  bucketMode: "day" | "month";
  periodLabel: string;
  summary: {
    totalRevenue: number;
    estimatedNetRevenue: number;
    paidRevenue: number;
    retailRevenue: number;
    retailGrossMargin: number;
    pendingRevenue: number;
    paidInvoices: number;
    averagePaidInvoice: number;
    totalServices: number;
    completionRate: number;
    totalSpareparts: number;
    lowStockCount: number;
    totalStock: number;
  };
  trend: AdminAnalyticsTrendPoint[];
  statusBreakdown: AdminAnalyticsStatusPoint[];
  topTechnicians: AdminAnalyticsTechnicianPoint[];
  topSpareparts: AdminAnalyticsTopSparepartPoint[];
  retail: AdminRetailAnalyticsData;
}

export interface AdminAnalyticsFilters {
  from: string;
  to: string;
  allTime?: boolean;
  status?: ServiceStatus;
}

interface AdminAnalyticsFilterInput {
  from?: string;
  to?: string;
  allTime?: string;
  status?: string;
}

export async function getAdminAnalytics(
  tokoId: string,
  filters?: AdminAnalyticsFilterInput
): Promise<ActionResultWithData<AdminAnalyticsData>> {
  return withScope(tokoId, { role: ["admin"], feature: "analytics.revenue" }, async (scope): Promise<AdminAnalyticsData> => {

    const normalizedFilters = normalizeFilters(filters);
    const allTimeStart = normalizedFilters.allTime ? await getAllTimeStart(tokoId) : null;
    const periodStart = allTimeStart ?? parseDateKey(normalizedFilters.from);
    const periodEnd = normalizedFilters.allTime ? addDays(new Date(), 1) : addDays(parseDateKey(normalizedFilters.to), 1);
    const daySpan = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / 86_400_000);
    const bucketMode = daySpan > 45 ? "month" : "day";
    const buckets = bucketMode === "month" ? getMonthBuckets(periodStart, periodEnd) : getDayBuckets(periodStart, periodEnd);
    const periodLabel = `${formatPeriodDate(periodStart)} - ${formatPeriodDate(addDays(periodEnd, -1))}`;
    const serviceWhere = {
      tokoId,
      checkinAt: { gte: periodStart, lt: periodEnd },
      ...(normalizedFilters.status ? { status: normalizedFilters.status } : {}),
    };

    const retailEnabled = scope.featureAccess["retail.sales"] ?? false;
    const [toko, services, invoices, refundClaims, sparepartCount, lowStockCount, stockAggregate, retailSales] = await Promise.all([
      prisma.toko.findUnique({
        where: { id: tokoId },
        select: { id: true, name: true, logoUrl: true },
      }),
      prisma.service.findMany({
        where: serviceWhere,
        select: {
          id: true,
          status: true,
          checkinAt: true,
          technician: { select: { id: true, name: true } },
          invoice: {
            select: {
              grandTotal: true,
              paymentStatus: true,
              paidAt: true,
            },
          },
        },
      }),
      prisma.invoice.findMany({
        where: {
          service: serviceWhere,
          OR: [
            { createdAt: { gte: periodStart, lt: periodEnd } },
            { paidAt: { gte: periodStart, lt: periodEnd } },
          ],
        },
        select: {
          grandTotal: true,
          dpAmount: true,
          paymentStatus: true,
          createdAt: true,
          paidAt: true,
          items: {
            where: { type: "sparepart" },
            select: {
              referenceId: true,
              name: true,
              qty: true,
              price: true,
            },
          },
        },
      }),
      prisma.warrantyClaim.findMany({
        where: {
          tokoId,
          status: "resolved",
          refundAmount: { gt: 0 },
          resolvedAt: { gte: periodStart, lt: periodEnd },
        },
        select: {
          refundAmount: true,
          resolvedAt: true,
        },
      }),
      prisma.sparepart.count({ where: { tokoId } }),
      prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*)::int AS count
        FROM "sparepart"
        WHERE "tokoId" = ${tokoId}
          AND "stock" <= "criticalStock"
      `,
      prisma.sparepart.aggregate({ where: { tokoId }, _sum: { stock: true } }),
      retailEnabled
        ? prisma.retailSale.findMany({
            where: {
              tokoId,
              status: "paid",
              paidAt: { gte: periodStart, lt: periodEnd },
            },
            select: {
              id: true,
              grandTotal: true,
              paymentMethod: true,
              paidAt: true,
              items: {
                select: {
                  sparepartId: true,
                  name: true,
                  kind: true,
                  qty: true,
                  unitCostSnapshot: true,
                  lineTotal: true,
                },
              },
            },
          })
        : Promise.resolve([]),
    ]);

    if (!toko) {
      throw new Error("Toko not found");
    }

    const lowStockTotal = lowStockCount[0]?.count ?? 0;

    const trendMap = Object.fromEntries(
      buckets.map((bucket) => [
        bucket.key,
        {
          key: bucket.key,
          label: bucket.label,
          revenue: 0,
          pending: 0,
          services: 0,
          completed: 0,
        },
      ])
    ) as Record<string, AdminAnalyticsTrendPoint>;

    const statusCounts: Record<ServiceStatus, number> = {
      received: 0,
      repairing: 0,
      done: 0,
      failed: 0,
    };

    const technicianMap = new Map<string, AdminAnalyticsTechnicianPoint>();
    const sparepartMap = new Map<string, AdminAnalyticsTopSparepartPoint>();
    const retailTrendMap = Object.fromEntries(
      buckets.map((bucket) => [bucket.key, { key: bucket.key, label: bucket.label, revenue: 0, transactions: 0 }])
    ) as Record<string, AdminRetailAnalyticsTrendPoint>;
    const retailItemMap = new Map<string, AdminRetailAnalyticsTopItemPoint>();
    const retailPaymentMap = new Map<AdminRetailAnalyticsPaymentPoint["method"], AdminRetailAnalyticsPaymentPoint>();

    for (const service of services) {
      statusCounts[service.status] += 1;

      const serviceTrend = trendMap[getBucketKey(service.checkinAt, bucketMode)];
      if (serviceTrend) {
        serviceTrend.services += 1;
        if (service.status === "done") serviceTrend.completed += 1;
      }

      if (service.status === "done" && service.technician) {
        const current = technicianMap.get(service.technician.id) ?? {
          id: service.technician.id,
          name: service.technician.name,
          completedServices: 0,
          revenue: 0,
        };
        current.completedServices += 1;
        if (service.invoice?.paymentStatus === "paid") {
          current.revenue += service.invoice.grandTotal;
        }
        technicianMap.set(service.technician.id, current);
      }
    }

    let paidRevenue = 0;
    let pendingRevenue = 0;
    let paidInvoices = 0;

    for (const invoice of invoices) {
      if (invoice.paymentStatus === "paid") {
        const paidDate = invoice.paidAt ?? invoice.createdAt;
        const bucketKey = getBucketKey(paidDate, bucketMode);
        if (trendMap[bucketKey]) {
          paidRevenue += invoice.grandTotal;
          paidInvoices += 1;
          trendMap[bucketKey].revenue += invoice.grandTotal;

          for (const item of invoice.items) {
            const sparepartKey = item.referenceId ?? item.name;
            const current = sparepartMap.get(sparepartKey) ?? {
              id: sparepartKey,
              name: item.name,
              qty: 0,
              revenue: 0,
            };
            current.qty += item.qty;
            current.revenue += item.qty * item.price;
            sparepartMap.set(sparepartKey, current);
          }
        }
        continue;
      }

      const pendingAmount = Math.max(invoice.grandTotal - invoice.dpAmount, 0);
      pendingRevenue += pendingAmount;

      const bucketKey = getBucketKey(invoice.createdAt, bucketMode);
      if (trendMap[bucketKey]) {
        trendMap[bucketKey].pending += pendingAmount;
      }
    }

    for (const claim of refundClaims) {
      if (!claim.resolvedAt) continue;
      const bucketKey = getBucketKey(claim.resolvedAt, bucketMode);
      paidRevenue -= claim.refundAmount;
      if (trendMap[bucketKey]) {
        trendMap[bucketKey].revenue -= claim.refundAmount;
      }
    }

    paidRevenue = Math.max(paidRevenue, 0);

    const totalServices = services.length;
    const completionRate = totalServices > 0 ? Math.round((statusCounts.done / totalServices) * 100) : 0;
    let retailRevenue = 0;
    let retailGrossMargin = 0;
    let retailTotalQty = 0;

    for (const sale of retailSales) {
      retailRevenue += sale.grandTotal;
      const retailTrend = retailTrendMap[getBucketKey(sale.paidAt, bucketMode)];
      if (retailTrend) {
        retailTrend.revenue += sale.grandTotal;
        retailTrend.transactions += 1;
      }

      const payment = retailPaymentMap.get(sale.paymentMethod) ?? {
        method: sale.paymentMethod,
        label: getPaymentMethodLabel(sale.paymentMethod),
        count: 0,
        revenue: 0,
      };
      payment.count += 1;
      payment.revenue += sale.grandTotal;
      retailPaymentMap.set(sale.paymentMethod, payment);

      for (const item of sale.items) {
        const itemGrossMargin = item.lineTotal - (item.unitCostSnapshot ?? 0) * item.qty;
        const itemKey = item.sparepartId ?? item.name;
        const current = retailItemMap.get(itemKey) ?? {
          id: itemKey,
          name: item.name,
          kind: item.kind,
          qty: 0,
          revenue: 0,
          grossMargin: 0,
        };
        current.qty += item.qty;
        current.revenue += item.lineTotal;
        current.grossMargin += itemGrossMargin;
        retailTotalQty += item.qty;
        retailGrossMargin += itemGrossMargin;
        retailItemMap.set(itemKey, current);
      }
    }

    const retailItems = Array.from(retailItemMap.values());

    return {
      toko,
      filters: normalizedFilters.allTime
        ? { ...normalizedFilters, from: getDateKey(periodStart), to: getDateKey(addDays(periodEnd, -1)) }
        : normalizedFilters,
      bucketMode,
      periodLabel,
      summary: {
        totalRevenue: paidRevenue + retailRevenue,
        estimatedNetRevenue: paidRevenue + retailGrossMargin,
        paidRevenue,
        retailRevenue,
        retailGrossMargin,
        pendingRevenue,
        paidInvoices,
        averagePaidInvoice: paidInvoices > 0 ? Math.round(paidRevenue / paidInvoices) : 0,
        totalServices,
        completionRate,
        totalSpareparts: sparepartCount,
        lowStockCount: lowStockTotal,
        totalStock: stockAggregate._sum.stock ?? 0,
      },
      trend: buckets.map((bucket) => trendMap[bucket.key]),
      statusBreakdown: (Object.keys(statusCounts) as ServiceStatus[]).map((status) => ({
        status,
        label: STATUS_LABELS[status],
        count: statusCounts[status],
      })),
      topTechnicians: Array.from(technicianMap.values())
        .sort((a, b) => b.completedServices - a.completedServices || b.revenue - a.revenue)
        .slice(0, 5),
      topSpareparts: Array.from(sparepartMap.values())
        .sort((a, b) => b.qty - a.qty || b.revenue - a.revenue)
        .slice(0, 5),
      retail: {
        enabled: retailEnabled,
        summary: {
          revenue: retailRevenue,
          transactions: retailSales.length,
          averageTransaction: retailSales.length > 0 ? Math.round(retailRevenue / retailSales.length) : 0,
          grossMargin: retailGrossMargin,
          totalQty: retailTotalQty,
        },
        trend: buckets.map((bucket) => retailTrendMap[bucket.key]),
        topItemsByQty: [...retailItems].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue).slice(0, 5),
        topItemsByRevenue: [...retailItems].sort((a, b) => b.revenue - a.revenue || b.qty - a.qty).slice(0, 5),
        paymentBreakdown: Array.from(retailPaymentMap.values()).sort((a, b) => b.revenue - a.revenue),
      },
    };
  });
}

function normalizeFilters(filters: AdminAnalyticsFilterInput | undefined): AdminAnalyticsFilters {
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const allTime = filters?.allTime === "true";
  const from = filters?.from && isDateKey(filters.from) ? parseDateKey(filters.from) : defaultFrom;
  const to = filters?.to && isDateKey(filters.to) ? parseDateKey(filters.to) : defaultTo;
  const normalizedFrom = from <= to ? from : to;
  const normalizedTo = from <= to ? to : from;
  const status = isServiceStatus(filters?.status) ? filters.status : undefined;

  return {
    from: getDateKey(normalizedFrom),
    to: getDateKey(normalizedTo),
    ...(allTime ? { allTime: true } : {}),
    ...(status ? { status } : {}),
  };
}

async function getAllTimeStart(tokoId: string) {
  const [serviceMin, invoiceMin, retailMin] = await Promise.all([
    prisma.service.aggregate({ where: { tokoId }, _min: { checkinAt: true } }),
    prisma.invoice.aggregate({ where: { service: { tokoId } }, _min: { createdAt: true } }),
    prisma.retailSale.aggregate({ where: { tokoId }, _min: { paidAt: true } }),
  ]);
  const dates = [serviceMin._min.checkinAt, invoiceMin._min.createdAt, retailMin._min.paidAt].filter((date): date is Date => Boolean(date));

  if (dates.length === 0) return new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  return new Date(Math.min(...dates.map((date) => date.getTime())));
}

function getDayBuckets(start: Date, end: Date) {
  const buckets: { key: string; label: string }[] = [];
  const cursor = new Date(start);

  while (cursor < end) {
    buckets.push({
      key: getDayKey(cursor),
      label: cursor.toLocaleDateString("id-ID", { day: "2-digit" }),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return buckets;
}

function getMonthBuckets(start: Date, end: Date) {
  const buckets: { key: string; label: string }[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);

  while (cursor < end) {
    buckets.push({
      key: getMonthKey(cursor),
      label: cursor.toLocaleDateString("id-ID", { month: "short", year: "2-digit" }),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return buckets;
}

function getBucketKey(date: Date, bucketMode: "day" | "month") {
  return bucketMode === "month" ? getMonthKey(date) : getDayKey(date);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getDayKey(date: Date) {
  return `${getMonthKey(date)}-${String(date.getDate()).padStart(2, "0")}`;
}

function getDateKey(date: Date) {
  return getDayKey(date);
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function isDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = parseDateKey(value);
  return !Number.isNaN(date.getTime()) && getDateKey(date) === value;
}

function isServiceStatus(value: unknown): value is ServiceStatus {
  return value === "received" || value === "repairing" || value === "done" || value === "failed";
}

function getPaymentMethodLabel(method: AdminRetailAnalyticsPaymentPoint["method"]) {
  const labels: Record<AdminRetailAnalyticsPaymentPoint["method"], string> = {
    cash: "Cash",
    transfer: "Transfer",
    qris: "QRIS",
    debit: "Debit",
  };

  return labels[method];
}

function formatPeriodDate(date: Date) {
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}
