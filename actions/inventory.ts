"use server"

import { createActivityLogIfUser } from "@/lib/activity-log"
import prisma from "@/lib/prisma"
import { actionError, type ActionResult, type ActionResultWithData } from "@/lib/auth/authorization"
import { assertFeature, assertRole, getRequestScope } from "@/lib/auth/request-scope"
import type { RequestScope } from "@/lib/auth/request-scope"
import { revalidateInventoryPaths } from "@/lib/revalidation"
import type { FeatureKey } from "@/lib/features"
import type { Prisma } from "@/prisma/generated/prisma/client"
import { revalidatePath } from "next/cache"
import { z } from "zod"

export type Sparepart = {
  id: string
  barcode: string
  name: string
  defaultPrice: number
  purchasePrice: number | null
  supplierName: string | null
  categoryId: string | null
  stock: number
  criticalStock: number
  isUniversal: boolean
  kind: InventoryItemKind
  tokoId: string
}

export type InventoryItemKind = "sparepart" | "retail_item"

export type SparepartCategory = {
  id: string
  name: string
  tokoId: string
}

export type ServicePricelist = {
  id: string
  title: string
  defaultPrice: number
  tokoId?: string
}

export type SparepartWithCompatibilities = Sparepart & {
  category: SparepartCategory | null
  compatibilities: Array<{
    hpCatalogId: string
    hpCatalog: {
      id: string
      modelName: string
      brand: { name: string }
    }
  }>
}

export type SparepartListItem = {
  id: string
  name: string
  barcode: string
  defaultPrice: number
  supplierName: string | null
  stock: number
  kind: InventoryItemKind
}

export type ImportSparepartInput = {
  rowNumber: number
  name: string
  defaultPrice: number
  purchasePrice?: number | null
  supplierName?: string | null
  categoryName?: string | null
  stock: number
  criticalStock?: number | null
  isUniversal?: boolean
  kind?: InventoryItemKind
}

export type ImportSparepartsResult = {
  created: number
  updated: number
  failed: number
  errors: Array<{ rowNumber: number; message: string }>
}

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
  sparepartId: string
  sparepartBarcode: string
  sparepartName: string
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
  kind?: InventoryItemKind
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
  kind: InventoryItemKind
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

export type SupplierReturnSparepartReport = {
  sparepartId: string
  sparepartName: string
  supplierName: string | null
  returnCount: number
  returnedQty: number
}

export type SupplierReturnReport = {
  supplierReports: SupplierReturnSupplierReport[]
  mostReturnedSpareparts: SupplierReturnSparepartReport[]
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

const createSparepartSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  defaultPrice: z.number().int().min(0, "Harga jual harus 0 atau lebih"),
  purchasePrice: z.number().int().min(0, "Harga beli harus 0 atau lebih").nullable().optional(),
  supplierName: z.string().trim().nullable().optional(),
  categoryName: z.string().trim().nullable().optional(),
  stock: z.number().int().min(0, "Stok harus 0 atau lebih").optional(),
  criticalStock: z.number().int().min(0, "Stok kritis harus 0 atau lebih").optional(),
  isUniversal: z.boolean().optional(),
  kind: z.enum(["sparepart", "retail_item"]).optional(),
  tokoId: z.string(),
  hpCatalogIds: z.array(z.string()).optional(),
})

const importSparepartRowSchema = z.object({
  rowNumber: z.number().int().min(2),
  name: z.string().trim().min(1, "Nama wajib diisi"),
  defaultPrice: z.number().int().min(0, "Harga jual harus 0 atau lebih"),
  purchasePrice: z.number().int().min(0, "Harga beli harus 0 atau lebih").nullable().optional(),
  supplierName: z.string().trim().nullable().optional(),
  categoryName: z.string().trim().nullable().optional(),
  stock: z.number().int().min(0, "Stok harus 0 atau lebih"),
  criticalStock: z.number().int().min(0, "Stok kritis harus 0 atau lebih").nullable().optional(),
  isUniversal: z.boolean().optional(),
  kind: z.enum(["sparepart", "retail_item"]).optional(),
})

const importSparepartsSchema = z.object({
  tokoId: z.string(),
  rows: z.array(importSparepartRowSchema).min(1, "Tidak ada data untuk diimport").max(100, "Maksimal 100 baris per import"),
})

const importServicePricelistRowSchema = z.object({
  rowNumber: z.number().int().min(2),
  title: z.string().trim().min(1, "Judul wajib diisi"),
  defaultPrice: z.number().int().min(0, "Harga harus 0 atau lebih"),
})

const importServicePricelistsSchema = z.object({
  tokoId: z.string(),
  rows: z.array(importServicePricelistRowSchema).min(1, "Tidak ada data untuk diimport").max(100, "Maksimal 100 baris per import"),
})

const updateSparepartSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Nama wajib diisi").optional(),
  defaultPrice: z.number().int().min(0, "Harga jual harus 0 atau lebih").optional(),
  purchasePrice: z.number().int().min(0, "Harga beli harus 0 atau lebih").nullable().optional(),
  supplierName: z.string().trim().nullable().optional(),
  categoryName: z.string().trim().nullable().optional(),
  stock: z.number().int().min(0, "Stok harus 0 atau lebih").optional(),
  criticalStock: z.number().int().min(0, "Stok kritis harus 0 atau lebih").optional(),
  isUniversal: z.boolean().optional(),
  kind: z.enum(["sparepart", "retail_item"]).optional(),
  hpCatalogIds: z.array(z.string()).optional(),
})

const createServicePricelistSchema = z.object({
  title: z.string().min(1, "Judul wajib diisi"),
  defaultPrice: z.number().int().min(0, "Harga harus 0 atau lebih"),
  tokoId: z.string(),
})

const updateServicePricelistSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Title is required").optional(),
  defaultPrice: z.number().int().min(0, "Price must be 0 or greater").optional(),
})

const SPAREPART_BARCODE_PREFIX = "SP"

function formatSparepartBarcode(sequence: number) {
  return `${SPAREPART_BARCODE_PREFIX}${sequence.toString().padStart(6, "0")}`
}

async function generateSparepartBarcode(tokoId: string) {
  const existingBarcodes = await prisma.sparepart.findMany({
    where: { tokoId },
    select: { barcode: true },
  })

  const usedBarcodes = new Set(existingBarcodes.map((sparepart) => sparepart.barcode))
  let sequence = usedBarcodes.size + 1
  let barcode = formatSparepartBarcode(sequence)

  while (usedBarcodes.has(barcode)) {
    sequence += 1
    barcode = formatSparepartBarcode(sequence)
  }

  return barcode
}

async function generateSparepartBarcodes(tokoId: string, count: number) {
  const existingBarcodes = await prisma.sparepart.findMany({
    where: { tokoId },
    select: { barcode: true },
  })

  const usedBarcodes = new Set(existingBarcodes.map((sparepart) => sparepart.barcode))
  const barcodes: string[] = []
  let sequence = usedBarcodes.size + 1

  while (barcodes.length < count) {
    const barcode = formatSparepartBarcode(sequence)
    sequence += 1

    if (usedBarcodes.has(barcode)) continue

    usedBarcodes.add(barcode)
    barcodes.push(barcode)
  }

  return barcodes
}

async function getInventoryUser(
  tokoId: string,
  requireWriteAccess: boolean = false,
  feature: FeatureKey = "inventory.management"
) {
  try {
    const scope = await getRequestScope(tokoId)
    if (requireWriteAccess) assertRole(scope, ["admin"])
    assertFeature(scope, feature)
    assertWorkflowForInventory(scope)

    return { success: true as const, user: scope.user, scope }
  } catch (error) {
    return actionError(error) as { success: false; error: string }
  }
}

async function getCreateSparepartUser(tokoId: string) {
  try {
    const scope = await getRequestScope(tokoId)
    assertFeature(scope, "inventory.management")
    assertWorkflowForInventory(scope)

    if (scope.user.role === "staff") {
      assertFeature(scope, "inventory.staffCreateSparepart")
    } else {
      assertRole(scope, ["admin"])
    }

    return { success: true as const, user: scope.user, scope }
  } catch (error) {
    return actionError(error) as { success: false; error: string }
  }
}

function assertWorkflowForInventory(scope: RequestScope) {
  if (scope.user.role === "staff") assertFeature(scope, "staff.workflow")
  if (scope.user.role === "technician") assertFeature(scope, "technician.workflow")
}

function assertRetailInventoryFeature(scope: RequestScope, kind?: InventoryItemKind | null) {
  if (kind === "retail_item") assertFeature(scope, "retail.sales")
}

type SparepartCategoryClient = typeof prisma | Prisma.TransactionClient

async function findOrCreateSparepartCategory(
  client: SparepartCategoryClient,
  tokoId: string,
  categoryName?: string | null
) {
  const name = categoryName?.trim()
  if (!name) return null

  const existing = await client.sparepartCategory.findFirst({
    where: { tokoId, name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  })
  if (existing) return existing

  return client.sparepartCategory.create({
    data: { tokoId, name },
    select: { id: true },
  })
}

export async function getSparepartCategories(tokoId: string): Promise<ActionResultWithData<SparepartCategory[]>> {
  try {
    const access = await getInventoryUser(tokoId)
    if (!access.success) return access

    const categories = await prisma.sparepartCategory.findMany({
      where: { tokoId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, tokoId: true },
    })

    return { success: true, data: categories }
  } catch (error) {
    console.error("Error fetching sparepart categories:", error)
    return { success: false, error: "Gagal mengambil kategori sparepart" }
  }
}

export async function getSpareparts(tokoId: string, kind: InventoryItemKind = "sparepart"): Promise<ActionResultWithData<SparepartWithCompatibilities[]>> {
  try {
    const access = await getInventoryUser(tokoId)
    if (!access.success) return access
    assertRetailInventoryFeature(access.scope, kind)

    const spareparts = await prisma.sparepart.findMany({
      where: { tokoId, kind },
      include: {
        category: true,
        compatibilities: {
          include: {
            hpCatalog: {
              include: { brand: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { name: "asc" },
      take: 500,
    })

    return { success: true, data: spareparts }
  } catch (error) {
    console.error("Error fetching spareparts:", error)
    return { success: false, error: "Gagal mengambil sparepart" }
  }
}

export async function getCompatibleSpareparts(tokoId: string, hpCatalogId?: string): Promise<ActionResultWithData<SparepartListItem[]>> {
  try {
    const access = await getInventoryUser(tokoId, false, "inventory.management")
    if (!access.success) return access

    const whereClause: {
      tokoId: string
      kind: InventoryItemKind
      OR?: Array<{ isUniversal: boolean } | { compatibilities: { some: { hpCatalogId: string } } }>
    } = { tokoId, kind: "sparepart" }

    if (hpCatalogId) {
      whereClause.OR = [
        { isUniversal: true },
        { compatibilities: { some: { hpCatalogId } } },
      ]
    }

    const spareparts = await prisma.sparepart.findMany({
      where: whereClause,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        barcode: true,
        defaultPrice: true,
        supplierName: true,
        stock: true,
        kind: true,
      },
    })

    return { success: true, data: spareparts }
  } catch (error) {
    console.error("Error fetching compatible spareparts:", error)
    return { success: false, error: "Gagal mengambil sparepart yang kompatibel" }
  }
}

export async function createSparepart(data: z.infer<typeof createSparepartSchema>): Promise<ActionResultWithData<SparepartWithCompatibilities>> {
  try {
    const validated = createSparepartSchema.parse(data)
    const access = await getCreateSparepartUser(validated.tokoId)
    if (!access.success) return access
    assertRetailInventoryFeature(access.scope, validated.kind)

    const existing = await prisma.sparepart.findFirst({
      where: { tokoId: validated.tokoId, name: validated.name },
    })

    if (existing) {
      return { success: false, error: "Sparepart dengan nama ini sudah ada" }
    }

    const category = await findOrCreateSparepartCategory(prisma, validated.tokoId, validated.categoryName)
    const kind = validated.kind ?? "sparepart"
    const isRetailItem = kind === "retail_item"

    const sparepart = await prisma.sparepart.create({
      data: {
        barcode: await generateSparepartBarcode(validated.tokoId),
        name: validated.name,
        defaultPrice: validated.defaultPrice,
        purchasePrice: validated.purchasePrice ?? null,
        supplierName: validated.supplierName || null,
        categoryId: category?.id ?? null,
        stock: validated.stock ?? 0,
        criticalStock: validated.criticalStock ?? 5,
        isUniversal: isRetailItem ? true : validated.isUniversal ?? false,
        kind,
        tokoId: validated.tokoId,
        compatibilities: !isRetailItem && validated.hpCatalogIds
          ? { create: validated.hpCatalogIds.map((id) => ({ hpCatalogId: id })) }
          : undefined,
      },
      include: {
        category: true,
        compatibilities: {
          include: {
            hpCatalog: { include: { brand: { select: { name: true } } } },
          },
        },
      },
    })

    revalidateInventoryPaths()

    await createActivityLogIfUser({
      tokoId: validated.tokoId,
      userId: access.user.id,
      type: "sparepart_created",
      title: "Sparepart created",
      payload: {
        sparepartId: sparepart.id,
        barcode: sparepart.barcode,
        name: sparepart.name,
        defaultPrice: sparepart.defaultPrice,
        purchasePrice: sparepart.purchasePrice,
        supplierName: sparepart.supplierName,
        categoryId: sparepart.categoryId,
        categoryName: sparepart.category?.name,
        stock: sparepart.stock,
        criticalStock: sparepart.criticalStock,
        isUniversal: sparepart.isUniversal,
        kind: sparepart.kind,
      },
    })

    return { success: true, data: sparepart }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    console.error("Error creating sparepart:", error)
    return { success: false, error: "Gagal membuat sparepart" }
  }
}

export async function updateSparepart(data: z.infer<typeof updateSparepartSchema>): Promise<ActionResultWithData<SparepartWithCompatibilities>> {
  try {
    const validated = updateSparepartSchema.parse(data)

    const sparepart = await prisma.sparepart.findUnique({
      where: { id: validated.id },
      select: { tokoId: true, kind: true },
    })

    if (!sparepart) {
      return { success: false, error: "Sparepart tidak ditemukan" }
    }

    const access = await getInventoryUser(sparepart.tokoId, true)
    if (!access.success) return access
    if (sparepart.kind === "retail_item" || validated.kind === "retail_item") {
      assertFeature(access.scope, "retail.sales")
    }

    if (validated.name) {
      const existing = await prisma.sparepart.findFirst({
        where: {
          tokoId: sparepart.tokoId,
          name: validated.name,
          id: { not: validated.id },
        },
      })
      if (existing) {
        return { success: false, error: "Sparepart dengan nama ini sudah ada" }
      }
    }

    const category = await findOrCreateSparepartCategory(prisma, sparepart.tokoId, validated.categoryName)
    const kind = validated.kind ?? sparepart.kind
    const isRetailItem = kind === "retail_item"

    const updated = await prisma.sparepart.update({
      where: { id: validated.id },
      data: {
        name: validated.name,
        defaultPrice: validated.defaultPrice,
        purchasePrice: validated.purchasePrice,
        supplierName: validated.supplierName === undefined ? undefined : validated.supplierName || null,
        categoryId: validated.categoryName === undefined ? undefined : category?.id ?? null,
        stock: validated.stock,
        criticalStock: validated.criticalStock,
        isUniversal: isRetailItem ? true : validated.isUniversal,
        kind: validated.kind,
        ...(isRetailItem
          ? { compatibilities: { deleteMany: {} } }
          : validated.hpCatalogIds
            ? { compatibilities: { deleteMany: {}, create: validated.hpCatalogIds.map((id) => ({ hpCatalogId: id })) } }
            : {}),
      },
      include: {
        category: true,
        compatibilities: {
          include: {
            hpCatalog: { include: { brand: { select: { name: true } } } },
          },
        },
      },
    })

    revalidateInventoryPaths()

    await createActivityLogIfUser({
      tokoId: sparepart.tokoId,
      userId: access.user.id,
      type: "sparepart_updated",
      title: "Sparepart updated",
      payload: {
        sparepartId: updated.id,
        name: updated.name,
        defaultPrice: updated.defaultPrice,
        purchasePrice: updated.purchasePrice,
        supplierName: updated.supplierName,
        categoryId: updated.categoryId,
        categoryName: updated.category?.name,
        stock: updated.stock,
        criticalStock: updated.criticalStock,
        isUniversal: updated.isUniversal,
        kind: updated.kind,
      },
    })

    return { success: true, data: updated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    console.error("Error updating sparepart:", error)
    return { success: false, error: "Gagal memperbarui sparepart" }
  }
}

export async function importSpareparts(data: z.infer<typeof importSparepartsSchema>): Promise<ActionResultWithData<ImportSparepartsResult>> {
  try {
    const validated = importSparepartsSchema.parse(data)
    const access = await getInventoryUser(validated.tokoId, true)
    if (!access.success) return access
    if (validated.rows.some((row) => row.kind === "retail_item")) {
      assertFeature(access.scope, "retail.sales")
    }

    const errors: ImportSparepartsResult["errors"] = []
    const seenNames = new Map<string, number>()
    const validRows: Array<z.infer<typeof importSparepartRowSchema>> = []

    for (const row of validated.rows) {
      const normalizedName = row.name.trim().toLowerCase()
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

    const existingSpareparts = await prisma.sparepart.findMany({
      where: {
        tokoId: validated.tokoId,
        name: { in: validRows.map((row) => row.name) },
      },
      select: { id: true, name: true },
    })
    const existingByName = new Map(existingSpareparts.map((sparepart) => [sparepart.name, sparepart]))
    const rowsToCreate = validRows.filter((row) => !existingByName.has(row.name))
    const barcodes = await generateSparepartBarcodes(validated.tokoId, rowsToCreate.length)
    let barcodeIndex = 0
    let created = 0
    let updated = 0

    await prisma.$transaction(async (tx) => {
      for (const row of validRows) {
        const existing = existingByName.get(row.name)
        const category = await findOrCreateSparepartCategory(tx, validated.tokoId, row.categoryName)

        if (existing) {
          await tx.sparepart.update({
            where: { id: existing.id },
            data: {
              defaultPrice: row.defaultPrice,
              purchasePrice: row.purchasePrice ?? null,
              supplierName: row.supplierName || null,
              categoryId: category?.id ?? null,
              stock: row.stock,
              criticalStock: row.criticalStock ?? 5,
              isUniversal: row.kind === "retail_item" ? true : row.isUniversal ?? true,
              kind: row.kind ?? "sparepart",
              ...(row.kind === "retail_item" ? { compatibilities: { deleteMany: {} } } : {}),
            },
          })
          updated += 1
          continue
        }

        await tx.sparepart.create({
          data: {
            barcode: barcodes[barcodeIndex],
            name: row.name,
            defaultPrice: row.defaultPrice,
            purchasePrice: row.purchasePrice ?? null,
            supplierName: row.supplierName || null,
            categoryId: category?.id ?? null,
            stock: row.stock,
            criticalStock: row.criticalStock ?? 5,
            isUniversal: row.kind === "retail_item" ? true : row.isUniversal ?? true,
            kind: row.kind ?? "sparepart",
            tokoId: validated.tokoId,
          },
        })
        barcodeIndex += 1
        created += 1
      }
    })

    revalidateInventoryPaths()

    await createActivityLogIfUser({
      tokoId: validated.tokoId,
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
    console.error("Error importing spareparts:", error)
    return { success: false, error: "Gagal import sparepart" }
  }
}

const restockSparepartSchema = z.object({
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

const restockSparepartsWithDebtSchema = z.object({
  tokoId: z.string().min(1, "Toko wajib diisi"),
  items: z.array(restockSparepartSchema).min(1, "Tambahkan minimal 1 item restock"),
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

export type RestockSparepartsWithDebtInput = z.infer<typeof restockSparepartsWithDebtSchema>

class RestockActionError extends Error {}

function getSupplierDebtStatus(totalAmount: number, paidAmount: number): "unpaid" | "partial" | "paid" {
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

function validateRestockSupplierDebt(input: NonNullable<RestockSparepartsWithDebtInput["supplierDebt"]>) {
  if (!input.enabled) return

  const totalAmount = input.totalAmount ?? 0
  const paidAmount = input.paidAmount ?? 0

  if (!input.supplierId) throw new RestockActionError("Supplier wajib dipilih")
  if (totalAmount <= 0) throw new RestockActionError("Total pembelian harus lebih dari 0")
  if (paidAmount < 0) throw new RestockActionError("Dibayar sekarang tidak boleh negatif")
  if (paidAmount > totalAmount) throw new RestockActionError("Dibayar sekarang tidak boleh melebihi total pembelian")
}

function revalidateSupplierDebtPath(tokoId: string) {
  revalidatePath(`/${tokoId}/admin/supplier-debts`)
}

export async function restockSparepart(data: z.infer<typeof restockSparepartSchema>): Promise<ActionResultWithData<SparepartWithCompatibilities>> {
  try {
    const validated = restockSparepartSchema.parse(data)

    const sparepart = await prisma.sparepart.findUnique({
      where: { id: validated.id },
      select: { tokoId: true, barcode: true, name: true, stock: true, purchasePrice: true, kind: true },
    })

    if (!sparepart) {
      return { success: false, error: "Sparepart tidak ditemukan" }
    }

    const access = await getInventoryUser(sparepart.tokoId, true)
    if (!access.success) return access
    assertRetailInventoryFeature(access.scope, sparepart.kind)

    const updated = await prisma.$transaction(async (tx) => {
      const updatedSparepart = await tx.sparepart.update({
        where: { id: validated.id },
        data: { stock: { increment: validated.qty } },
        include: {
          category: true,
          compatibilities: {
            include: {
              hpCatalog: { include: { brand: { select: { name: true } } } },
            },
          },
        },
      })

      await tx.stockMovement.create({
        data: {
          tokoId: sparepart.tokoId,
          sparepartId: validated.id,
          type: "restock",
          qtyChange: validated.qty,
          stockBefore: updatedSparepart.stock - validated.qty,
          stockAfter: updatedSparepart.stock,
          unitCostSnapshot: sparepart.purchasePrice,
          unitPriceSnapshot: updatedSparepart.defaultPrice,
          referenceType: "restock",
          referenceId: validated.id,
          note: "Manual restock",
          createdById: access.user.id,
        },
      })

      return updatedSparepart
    })

    revalidateInventoryPaths()

    await createActivityLogIfUser({
      tokoId: sparepart.tokoId,
      userId: access.user.id,
      type: "sparepart_stock_in",
      title: "Sparepart restocked",
      payload: {
        sparepartId: validated.id,
        sparepartBarcode: sparepart.barcode,
        sparepartName: sparepart.name,
        previousStock: updated.stock - validated.qty,
        addedQty: validated.qty,
        newStock: updated.stock,
        kind: sparepart.kind,
        purchasePrice: sparepart.purchasePrice ?? 0,
        totalPrice: (sparepart.purchasePrice ?? 0) * validated.qty,
      },
    })

    return { success: true, data: updated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    console.error("Error restocking sparepart:", error)
    return { success: false, error: "Gagal menambah stok sparepart" }
  }
}

export async function restockSparepartsWithDebt(
  data: RestockSparepartsWithDebtInput
): Promise<ActionResultWithData<SparepartWithCompatibilities[]>> {
  try {
    const validated = restockSparepartsWithDebtSchema.parse(data)
    const access = await getInventoryUser(validated.tokoId, true)
    if (!access.success) return access

    const supplierDebt = validated.supplierDebt
    if (supplierDebt?.enabled) validateRestockSupplierDebt(supplierDebt)

    const sparepartIds = validated.items.map((item) => item.id)
    if (new Set(sparepartIds).size !== sparepartIds.length) {
      return { success: false, error: "Item restock tidak boleh duplikat" }
    }

    const existingSpareparts = await prisma.sparepart.findMany({
      where: { id: { in: sparepartIds }, tokoId: validated.tokoId },
      select: { id: true, barcode: true, name: true, stock: true, purchasePrice: true, kind: true },
    })
    const sparepartById = new Map(existingSpareparts.map((sparepart) => [sparepart.id, sparepart]))

    if (existingSpareparts.some((sparepart) => sparepart.kind === "retail_item")) {
      assertFeature(access.scope, "retail.sales")
    }

    for (const item of validated.items) {
      if (!sparepartById.has(item.id)) return { success: false, error: "Item restock tidak ditemukan di toko ini" }
    }

    if (supplierDebt?.enabled && supplierDebt.supplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: { id: supplierDebt.supplierId, tokoId: validated.tokoId },
        select: { id: true },
      })
      if (!supplier) return { success: false, error: "Supplier tidak ditemukan di toko ini" }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedSpareparts: SparepartWithCompatibilities[] = []

      for (const item of validated.items) {
        const sparepart = sparepartById.get(item.id)
        if (!sparepart) throw new RestockActionError("Item restock tidak ditemukan di toko ini")

        const updatedSparepart = await tx.sparepart.update({
          where: { id: item.id },
          data: { stock: { increment: item.qty } },
          include: {
            category: true,
            compatibilities: {
              include: {
                hpCatalog: { include: { brand: { select: { name: true } } } },
              },
            },
          },
        })

        await tx.stockMovement.create({
          data: {
            tokoId: validated.tokoId,
            sparepartId: item.id,
            type: "restock",
            qtyChange: item.qty,
            stockBefore: updatedSparepart.stock - item.qty,
            stockAfter: updatedSparepart.stock,
            unitCostSnapshot: sparepart.purchasePrice,
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
            const sparepart = sparepartById.get(item.id)
            return sparepart ? `${sparepart.name} x${item.qty}` : null
          })
          .filter(Boolean)
          .join(", ")
        const descriptionParts = [`Restock: ${itemSummary}`]
        if (invoiceDate) descriptionParts.push(`Tanggal nota: ${invoiceDate}`)

        await tx.supplierDebt.create({
          data: {
            tokoId: validated.tokoId,
            supplierId: supplierDebt.supplierId,
            invoiceNumber: normalizeOptionalText(supplierDebt.invoiceNumber),
            description: descriptionParts.join("\n"),
            totalAmount: supplierDebt.totalAmount ?? 0,
            paidAmount,
            dueDate: parseOptionalDate(supplierDebt.dueDate),
            status: getSupplierDebtStatus(supplierDebt.totalAmount ?? 0, paidAmount),
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

    revalidateInventoryPaths(validated.tokoId)
    if (supplierDebt?.enabled) revalidateSupplierDebtPath(validated.tokoId)

    await Promise.all(updated.map((updatedSparepart) => {
      const item = validated.items.find((currentItem) => currentItem.id === updatedSparepart.id)
      const previous = sparepartById.get(updatedSparepart.id)
      if (!item || !previous) return Promise.resolve()

      return createActivityLogIfUser({
        tokoId: validated.tokoId,
        userId: access.user.id,
        type: "sparepart_stock_in",
        title: "Sparepart restocked",
        payload: {
          sparepartId: updatedSparepart.id,
          sparepartBarcode: previous.barcode,
          sparepartName: previous.name,
          previousStock: updatedSparepart.stock - item.qty,
          addedQty: item.qty,
          newStock: updatedSparepart.stock,
          kind: previous.kind,
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
    console.error("Error restocking spareparts with supplier debt:", error)
    return { success: false, error: "Gagal menyimpan restock" }
  }
}

export async function searchSpareparts(tokoId: string, query: string, kind: InventoryItemKind = "sparepart"): Promise<ActionResultWithData<SparepartWithCompatibilities[]>> {
  try {
    const access = await getInventoryUser(tokoId)
    if (!access.success) return access
    assertRetailInventoryFeature(access.scope, kind)

    const spareparts = await prisma.sparepart.findMany({
      where: {
        tokoId,
        kind,
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
            hpCatalog: { include: { brand: { select: { name: true } } } },
          },
        },
      },
      orderBy: { name: "asc" },
      take: 10,
    })

    return { success: true, data: spareparts }
  } catch (error) {
    console.error("Error searching spareparts:", error)
    return { success: false, error: "Gagal mencari sparepart" }
  }
}

export async function getStockInHistory(tokoId: string, limit: number = 20): Promise<ActionResultWithData<Array<{
  id: string
  createdAt: Date
  sparepartId: string
  sparepartName: string
  previousStock: number
  addedQty: number
  newStock: number
  userName: string
}>>> {
  try {
    const access = await getInventoryUser(tokoId)
    if (!access.success) return access

    const activities = await prisma.activityLog.findMany({
      where: {
        tokoId,
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
        sparepartId: string
        sparepartName: string
        previousStock: number
        addedQty: number
        newStock: number
      } | null

      return {
        id: log.id,
        createdAt: log.createdAt,
        sparepartId: payload?.sparepartId ?? "",
        sparepartName: payload?.sparepartName ?? "",
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
  tokoId: string,
  filters: RestockHistoryFilters = {}
): Promise<ActionResultWithData<RestockHistoryResult>> {
  try {
    const access = await getInventoryUser(tokoId)
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
        tokoId,
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
        tokoId,
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
        sparepartId?: string
        sparepartBarcode?: string
        sparepartName?: string
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
        sparepartId: payload?.sparepartId ?? "",
        sparepartBarcode: payload?.sparepartBarcode ?? "",
        sparepartName: payload?.sparepartName ?? "",
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
          item.sparepartName.toLowerCase().includes(normalizedQuery) ||
          item.sparepartBarcode.toLowerCase().includes(normalizedQuery) ||
          item.sparepartId.toLowerCase().includes(normalizedQuery) ||
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
  tokoId: string,
  filters: InventoryReportFilters = {}
): Promise<ActionResultWithData<InventoryReportResult>> {
  try {
    const access = await getInventoryUser(tokoId)
    if (!access.success) return access
    assertRetailInventoryFeature(access.scope, filters.kind)

    const [spareparts, supplierReturns] = await Promise.all([
      prisma.sparepart.findMany({
        where: { tokoId, ...(filters.kind ? { kind: filters.kind } : {}) },
        include: { category: true },
        orderBy: { name: "asc" },
      }),
      prisma.supplierReturn.findMany({
        where: { tokoId },
        select: {
          id: true,
          qty: true,
          supplierName: true,
          status: true,
          refundAmount: true,
          createdAt: true,
          resolvedAt: true,
          sparepartId: true,
          sparepart: { select: { id: true, name: true, purchasePrice: true, supplierName: true } },
        },
      }),
    ])

    const categories = Array.from(
      new Map(
        spareparts
          .filter((sparepart) => sparepart.category)
          .map((sparepart) => [
            sparepart.category!.id,
            { id: sparepart.category!.id, name: sparepart.category!.name },
          ])
      ).values()
    ).sort((a, b) => a.name.localeCompare(b.name))

    const reportItems = spareparts.map((sparepart) => {
      const purchasePrice = sparepart.purchasePrice ?? 0
      const capitalValue = sparepart.stock * purchasePrice
      const sellingValue = sparepart.stock * sparepart.defaultPrice
      const status: Exclude<InventoryReportStockStatus, "all"> = sparepart.stock <= 0
        ? "out"
        : sparepart.stock <= sparepart.criticalStock
          ? "critical"
          : "safe"

      return {
        id: sparepart.id,
        barcode: sparepart.barcode,
        name: sparepart.name,
        categoryId: sparepart.categoryId,
        categoryName: sparepart.category?.name ?? null,
        supplierName: sparepart.supplierName,
        stock: sparepart.stock,
        criticalStock: sparepart.criticalStock,
        purchasePrice,
        defaultPrice: sparepart.defaultPrice,
        kind: sparepart.kind,
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
    const sparepartReportMap = new Map<string, SupplierReturnSparepartReport>()

    for (const supplierReturn of supplierReturns) {
      const supplierName = supplierReturn.supplierName || supplierReturn.sparepart.supplierName || "Tanpa supplier"
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
      const purchasePrice = supplierReturn.sparepart.purchasePrice ?? 0

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

      const sparepartReport = sparepartReportMap.get(supplierReturn.sparepartId) ?? {
        sparepartId: supplierReturn.sparepart.id,
        sparepartName: supplierReturn.sparepart.name,
        supplierName: supplierReturn.sparepart.supplierName,
        returnCount: 0,
        returnedQty: 0,
      }
      sparepartReport.returnCount += 1
      sparepartReport.returnedQty += supplierReturn.qty
      sparepartReportMap.set(supplierReturn.sparepartId, sparepartReport)
    }

    const supplierReports = Array.from(supplierReportMap.values())
      .map(({ resolvedItems, ...report }) => ({
        ...report,
        averageResolutionDays: calculateAverageResolutionDays(resolvedItems),
      }))
      .sort((a, b) => b.pendingValue - a.pendingValue || b.refundedAmount - a.refundedAmount || a.supplierName.localeCompare(b.supplierName))

    const supplierReturnReport: SupplierReturnReport = {
      supplierReports,
      mostReturnedSpareparts: Array.from(sparepartReportMap.values())
        .sort((a, b) => b.returnedQty - a.returnedQty || b.returnCount - a.returnCount || a.sparepartName.localeCompare(b.sparepartName))
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

export async function deleteSparepart(id: string): Promise<ActionResult> {
  try {
    const sparepart = await prisma.sparepart.findUnique({
      where: { id },
      select: { tokoId: true, name: true, kind: true },
    })

    if (!sparepart) {
      return { success: false, error: "Sparepart tidak ditemukan" }
    }

    const access = await getInventoryUser(sparepart.tokoId, true)
    if (!access.success) return access
    assertRetailInventoryFeature(access.scope, sparepart.kind)

    const usedInServices = await prisma.serviceItem.findFirst({
      where: { referenceId: id },
    })

    if (usedInServices) {
      return { success: false, error: "Tidak dapat menghapus sparepart yang digunakan dalam service" }
    }

    await prisma.$transaction([
      prisma.sparepartCompatibility.deleteMany({ where: { sparepartId: id } }),
      prisma.sparepart.delete({ where: { id } }),
    ])

    revalidateInventoryPaths()

    await createActivityLogIfUser({
      tokoId: sparepart.tokoId,
      userId: access.user.id,
      type: "sparepart_deleted",
      title: "Sparepart deleted",
      payload: {
        sparepartId: id,
        name: sparepart.name,
      },
    })

    return { success: true }
  } catch (error) {
    console.error("Error deleting sparepart:", error)
    return { success: false, error: "Gagal menghapus sparepart" }
  }
}

export async function getServicePricelists(tokoId: string): Promise<ActionResultWithData<ServicePricelist[]>> {
  try {
    const access = await getInventoryUser(tokoId)
    if (!access.success) return access

    const pricelists = await prisma.servicePricelist.findMany({
      where: { tokoId },
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        defaultPrice: true,
        tokoId: true,
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
    const access = await getInventoryUser(validated.tokoId, true)
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

    const existingPricelists = await prisma.servicePricelist.findMany({
      where: { tokoId: validated.tokoId },
      select: { id: true, title: true },
    })
    const existingByTitle = new Map(existingPricelists.map((pricelist) => [pricelist.title.toLowerCase(), pricelist]))
    let created = 0
    let updated = 0

    await prisma.$transaction(async (tx) => {
      for (const row of validRows) {
        const existing = existingByTitle.get(row.title.toLowerCase())

        if (existing) {
          await tx.servicePricelist.update({
            where: { id: existing.id },
            data: {
              title: row.title,
              defaultPrice: row.defaultPrice,
            },
          })
          updated += 1
          continue
        }

        await tx.servicePricelist.create({
          data: {
            title: row.title,
            defaultPrice: row.defaultPrice,
            tokoId: validated.tokoId,
          },
        })
        created += 1
      }
    })

    revalidateInventoryPaths()

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
    const access = await getInventoryUser(validated.tokoId, true)
    if (!access.success) return access

    const existing = await prisma.servicePricelist.findFirst({
      where: { tokoId: validated.tokoId, title: validated.title },
    })

    if (existing) {
      return { success: false, error: "Daftar harga jasa dengan judul ini sudah ada" }
    }

    const pricelist = await prisma.servicePricelist.create({
      data: {
        title: validated.title,
        defaultPrice: validated.defaultPrice,
        tokoId: validated.tokoId,
      },
      select: {
        id: true,
        title: true,
        defaultPrice: true,
        tokoId: true,
      },
    })

    revalidateInventoryPaths()

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

    const pricelist = await prisma.servicePricelist.findUnique({
      where: { id: validated.id },
      select: { tokoId: true },
    })

    if (!pricelist) {
      return { success: false, error: "Daftar harga jasa tidak ditemukan" }
    }

    const access = await getInventoryUser(pricelist.tokoId, true)
    if (!access.success) return access

    if (validated.title) {
      const existing = await prisma.servicePricelist.findFirst({
        where: {
          tokoId: pricelist.tokoId,
          title: validated.title,
          id: { not: validated.id },
        },
      })
      if (existing) {
        return { success: false, error: "Daftar harga jasa dengan judul ini sudah ada" }
      }
    }

    const updated = await prisma.servicePricelist.update({
      where: { id: validated.id },
      data: {
        title: validated.title,
        defaultPrice: validated.defaultPrice,
      },
      select: {
        id: true,
        title: true,
        defaultPrice: true,
        tokoId: true,
      },
    })

    revalidateInventoryPaths()

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
    const pricelist = await prisma.servicePricelist.findUnique({
      where: { id },
      select: { tokoId: true },
    })

    if (!pricelist) {
      return { success: false, error: "Daftar harga jasa tidak ditemukan" }
    }

    const access = await getInventoryUser(pricelist.tokoId, true)
    if (!access.success) return access

    await prisma.servicePricelist.delete({ where: { id } })

    revalidateInventoryPaths()

    return { success: true }
  } catch (error) {
    console.error("Error deleting service pricelist:", error)
    return { success: false, error: "Gagal menghapus daftar harga jasa" }
  }
}
