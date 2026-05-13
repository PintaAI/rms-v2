"use server"

import prisma from "@/lib/prisma"
import { actionError, type ActionResultWithData } from "@/lib/auth/authorization"
import { assertFeature, assertRole, getRequestScope } from "@/lib/auth/request-scope"
import { revalidateRetailPaths } from "@/lib/revalidation"
import { z } from "zod"

export type RetailCheckoutItem = {
  id: string
  barcode: string
  name: string
  kind: "sparepart" | "retail_item"
  defaultPrice: number
  purchasePrice: number | null
  warrantyDays: number | null
  stock: number
  categoryName: string | null
}

export type RetailSaleResult = {
  id: string
  grandTotal: number
  paidAt: Date
}

export type RetailSalesFilters = {
  q?: string
  cashierId?: string
  paymentMethod?: "cash" | "transfer" | "qris" | "debit" | "all"
  status?: "paid" | "void" | "all"
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

export type RetailSaleHistoryItem = {
  id: string
  paidAt: Date
  status: "paid" | "void"
  customerName: string | null
  customerPhone: string | null
  subtotal: number
  discountAmount: number
  grandTotal: number
  paymentMethod: "cash" | "transfer" | "qris" | "debit"
  cashReceived: number | null
  changeAmount: number | null
  cashier: { id: string; name: string }
  itemCount: number
  totalQty: number
}

export type RetailSalesResult = {
  items: RetailSaleHistoryItem[]
  cashiers: Array<{ id: string; name: string }>
  totalItems: number
  totalGross: number
  totalDiscount: number
  totalNet: number
  page: number
  pageSize: number
  totalPages: number
}

export type RetailSaleDetail = RetailSaleHistoryItem & {
  toko: {
    id: string
    name: string
    address: string | null
    phone: string | null
    logoUrl: string | null
    invoiceTerms: string | null
  }
  items: Array<{
    id: string
    sparepartId: string | null
    name: string
    barcode: string | null
    kind: "sparepart" | "retail_item"
    qty: number
    unitPrice: number
    unitCostSnapshot: number | null
    warrantyDaysSnapshot: number | null
    warrantyUntil: Date | null
    lineTotal: number
  }>
}

const createRetailSaleSchema = z.object({
  tokoId: z.string().min(1, "Toko wajib diisi"),
  customerName: z.string().trim().optional().nullable(),
  customerPhone: z.string().trim().optional().nullable(),
  items: z.array(z.object({
    sparepartId: z.string().min(1, "Barang wajib dipilih"),
    qty: z.number().int().min(1, "Qty minimal 1"),
  })).min(1, "Keranjang masih kosong"),
  discountType: z.enum(["flat", "percent"]).optional(),
  discountAmount: z.number().int().min(0, "Diskon harus 0 atau lebih").optional(),
  discountPercent: z.number().min(0, "Diskon persen minimal 0").max(100, "Diskon persen maksimal 100").optional(),
  paymentMethod: z.enum(["cash", "transfer", "qris", "debit"]),
  cashReceived: z.number().int().min(0, "Uang diterima harus 0 atau lebih").optional().nullable(),
})

export type CreateRetailSaleInput = z.infer<typeof createRetailSaleSchema>

class RetailCheckoutError extends Error {}

async function assertRetailCheckoutAccess(tokoId: string) {
  const scope = await getRequestScope(tokoId)
  assertRole(scope, ["admin", "staff"])
  assertFeature(scope, "inventory.management")
  assertFeature(scope, "retail.sales")
  return scope
}

function normalizeRetailSalesFilters(filters?: RetailSalesFilters) {
  const rawPageSize = Number.isFinite(filters?.pageSize) ? filters?.pageSize ?? 20 : 20
  const rawPage = Number.isFinite(filters?.page) ? filters?.page ?? 1 : 1
  const pageSize = Math.min(Math.max(rawPageSize, 1), 100)
  const page = Math.max(rawPage, 1)
  const q = filters?.q?.trim()
  const cashierId = filters?.cashierId && filters.cashierId !== "all" ? filters.cashierId : undefined
  const paymentMethod = filters?.paymentMethod && filters.paymentMethod !== "all" ? filters.paymentMethod : undefined
  const status = filters?.status && filters.status !== "all" ? filters.status : undefined
  const from = filters?.from && /^\d{4}-\d{2}-\d{2}$/.test(filters.from) ? filters.from : undefined
  const to = filters?.to && /^\d{4}-\d{2}-\d{2}$/.test(filters.to) ? filters.to : undefined

  return {
    q: q || undefined,
    cashierId,
    paymentMethod,
    status,
    from,
    to,
    page,
    pageSize,
  }
}

function toRetailHistoryItem(sale: {
  id: string
  paidAt: Date
  status: "paid" | "void"
  customerName: string | null
  customerPhone: string | null
  subtotal: number
  discountAmount: number
  grandTotal: number
  paymentMethod: "cash" | "transfer" | "qris" | "debit"
  cashReceived: number | null
  changeAmount: number | null
  createdBy: { id: string; name: string }
  items: Array<{ qty: number }>
}): RetailSaleHistoryItem {
  return {
    id: sale.id,
    paidAt: sale.paidAt,
    status: sale.status,
    customerName: sale.customerName,
    customerPhone: sale.customerPhone,
    subtotal: sale.subtotal,
    discountAmount: sale.discountAmount,
    grandTotal: sale.grandTotal,
    paymentMethod: sale.paymentMethod,
    cashReceived: sale.cashReceived,
    changeAmount: sale.changeAmount,
    cashier: sale.createdBy,
    itemCount: sale.items.length,
    totalQty: sale.items.reduce((total, item) => total + item.qty, 0),
  }
}

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export async function getRetailCheckoutItems(
  tokoId: string,
  query?: string
): Promise<ActionResultWithData<RetailCheckoutItem[]>> {
  try {
    await assertRetailCheckoutAccess(tokoId)

    const search = query?.trim()
    const items = await prisma.sparepart.findMany({
      where: {
        tokoId,
        stock: { gt: 0 },
        ...(search
          ? {
              OR: [
                { barcode: { contains: search, mode: "insensitive" } },
                { name: { contains: search, mode: "insensitive" } },
                { category: { name: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      orderBy: [{ kind: "desc" }, { name: "asc" }],
      take: 50,
      select: {
        id: true,
        barcode: true,
        name: true,
        kind: true,
        defaultPrice: true,
        purchasePrice: true,
        warrantyDays: true,
        stock: true,
        category: { select: { name: true } },
      },
    })

    return {
      success: true,
      data: items.map((item) => ({
        id: item.id,
        barcode: item.barcode,
        name: item.name,
        kind: item.kind,
        defaultPrice: item.defaultPrice,
        purchasePrice: item.purchasePrice,
        warrantyDays: item.warrantyDays,
        stock: item.stock,
        categoryName: item.category?.name ?? null,
      })),
    }
  } catch (error) {
    return actionError(error) as ActionResultWithData<RetailCheckoutItem[]>
  }
}

export async function getRetailSales(
  tokoId: string,
  filters?: RetailSalesFilters
): Promise<ActionResultWithData<RetailSalesResult>> {
  try {
    await assertRetailCheckoutAccess(tokoId)
    const normalized = normalizeRetailSalesFilters(filters)
    const paidAtFilter = {
      ...(normalized.from ? { gte: new Date(`${normalized.from}T00:00:00.000`) } : {}),
      ...(normalized.to ? { lte: new Date(`${normalized.to}T23:59:59.999`) } : {}),
    }
    const where = {
      tokoId,
      ...(normalized.cashierId ? { createdById: normalized.cashierId } : {}),
      ...(normalized.paymentMethod ? { paymentMethod: normalized.paymentMethod } : {}),
      ...(normalized.status ? { status: normalized.status } : {}),
      ...(Object.keys(paidAtFilter).length > 0 ? { paidAt: paidAtFilter } : {}),
      ...(normalized.q
        ? {
            OR: [
              { id: { contains: normalized.q, mode: "insensitive" as const } },
              { customerName: { contains: normalized.q, mode: "insensitive" as const } },
              { customerPhone: { contains: normalized.q, mode: "insensitive" as const } },
              { items: { some: { name: { contains: normalized.q, mode: "insensitive" as const } } } },
            ],
          }
        : {}),
    }

    const [sales, totalItems, totals, cashiers] = await Promise.all([
      prisma.retailSale.findMany({
        where,
        orderBy: { paidAt: "desc" },
        skip: (normalized.page - 1) * normalized.pageSize,
        take: normalized.pageSize,
        select: {
          id: true,
          paidAt: true,
          status: true,
          customerName: true,
          customerPhone: true,
          subtotal: true,
          discountAmount: true,
          grandTotal: true,
          paymentMethod: true,
          cashReceived: true,
          changeAmount: true,
          createdBy: { select: { id: true, name: true } },
          items: { select: { qty: true } },
        },
      }),
      prisma.retailSale.count({ where }),
      prisma.retailSale.aggregate({
        where: { ...where, status: "paid" },
        _sum: { subtotal: true, discountAmount: true, grandTotal: true },
      }),
      prisma.user.findMany({
        where: { retailSales: { some: { tokoId } } },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ])

    return {
      success: true,
      data: {
        items: sales.map(toRetailHistoryItem),
        cashiers,
        totalItems,
        totalGross: totals._sum.subtotal ?? 0,
        totalDiscount: totals._sum.discountAmount ?? 0,
        totalNet: totals._sum.grandTotal ?? 0,
        page: normalized.page,
        pageSize: normalized.pageSize,
        totalPages: Math.max(1, Math.ceil(totalItems / normalized.pageSize)),
      },
    }
  } catch (error) {
    return actionError(error) as ActionResultWithData<RetailSalesResult>
  }
}

export async function getRetailSale(saleId: string): Promise<ActionResultWithData<RetailSaleDetail>> {
  try {
    const sale = await prisma.retailSale.findUnique({
      where: { id: saleId },
      select: {
        id: true,
        tokoId: true,
        paidAt: true,
        status: true,
        customerName: true,
        customerPhone: true,
        subtotal: true,
        discountAmount: true,
        grandTotal: true,
        paymentMethod: true,
        cashReceived: true,
        changeAmount: true,
        createdBy: { select: { id: true, name: true } },
        toko: { select: { id: true, name: true, address: true, phone: true, logoUrl: true, invoiceTerms: true } },
        items: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            sparepartId: true,
            name: true,
            barcode: true,
            kind: true,
            qty: true,
            unitPrice: true,
            unitCostSnapshot: true,
            warrantyDaysSnapshot: true,
            warrantyUntil: true,
            lineTotal: true,
          },
        },
      },
    })

    if (!sale) return { success: false, error: "Penjualan retail tidak ditemukan" }
    await assertRetailCheckoutAccess(sale.tokoId)

    return {
      success: true,
      data: {
        ...toRetailHistoryItem(sale),
        toko: sale.toko,
        items: sale.items,
      },
    }
  } catch (error) {
    return actionError(error) as ActionResultWithData<RetailSaleDetail>
  }
}

export async function createRetailSale(input: CreateRetailSaleInput): Promise<ActionResultWithData<RetailSaleResult>> {
  try {
    const validated = createRetailSaleSchema.parse(input)
    const scope = await assertRetailCheckoutAccess(validated.tokoId)

    const qtyBySparepartId = new Map<string, number>()
    for (const item of validated.items) {
      qtyBySparepartId.set(item.sparepartId, (qtyBySparepartId.get(item.sparepartId) ?? 0) + item.qty)
    }

    const sale = await prisma.$transaction(async (tx) => {
      const inventoryItems = await tx.sparepart.findMany({
        where: {
          tokoId: scope.tokoId,
          id: { in: Array.from(qtyBySparepartId.keys()) },
        },
        select: {
          id: true,
          barcode: true,
          name: true,
          kind: true,
          defaultPrice: true,
          purchasePrice: true,
          warrantyDays: true,
          stock: true,
        },
      })

      if (inventoryItems.length !== qtyBySparepartId.size) {
        throw new RetailCheckoutError("Ada barang yang tidak ditemukan di toko ini")
      }

      let subtotal = 0
      for (const item of inventoryItems) {
        const qty = qtyBySparepartId.get(item.id) ?? 0
        if (item.stock < qty) throw new RetailCheckoutError(`Stok ${item.name} tidak cukup`)
        if (item.defaultPrice <= 0) throw new RetailCheckoutError(`${item.name} belum punya harga jual`)
        subtotal += item.defaultPrice * qty
      }

      const discountAmount = validated.discountType === "percent"
        ? Math.floor(subtotal * ((validated.discountPercent ?? 0) / 100))
        : validated.discountAmount ?? 0

      if (discountAmount > subtotal) throw new RetailCheckoutError("Diskon tidak boleh melebihi subtotal")

      const grandTotal = subtotal - discountAmount
      const paidAt = new Date()
      let cashReceived: number | null = null
      let changeAmount: number | null = null

      if (validated.paymentMethod === "cash") {
        cashReceived = validated.cashReceived ?? 0
        changeAmount = cashReceived - grandTotal
      }

      if (cashReceived !== null && cashReceived < grandTotal) {
        throw new RetailCheckoutError("Uang diterima kurang dari total belanja")
      }

      const createdSale = await tx.retailSale.create({
        data: {
          tokoId: scope.tokoId,
          createdById: scope.user.id,
          customerName: normalizeOptionalText(validated.customerName),
          customerPhone: normalizeOptionalText(validated.customerPhone),
          subtotal,
          discountAmount,
          grandTotal,
          paymentMethod: validated.paymentMethod,
          cashReceived,
          changeAmount,
          paidAt,
          items: {
            create: inventoryItems.map((item) => {
              const qty = qtyBySparepartId.get(item.id) ?? 0
              const warrantyUntil = item.warrantyDays ? addDays(paidAt, item.warrantyDays) : null
              return {
                sparepartId: item.id,
                name: item.name,
                barcode: item.barcode,
                kind: item.kind,
                qty,
                unitPrice: item.defaultPrice,
                unitCostSnapshot: item.purchasePrice,
                warrantyDaysSnapshot: item.warrantyDays,
                warrantyUntil,
                lineTotal: item.defaultPrice * qty,
              }
            }),
          },
        },
        select: { id: true, grandTotal: true, paidAt: true },
      })

      for (const item of inventoryItems) {
        const qty = qtyBySparepartId.get(item.id) ?? 0
        const updated = await tx.sparepart.updateMany({
          where: {
            id: item.id,
            tokoId: scope.tokoId,
            stock: { gte: qty },
          },
          data: { stock: { decrement: qty } },
        })

        if (updated.count !== 1) throw new RetailCheckoutError(`Stok ${item.name} tidak cukup`)

        await tx.stockMovement.create({
          data: {
            tokoId: scope.tokoId,
            sparepartId: item.id,
            type: "retail_sale",
            qtyChange: -qty,
            stockBefore: item.stock,
            stockAfter: item.stock - qty,
            unitCostSnapshot: item.purchasePrice,
            unitPriceSnapshot: item.defaultPrice,
            referenceType: "retail_sale",
            referenceId: createdSale.id,
            createdById: scope.user.id,
          },
        })
      }

      return createdSale
    })

    revalidateRetailPaths(scope.tokoId)

    return { success: true, data: sale }
  } catch (error) {
    if (error instanceof z.ZodError) return { success: false, error: error.issues[0].message }
    if (error instanceof RetailCheckoutError) return { success: false, error: error.message }
    return actionError(error) as ActionResultWithData<RetailSaleResult>
  }
}
