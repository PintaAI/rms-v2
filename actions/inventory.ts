"use server"

import { createActivityLogIfUser } from "@/lib/activity-log"
import prisma from "@/lib/prisma"
import { actionError, type ActionResult, type ActionResultWithData } from "@/lib/auth/authorization"
import { assertFeature, assertRole, getRequestScope } from "@/lib/auth/request-scope"
import type { RequestScope } from "@/lib/auth/request-scope"
import { revalidateInventoryPaths } from "@/lib/revalidation"
import type { FeatureKey } from "@/lib/features"
import type { Prisma } from "@/prisma/generated/prisma/client"
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
  tokoId: string
}

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
  stock: number
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

const createSparepartSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  defaultPrice: z.number().int().min(0, "Harga jual harus 0 atau lebih"),
  purchasePrice: z.number().int().min(0, "Harga beli harus 0 atau lebih").nullable().optional(),
  supplierName: z.string().trim().nullable().optional(),
  categoryName: z.string().trim().nullable().optional(),
  stock: z.number().int().min(0, "Stok harus 0 atau lebih").optional(),
  criticalStock: z.number().int().min(0, "Stok kritis harus 0 atau lebih").optional(),
  isUniversal: z.boolean().optional(),
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

export async function getSpareparts(tokoId: string): Promise<ActionResultWithData<SparepartWithCompatibilities[]>> {
  try {
    const access = await getInventoryUser(tokoId)
    if (!access.success) return access

    const spareparts = await prisma.sparepart.findMany({
      where: { tokoId },
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
      OR?: Array<{ isUniversal: boolean } | { compatibilities: { some: { hpCatalogId: string } } }>
    } = { tokoId }

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
        stock: true,
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

    const existing = await prisma.sparepart.findFirst({
      where: { tokoId: validated.tokoId, name: validated.name },
    })

    if (existing) {
      return { success: false, error: "Sparepart dengan nama ini sudah ada" }
    }

    const category = await findOrCreateSparepartCategory(prisma, validated.tokoId, validated.categoryName)

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
        isUniversal: validated.isUniversal ?? false,
        tokoId: validated.tokoId,
        compatibilities: validated.hpCatalogIds
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
      select: { tokoId: true },
    })

    if (!sparepart) {
      return { success: false, error: "Sparepart tidak ditemukan" }
    }

    const access = await getInventoryUser(sparepart.tokoId, true)
    if (!access.success) return access

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
        isUniversal: validated.isUniversal,
        ...(validated.hpCatalogIds && {
          compatibilities: {
            deleteMany: {},
            create: validated.hpCatalogIds.map((id) => ({ hpCatalogId: id })),
          },
        }),
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
              isUniversal: row.isUniversal ?? true,
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
            isUniversal: row.isUniversal ?? true,
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

export async function restockSparepart(data: z.infer<typeof restockSparepartSchema>): Promise<ActionResultWithData<SparepartWithCompatibilities>> {
  try {
    const validated = restockSparepartSchema.parse(data)

    const sparepart = await prisma.sparepart.findUnique({
      where: { id: validated.id },
      select: { tokoId: true, name: true, stock: true },
    })

    if (!sparepart) {
      return { success: false, error: "Sparepart tidak ditemukan" }
    }

    const access = await getInventoryUser(sparepart.tokoId, true)
    if (!access.success) return access

    const updated = await prisma.sparepart.update({
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

    revalidateInventoryPaths()

    await createActivityLogIfUser({
      tokoId: sparepart.tokoId,
      userId: access.user.id,
      type: "sparepart_stock_in",
      title: "Sparepart restocked",
      payload: {
        sparepartId: validated.id,
        sparepartName: sparepart.name,
        previousStock: sparepart.stock,
        addedQty: validated.qty,
        newStock: updated.stock,
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

export async function searchSpareparts(tokoId: string, query: string): Promise<ActionResultWithData<SparepartWithCompatibilities[]>> {
  try {
    const access = await getInventoryUser(tokoId)
    if (!access.success) return access

    const spareparts = await prisma.sparepart.findMany({
      where: {
        tokoId,
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

export async function deleteSparepart(id: string): Promise<ActionResult> {
  try {
    const sparepart = await prisma.sparepart.findUnique({
      where: { id },
      select: { tokoId: true, name: true },
    })

    if (!sparepart) {
      return { success: false, error: "Sparepart tidak ditemukan" }
    }

    const access = await getInventoryUser(sparepart.tokoId, true)
    if (!access.success) return access

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
