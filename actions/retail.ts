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
  stock: number
  categoryName: string | null
}

export type RetailSaleResult = {
  id: string
  grandTotal: number
  paidAt: Date
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

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
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
        stock: item.stock,
        categoryName: item.category?.name ?? null,
      })),
    }
  } catch (error) {
    return actionError(error) as ActionResultWithData<RetailCheckoutItem[]>
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
          items: {
            create: inventoryItems.map((item) => {
              const qty = qtyBySparepartId.get(item.id) ?? 0
              return {
                sparepartId: item.id,
                name: item.name,
                barcode: item.barcode,
                kind: item.kind,
                qty,
                unitPrice: item.defaultPrice,
                unitCostSnapshot: item.purchasePrice,
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
