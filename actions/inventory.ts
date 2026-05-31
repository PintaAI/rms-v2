"use server"

import { createActivityLogIfUser } from "@/lib/activity-log"
import prisma from "@/lib/prisma"
import { actionError, type ActionResult, type ActionResultWithData } from "@/lib/auth/authorization"
import { assertFeature, assertPermission, getRequestScope } from "@/lib/auth/request-scope"
import { revalidateInventoryPaths } from "@/lib/revalidation"
import type { FeatureKey } from "@/lib/features"
import type { PermissionKey } from "@/lib/permissions"
import type { Prisma } from "@/prisma/generated/prisma/client"
import { revalidatePath } from "next/cache"
import { z } from "zod"

export type InventoryItem = {
  id: string
  barcode: string
  name: string
  defaultPrice: number
  purchasePrice: number | null
  supplierName: string | null
  categoryId: string | null
  stock: number
  criticalStock: number
  warrantyDays: number | null
  isUniversal: boolean
  type: InventoryItemKind
  storeId: string
}

/** @deprecated Use InventoryItem instead. */
export type Sparepart = InventoryItem

export type InventoryItemKind = "repair_part" | "retail_product" | "phone_unit"

export type InventoryCategory = {
  id: string
  name: string
  kind: InventoryItemKind
  storeId: string
}

/** @deprecated Use InventoryCategory instead. */
export type SparepartCategory = InventoryCategory

export type ServicePricelist = {
  id: string
  title: string
  defaultPrice: number
  storeId?: string
}

export type InventoryItemWithCompatibilities = InventoryItem & {
  category: InventoryCategory | null
  compatibilities: Array<{
    deviceModelId: string
    deviceModel: {
      id: string
      modelName: string
      brand: { name: string }
    }
  }>
}

/** @deprecated Use InventoryItemWithCompatibilities instead. */
export type SparepartWithCompatibilities = InventoryItemWithCompatibilities

export type InventoryItemListItem = {
  id: string
  name: string
  barcode: string
  defaultPrice: number
  supplierName: string | null
  stock: number
  type: InventoryItemKind
}

/** @deprecated Use InventoryItemListItem instead. */
export type SparepartListItem = InventoryItemListItem

type LegacyInventoryItemType = "sparepart" | "retail_item"

function normalizeInventoryItemType(value: unknown): InventoryItemKind | undefined {
  if (value === "sparepart") return "repair_part"
  if (value === "retail_item") return "retail_product"
  if (value === "phone_unit" || value === "repair_part" || value === "retail_product") return value
  return undefined
}

const inventoryItemTypeSchema = z.preprocess(
  normalizeInventoryItemType,
  z.enum(["repair_part", "retail_product", "phone_unit"]).optional()
)

export type ImportInventoryItemInput = {
  rowNumber: number
  name: string
  defaultPrice: number
  purchasePrice?: number | null
  supplierName?: string | null
  categoryName?: string | null
  stock: number
  criticalStock?: number | null
  warrantyDays?: number | null
  isUniversal?: boolean
  type?: InventoryItemKind | LegacyInventoryItemType
}

export type ImportSparepartInput = ImportInventoryItemInput

export type ImportInventoryItemsResult = {
  created: number
  updated: number
  failed: number
  errors: Array<{ rowNumber: number; message: string }>
}

/** @deprecated Use ImportInventoryItemsResult instead. */
export type ImportSparepartsResult = ImportInventoryItemsResult

export type ImportServicePricelistInput = {
  rowNumber: number
  title: string
  defaultPrice: number
}

export type ImportServicePricelistsResult = {
  created: number
  updated: number
  failed: number
  errors: Array<{ rowNumber: number; message: string }>
}

export type RestockHistoryItem = {
  id: string
  createdAt: Date
  inventoryItemId: string
  inventoryItemBarcode: string
  inventoryItemName: string
  previousStock: number
  addedQty: number
  newStock: number
  purchasePrice: number
  totalPrice: number
  userId: string
  userName: string
}

export type RestockHistoryUser = {
  id: string
  name: string
}

export type RestockHistoryFilters = {
  q?: string
  userId?: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

export type RestockHistoryResult = {
  items: RestockHistoryItem[]
  users: RestockHistoryUser[]
  totalItems: number
  totalQty: number
  totalPrice: number
  page: number
  pageSize: number
  totalPages: number
}

export type InventoryReportStockStatus = "all" | "safe" | "critical" | "out"

export type InventoryReportFilters = {
  q?: string
  categoryId?: string
  status?: InventoryReportStockStatus
  type?: InventoryItemKind
}

export type InventoryReportItem = {
  id: string
  barcode: string
  name: string
  categoryId: string | null
  categoryName: string | null
  supplierName: string | null
  stock: number
  criticalStock: number
  purchasePrice: number
  defaultPrice: number
  type: InventoryItemKind
  capitalValue: number
  sellingValue: number
  potentialMargin: number
  status: Exclude<InventoryReportStockStatus, "all">
}

export type InventoryReportCategory = {
  id: string
  name: string
}

export type SupplierReturnSupplierReport = {
  supplierName: string
  pendingCount: number
  pendingQty: number
  pendingValue: number
  averageResolutionDays: number | null
  replacedQty: number
  refundedAmount: number
  rejectedCount: number
}

export type SupplierReturnInventoryItemReport = {
  inventoryItemId: string
  inventoryItemName: string
  supplierName: string | null
  returnCount: number
  returnedQty: number
}

export type SupplierReturnReport = {
  supplierReports: SupplierReturnSupplierReport[]
  mostReturnedSpareparts: SupplierReturnInventoryItemReport[]
  totalPendingValue: number
  averageResolutionDays: number | null
}

export type InventoryReportResult = {
  items: InventoryReportItem[]
  categories: InventoryReportCategory[]
  supplierReturns: SupplierReturnReport
  totalSpareparts: number
  totalStockUnits: number
  totalCapitalValue: number
  totalSellingValue: number
  potentialMargin: number
  outOfStockCount: number
  criticalStockCount: number
  safeStockCount: number
}

function calculateAverageResolutionDays(
  items: Array<{ createdAt: Date; resolvedAt: Date | null }>
): number | null {
  const resolvedDurations = items
    .filter((item) => item.resolvedAt)
    .map((item) => item.resolvedAt!.getTime() - item.createdAt.getTime())

  if (resolvedDurations.length === 0) return null

  const averageMs = resolvedDurations.reduce((total, duration) => total + duration, 0) / resolvedDurations.length
  return Math.round((averageMs / (1000 * 60 * 60 * 24)) * 10) / 10
}

const createInventoryItemSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  defaultPrice: z.number().int().min(0, "Harga jual harus 0 atau lebih"),
  purchasePrice: z.number().int().min(0, "Harga beli harus 0 atau lebih").nullable().optional(),
  supplierName: z.string().trim().nullable().optional(),
  categoryName: z.string().trim().nullable().optional(),
  stock: z.number().int().min(0, "Stok harus 0 atau lebih").optional(),
  criticalStock: z.number().int().min(0, "Stok kritis harus 0 atau lebih").optional(),
  warrantyDays: z.number().int().min(1, "Garansi harus 1 hari atau lebih").nullable().optional(),
  isUniversal: z.boolean().optional(),
  type: inventoryItemTypeSchema,
  storeId: z.string(),
  deviceModelIds: z.array(z.string()).optional(),
})

const importInventoryItemRowSchema = z.object({
  rowNumber: z.number().int().min(2),
  name: z.string().trim().min(1, "Nama wajib diisi"),
  defaultPrice: z.number().int().min(0, "Harga jual harus 0 atau lebih"),
  purchasePrice: z.number().int().min(0, "Harga beli harus 0 atau lebih").nullable().optional(),
  supplierName: z.string().trim().nullable().optional(),
  categoryName: z.string().trim().nullable().optional(),
  stock: z.number().int().min(0, "Stok harus 0 atau lebih"),
  criticalStock: z.number().int().min(0, "Stok kritis harus 0 atau lebih").nullable().optional(),
  warrantyDays: z.number().int().min(1, "Garansi harus 1 hari atau lebih").nullable().optional(),
  isUniversal: z.boolean().optional(),
  type: inventoryItemTypeSchema,
})

const importInventoryItemsSchema = z.object({
  storeId: z.string(),
  rows: z.array(importInventoryItemRowSchema).min(1, "Tidak ada data untuk diimport").max(1000, "Maksimal 1000 baris per import"),
})

const importServicePricelistRowSchema = z.object({
  rowNumber: z.number().int().min(2),
  title: z.string().trim().min(1, "Judul wajib diisi"),
  defaultPrice: z.number().int().min(0, "Harga harus 0 atau lebih"),
})

const importServicePricelistsSchema = z.object({
  storeId: z.string(),
  rows: z.array(importServicePricelistRowSchema).min(1, "Tidak ada data untuk diimport").max(1000, "Maksimal 1000 baris per import"),
})

const updateInventoryItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Nama wajib diisi").optional(),
  defaultPrice: z.number().int().min(0, "Harga jual harus 0 atau lebih").optional(),
  purchasePrice: z.number().int().min(0, "Harga beli harus 0 atau lebih").nullable().optional(),
  supplierName: z.string().trim().nullable().optional(),
  categoryName: z.string().trim().nullable().optional(),
  stock: z.number().int().min(0, "Stok harus 0 atau lebih").optional(),
  criticalStock: z.number().int().min(0, "Stok kritis harus 0 atau lebih").optional(),
  warrantyDays: z.number().int().min(1, "Garansi harus 1 hari atau lebih").nullable().optional(),
  isUniversal: z.boolean().optional(),
  type: inventoryItemTypeSchema,
  deviceModelIds: z.array(z.string()).optional(),
})

const createServicePricelistSchema = z.object({
  title: z.string().min(1, "Judul wajib diisi"),
  defaultPrice: z.number().int().min(0, "Harga harus 0 atau lebih"),
  storeId: z.string(),
})

const updateServicePricelistSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Title is required").optional(),
  defaultPrice: z.number().int().min(0, "Price must be 0 or greater").optional(),
})

const INVENTORY_ITEM_BARCODE_PREFIX = "SP"

function formatInventoryItemBarcode(sequence: number) {
  return `${INVENTORY_ITEM_BARCODE_PREFIX}${sequence.toString().padStart(6, "0")}`
}

async function generateInventoryItemBarcode(storeId: string) {
  const existingBarcodes = await prisma.inventoryItem.findMany({
    where: { storeId },
    select: { barcode: true },
  })

  const usedBarcodes = new Set(existingBarcodes.map((inventoryItem) => inventoryItem.barcode))
  let sequence = usedBarcodes.size + 1
  let barcode = formatInventoryItemBarcode(sequence)

  while (usedBarcodes.has(barcode)) {
    sequence += 1
    barcode = formatInventoryItemBarcode(sequence)
  }

  return barcode
}

async function generateInventoryItemBarcodes(storeId: string, count: number) {
  const existingBarcodes = await prisma.inventoryItem.findMany({
    where: { storeId },
    select: { barcode: true },
  })

  const usedBarcodes = new Set(existingBarcodes.map((inventoryItem) => inventoryItem.barcode))
  const barcodes: string[] = []
  let sequence = usedBarcodes.size + 1

  while (barcodes.length < count) {
    const barcode = formatInventoryItemBarcode(sequence)
    sequence += 1

    if (usedBarcodes.has(barcode)) continue

    usedBarcodes.add(barcode)
    barcodes.push(barcode)
  }

  return barcodes
}

async function getInventoryUser(
  storeId: string,
  permissionKey: PermissionKey = "inventory.view",
  feature: FeatureKey = "inventory.management",
  type?: InventoryItemKind | null
) {
  try {
    const scope = await getRequestScope(storeId)
    if (type === "retail_product") {
      assertFeature(scope, "retail.sales")
      assertPermission(scope, "inventory.manageRetail")
    } else if (type === "phone_unit") {
      assertFeature(scope, "inventory.management")
      assertPermission(scope, "inventory.managePhoneUnits")
    } else {
      assertFeature(scope, feature)
      assertPermission(scope, permissionKey)
    }

    return { success: true as const, user: scope.user, scope }
  } catch (error) {
    return actionError(error) as { success: false; error: string }
  }
}

async function getCreateInventoryItemUser(storeId: string, type?: InventoryItemKind | null) {
  try {
    const scope = await getRequestScope(storeId)
    if (type === "retail_product") {
      assertFeature(scope, "retail.sales")
      assertPermission(scope, "inventory.manageRetail")
    } else {
      assertFeature(scope, "inventory.management")
      assertPermission(scope, "inventory.create")
    }

    return { success: true as const, user: scope.user, scope }
  } catch (error) {
    return actionError(error) as { success: false; error: string }
  }
}

type InventoryCategoryClient = typeof prisma | Prisma.TransactionClient

async function findOrCreateInventoryCategory(
  client: InventoryCategoryClient,
  storeId: string,
  kind: InventoryItemKind,
  categoryName?: string | null
) {
  const name = categoryName?.trim()
  if (!name) return null

  const existing = await client.inventoryCategory.findFirst({
    where: { storeId, kind, name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  })
  if (existing) return existing

  return client.inventoryCategory.create({
    data: { storeId, kind, name },
    select: { id: true },
  })
}

export async function getInventoryCategories(storeId: string, kind: InventoryItemKind = "repair_part"): Promise<ActionResultWithData<InventoryCategory[]>> {
  try {
    const access = await getInventoryUser(storeId, "inventory.view", "inventory.management", kind)
    if (!access.success) return access

    const categories = await prisma.inventoryCategory.findMany({
      where: { storeId, kind },
      orderBy: { name: "asc" },
      select: { id: true, name: true, kind: true, storeId: true },
    })

    return { success: true, data: categories }
  } catch (error) {
    console.error("Error fetching inventoryItem categories:", error)
    return { success: false, error: "Gagal mengambil kategori sparepart" }
  }
}

export async function getInventoryItems(storeId: string, type: InventoryItemKind = "repair_part"): Promise<ActionResultWithData<InventoryItemWithCompatibilities[]>> {
  try {
    const access = await getInventoryUser(storeId, "inventory.view", "inventory.management", type)
    if (!access.success) return access

    const inventoryItems = await prisma.inventoryItem.findMany({
      where: { storeId, type },
      include: {
        category: true,
        compatibilities: {
          include: {
            deviceModel: {
              include: { brand: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { name: "asc" },
      take: 1000,
    })

    return { success: true, data: inventoryItems }
  } catch (error) {
    console.error("Error fetching inventoryItems:", error)
    return { success: false, error: "Gagal mengambil sparepart" }
  }
}

export async function getCompatibleInventoryItems(storeId: string, deviceModelId?: string): Promise<ActionResultWithData<InventoryItemListItem[]>> {
  try {
    const access = await getInventoryUser(storeId, "inventory.view", "inventory.management")
    if (!access.success) return access

    const whereClause: {
      storeId: string
      type: InventoryItemKind
      OR?: Array<{ isUniversal: boolean } | { compatibilities: { some: { deviceModelId: string } } }>
    } = { storeId, type: "repair_part" }

    if (deviceModelId) {
      whereClause.OR = [
        { isUniversal: true },
        { compatibilities: { some: { deviceModelId } } },
      ]
    }

    const inventoryItems = await prisma.inventoryItem.findMany({
      where: whereClause,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        barcode: true,
        defaultPrice: true,
        supplierName: true,
        stock: true,
        type: true,
      },
    })

    return { success: true, data: inventoryItems }
  } catch (error) {
    console.error("Error fetching compatible inventoryItems:", error)
    return { success: false, error: "Gagal mengambil sparepart yang kompatibel" }
  }
}

export async function createInventoryItem(data: z.infer<typeof createInventoryItemSchema>): Promise<ActionResultWithData<InventoryItemWithCompatibilities>> {
  try {
    const validated = createInventoryItemSchema.parse(data)
    const access = await getCreateInventoryItemUser(validated.storeId, validated.type)
    if (!access.success) return access

    const type = validated.type ?? "repair_part"
    const existing = await prisma.inventoryItem.findFirst({
      where: { storeId: validated.storeId, type, name: validated.name },
    })

    if (existing) {
      return { success: false, error: "Sparepart dengan nama ini sudah ada" }
    }

    const category = await findOrCreateInventoryCategory(prisma, validated.storeId, type, validated.categoryName)
    const isRetailItem = type === "retail_product"

    const inventoryItem = await prisma.inventoryItem.create({
      data: {
        barcode: await generateInventoryItemBarcode(validated.storeId),
        name: validated.name,
        defaultPrice: validated.defaultPrice,
        purchasePrice: validated.purchasePrice ?? null,
        supplierName: validated.supplierName || null,
        categoryId: category?.id ?? null,
        stock: validated.stock ?? 0,
        criticalStock: validated.criticalStock ?? 5,
        warrantyDays: isRetailItem ? validated.warrantyDays ?? null : null,
        isUniversal: isRetailItem ? true : validated.isUniversal ?? false,
        type,
        storeId: validated.storeId,
        compatibilities: !isRetailItem && validated.deviceModelIds
          ? { create: validated.deviceModelIds.map((id) => ({ deviceModelId: id })) }
          : undefined,
      },
      include: {
        category: true,
        compatibilities: {
          include: {
            deviceModel: { include: { brand: { select: { name: true } } } },
          },
        },
      },
    })

    revalidateInventoryPaths(validated.storeId)

    await createActivityLogIfUser({
      storeId: validated.storeId,
      userId: access.user.id,
      type: "sparepart_created",
      title: "Sparepart created",
      payload: {
        inventoryItemId: inventoryItem.id,
        barcode: inventoryItem.barcode,
        name: inventoryItem.name,
        defaultPrice: inventoryItem.defaultPrice,
        purchasePrice: inventoryItem.purchasePrice,
        supplierName: inventoryItem.supplierName,
        categoryId: inventoryItem.categoryId,
        categoryName: inventoryItem.category?.name,
        stock: inventoryItem.stock,
        criticalStock: inventoryItem.criticalStock,
        warrantyDays: inventoryItem.warrantyDays,
        isUniversal: inventoryItem.isUniversal,
        type: inventoryItem.type,
      },
    })

    return { success: true, data: inventoryItem }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    console.error("Error creating inventoryItem:", error)
    return { success: false, error: "Gagal membuat sparepart" }
  }
}

export async function updateInventoryItem(data: z.infer<typeof updateInventoryItemSchema>): Promise<ActionResultWithData<InventoryItemWithCompatibilities>> {
  try {
    const validated = updateInventoryItemSchema.parse(data)

    const inventoryItem = await prisma.inventoryItem.findUnique({
      where: { id: validated.id },
      select: { storeId: true, type: true },
    })

    if (!inventoryItem) {
      return { success: false, error: "Sparepart tidak ditemukan" }
    }

    const access = await getInventoryUser(inventoryItem.storeId, "inventory.update", "inventory.management", inventoryItem.type)
    if (!access.success) return access

    if (validated.name) {
      const existing = await prisma.inventoryItem.findFirst({
        where: {
          storeId: inventoryItem.storeId,
          name: validated.name,
          id: { not: validated.id },
        },
      })
      if (existing) {
        return { success: false, error: "Sparepart dengan nama ini sudah ada" }
      }
    }

    const type = validated.type ?? inventoryItem.type
    const isRetailItem = type === "retail_product"
    const category = await findOrCreateInventoryCategory(prisma, inventoryItem.storeId, type, validated.categoryName)

    const updated = await prisma.inventoryItem.update({
      where: { id: validated.id },
      data: {
        name: validated.name,
        defaultPrice: validated.defaultPrice,
        purchasePrice: validated.purchasePrice,
        supplierName: validated.supplierName === undefined ? undefined : validated.supplierName || null,
        categoryId: validated.categoryName === undefined ? undefined : category?.id ?? null,
        stock: validated.stock,
        criticalStock: validated.criticalStock,
        warrantyDays: isRetailItem ? validated.warrantyDays : null,
        isUniversal: isRetailItem ? true : validated.isUniversal,
        type: validated.type,
        ...(isRetailItem
          ? { compatibilities: { deleteMany: {} } }
          : validated.deviceModelIds
            ? { compatibilities: { deleteMany: {}, create: validated.deviceModelIds.map((id) => ({ deviceModelId: id })) } }
            : {}),
      },
      include: {
        category: true,
        compatibilities: {
          include: {
            deviceModel: { include: { brand: { select: { name: true } } } },
          },
        },
      },
    })

    revalidateInventoryPaths(inventoryItem.storeId)

    await createActivityLogIfUser({
      storeId: inventoryItem.storeId,
      userId: access.user.id,
      type: "sparepart_updated",
      title: "Sparepart updated",
      payload: {
        inventoryItemId: updated.id,
        name: updated.name,
        defaultPrice: updated.defaultPrice,
        purchasePrice: updated.purchasePrice,
        supplierName: updated.supplierName,
        categoryId: updated.categoryId,
        categoryName: updated.category?.name,
        stock: updated.stock,
        criticalStock: updated.criticalStock,
        warrantyDays: updated.warrantyDays,
        isUniversal: updated.isUniversal,
        type: updated.type,
      },
    })

    return { success: true, data: updated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    console.error("Error updating inventoryItem:", error)
    return { success: false, error: "Gagal memperbarui sparepart" }
  }
}

export async function importInventoryItems(data: z.infer<typeof importInventoryItemsSchema>): Promise<ActionResultWithData<ImportInventoryItemsResult>> {
  try {
    const validated = importInventoryItemsSchema.parse(data)
    const access = await getInventoryUser(validated.storeId, "inventory.import")
    if (!access.success) return access
    if (validated.rows.some((row) => row.type === "retail_product")) {
      assertFeature(access.scope, "retail.sales")
      assertPermission(access.scope, "inventory.manageRetail")
    }

    const errors: ImportInventoryItemsResult["errors"] = []
    const seenNames = new Map<string, number>()
    const validRows: Array<z.infer<typeof importInventoryItemRowSchema>> = []

    for (const row of validated.rows) {
      const rowType = row.type ?? "repair_part"
      const normalizedName = `${rowType}:${row.name.trim().toLowerCase()}`
      const duplicateRow = seenNames.get(normalizedName)

      if (duplicateRow) {
        errors.push({
          rowNumber: row.rowNumber,
          message: `Nama duplikat dengan baris ${duplicateRow}`,
        })
        continue
      }

      seenNames.set(normalizedName, row.rowNumber)
      validRows.push({ ...row, name: row.name.trim() })
    }

    if (validRows.length === 0) {
      return {
        success: true,
        data: { created: 0, updated: 0, failed: errors.length, errors },
      }
    }

    const existingSpareparts = await prisma.inventoryItem.findMany({
      where: {
        storeId: validated.storeId,
        name: { in: validRows.map((row) => row.name) },
      },
      select: { id: true, name: true, type: true },
    })
    const existingByName = new Map(existingSpareparts.map((inventoryItem) => [`${inventoryItem.type}:${inventoryItem.name}`, inventoryItem]))
    const rowsToCreate = validRows.filter((row) => !existingByName.has(`${row.type ?? "repair_part"}:${row.name}`))
    const barcodes = await generateInventoryItemBarcodes(validated.storeId, rowsToCreate.length)
    let barcodeIndex = 0
    let created = 0
    let updated = 0

    await prisma.$transaction(async (tx) => {
      for (const row of validRows) {
        const type = row.type ?? "repair_part"
        const existing = existingByName.get(`${type}:${row.name}`)
        const category = await findOrCreateInventoryCategory(tx, validated.storeId, type, row.categoryName)

        if (existing) {
          await tx.inventoryItem.update({
            where: { id: existing.id },
            data: {
              defaultPrice: row.defaultPrice,
              purchasePrice: row.purchasePrice ?? null,
              supplierName: row.supplierName || null,
              categoryId: category?.id ?? null,
              stock: row.stock,
              criticalStock: row.criticalStock ?? 5,
              warrantyDays: type === "retail_product" ? row.warrantyDays ?? null : null,
              isUniversal: type === "retail_product" ? true : row.isUniversal ?? true,
              type,
              ...(type === "retail_product" ? { compatibilities: { deleteMany: {} } } : {}),
            },
          })
          updated += 1
          continue
        }

        await tx.inventoryItem.create({
          data: {
            barcode: barcodes[barcodeIndex],
            name: row.name,
            defaultPrice: row.defaultPrice,
            purchasePrice: row.purchasePrice ?? null,
            supplierName: row.supplierName || null,
            categoryId: category?.id ?? null,
            stock: row.stock,
            criticalStock: row.criticalStock ?? 5,
            warrantyDays: type === "retail_product" ? row.warrantyDays ?? null : null,
            isUniversal: type === "retail_product" ? true : row.isUniversal ?? true,
            type,
            storeId: validated.storeId,
          },
        })
        barcodeIndex += 1
        created += 1
      }
    })

    revalidateInventoryPaths(validated.storeId)

    await createActivityLogIfUser({
      storeId: validated.storeId,
      userId: access.user.id,
      type: "sparepart_created",
      title: "Spareparts imported",
      payload: {
        created,
        updated,
        failed: errors.length,
      },
    })

    return {
      success: true,
      data: { created, updated, failed: errors.length, errors },
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    console.error("Error importing inventoryItems:", error)
    return { success: false, error: "Gagal import sparepart" }
  }
}

// Legacy export kept so existing Excel import callers/templates continue to work during the domain rename.
export const importSpareparts = importInventoryItems

const restockInventoryItemSchema = z.object({
  id: z.string(),
  qty: z.number().int().min(1, "Jumlah harus 1 atau lebih"),
})

const currencyAmountSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const digits = value.replace(/\D/g, "")
    return digits === "" ? undefined : Number(digits)
  }

  return value
}, z.number().int("Nominal harus berupa angka bulat"))

const restockInventoryItemsWithDebtSchema = z.object({
  storeId: z.string().min(1, "Toko wajib diisi"),
  items: z.array(restockInventoryItemSchema).min(1, "Tambahkan minimal 1 item restock"),
  supplierDebt: z.object({
    enabled: z.boolean(),
    supplierId: z.string().optional().nullable(),
    invoiceNumber: z.string().trim().optional().nullable(),
    invoiceDate: z.string().trim().optional().nullable(),
    dueDate: z.string().trim().optional().nullable(),
    totalAmount: currencyAmountSchema.optional(),
    paidAmount: currencyAmountSchema.optional(),
  }).optional(),
})

export type RestockInventoryItemsWithDebtInput = z.infer<typeof restockInventoryItemsWithDebtSchema>

class RestockActionError extends Error {}

function getSupplierPayableStatus(totalAmount: number, paidAmount: number): "unpaid" | "partial" | "paid" {
  if (paidAmount >= totalAmount) return "paid"
  if (paidAmount > 0) return "partial"
  return "unpaid"
}

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function parseOptionalDate(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function validateRestockSupplierPayable(input: NonNullable<RestockInventoryItemsWithDebtInput["supplierDebt"]>) {
  if (!input.enabled) return

  const totalAmount = input.totalAmount ?? 0
  const paidAmount = input.paidAmount ?? 0

  if (!input.supplierId) throw new RestockActionError("Supplier wajib dipilih")
  if (totalAmount <= 0) throw new RestockActionError("Total pembelian harus lebih dari 0")
  if (paidAmount < 0) throw new RestockActionError("Dibayar sekarang tidak boleh negatif")
  if (paidAmount > totalAmount) throw new RestockActionError("Dibayar sekarang tidak boleh melebihi total pembelian")
}

function revalidateSupplierPayablePath(storeId: string) {
  revalidatePath(`/${storeId}/supplier-debts`)
}

export async function restockInventoryItem(data: z.infer<typeof restockInventoryItemSchema>): Promise<ActionResultWithData<InventoryItemWithCompatibilities>> {
  try {
    const validated = restockInventoryItemSchema.parse(data)

    const inventoryItem = await prisma.inventoryItem.findUnique({
      where: { id: validated.id },
      select: { storeId: true, barcode: true, name: true, stock: true, purchasePrice: true, type: true },
    })

    if (!inventoryItem) {
      return { success: false, error: "Sparepart tidak ditemukan" }
    }

    const access = await getInventoryUser(inventoryItem.storeId, "inventory.restock")
    if (!access.success) return access
    if (inventoryItem.type === "retail_product") {
      assertFeature(access.scope, "retail.sales")
      assertPermission(access.scope, "inventory.manageRetail")
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedSparepart = await tx.inventoryItem.update({
        where: { id: validated.id },
        data: { stock: { increment: validated.qty } },
        include: {
          category: true,
          compatibilities: {
            include: {
              deviceModel: { include: { brand: { select: { name: true } } } },
            },
          },
        },
      })

      await tx.inventoryMovement.create({
        data: {
          storeId: inventoryItem.storeId,
          inventoryItemId: validated.id,
          type: "restock",
          qtyChange: validated.qty,
          stockBefore: updatedSparepart.stock - validated.qty,
          stockAfter: updatedSparepart.stock,
          unitCostSnapshot: inventoryItem.purchasePrice,
          unitPriceSnapshot: updatedSparepart.defaultPrice,
          referenceType: "restock",
          referenceId: validated.id,
          note: "Manual restock",
          createdById: access.user.id,
        },
      })

      return updatedSparepart
    })

    revalidateInventoryPaths(inventoryItem.storeId)

    await createActivityLogIfUser({
      storeId: inventoryItem.storeId,
      userId: access.user.id,
      type: "sparepart_stock_in",
      title: "Sparepart restocked",
      payload: {
        inventoryItemId: validated.id,
        inventoryItemBarcode: inventoryItem.barcode,
        inventoryItemName: inventoryItem.name,
        previousStock: updated.stock - validated.qty,
        addedQty: validated.qty,
        newStock: updated.stock,
        type: inventoryItem.type,
        purchasePrice: inventoryItem.purchasePrice ?? 0,
        totalPrice: (inventoryItem.purchasePrice ?? 0) * validated.qty,
      },
    })

    return { success: true, data: updated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    console.error("Error restocking inventoryItem:", error)
    return { success: false, error: "Gagal menambah stok sparepart" }
  }
}

export async function restockInventoryItemsWithDebt(
  data: RestockInventoryItemsWithDebtInput
): Promise<ActionResultWithData<InventoryItemWithCompatibilities[]>> {
  try {
    const validated = restockInventoryItemsWithDebtSchema.parse(data)
    const access = await getInventoryUser(validated.storeId, "inventory.restock")
    if (!access.success) return access

    const supplierDebt = validated.supplierDebt
    if (supplierDebt?.enabled) validateRestockSupplierPayable(supplierDebt)

    const inventoryItemIds = validated.items.map((item) => item.id)
    if (new Set(inventoryItemIds).size !== inventoryItemIds.length) {
      return { success: false, error: "Item restock tidak boleh duplikat" }
    }

    const existingSpareparts = await prisma.inventoryItem.findMany({
      where: { id: { in: inventoryItemIds }, storeId: validated.storeId },
      select: { id: true, barcode: true, name: true, stock: true, purchasePrice: true, type: true },
    })
    const inventoryItemById = new Map(existingSpareparts.map((inventoryItem) => [inventoryItem.id, inventoryItem]))

    if (existingSpareparts.some((inventoryItem) => inventoryItem.type === "retail_product")) {
      assertFeature(access.scope, "retail.sales")
      assertPermission(access.scope, "inventory.manageRetail")
    }

    for (const item of validated.items) {
      if (!inventoryItemById.has(item.id)) return { success: false, error: "Item restock tidak ditemukan di toko ini" }
    }

    if (supplierDebt?.enabled && supplierDebt.supplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: { id: supplierDebt.supplierId, storeId: validated.storeId },
        select: { id: true },
      })
      if (!supplier) return { success: false, error: "Supplier tidak ditemukan di toko ini" }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedSpareparts: InventoryItemWithCompatibilities[] = []

      for (const item of validated.items) {
        const inventoryItem = inventoryItemById.get(item.id)
        if (!inventoryItem) throw new RestockActionError("Item restock tidak ditemukan di toko ini")

        const updatedSparepart = await tx.inventoryItem.update({
          where: { id: item.id },
          data: { stock: { increment: item.qty } },
          include: {
            category: true,
            compatibilities: {
              include: {
                deviceModel: { include: { brand: { select: { name: true } } } },
              },
            },
          },
        })

        await tx.inventoryMovement.create({
          data: {
            storeId: validated.storeId,
            inventoryItemId: item.id,
            type: "restock",
            qtyChange: item.qty,
            stockBefore: updatedSparepart.stock - item.qty,
            stockAfter: updatedSparepart.stock,
            unitCostSnapshot: inventoryItem.purchasePrice,
            unitPriceSnapshot: updatedSparepart.defaultPrice,
            referenceType: "restock",
            referenceId: item.id,
            note: supplierDebt?.enabled ? "Manual restock dengan hutang supplier" : "Manual restock",
            createdById: access.user.id,
          },
        })

        updatedSpareparts.push(updatedSparepart)
      }

      if (supplierDebt?.enabled && supplierDebt.supplierId) {
        const paidAmount = supplierDebt.paidAmount ?? 0
        const invoiceDate = normalizeOptionalText(supplierDebt.invoiceDate)
        const itemSummary = validated.items
          .map((item) => {
            const inventoryItem = inventoryItemById.get(item.id)
            return inventoryItem ? `${inventoryItem.name} x${item.qty}` : null
          })
          .filter(Boolean)
          .join(", ")
        const descriptionParts = [`Restock: ${itemSummary}`]
        if (invoiceDate) descriptionParts.push(`Tanggal nota: ${invoiceDate}`)

        await tx.supplierPayable.create({
          data: {
            storeId: validated.storeId,
            supplierId: supplierDebt.supplierId,
            invoiceNumber: normalizeOptionalText(supplierDebt.invoiceNumber),
            description: descriptionParts.join("\n"),
            totalAmount: supplierDebt.totalAmount ?? 0,
            paidAmount,
            dueDate: parseOptionalDate(supplierDebt.dueDate),
            status: getSupplierPayableStatus(supplierDebt.totalAmount ?? 0, paidAmount),
            payments: paidAmount > 0
              ? {
                  create: {
                    amount: paidAmount,
                    note: "Pembayaran awal dari restock",
                  },
                }
              : undefined,
          },
        })
      }

      return updatedSpareparts
    })

    revalidateInventoryPaths(validated.storeId)
    if (supplierDebt?.enabled) revalidateSupplierPayablePath(validated.storeId)

    await Promise.all(updated.map((updatedSparepart) => {
      const item = validated.items.find((currentItem) => currentItem.id === updatedSparepart.id)
      const previous = inventoryItemById.get(updatedSparepart.id)
      if (!item || !previous) return Promise.resolve()

      return createActivityLogIfUser({
        storeId: validated.storeId,
        userId: access.user.id,
        type: "sparepart_stock_in",
        title: "Sparepart restocked",
        payload: {
          inventoryItemId: updatedSparepart.id,
          inventoryItemBarcode: previous.barcode,
          inventoryItemName: previous.name,
          previousStock: updatedSparepart.stock - item.qty,
          addedQty: item.qty,
          newStock: updatedSparepart.stock,
          type: previous.type,
          purchasePrice: previous.purchasePrice ?? 0,
          totalPrice: (previous.purchasePrice ?? 0) * item.qty,
          supplierDebtCreated: Boolean(supplierDebt?.enabled),
        },
      })
    }))

    return { success: true, data: updated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    if (error instanceof RestockActionError) return { success: false, error: error.message }
    console.error("Error restocking inventoryItems with supplier debt:", error)
    return { success: false, error: "Gagal menyimpan restock" }
  }
}

export async function searchInventoryItems(storeId: string, query: string, type: InventoryItemKind = "repair_part"): Promise<ActionResultWithData<InventoryItemWithCompatibilities[]>> {
  try {
    const access = await getInventoryUser(storeId, "inventory.view", "inventory.management", type)
    if (!access.success) return access

    const inventoryItems = await prisma.inventoryItem.findMany({
      where: {
        storeId,
        type,
        OR: [
          { barcode: { equals: query, mode: "insensitive" } },
          { id: { startsWith: query } },
          { name: { contains: query, mode: "insensitive" } },
        ],
      },
      include: {
        category: true,
        compatibilities: {
          include: {
            deviceModel: { include: { brand: { select: { name: true } } } },
          },
        },
      },
      orderBy: { name: "asc" },
      take: 10,
    })

    return { success: true, data: inventoryItems }
  } catch (error) {
    console.error("Error searching inventoryItems:", error)
    return { success: false, error: "Gagal mencari sparepart" }
  }
}

export async function getStockInHistory(storeId: string, limit: number = 20): Promise<ActionResultWithData<Array<{
  id: string
  createdAt: Date
  inventoryItemId: string
  inventoryItemName: string
  previousStock: number
  addedQty: number
  newStock: number
  userName: string
}>>> {
  try {
    const access = await getInventoryUser(storeId, "inventory.viewHistory")
    if (!access.success) return access

    const activities = await prisma.activityLog.findMany({
      where: {
        storeId,
        type: "sparepart_stock_in",
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        createdAt: true,
        payload: true,
        user: {
          select: { name: true },
        },
      },
    })

    const history = activities.map((log) => {
      const payload = log.payload as {
        inventoryItemId: string
        inventoryItemName: string
        previousStock: number
        addedQty: number
        newStock: number
      } | null

      return {
        id: log.id,
        createdAt: log.createdAt,
        inventoryItemId: payload?.inventoryItemId ?? "",
        inventoryItemName: payload?.inventoryItemName ?? "",
        previousStock: payload?.previousStock ?? 0,
        addedQty: payload?.addedQty ?? 0,
        newStock: payload?.newStock ?? 0,
        userName: log.user.name,
      }
    })

    return { success: true, data: history }
  } catch (error) {
    console.error("Error fetching stock history:", error)
    return { success: false, error: "Gagal mengambil history stok" }
  }
}

export async function getRestockHistory(
  storeId: string,
  filters: RestockHistoryFilters = {}
): Promise<ActionResultWithData<RestockHistoryResult>> {
  try {
    const access = await getInventoryUser(storeId, "inventory.viewHistory")
    if (!access.success) return access

    const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 1), 100)
    const page = Math.max(filters.page ?? 1, 1)
    const createdAt: Prisma.DateTimeFilter = {}

    if (filters.from) {
      const fromDate = new Date(`${filters.from}T00:00:00.000`)
      if (!Number.isNaN(fromDate.getTime())) createdAt.gte = fromDate
    }

    if (filters.to) {
      const toDate = new Date(`${filters.to}T23:59:59.999`)
      if (!Number.isNaN(toDate.getTime())) createdAt.lte = toDate
    }

    const activities = await prisma.activityLog.findMany({
      where: {
        storeId,
        type: "sparepart_stock_in",
        title: "Sparepart restocked",
        ...(filters.userId ? { userId: filters.userId } : {}),
        ...(Object.keys(createdAt).length > 0 ? { createdAt } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        payload: true,
        userId: true,
        user: { select: { id: true, name: true } },
      },
    })

    const userActivities = await prisma.activityLog.findMany({
      where: {
        storeId,
        type: "sparepart_stock_in",
        title: "Sparepart restocked",
      },
      distinct: ["userId"],
      select: {
        user: { select: { id: true, name: true } },
      },
    })

    const mappedItems = activities.map((log) => {
      const payload = log.payload as {
        inventoryItemId?: string
        inventoryItemBarcode?: string
        inventoryItemName?: string
        previousStock?: number
        addedQty?: number
        newStock?: number
        purchasePrice?: number
        totalPrice?: number
      } | null
      const addedQty = payload?.addedQty ?? 0
      const purchasePrice = payload?.purchasePrice ?? 0

      return {
        id: log.id,
        createdAt: log.createdAt,
        inventoryItemId: payload?.inventoryItemId ?? "",
        inventoryItemBarcode: payload?.inventoryItemBarcode ?? "",
        inventoryItemName: payload?.inventoryItemName ?? "",
        previousStock: payload?.previousStock ?? 0,
        addedQty,
        newStock: payload?.newStock ?? 0,
        purchasePrice,
        totalPrice: payload?.totalPrice ?? purchasePrice * addedQty,
        userId: log.userId,
        userName: log.user.name,
      }
    })

    const normalizedQuery = filters.q?.trim().toLowerCase() ?? ""
    const filteredItems = normalizedQuery
      ? mappedItems.filter((item) =>
          item.inventoryItemName.toLowerCase().includes(normalizedQuery) ||
          item.inventoryItemBarcode.toLowerCase().includes(normalizedQuery) ||
          item.inventoryItemId.toLowerCase().includes(normalizedQuery) ||
          item.userName.toLowerCase().includes(normalizedQuery)
        )
      : mappedItems

    const totalItems = filteredItems.length
    const totalQty = filteredItems.reduce((total, item) => total + item.addedQty, 0)
    const totalPrice = filteredItems.reduce((total, item) => total + item.totalPrice, 0)
    const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1)
    const normalizedPage = Math.min(page, totalPages)
    const items = filteredItems.slice((normalizedPage - 1) * pageSize, normalizedPage * pageSize)
    const users = Array.from(
      new Map(
        userActivities.map((activity) => [activity.user.id, { id: activity.user.id, name: activity.user.name }])
      ).values()
    ).sort((a, b) => a.name.localeCompare(b.name))

    return {
      success: true,
      data: {
        items,
        users,
        totalItems,
        totalQty,
        totalPrice,
        page: normalizedPage,
        pageSize,
        totalPages,
      },
    }
  } catch (error) {
    console.error("Error fetching restock history:", error)
    return { success: false, error: "Gagal mengambil riwayat restock" }
  }
}

export async function getInventoryReport(
  storeId: string,
  filters: InventoryReportFilters = {}
): Promise<ActionResultWithData<InventoryReportResult>> {
  try {
    const access = await getInventoryUser(storeId, "inventory.report", "inventory.management", filters.type)
    if (!access.success) return access

    const [inventoryItems, supplierReturns] = await Promise.all([
      prisma.inventoryItem.findMany({
        where: { storeId, ...(filters.type ? { type: filters.type } : {}) },
        include: { category: true },
        orderBy: { name: "asc" },
      }),
      prisma.supplierReturn.findMany({
        where: { storeId },
        select: {
          id: true,
          qty: true,
          supplierName: true,
          status: true,
          refundAmount: true,
          createdAt: true,
          resolvedAt: true,
          inventoryItemId: true,
          inventoryItem: { select: { id: true, name: true, purchasePrice: true, supplierName: true } },
        },
      }),
    ])

    const categories = Array.from(
      new Map(
        inventoryItems
          .filter((inventoryItem) => inventoryItem.category)
          .map((inventoryItem) => [
            inventoryItem.category!.id,
            { id: inventoryItem.category!.id, name: inventoryItem.category!.name },
          ])
      ).values()
    ).sort((a, b) => a.name.localeCompare(b.name))

    const reportItems = inventoryItems.map((inventoryItem) => {
      const purchasePrice = inventoryItem.purchasePrice ?? 0
      const capitalValue = inventoryItem.stock * purchasePrice
      const sellingValue = inventoryItem.stock * inventoryItem.defaultPrice
      const status: Exclude<InventoryReportStockStatus, "all"> = inventoryItem.stock <= 0
        ? "out"
        : inventoryItem.stock <= inventoryItem.criticalStock
          ? "critical"
          : "safe"

      return {
        id: inventoryItem.id,
        barcode: inventoryItem.barcode,
        name: inventoryItem.name,
        categoryId: inventoryItem.categoryId,
        categoryName: inventoryItem.category?.name ?? null,
        supplierName: inventoryItem.supplierName,
        stock: inventoryItem.stock,
        criticalStock: inventoryItem.criticalStock,
        purchasePrice,
        defaultPrice: inventoryItem.defaultPrice,
        type: inventoryItem.type,
        capitalValue,
        sellingValue,
        potentialMargin: sellingValue - capitalValue,
        status,
      }
    })

    const normalizedQuery = filters.q?.trim().toLowerCase() ?? ""
    const statusFilter = filters.status ?? "all"
    const filteredItems = reportItems.filter((item) =>
      (!normalizedQuery ||
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.barcode.toLowerCase().includes(normalizedQuery) ||
        (item.supplierName?.toLowerCase().includes(normalizedQuery) ?? false) ||
        (item.categoryName?.toLowerCase().includes(normalizedQuery) ?? false)) &&
      (!filters.categoryId || item.categoryId === filters.categoryId) &&
      (statusFilter === "all" || item.status === statusFilter)
    )

    const supplierReportMap = new Map<string, SupplierReturnSupplierReport & { resolvedItems: Array<{ createdAt: Date; resolvedAt: Date | null }> }>()
    const inventoryItemReportMap = new Map<string, SupplierReturnInventoryItemReport>()

    for (const supplierReturn of supplierReturns) {
      const supplierName = supplierReturn.supplierName || supplierReturn.inventoryItem.supplierName || "Tanpa supplier"
      const supplierReport = supplierReportMap.get(supplierName) ?? {
        supplierName,
        pendingCount: 0,
        pendingQty: 0,
        pendingValue: 0,
        averageResolutionDays: null,
        replacedQty: 0,
        refundedAmount: 0,
        rejectedCount: 0,
        resolvedItems: [],
      }
      const purchasePrice = supplierReturn.inventoryItem.purchasePrice ?? 0

      if (supplierReturn.status === "pending") {
        supplierReport.pendingCount += 1
        supplierReport.pendingQty += supplierReturn.qty
        supplierReport.pendingValue += supplierReturn.qty * purchasePrice
      }

      if (supplierReturn.status === "replaced") supplierReport.replacedQty += supplierReturn.qty
      if (supplierReturn.status === "refunded") supplierReport.refundedAmount += supplierReturn.refundAmount
      if (supplierReturn.status === "rejected") supplierReport.rejectedCount += 1
      if (supplierReturn.resolvedAt) supplierReport.resolvedItems.push({ createdAt: supplierReturn.createdAt, resolvedAt: supplierReturn.resolvedAt })

      supplierReportMap.set(supplierName, supplierReport)

      const inventoryItemReport = inventoryItemReportMap.get(supplierReturn.inventoryItemId) ?? {
        inventoryItemId: supplierReturn.inventoryItem.id,
        inventoryItemName: supplierReturn.inventoryItem.name,
        supplierName: supplierReturn.inventoryItem.supplierName,
        returnCount: 0,
        returnedQty: 0,
      }
      inventoryItemReport.returnCount += 1
      inventoryItemReport.returnedQty += supplierReturn.qty
      inventoryItemReportMap.set(supplierReturn.inventoryItemId, inventoryItemReport)
    }

    const supplierReports = Array.from(supplierReportMap.values())
      .map(({ resolvedItems, ...report }) => ({
        ...report,
        averageResolutionDays: calculateAverageResolutionDays(resolvedItems),
      }))
      .sort((a, b) => b.pendingValue - a.pendingValue || b.refundedAmount - a.refundedAmount || a.supplierName.localeCompare(b.supplierName))

    const supplierReturnReport: SupplierReturnReport = {
      supplierReports,
      mostReturnedSpareparts: Array.from(inventoryItemReportMap.values())
        .sort((a, b) => b.returnedQty - a.returnedQty || b.returnCount - a.returnCount || a.inventoryItemName.localeCompare(b.inventoryItemName))
        .slice(0, 10),
      totalPendingValue: supplierReports.reduce((total, report) => total + report.pendingValue, 0),
      averageResolutionDays: calculateAverageResolutionDays(supplierReturns),
    }

    return {
      success: true,
      data: {
        items: filteredItems,
        categories,
        supplierReturns: supplierReturnReport,
        totalSpareparts: filteredItems.length,
        totalStockUnits: filteredItems.reduce((total, item) => total + item.stock, 0),
        totalCapitalValue: filteredItems.reduce((total, item) => total + item.capitalValue, 0),
        totalSellingValue: filteredItems.reduce((total, item) => total + item.sellingValue, 0),
        potentialMargin: filteredItems.reduce((total, item) => total + item.potentialMargin, 0),
        outOfStockCount: filteredItems.filter((item) => item.status === "out").length,
        criticalStockCount: filteredItems.filter((item) => item.status === "critical").length,
        safeStockCount: filteredItems.filter((item) => item.status === "safe").length,
      },
    }
  } catch (error) {
    console.error("Error fetching inventory report:", error)
    return { success: false, error: "Gagal mengambil laporan inventory" }
  }
}

export async function deleteInventoryItem(id: string): Promise<ActionResult> {
  try {
    const inventoryItem = await prisma.inventoryItem.findUnique({
      where: { id },
      select: { storeId: true, name: true, type: true },
    })

    if (!inventoryItem) {
      return { success: false, error: "Sparepart tidak ditemukan" }
    }

    const access = await getInventoryUser(inventoryItem.storeId, "inventory.delete", "inventory.management", inventoryItem.type)
    if (!access.success) return access

    const usedInServices = await prisma.repairOrderItem.findFirst({
      where: { referenceId: id },
    })

    if (usedInServices) {
      return { success: false, error: "Tidak dapat menghapus sparepart yang digunakan dalam service" }
    }

    await prisma.$transaction([
      prisma.partCompatibility.deleteMany({ where: { inventoryItemId: id } }),
      prisma.inventoryItem.delete({ where: { id } }),
    ])

    revalidateInventoryPaths(inventoryItem.storeId)

    await createActivityLogIfUser({
      storeId: inventoryItem.storeId,
      userId: access.user.id,
      type: "sparepart_deleted",
      title: "Sparepart deleted",
      payload: {
        inventoryItemId: id,
        name: inventoryItem.name,
      },
    })

    return { success: true }
  } catch (error) {
    console.error("Error deleting inventoryItem:", error)
    return { success: false, error: "Gagal menghapus sparepart" }
  }
}

export async function getServicePricelists(storeId: string): Promise<ActionResultWithData<ServicePricelist[]>> {
  try {
    const access = await getInventoryUser(storeId)
    if (!access.success) return access

    const pricelists = await prisma.serviceCatalogItem.findMany({
      where: { storeId },
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        defaultPrice: true,
        storeId: true,
      },
      take: 200,
    })

    return { success: true, data: pricelists }
  } catch (error) {
    console.error("Error fetching service pricelists:", error)
    return { success: false, error: "Gagal mengambil daftar harga jasa" }
  }
}

export async function importServicePricelists(data: z.infer<typeof importServicePricelistsSchema>): Promise<ActionResultWithData<ImportServicePricelistsResult>> {
  try {
    const validated = importServicePricelistsSchema.parse(data)
    const access = await getInventoryUser(validated.storeId, "inventory.manageServicePricelists")
    if (!access.success) return access

    const errors: ImportServicePricelistsResult["errors"] = []
    const seenTitles = new Map<string, number>()
    const validRows: Array<z.infer<typeof importServicePricelistRowSchema>> = []

    for (const row of validated.rows) {
      const title = row.title.trim()
      const normalizedTitle = title.toLowerCase()
      const duplicateRow = seenTitles.get(normalizedTitle)

      if (duplicateRow) {
        errors.push({
          rowNumber: row.rowNumber,
          message: `Judul duplikat dengan baris ${duplicateRow}`,
        })
        continue
      }

      seenTitles.set(normalizedTitle, row.rowNumber)
      validRows.push({ ...row, title })
    }

    if (validRows.length === 0) {
      return {
        success: true,
        data: { created: 0, updated: 0, failed: errors.length, errors },
      }
    }

    const existingPricelists = await prisma.serviceCatalogItem.findMany({
      where: { storeId: validated.storeId },
      select: { id: true, title: true },
    })
    const existingByTitle = new Map(existingPricelists.map((pricelist) => [pricelist.title.toLowerCase(), pricelist]))
    let created = 0
    let updated = 0

    await prisma.$transaction(async (tx) => {
      for (const row of validRows) {
        const existing = existingByTitle.get(row.title.toLowerCase())

        if (existing) {
          await tx.serviceCatalogItem.update({
            where: { id: existing.id },
            data: {
              title: row.title,
              defaultPrice: row.defaultPrice,
            },
          })
          updated += 1
          continue
        }

        await tx.serviceCatalogItem.create({
          data: {
            title: row.title,
            defaultPrice: row.defaultPrice,
            storeId: validated.storeId,
          },
        })
        created += 1
      }
    })

    revalidateInventoryPaths(validated.storeId)

    return {
      success: true,
      data: { created, updated, failed: errors.length, errors },
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    console.error("Error importing service pricelists:", error)
    return { success: false, error: "Gagal import jasa" }
  }
}

export async function createServicePricelist(data: z.infer<typeof createServicePricelistSchema>): Promise<ActionResultWithData<ServicePricelist>> {
  try {
    const validated = createServicePricelistSchema.parse(data)
    const access = await getInventoryUser(validated.storeId, "inventory.manageServicePricelists")
    if (!access.success) return access

    const existing = await prisma.serviceCatalogItem.findFirst({
      where: { storeId: validated.storeId, title: validated.title },
    })

    if (existing) {
      return { success: false, error: "Daftar harga jasa dengan judul ini sudah ada" }
    }

    const pricelist = await prisma.serviceCatalogItem.create({
      data: {
        title: validated.title,
        defaultPrice: validated.defaultPrice,
        storeId: validated.storeId,
      },
      select: {
        id: true,
        title: true,
        defaultPrice: true,
        storeId: true,
      },
    })

    revalidateInventoryPaths(validated.storeId)

    return { success: true, data: pricelist }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    console.error("Error creating service pricelist:", error)
    return { success: false, error: "Gagal membuat daftar harga jasa" }
  }
}

export async function updateServicePricelist(data: z.infer<typeof updateServicePricelistSchema>): Promise<ActionResultWithData<ServicePricelist>> {
  try {
    const validated = updateServicePricelistSchema.parse(data)

    const pricelist = await prisma.serviceCatalogItem.findUnique({
      where: { id: validated.id },
      select: { storeId: true },
    })

    if (!pricelist) {
      return { success: false, error: "Daftar harga jasa tidak ditemukan" }
    }

    const access = await getInventoryUser(pricelist.storeId, "inventory.manageServicePricelists")
    if (!access.success) return access

    if (validated.title) {
      const existing = await prisma.serviceCatalogItem.findFirst({
        where: {
          storeId: pricelist.storeId,
          title: validated.title,
          id: { not: validated.id },
        },
      })
      if (existing) {
        return { success: false, error: "Daftar harga jasa dengan judul ini sudah ada" }
      }
    }

    const updated = await prisma.serviceCatalogItem.update({
      where: { id: validated.id },
      data: {
        title: validated.title,
        defaultPrice: validated.defaultPrice,
      },
      select: {
        id: true,
        title: true,
        defaultPrice: true,
        storeId: true,
      },
    })

    revalidateInventoryPaths(pricelist.storeId)

    return { success: true, data: updated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    console.error("Error updating service pricelist:", error)
    return { success: false, error: "Gagal memperbarui daftar harga jasa" }
  }
}

export async function deleteServicePricelist(id: string): Promise<ActionResult> {
  try {
    const pricelist = await prisma.serviceCatalogItem.findUnique({
      where: { id },
      select: { storeId: true },
    })

    if (!pricelist) {
      return { success: false, error: "Daftar harga jasa tidak ditemukan" }
    }

    const access = await getInventoryUser(pricelist.storeId, "inventory.manageServicePricelists")
    if (!access.success) return access

    await prisma.serviceCatalogItem.delete({ where: { id } })

    revalidateInventoryPaths(pricelist.storeId)

    return { success: true }
  } catch (error) {
    console.error("Error deleting service pricelist:", error)
    return { success: false, error: "Gagal menghapus daftar harga jasa" }
  }
}

// Legacy function exports for backwards compatibility.
export const getSpareparts = getInventoryItems
export const getSparepartCategories = getInventoryCategories
export const getCompatibleSpareparts = getCompatibleInventoryItems
export const createSparepart = createInventoryItem
export const updateSparepart = updateInventoryItem
export const deleteSparepart = deleteInventoryItem
export const searchSpareparts = searchInventoryItems
export const restockSparepart = restockInventoryItem
export const restockSparepartsWithDebt = restockInventoryItemsWithDebt
