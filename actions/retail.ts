"use server"

import prisma from "@/lib/prisma"
import { actionError, type ActionResultWithData } from "@/lib/auth/authorization"
import { assertFeature, assertPermission, getRequestScope } from "@/lib/auth/request-scope"
import type { PermissionKey } from "@/lib/permissions"
import { revalidateRetailPaths } from "@/lib/revalidation"
import { z } from "zod"

export type RetailCheckoutItem = {
  id: string
  barcode: string
  name: string
  kind: "repair_part" | "retail_product" | "phone_unit"
  defaultPrice: number
  purchasePrice: number | null
  warrantyDays: number | null
  stock: number
  categoryName: string | null
}

export type PhoneUnitCheckoutItem = {
  id: string
  deviceModelName: string
  deviceBrandName: string
  imei: string | null
  serialNumber: string | null
  condition: string
  sellingPrice: number
  purchasePrice: number
  warrantyDays: number | null
}

export type SalesOrderResult = {
  id: string
  grandTotal: number
  paidAt: Date
}

export type SalesOrdersFilters = {
  q?: string
  cashierId?: string
  paymentMethod?: "cash" | "transfer" | "qris" | "debit" | "all"
  status?: "paid" | "void" | "all"
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

export type SalesOrderHistoryItem = {
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

export type SalesOrdersResult = {
  items: SalesOrderHistoryItem[]
  cashiers: Array<{ id: string; name: string }>
  totalItems: number
  totalGross: number
  totalDiscount: number
  totalNet: number
  page: number
  pageSize: number
  totalPages: number
}

export type SalesOrderDetail = SalesOrderHistoryItem & {
  store: {
    id: string
    name: string
    address: string | null
    phone: string | null
    logoUrl: string | null
    invoiceTerms: string | null
  }
  items: Array<{
    id: string
    inventoryItemId: string | null
    name: string
    barcode: string | null
    kind: "repair_part" | "retail_product" | "phone_unit"
    qty: number
    unitPrice: number
    unitCostSnapshot: number | null
    warrantyDaysSnapshot: number | null
    warrantyUntil: Date | null
    lineTotal: number
  }>
}

const createSalesOrderSchema = z.object({
  storeId: z.string().min(1, "Toko wajib diisi"),
  customerName: z.string().trim().optional().nullable(),
  customerPhone: z.string().trim().optional().nullable(),
  items: z.array(z.object({
    inventoryItemId: z.string().min(1, "Barang wajib dipilih"),
    qty: z.number().int().min(1, "Qty minimal 1"),
  })).min(1, "Keranjang masih kosong"),
  discountType: z.enum(["flat", "percent"]).optional(),
  discountAmount: z.number().int().min(0, "Diskon harus 0 atau lebih").optional(),
  discountPercent: z.number().min(0, "Diskon persen minimal 0").max(100, "Diskon persen maksimal 100").optional(),
  paymentMethod: z.enum(["cash", "transfer", "qris", "debit"]),
  cashReceived: z.number().int().min(0, "Uang diterima harus 0 atau lebih").optional().nullable(),
})

export type CreateSalesOrderInput = z.infer<typeof createSalesOrderSchema>

class RetailCheckoutError extends Error {}

async function assertRetailAccess(storeId: string, permission: PermissionKey) {
  const scope = await getRequestScope(storeId)
  assertPermission(scope, permission)
  assertFeature(scope, "retail.sales")
  return scope
}

function normalizeSalesOrdersFilters(filters?: SalesOrdersFilters) {
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
}): SalesOrderHistoryItem {
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
  storeId: string,
  query?: string
): Promise<ActionResultWithData<RetailCheckoutItem[]>> {
  try {
    await assertRetailAccess(storeId, "retail.view")

    const search = query?.trim()
    const items = await prisma.inventoryItem.findMany({
      where: {
        storeId,
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
      orderBy: [{ type: "desc" }, { name: "asc" }],
      take: 50,
      select: {
        id: true,
        barcode: true,
        name: true,
        type: true,
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
        kind: item.type,
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

export async function getPhoneUnitsForCheckout(
  storeId: string,
  query?: string
): Promise<ActionResultWithData<PhoneUnitCheckoutItem[]>> {
  try {
    await assertRetailAccess(storeId, "retail.view")

    const search = query?.trim()
    const units = await prisma.inventoryUnit.findMany({
      where: {
        storeId,
        status: "available",
        ...(search
          ? {
              OR: [
                { imei: { contains: search, mode: "insensitive" as const } },
                { serialNumber: { contains: search, mode: "insensitive" as const } },
                { deviceModel: { modelName: { contains: search, mode: "insensitive" as const } } },
                { deviceModel: { brand: { name: { contains: search, mode: "insensitive" as const } } } },
              ],
            }
          : {}),
      },
      orderBy: { acquiredAt: "desc" },
      take: 50,
      select: {
        id: true,
        imei: true,
        serialNumber: true,
        condition: true,
        sellingPrice: true,
        purchasePrice: true,
        warrantyDays: true,
        deviceModel: {
          select: {
            modelName: true,
            brand: { select: { name: true } },
          },
        },
      },
    })

    return {
      success: true,
      data: units.map((unit) => ({
        id: unit.id,
        deviceModelName: unit.deviceModel.modelName,
        deviceBrandName: unit.deviceModel.brand.name,
        imei: unit.imei,
        serialNumber: unit.serialNumber,
        condition: unit.condition,
        sellingPrice: unit.sellingPrice,
        purchasePrice: unit.purchasePrice,
        warrantyDays: unit.warrantyDays,
      })),
    }
  } catch (error) {
    return actionError(error) as ActionResultWithData<PhoneUnitCheckoutItem[]>
  }
}

export type CreatePhoneUnitSalesOrderInput = {
  storeId: string
  customerName?: string | null
  customerPhone?: string | null
  inventoryUnitIds: string[]
  discountType?: "flat" | "percent"
  discountAmount?: number
  discountPercent?: number
  paymentMethod: "cash" | "transfer" | "qris" | "debit"
  cashReceived?: number | null
}

const createPhoneUnitSalesOrderSchema = z.object({
  storeId: z.string().min(1, "Toko wajib diisi"),
  customerName: z.string().trim().optional().nullable(),
  customerPhone: z.string().trim().optional().nullable(),
  inventoryUnitIds: z.array(z.string().min(1)).min(1, "Pilih minimal satu unit"),
  discountType: z.enum(["flat", "percent"]).optional(),
  discountAmount: z.number().int().min(0, "Diskon harus 0 atau lebih").optional(),
  discountPercent: z.number().min(0, "Diskon persen minimal 0").max(100, "Diskon persen maksimal 100").optional(),
  paymentMethod: z.enum(["cash", "transfer", "qris", "debit"]),
  cashReceived: z.number().int().min(0, "Uang diterima harus 0 atau lebih").optional().nullable(),
})

export async function createPhoneUnitSalesOrder(
  input: CreatePhoneUnitSalesOrderInput
): Promise<ActionResultWithData<SalesOrderResult>> {
  try {
    const validated = createPhoneUnitSalesOrderSchema.parse(input)
    const scope = await assertRetailAccess(validated.storeId, "retail.sell")

    const sale = await prisma.$transaction(async (tx) => {
      const units = await tx.inventoryUnit.findMany({
        where: {
          id: { in: validated.inventoryUnitIds },
          storeId: scope.storeId,
          status: "available",
        },
        select: {
          id: true,
          deviceModelId: true,
          imei: true,
          serialNumber: true,
          condition: true,
          sellingPrice: true,
          purchasePrice: true,
          warrantyDays: true,
          deviceModel: {
            select: {
              modelName: true,
              brand: { select: { name: true } },
            },
          },
        },
      })

      if (units.length !== validated.inventoryUnitIds.length) {
        throw new RetailCheckoutError("Ada unit yang tidak ditemukan atau sudah terjual")
      }

      for (const unit of units) {
        if (unit.sellingPrice <= 0) {
          throw new RetailCheckoutError(`Unit ${unit.deviceModel.brand.name} ${unit.deviceModel.modelName} belum punya harga jual`)
        }
      }

      let subtotal = units.reduce((sum, unit) => sum + unit.sellingPrice, 0)

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

      const createdSale = await tx.salesOrder.create({
        data: {
          storeId: scope.storeId,
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
            create: units.map((unit) => ({
              inventoryItemId: null,
              inventoryUnitId: unit.id,
              name: `${unit.deviceModel.brand.name} ${unit.deviceModel.modelName}`,
              barcode: unit.imei || unit.serialNumber || null,
              kind: "phone_unit",
              qty: 1,
              unitPrice: unit.sellingPrice,
              unitCostSnapshot: unit.purchasePrice,
              warrantyDaysSnapshot: unit.warrantyDays,
              warrantyUntil: unit.warrantyDays ? addDays(paidAt, unit.warrantyDays) : null,
              lineTotal: unit.sellingPrice,
            })),
          },
        },
        select: { id: true, grandTotal: true, paidAt: true },
      })

      for (const unit of units) {
        await tx.inventoryUnit.update({
          where: { id: unit.id },
          data: {
            status: "sold",
            soldAt: paidAt,
          },
        })

        await tx.inventoryMovement.create({
          data: {
            storeId: scope.storeId,
            inventoryItemId: null,
            inventoryUnitId: unit.id,
            type: "unit_sold",
            qtyChange: -1,
            stockBefore: 1,
            stockAfter: 0,
            unitCostSnapshot: unit.purchasePrice,
            unitPriceSnapshot: unit.sellingPrice,
            referenceType: "sales_order",
            referenceId: createdSale.id,
            createdById: scope.user.id,
          },
        })
      }

      return createdSale
    })

    revalidateRetailPaths(scope.storeId)

    return { success: true, data: sale }
  } catch (error) {
    if (error instanceof z.ZodError) return { success: false, error: error.issues[0].message }
    if (error instanceof RetailCheckoutError) return { success: false, error: error.message }
    return actionError(error) as ActionResultWithData<SalesOrderResult>
  }
}

export async function getSalesOrders(
  storeId: string,
  filters?: SalesOrdersFilters
): Promise<ActionResultWithData<SalesOrdersResult>> {
  try {
    await assertRetailAccess(storeId, "retail.viewHistory")
    const normalized = normalizeSalesOrdersFilters(filters)
    const paidAtFilter = {
      ...(normalized.from ? { gte: new Date(`${normalized.from}T00:00:00.000`) } : {}),
      ...(normalized.to ? { lte: new Date(`${normalized.to}T23:59:59.999`) } : {}),
    }
    const where = {
      storeId,
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
      prisma.salesOrder.findMany({
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
      prisma.salesOrder.count({ where }),
      prisma.salesOrder.aggregate({
        where: { ...where, status: "paid" },
        _sum: { subtotal: true, discountAmount: true, grandTotal: true },
      }),
      prisma.user.findMany({
        where: { salesOrders: { some: { storeId } } },
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
    return actionError(error) as ActionResultWithData<SalesOrdersResult>
  }
}

export async function getSalesOrder(salesOrderId: string): Promise<ActionResultWithData<SalesOrderDetail>> {
  try {
    const sale = await prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
      select: {
        id: true,
        storeId: true,
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
        store: { select: { id: true, name: true, address: true, phone: true, logoUrl: true, invoiceTerms: true } },
        items: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            inventoryItemId: true,
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
    await assertRetailAccess(sale.storeId, "retail.viewHistory")

    return {
      success: true,
      data: {
        ...toRetailHistoryItem(sale),
        store: sale.store,
        items: sale.items,
      },
    }
  } catch (error) {
    return actionError(error) as ActionResultWithData<SalesOrderDetail>
  }
}

export async function createSalesOrder(input: CreateSalesOrderInput): Promise<ActionResultWithData<SalesOrderResult>> {
  try {
    const validated = createSalesOrderSchema.parse(input)
    const scope = await assertRetailAccess(validated.storeId, "retail.sell")

    const qtyBySparepartId = new Map<string, number>()
    for (const item of validated.items) {
      qtyBySparepartId.set(item.inventoryItemId, (qtyBySparepartId.get(item.inventoryItemId) ?? 0) + item.qty)
    }

    const sale = await prisma.$transaction(async (tx) => {
      const inventoryItems = await tx.inventoryItem.findMany({
        where: {
          storeId: scope.storeId,
          id: { in: Array.from(qtyBySparepartId.keys()) },
        },
        select: {
          id: true,
          barcode: true,
          name: true,
          type: true,
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

      const createdSale = await tx.salesOrder.create({
        data: {
          storeId: scope.storeId,
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
                inventoryItemId: item.id,
                name: item.name,
                barcode: item.barcode,
                kind: item.type,
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
        const updated = await tx.inventoryItem.updateMany({
          where: {
            id: item.id,
            storeId: scope.storeId,
            stock: { gte: qty },
          },
          data: { stock: { decrement: qty } },
        })

        if (updated.count !== 1) throw new RetailCheckoutError(`Stok ${item.name} tidak cukup`)

        await tx.inventoryMovement.create({
          data: {
            storeId: scope.storeId,
            inventoryItemId: item.id,
            type: "sales_order",
            qtyChange: -qty,
            stockBefore: item.stock,
            stockAfter: item.stock - qty,
            unitCostSnapshot: item.purchasePrice,
            unitPriceSnapshot: item.defaultPrice,
            referenceType: "sales_order",
            referenceId: createdSale.id,
            createdById: scope.user.id,
          },
        })
      }

      return createdSale
    })

    revalidateRetailPaths(scope.storeId)

    return { success: true, data: sale }
  } catch (error) {
    if (error instanceof z.ZodError) return { success: false, error: error.issues[0].message }
    if (error instanceof RetailCheckoutError) return { success: false, error: error.message }
    return actionError(error) as ActionResultWithData<SalesOrderResult>
  }
}

export type RetailSaleResult = SalesOrderResult
export type RetailSalesFilters = SalesOrdersFilters
export type RetailSaleHistoryItem = SalesOrderHistoryItem
export type RetailSalesResult = SalesOrdersResult
export type RetailSaleDetail = SalesOrderDetail
export type CreateRetailSaleInput = CreateSalesOrderInput

export const getRetailSales = getSalesOrders
export const getRetailSale = getSalesOrder
export const createRetailSale = createSalesOrder
