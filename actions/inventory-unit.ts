"use server"

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
  imei?: string | null
  serialNumber?: string | null
  condition?: InventoryUnitCondition
  status?: InventoryUnitStatus
  purchasePrice?: number
  sellingPrice?: number
  warrantyDays?: number | null
  notes?: string | null
}

const createInventoryUnitSchema = z.object({
  deviceModelId: z.string().min(1, "Model perangkat wajib dipilih"),
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
  const q = filters?.q?.trim()
  const deviceModelId = filters?.deviceModelId
  const status = filters?.status && filters.status !== "all" ? filters.status : undefined
  const condition = filters?.condition && filters.condition !== "all" ? filters.condition : undefined

  return { q, deviceModelId, status, condition, page, pageSize }
}

function mapUnitToItem(unit: {
  id: string
  deviceModelId: string
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
  deviceModel: {
    modelName: string
    brand: { name: string }
  }
}): InventoryUnitItem {
  return {
    id: unit.id,
    deviceModelId: unit.deviceModelId,
    deviceModelName: unit.deviceModel.modelName,
    deviceBrandName: unit.deviceModel.brand.name,
    imei: unit.imei,
    serialNumber: unit.serialNumber,
    condition: unit.condition,
    status: unit.status,
    purchasePrice: unit.purchasePrice,
    sellingPrice: unit.sellingPrice,
    warrantyDays: unit.warrantyDays,
    warrantyUntil: unit.warrantyUntil,
    notes: unit.notes,
    acquiredAt: unit.acquiredAt,
    soldAt: unit.soldAt,
    createdAt: unit.createdAt,
  }
}

export async function getInventoryUnits(
  storeId: string,
  filters?: InventoryUnitFilters
): Promise<ActionResultWithData<InventoryUnitsResult>> {
  try {
    await assertInventoryUnitAccess(storeId, "inventory.view")

    const normalized = normalizeInventoryUnitFilters(filters)
    const where = {
      storeId,
      ...(normalized.deviceModelId ? { deviceModelId: normalized.deviceModelId } : {}),
      ...(normalized.status ? { status: normalized.status } : {}),
      ...(normalized.condition ? { condition: normalized.condition } : {}),
      ...(normalized.q
        ? {
            OR: [
              { imei: { contains: normalized.q, mode: "insensitive" as const } },
              { serialNumber: { contains: normalized.q, mode: "insensitive" as const } },
              { deviceModel: { modelName: { contains: normalized.q, mode: "insensitive" as const } } },
              { deviceModel: { brand: { name: { contains: normalized.q, mode: "insensitive" as const } } } },
            ],
          }
        : {}),
    }

    const [units, totalItems] = await Promise.all([
      prisma.inventoryUnit.findMany({
        where,
        orderBy: { acquiredAt: "desc" },
        skip: (normalized.page - 1) * normalized.pageSize,
        take: normalized.pageSize,
        select: {
          id: true,
          deviceModelId: true,
          imei: true,
          serialNumber: true,
          condition: true,
          status: true,
          purchasePrice: true,
          sellingPrice: true,
          warrantyDays: true,
          warrantyUntil: true,
          notes: true,
          acquiredAt: true,
          soldAt: true,
          createdAt: true,
          deviceModel: {
            select: {
              modelName: true,
              brand: { select: { name: true } },
            },
          },
        },
      }),
      prisma.inventoryUnit.count({ where }),
    ])

    return {
      success: true,
      data: {
        items: units.map(mapUnitToItem),
        totalItems,
        page: normalized.page,
        pageSize: normalized.pageSize,
        totalPages: Math.max(1, Math.ceil(totalItems / normalized.pageSize)),
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
    await assertInventoryUnitAccess(storeId, "inventory.view")

    const unit = await prisma.inventoryUnit.findFirst({
      where: { id: unitId, storeId },
      select: {
        id: true,
        deviceModelId: true,
        imei: true,
        serialNumber: true,
        condition: true,
        status: true,
        purchasePrice: true,
        sellingPrice: true,
        warrantyDays: true,
        warrantyUntil: true,
        notes: true,
        acquiredAt: true,
        soldAt: true,
        createdAt: true,
        deviceModel: {
          select: {
            modelName: true,
            brand: { select: { name: true } },
          },
        },
      },
    })

    if (!unit) return { success: false, error: "Unit inventaris tidak ditemukan" }

    return { success: true, data: mapUnitToItem(unit) }
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

    const where = {
      storeId,
      status: "available" as InventoryUnitStatus,
      ...(deviceModelId ? { deviceModelId } : {}),
    }

    const units = await prisma.inventoryUnit.findMany({
      where,
      orderBy: { acquiredAt: "desc" },
      take: 100,
      select: {
        id: true,
        deviceModelId: true,
        imei: true,
        serialNumber: true,
        condition: true,
        status: true,
        purchasePrice: true,
        sellingPrice: true,
        warrantyDays: true,
        warrantyUntil: true,
        notes: true,
        acquiredAt: true,
        soldAt: true,
        createdAt: true,
        deviceModel: {
          select: {
            modelName: true,
            brand: { select: { name: true } },
          },
        },
      },
    })

    return { success: true, data: units.map(mapUnitToItem) }
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
    const scope = await assertInventoryUnitAccess(storeId, "inventory.create")

    const deviceModel = await prisma.deviceModel.findUnique({
      where: { id: validated.deviceModelId },
      select: { id: true },
    })

    if (!deviceModel) return { success: false, error: "Model perangkat tidak ditemukan" }

    if (validated.imei) {
      const existingImei = await prisma.inventoryUnit.findUnique({
        where: { imei: validated.imei },
      })
      if (existingImei) return { success: false, error: "IMEI sudah terdaftar di unit lain" }
    }

    if (validated.serialNumber) {
      const existingSerial = await prisma.inventoryUnit.findUnique({
        where: { serialNumber: validated.serialNumber },
      })
      if (existingSerial) return { success: false, error: "Serial number sudah terdaftar di unit lain" }
    }

    const unit = await prisma.inventoryUnit.create({
      data: {
        storeId: scope.storeId,
        deviceModelId: validated.deviceModelId,
        imei: validated.imei || null,
        serialNumber: validated.serialNumber || null,
        condition: validated.condition ?? "used_good",
        status: "available",
        purchasePrice: validated.purchasePrice,
        sellingPrice: validated.sellingPrice,
        warrantyDays: validated.warrantyDays ?? null,
        notes: validated.notes ?? null,
      },
      select: {
        id: true,
        deviceModelId: true,
        imei: true,
        serialNumber: true,
        condition: true,
        status: true,
        purchasePrice: true,
        sellingPrice: true,
        warrantyDays: true,
        warrantyUntil: true,
        notes: true,
        acquiredAt: true,
        soldAt: true,
        createdAt: true,
        deviceModel: {
          select: {
            modelName: true,
            brand: { select: { name: true } },
          },
        },
      },
    })

    await prisma.inventoryMovement.create({
      data: {
        storeId: scope.storeId,
        inventoryItemId: null,
        inventoryUnitId: unit.id,
        type: "unit_acquired",
        qtyChange: 1,
        stockBefore: 0,
        stockAfter: 1,
        unitCostSnapshot: validated.purchasePrice,
        unitPriceSnapshot: validated.sellingPrice,
        referenceType: "inventory_unit",
        referenceId: unit.id,
        createdById: scope.user.id,
      },
    })

    revalidateInventoryPaths(scope.storeId)

    return { success: true, data: mapUnitToItem(unit) }
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
    const scope = await assertInventoryUnitAccess(storeId, "inventory.update")

    const existingUnit = await prisma.inventoryUnit.findFirst({
      where: { id: validated.id, storeId },
      select: { id: true, status: true },
    })

    if (!existingUnit) return { success: false, error: "Unit inventaris tidak ditemukan" }

    if (existingUnit.status === "sold" && validated.status !== "returned") {
      return { success: false, error: "Unit yang sudah sold tidak bisa diubah (kecuali returned)" }
    }

    if (validated.imei) {
      const existingImei = await prisma.inventoryUnit.findUnique({
        where: { imei: validated.imei },
      })
      if (existingImei && existingImei.id !== validated.id) {
        return { success: false, error: "IMEI sudah terdaftar di unit lain" }
      }
    }

    if (validated.serialNumber) {
      const existingSerial = await prisma.inventoryUnit.findUnique({
        where: { serialNumber: validated.serialNumber },
      })
      if (existingSerial && existingSerial.id !== validated.id) {
        return { success: false, error: "Serial number sudah terdaftar di unit lain" }
      }
    }

    const updateData: Record<string, unknown> = {}
    if (validated.imei !== undefined) updateData.imei = validated.imei || null
    if (validated.serialNumber !== undefined) updateData.serialNumber = validated.serialNumber || null
    if (validated.condition) updateData.condition = validated.condition
    if (validated.status) {
      updateData.status = validated.status
      if (validated.status === "sold") updateData.soldAt = new Date()
      if (validated.status === "returned") updateData.returnedAt = new Date()
    }
    if (validated.purchasePrice !== undefined) updateData.purchasePrice = validated.purchasePrice
    if (validated.sellingPrice !== undefined) updateData.sellingPrice = validated.sellingPrice
    if (validated.warrantyDays !== undefined) updateData.warrantyDays = validated.warrantyDays ?? null
    if (validated.notes !== undefined) updateData.notes = validated.notes ?? null

    const unit = await prisma.inventoryUnit.update({
      where: { id: validated.id },
      data: updateData,
      select: {
        id: true,
        deviceModelId: true,
        imei: true,
        serialNumber: true,
        condition: true,
        status: true,
        purchasePrice: true,
        sellingPrice: true,
        warrantyDays: true,
        warrantyUntil: true,
        notes: true,
        acquiredAt: true,
        soldAt: true,
        createdAt: true,
        deviceModel: {
          select: {
            modelName: true,
            brand: { select: { name: true } },
          },
        },
      },
    })

    revalidateInventoryPaths(scope.storeId)

    return { success: true, data: mapUnitToItem(unit) }
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
    const scope = await assertInventoryUnitAccess(storeId, "inventory.delete")

    const unit = await prisma.inventoryUnit.findFirst({
      where: { id: unitId, storeId },
      select: { id: true, status: true },
    })

    if (!unit) return { success: false, error: "Unit inventaris tidak ditemukan" }
    if (unit.status === "sold") return { success: false, error: "Unit yang sudah sold tidak bisa dihapus" }

    await prisma.inventoryUnit.delete({ where: { id: unitId } })

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
    await assertInventoryUnitAccess(storeId, "inventory.view")

    const unit = await prisma.inventoryUnit.findFirst({
      where: { imei, storeId },
      select: {
        id: true,
        deviceModelId: true,
        imei: true,
        serialNumber: true,
        condition: true,
        status: true,
        purchasePrice: true,
        sellingPrice: true,
        warrantyDays: true,
        warrantyUntil: true,
        notes: true,
        acquiredAt: true,
        soldAt: true,
        createdAt: true,
        deviceModel: {
          select: {
            modelName: true,
            brand: { select: { name: true } },
          },
        },
      },
    })

    if (!unit) return { success: true, data: null }

    return { success: true, data: mapUnitToItem(unit) }
  } catch (error) {
    return actionError(error) as ActionResultWithData<InventoryUnitItem | null>
  }
}