"use server"

import { randomUUID } from "node:crypto"
import prisma from "@/lib/prisma"
import { actionError, type ActionResult, type ActionResultWithData } from "@/lib/auth/authorization"
import { assertFeature, assertPermission, getRequestScope } from "@/lib/auth/request-scope"
import type { PermissionKey } from "@/lib/permissions"
import { revalidateInventoryPaths } from "@/lib/revalidation"
import { z } from "zod"

export type InventoryUnitCondition = "new" | "used_good" | "used_fair" | "refurbished" | "damaged"
export type InventoryUnitStatus = "available" | "reserved" | "sold" | "returned" | "defective"

export type InventoryUnitItem = {
  id: string
  deviceModelId: string
  deviceModelName: string
  deviceBrandName: string
  categoryId: string | null
  categoryName: string | null
  imei: string | null
  serialNumber: string | null
  condition: InventoryUnitCondition
  status: InventoryUnitStatus
  purchasePrice: number
  sellingPrice: number
  warrantyDays: number | null
  warrantyUntil: Date | null
  notes: string | null
  acquiredAt: Date
  soldAt: Date | null
  createdAt: Date
}

export type InventoryUnitFilters = {
  q?: string
  deviceModelId?: string
  status?: InventoryUnitStatus | "all"
  condition?: InventoryUnitCondition | "all"
  page?: number
  pageSize?: number
}

export type InventoryUnitsResult = {
  items: InventoryUnitItem[]
  totalItems: number
  page: number
  pageSize: number
  totalPages: number
}

export type CreateInventoryUnitInput = {
  deviceModelId: string
  categoryName?: string | null
  imei?: string | null
  serialNumber?: string | null
  condition?: InventoryUnitCondition
  purchasePrice: number
  sellingPrice: number
  warrantyDays?: number | null
  notes?: string | null
}

export type UpdateInventoryUnitInput = {
  id: string
  categoryName?: string | null
  imei?: string | null
  serialNumber?: string | null
  condition?: InventoryUnitCondition
  status?: InventoryUnitStatus
  purchasePrice?: number
  sellingPrice?: number
  warrantyDays?: number | null
  notes?: string | null
}

const phoneMetadataSchema = z.object({
  imei: z.string().nullable().optional(),
  serialNumber: z.string().nullable().optional(),
  condition: z.enum(["new", "used_good", "used_fair", "refurbished", "damaged"]).default("used_good"),
  status: z.enum(["available", "reserved", "sold", "returned", "defective"]).default("available"),
  notes: z.string().nullable().optional(),
  acquiredAt: z.string().datetime().nullable().optional(),
  soldAt: z.string().datetime().nullable().optional(),
  returnedAt: z.string().datetime().nullable().optional(),
})

type PhoneMetadata = z.infer<typeof phoneMetadataSchema>

const createInventoryUnitSchema = z.object({
  deviceModelId: z.string().min(1, "Model perangkat wajib dipilih"),
  categoryName: z.string().trim().max(100).optional().nullable(),
  imei: z.string().trim().max(50).optional().nullable(),
  serialNumber: z.string().trim().max(50).optional().nullable(),
  condition: z.enum(["new", "used_good", "used_fair", "refurbished", "damaged"]).optional(),
  purchasePrice: z.number().int().min(0, "Harga beli minimal 0"),
  sellingPrice: z.number().int().min(0, "Harga jual minimal 0"),
  warrantyDays: z.number().int().min(0).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
})

const updateInventoryUnitSchema = z.object({
  id: z.string().min(1, "ID unit wajib diisi"),
  categoryName: z.string().trim().max(100).optional().nullable(),
  imei: z.string().trim().max(50).optional().nullable(),
  serialNumber: z.string().trim().max(50).optional().nullable(),
  condition: z.enum(["new", "used_good", "used_fair", "refurbished", "damaged"]).optional(),
  status: z.enum(["available", "reserved", "sold", "returned", "defective"]).optional(),
  purchasePrice: z.number().int().min(0, "Harga beli minimal 0").optional(),
  sellingPrice: z.number().int().min(0, "Harga jual minimal 0").optional(),
  warrantyDays: z.number().int().min(0).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
})

async function assertInventoryUnitAccess(storeId: string, permission: PermissionKey) {
  const scope = await getRequestScope(storeId)
  assertPermission(scope, permission)
  assertFeature(scope, "inventory.management")
  return scope
}

function normalizeInventoryUnitFilters(filters?: InventoryUnitFilters) {
  const rawPageSize = Number.isFinite(filters?.pageSize) ? filters?.pageSize ?? 20 : 20
  const rawPage = Number.isFinite(filters?.page) ? filters?.page ?? 1 : 1
  const pageSize = Math.min(Math.max(rawPageSize, 1), 100)
  const page = Math.max(rawPage, 1)
  const q = filters?.q?.trim().toLowerCase()
  const deviceModelId = filters?.deviceModelId
  const status = filters?.status && filters.status !== "all" ? filters.status : undefined
  const condition = filters?.condition && filters.condition !== "all" ? filters.condition : undefined

  return { q, deviceModelId, status, condition, page, pageSize }
}

function parsePhoneMetadata(metadata: unknown): PhoneMetadata {
  return phoneMetadataSchema.parse(metadata ?? {})
}

function nullableDate(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null
}

function stockForStatus(status: InventoryUnitStatus) {
  return status === "sold" || status === "defective" ? 0 : 1
}

function barcodeForUnit(id: string, imei: string | null | undefined, serialNumber: string | null | undefined) {
  return imei || serialNumber || `UNIT-${id}`
}

async function findOrCreatePhoneUnitCategory(storeId: string, categoryName?: string | null) {
  const name = categoryName?.trim()
  if (!name) return null

  const existing = await prisma.inventoryCategory.findFirst({
    where: { storeId, kind: "phone_unit", name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  })
  if (existing) return existing

  return prisma.inventoryCategory.create({
    data: { storeId, kind: "phone_unit", name },
    select: { id: true },
  })
}

function buildPhoneMetadata(input: {
  imei?: string | null
  serialNumber?: string | null
  condition?: InventoryUnitCondition
  status?: InventoryUnitStatus
  notes?: string | null
  acquiredAt?: string | null
  soldAt?: string | null
  returnedAt?: string | null
}): PhoneMetadata {
  return {
    imei: input.imei || null,
    serialNumber: input.serialNumber || null,
    condition: input.condition ?? "used_good",
    status: input.status ?? "available",
    notes: input.notes ?? null,
    acquiredAt: input.acquiredAt ?? new Date().toISOString(),
    soldAt: input.soldAt ?? null,
    returnedAt: input.returnedAt ?? null,
  }
}

function mapItemToUnit(item: {
  id: string
  deviceModelId: string | null
  categoryId: string | null
  purchasePrice: number | null
  defaultPrice: number
  warrantyDays: number | null
  metadata: unknown
  deviceModel: {
    modelName: string
    brand: { name: string }
  } | null
  category: { name: string } | null
}): InventoryUnitItem {
  const metadata = parsePhoneMetadata(item.metadata)
  const acquiredAt = nullableDate(metadata.acquiredAt) ?? new Date()
  return {
    id: item.id,
    deviceModelId: item.deviceModelId ?? "",
    deviceModelName: item.deviceModel?.modelName ?? "Unknown",
    deviceBrandName: item.deviceModel?.brand.name ?? "Unknown",
    categoryId: item.categoryId,
    categoryName: item.category?.name ?? null,
    imei: metadata.imei ?? null,
    serialNumber: metadata.serialNumber ?? null,
    condition: metadata.condition,
    status: metadata.status,
    purchasePrice: item.purchasePrice ?? 0,
    sellingPrice: item.defaultPrice,
    warrantyDays: item.warrantyDays,
    warrantyUntil: null,
    notes: metadata.notes ?? null,
    acquiredAt,
    soldAt: nullableDate(metadata.soldAt),
    createdAt: acquiredAt,
  }
}

async function findDuplicateMetadataValue(
  field: "imei" | "serialNumber",
  value: string | null | undefined,
  excludeId?: string
) {
  if (!value) return null
  const items = await prisma.inventoryItem.findMany({
    where: { type: "phone_unit" },
    select: { id: true, metadata: true },
  })

  return items.find((item) => {
    if (excludeId && item.id === excludeId) return false
    const metadata = parsePhoneMetadata(item.metadata)
    return metadata[field] === value
  }) ?? null
}

export async function getInventoryUnits(
  storeId: string,
  filters?: InventoryUnitFilters
): Promise<ActionResultWithData<InventoryUnitsResult>> {
  try {
    await assertInventoryUnitAccess(storeId, "inventory.managePhoneUnits")

    const normalized = normalizeInventoryUnitFilters(filters)
    const items = await prisma.inventoryItem.findMany({
      where: {
        storeId,
        type: "phone_unit",
        ...(normalized.deviceModelId ? { deviceModelId: normalized.deviceModelId } : {}),
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        deviceModelId: true,
        purchasePrice: true,
        categoryId: true,
        defaultPrice: true,
        warrantyDays: true,
        metadata: true,
        deviceModel: {
          select: {
            modelName: true,
            brand: { select: { name: true } },
          },
        },
        category: { select: { name: true } },
      },
    })

    const filtered = items.map(mapItemToUnit).filter((unit) => {
      if (normalized.status && unit.status !== normalized.status) return false
      if (normalized.condition && unit.condition !== normalized.condition) return false
      if (!normalized.q) return true
      return [unit.imei, unit.serialNumber, unit.deviceModelName, unit.deviceBrandName]
        .some((value) => value?.toLowerCase().includes(normalized.q!))
    })

    const start = (normalized.page - 1) * normalized.pageSize
    const paged = filtered.slice(start, start + normalized.pageSize)

    return {
      success: true,
      data: {
        items: paged,
        totalItems: filtered.length,
        page: normalized.page,
        pageSize: normalized.pageSize,
        totalPages: Math.max(1, Math.ceil(filtered.length / normalized.pageSize)),
      },
    }
  } catch (error) {
    return actionError(error) as ActionResultWithData<InventoryUnitsResult>
  }
}

export async function getInventoryUnit(
  storeId: string,
  unitId: string
): Promise<ActionResultWithData<InventoryUnitItem>> {
  try {
    await assertInventoryUnitAccess(storeId, "inventory.managePhoneUnits")

    const item = await prisma.inventoryItem.findFirst({
      where: { id: unitId, storeId, type: "phone_unit" },
      select: {
        id: true,
        deviceModelId: true,
        purchasePrice: true,
        categoryId: true,
        defaultPrice: true,
        warrantyDays: true,
        metadata: true,
        deviceModel: {
          select: {
            modelName: true,
            brand: { select: { name: true } },
          },
        },
        category: { select: { name: true } },
      },
    })

    if (!item) return { success: false, error: "Unit inventaris tidak ditemukan" }

    return { success: true, data: mapItemToUnit(item) }
  } catch (error) {
    return actionError(error) as ActionResultWithData<InventoryUnitItem>
  }
}

export async function getAvailablePhoneUnits(
  storeId: string,
  deviceModelId?: string
): Promise<ActionResultWithData<InventoryUnitItem[]>> {
  try {
    await assertInventoryUnitAccess(storeId, "retail.view")

    const items = await prisma.inventoryItem.findMany({
      where: {
        storeId,
        type: "phone_unit",
        ...(deviceModelId ? { deviceModelId } : {}),
      },
      orderBy: { name: "asc" },
      take: 100,
      select: {
        id: true,
        deviceModelId: true,
        purchasePrice: true,
        categoryId: true,
        defaultPrice: true,
        warrantyDays: true,
        metadata: true,
        deviceModel: {
          select: {
            modelName: true,
            brand: { select: { name: true } },
          },
        },
        category: { select: { name: true } },
      },
    })

    return { success: true, data: items.map(mapItemToUnit).filter((unit) => unit.status === "available") }
  } catch (error) {
    return actionError(error) as ActionResultWithData<InventoryUnitItem[]>
  }
}

export async function createInventoryUnit(
  storeId: string,
  input: CreateInventoryUnitInput
): Promise<ActionResultWithData<InventoryUnitItem>> {
  try {
    const validated = createInventoryUnitSchema.parse(input)
    const scope = await assertInventoryUnitAccess(storeId, "inventory.managePhoneUnits")

    const deviceModel = await prisma.deviceModel.findUnique({
      where: { id: validated.deviceModelId },
      select: { id: true, modelName: true, brand: { select: { name: true } } },
    })

    if (!deviceModel) return { success: false, error: "Model perangkat tidak ditemukan" }
    if (await findDuplicateMetadataValue("imei", validated.imei)) {
      return { success: false, error: "IMEI sudah terdaftar di unit lain" }
    }
    if (await findDuplicateMetadataValue("serialNumber", validated.serialNumber)) {
      return { success: false, error: "Serial number sudah terdaftar di unit lain" }
    }

    const id = randomUUID()
    const category = await findOrCreatePhoneUnitCategory(scope.storeId, validated.categoryName)
    const metadata = buildPhoneMetadata({
      imei: validated.imei,
      serialNumber: validated.serialNumber,
      condition: validated.condition,
      status: "available",
      notes: validated.notes,
    })

    const item = await prisma.$transaction(async (tx) => {
      const createdItem = await tx.inventoryItem.create({
        data: {
          id,
          storeId: scope.storeId,
          deviceModelId: validated.deviceModelId,
          categoryId: category?.id ?? null,
          barcode: barcodeForUnit(id, validated.imei, validated.serialNumber),
          name: `${deviceModel.brand.name} ${deviceModel.modelName}`,
          type: "phone_unit",
          stock: 1,
          criticalStock: 0,
          defaultPrice: validated.sellingPrice,
          purchasePrice: validated.purchasePrice,
          warrantyDays: validated.warrantyDays ?? null,
          metadata,
        },
        select: {
          id: true,
          deviceModelId: true,
          purchasePrice: true,
          categoryId: true,
          defaultPrice: true,
          warrantyDays: true,
          metadata: true,
          deviceModel: {
            select: {
              modelName: true,
              brand: { select: { name: true } },
            },
          },
          category: { select: { name: true } },
        },
      })

      await tx.inventoryMovement.create({
        data: {
          storeId: scope.storeId,
          inventoryItemId: createdItem.id,
          type: "unit_acquired",
          qtyChange: 1,
          stockBefore: 0,
          stockAfter: 1,
          unitCostSnapshot: validated.purchasePrice,
          unitPriceSnapshot: validated.sellingPrice,
          referenceType: "inventory_item",
          referenceId: createdItem.id,
          createdById: scope.user.id,
        },
      })

      return createdItem
    })

    revalidateInventoryPaths(scope.storeId)

    return { success: true, data: mapItemToUnit(item) }
  } catch (error) {
    if (error instanceof z.ZodError) return { success: false, error: error.issues[0].message }
    return actionError(error) as ActionResultWithData<InventoryUnitItem>
  }
}

export async function updateInventoryUnit(
  storeId: string,
  input: UpdateInventoryUnitInput
): Promise<ActionResultWithData<InventoryUnitItem>> {
  try {
    const validated = updateInventoryUnitSchema.parse(input)
    const scope = await assertInventoryUnitAccess(storeId, "inventory.managePhoneUnits")

    const existingItem = await prisma.inventoryItem.findFirst({
      where: { id: validated.id, storeId, type: "phone_unit" },
      select: { id: true, metadata: true },
    })

    if (!existingItem) return { success: false, error: "Unit inventaris tidak ditemukan" }

    const existingMetadata = parsePhoneMetadata(existingItem.metadata)
    if (existingMetadata.status === "sold" && validated.status !== "returned") {
      return { success: false, error: "Unit yang sudah sold tidak bisa diubah (kecuali returned)" }
    }

    if (await findDuplicateMetadataValue("imei", validated.imei, validated.id)) {
      return { success: false, error: "IMEI sudah terdaftar di unit lain" }
    }
    if (await findDuplicateMetadataValue("serialNumber", validated.serialNumber, validated.id)) {
      return { success: false, error: "Serial number sudah terdaftar di unit lain" }
    }

    const nextStatus = validated.status ?? existingMetadata.status
    const category = validated.categoryName === undefined
      ? undefined
      : await findOrCreatePhoneUnitCategory(scope.storeId, validated.categoryName)
    const nextMetadata = {
      ...existingMetadata,
      ...(validated.imei !== undefined ? { imei: validated.imei || null } : {}),
      ...(validated.serialNumber !== undefined ? { serialNumber: validated.serialNumber || null } : {}),
      ...(validated.condition ? { condition: validated.condition } : {}),
      ...(validated.status ? { status: validated.status } : {}),
      ...(validated.notes !== undefined ? { notes: validated.notes ?? null } : {}),
      ...(validated.status === "sold" ? { soldAt: new Date().toISOString() } : {}),
      ...(validated.status === "returned" ? { returnedAt: new Date().toISOString() } : {}),
    }

    const item = await prisma.inventoryItem.update({
      where: { id: validated.id },
      data: {
        ...(validated.imei !== undefined || validated.serialNumber !== undefined
          ? { barcode: barcodeForUnit(validated.id, nextMetadata.imei, nextMetadata.serialNumber) }
          : {}),
        ...(validated.purchasePrice !== undefined ? { purchasePrice: validated.purchasePrice } : {}),
        ...(validated.categoryName !== undefined ? { categoryId: category?.id ?? null } : {}),
        ...(validated.sellingPrice !== undefined ? { defaultPrice: validated.sellingPrice } : {}),
        ...(validated.warrantyDays !== undefined ? { warrantyDays: validated.warrantyDays ?? null } : {}),
        ...(validated.status ? { stock: stockForStatus(nextStatus) } : {}),
        metadata: nextMetadata,
      },
      select: {
        id: true,
        deviceModelId: true,
        purchasePrice: true,
        categoryId: true,
        defaultPrice: true,
        warrantyDays: true,
        metadata: true,
        deviceModel: {
          select: {
            modelName: true,
            brand: { select: { name: true } },
          },
        },
        category: { select: { name: true } },
      },
    })

    revalidateInventoryPaths(scope.storeId)

    return { success: true, data: mapItemToUnit(item) }
  } catch (error) {
    if (error instanceof z.ZodError) return { success: false, error: error.issues[0].message }
    return actionError(error) as ActionResultWithData<InventoryUnitItem>
  }
}

export async function deleteInventoryUnit(
  storeId: string,
  unitId: string
): Promise<ActionResult> {
  try {
    const scope = await assertInventoryUnitAccess(storeId, "inventory.managePhoneUnits")

    const item = await prisma.inventoryItem.findFirst({
      where: { id: unitId, storeId, type: "phone_unit" },
      select: { id: true, metadata: true },
    })

    if (!item) return { success: false, error: "Unit inventaris tidak ditemukan" }
    const metadata = parsePhoneMetadata(item.metadata)
    if (metadata.status === "sold") return { success: false, error: "Unit yang sudah sold tidak bisa dihapus" }

    await prisma.inventoryItem.delete({ where: { id: unitId } })

    revalidateInventoryPaths(scope.storeId)

    return { success: true }
  } catch (error) {
    return actionError(error)
  }
}

export async function searchInventoryUnitByImei(
  storeId: string,
  imei: string
): Promise<ActionResultWithData<InventoryUnitItem | null>> {
  try {
    await assertInventoryUnitAccess(storeId, "inventory.managePhoneUnits")

    const result = await getInventoryUnits(storeId, { q: imei, page: 1, pageSize: 100 })
    if (!result.success) return { success: false, error: result.error }

    const unit = result.data?.items.find((item) => item.imei === imei) ?? null
    return { success: true, data: unit }
  } catch (error) {
    return actionError(error) as ActionResultWithData<InventoryUnitItem | null>
  }
}
