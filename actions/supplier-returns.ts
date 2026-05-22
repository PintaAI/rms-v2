"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import prisma from "@/lib/prisma"
import { createActivityLog } from "@/lib/activity-log"
import { assertPermission } from "@/lib/auth/request-scope"
import { withScope } from "@/lib/auth/wrapper"
import { revalidateInventoryPaths, revalidateServicePaths } from "@/lib/revalidation"
import type { ActionResult, ActionResultWithData } from "@/lib/auth/authorization"
import type { Prisma } from "@/prisma/generated/prisma/client"
import type { SupplierReturnStatus } from "@/prisma/generated/prisma/enums"

const supplierReturnStatusSchema = z.enum(["pending", "sent", "replaced", "refunded", "rejected"])

const getSupplierReturnsFiltersSchema = z.object({
  status: z.union([supplierReturnStatusSchema, z.literal("all")]).optional(),
  query: z.string().trim().optional(),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
}).optional()

const createSupplierReturnSchema = z.object({
  storeId: z.string().min(1),
  inventoryItemId: z.string().min(1),
  qty: z.number().int().min(1),
  reason: z.string().trim().min(3, "Alasan retur wajib diisi"),
  warrantyClaimId: z.string().min(1).optional(),
  supplierName: z.string().trim().optional(),
  note: z.string().trim().optional(),
})

const idSchema = z.string().min(1)
const refundSchema = z.object({ id: z.string().min(1), refundAmount: z.number().int().min(1, "Nominal refund supplier wajib lebih dari nol") })
const rejectedSchema = z.object({ id: z.string().min(1), note: z.string().trim().optional() })

type SupplierReturnFilterInput = z.infer<typeof getSupplierReturnsFiltersSchema>

export type SupplierReturnFilters = NonNullable<SupplierReturnFilterInput>

export type SupplierReturnRow = {
  id: string
  createdAt: Date
  status: SupplierReturnStatus
  inventoryItem: { id: string; name: string }
  qty: number
  supplierName: string | null
  reason: string
  note: string | null
  refundAmount: number
  warrantyClaim: {
    id: string
    status: string
    reason: string
    repairOrderId: string
    customerName: string | null
    deviceName: string
  } | null
  createdBy: { id: string; name: string }
  resolvedBy: { id: string; name: string } | null
  sentAt: Date | null
  resolvedAt: Date | null
}

export type SupplierReturnsResult = {
  items: SupplierReturnRow[]
  summary: {
    pendingCount: number
    sentCount: number
    replacedThisMonth: number
    refundedAmountThisMonth: number
  }
  totalItems: number
  page: number
  pageSize: number
  totalPages: number
}

function parseDateStart(value?: string): Date | undefined {
  if (!value) return undefined
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function parseDateEnd(value?: string): Date | undefined {
  if (!value) return undefined
  const date = new Date(`${value}T23:59:59.999`)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function getMonthRange(date = new Date()) {
  return {
    start: new Date(date.getFullYear(), date.getMonth(), 1),
    end: new Date(date.getFullYear(), date.getMonth() + 1, 1),
  }
}

function revalidateSupplierReturnPaths(storeId: string) {
  revalidatePath(`/${storeId}/inventory/supplier-returns`)
}

function revalidateAfterSupplierReturnMutation(storeId: string, repairOrderId?: string | null) {
  revalidateInventoryPaths(storeId)
  revalidateSupplierReturnPaths(storeId)
  if (repairOrderId) revalidateServicePaths(storeId)
}

async function getSupplierReturnForMutation(id: string) {
  return prisma.supplierReturn.findUnique({
    where: { id },
    select: {
      id: true,
      storeId: true,
      status: true,
      qty: true,
      supplierName: true,
      reason: true,
      note: true,
      warrantyClaimId: true,
      inventoryItemId: true,
      inventoryItem: { select: { id: true, name: true, stock: true, purchasePrice: true, defaultPrice: true } },
      warrantyClaim: { select: { repairOrderId: true } },
    },
  })
}

export async function getSupplierReturns(
  storeId: string,
  filters?: SupplierReturnFilters
): Promise<ActionResultWithData<SupplierReturnsResult>> {
  const validated = getSupplierReturnsFiltersSchema.safeParse(filters)
  if (!validated.success) return { success: false, error: validated.error.issues[0].message }

  return withScope(storeId, { feature: "inventory.management" }, async (scope) => {
    assertPermission(scope, "supplier_returns.view")

    const normalized = validated.data ?? {}
    const page = normalized.page ?? 1
    const pageSize = normalized.pageSize ?? 20
    const query = normalized.query?.trim()
    const from = parseDateStart(normalized.from)
    const to = parseDateEnd(normalized.to)

    const where: Prisma.SupplierReturnWhereInput = {
      storeId,
      ...(normalized.status && normalized.status !== "all" ? { status: normalized.status } : {}),
      ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      ...(query
        ? {
            OR: [
              { id: { contains: query, mode: "insensitive" as const } },
              { supplierName: { contains: query, mode: "insensitive" as const } },
              { inventoryItem: { name: { contains: query, mode: "insensitive" as const } } },
              { warrantyClaim: { is: { reason: { contains: query, mode: "insensitive" as const } } } },
              { warrantyClaim: { is: { repairOrder: { customerName: { contains: query, mode: "insensitive" as const } } } } },
              { warrantyClaim: { is: { repairOrder: { deviceModel: { modelName: { contains: query, mode: "insensitive" as const } } } } } },
              { warrantyClaim: { is: { repairOrder: { deviceModel: { brand: { name: { contains: query, mode: "insensitive" as const } } } } } } },
            ],
          }
        : {}),
    }

    const monthRange = getMonthRange()

    const [totalItems, returns, pendingCount, sentCount, replacedThisMonth, refundThisMonth] = await Promise.all([
      prisma.supplierReturn.count({ where }),
      prisma.supplierReturn.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          createdAt: true,
          status: true,
          qty: true,
          supplierName: true,
          reason: true,
          note: true,
          refundAmount: true,
          sentAt: true,
          resolvedAt: true,
          inventoryItem: { select: { id: true, name: true } },
          warrantyClaim: {
            select: {
              id: true,
              status: true,
              reason: true,
              repairOrderId: true,
              repairOrder: {
                select: {
                  customerName: true,
                  deviceModel: { select: { modelName: true, brand: { select: { name: true } } } },
                },
              },
            },
          },
          createdBy: { select: { id: true, name: true } },
          resolvedBy: { select: { id: true, name: true } },
        },
      }),
      prisma.supplierReturn.count({ where: { storeId, status: "pending" } }),
      prisma.supplierReturn.count({ where: { storeId, status: "sent" } }),
      prisma.supplierReturn.count({
        where: {
          storeId,
          status: "replaced",
          resolvedAt: { gte: monthRange.start, lt: monthRange.end },
        },
      }),
      prisma.supplierReturn.aggregate({
        where: {
          storeId,
          status: "refunded",
          resolvedAt: { gte: monthRange.start, lt: monthRange.end },
        },
        _sum: { refundAmount: true },
      }),
    ])

    return {
      items: returns.map((item) => ({
        id: item.id,
        createdAt: item.createdAt,
        status: item.status,
        inventoryItem: item.inventoryItem,
        qty: item.qty,
        supplierName: item.supplierName,
        reason: item.reason,
        note: item.note,
        refundAmount: item.refundAmount,
        warrantyClaim: item.warrantyClaim
          ? {
              id: item.warrantyClaim.id,
              status: item.warrantyClaim.status,
              reason: item.warrantyClaim.reason,
              repairOrderId: item.warrantyClaim.repairOrderId,
              customerName: item.warrantyClaim.repairOrder.customerName,
              deviceName: `${item.warrantyClaim.repairOrder.deviceModel.brand.name} ${item.warrantyClaim.repairOrder.deviceModel.modelName}`,
            }
          : null,
        createdBy: item.createdBy,
        resolvedBy: item.resolvedBy,
        sentAt: item.sentAt,
        resolvedAt: item.resolvedAt,
      })),
      summary: {
        pendingCount,
        sentCount,
        replacedThisMonth,
        refundedAmountThisMonth: refundThisMonth._sum.refundAmount ?? 0,
      },
      totalItems,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    }
  })
}

export async function createSupplierReturn(
  input: z.infer<typeof createSupplierReturnSchema>
): Promise<ActionResultWithData<{ id: string }>> {
  const validated = createSupplierReturnSchema.safeParse(input)
  if (!validated.success) return { success: false, error: validated.error.issues[0].message }

  const inventoryItem = await prisma.inventoryItem.findFirst({
    where: { id: validated.data.inventoryItemId, storeId: validated.data.storeId, type: "repair_part" },
    select: { id: true, name: true },
  })
  if (!inventoryItem) return { success: false, error: "Sparepart tidak ditemukan" }

  let warrantyClaim: { id: string; repairOrderId: string } | null = null
  if (validated.data.warrantyClaimId) {
    warrantyClaim = await prisma.warrantyClaim.findFirst({
      where: { id: validated.data.warrantyClaimId, storeId: validated.data.storeId },
      select: { id: true, repairOrderId: true },
    })
    if (!warrantyClaim) return { success: false, error: "Klaim garansi tidak ditemukan" }
  }

  return withScope(validated.data.storeId, { feature: "inventory.management" }, async (scope) => {
    assertPermission(scope, "supplier_returns.create")

    const created = await prisma.$transaction(async (tx) => {
      const supplierReturn = await tx.supplierReturn.create({
        data: {
          storeId: scope.storeId,
          warrantyClaimId: warrantyClaim?.id ?? null,
          inventoryItemId: inventoryItem.id,
          qty: validated.data.qty,
          supplierName: validated.data.supplierName || null,
          reason: validated.data.reason,
          note: validated.data.note || null,
          createdById: scope.user.id,
        },
        select: { id: true },
      })

      await createActivityLog(tx, {
        storeId: scope.storeId,
        userId: scope.user.id,
        repairOrderId: warrantyClaim?.repairOrderId ?? null,
        type: "supplier_return_created",
        title: "Supplier return created",
        payload: {
          supplierReturnId: supplierReturn.id,
          warrantyClaimId: warrantyClaim?.id ?? null,
          inventoryItemId: inventoryItem.id,
          inventoryItemName: inventoryItem.name,
          qty: validated.data.qty,
          supplierName: validated.data.supplierName || null,
          reason: validated.data.reason,
        },
      })

      return supplierReturn
    })

    revalidateAfterSupplierReturnMutation(scope.storeId, warrantyClaim?.repairOrderId)
    return created
  })
}

export async function markSupplierReturnSent(id: string): Promise<ActionResult> {
  const validated = idSchema.safeParse(id)
  if (!validated.success) return { success: false, error: validated.error.issues[0].message }

  const supplierReturn = await getSupplierReturnForMutation(validated.data)
  if (!supplierReturn) return { success: false, error: "Retur supplier tidak ditemukan" }
  if (supplierReturn.status !== "pending") return { success: false, error: supplierReturn.status === "sent" ? "Retur supplier sudah dikirim" : "Retur supplier sudah selesai" }

  return withScope(supplierReturn.storeId, { feature: "inventory.management" }, async (scope) => {
    assertPermission(scope, "supplier_returns.update")

    const sentAt = new Date()
    const updated = await prisma.$transaction(async (tx) => {
      const updated = await tx.supplierReturn.updateMany({
        where: { id: supplierReturn.id, status: "pending" },
        data: { status: "sent", sentAt },
      })
      if (updated.count !== 1) return false

      await createActivityLog(tx, {
        storeId: scope.storeId,
        userId: scope.user.id,
        repairOrderId: supplierReturn.warrantyClaim?.repairOrderId ?? null,
        type: "supplier_return_sent",
        title: "Supplier return sent",
        payload: { supplierReturnId: supplierReturn.id, inventoryItemId: supplierReturn.inventoryItemId, qty: supplierReturn.qty, sentAt: sentAt.toISOString() },
      })

      return true
    })
    if (!updated) return { success: false, error: "Retur supplier sudah selesai" }

    revalidateAfterSupplierReturnMutation(scope.storeId, supplierReturn.warrantyClaim?.repairOrderId)
    return { success: true }
  })
}

export async function markSupplierReturnReplaced(id: string): Promise<ActionResult> {
  const validated = idSchema.safeParse(id)
  if (!validated.success) return { success: false, error: validated.error.issues[0].message }

  const supplierReturn = await getSupplierReturnForMutation(validated.data)
  if (!supplierReturn) return { success: false, error: "Retur supplier tidak ditemukan" }
  if (supplierReturn.status !== "pending" && supplierReturn.status !== "sent") return { success: false, error: "Retur supplier sudah selesai" }

  return withScope(supplierReturn.storeId, { feature: "inventory.management" }, async (scope) => {
    assertPermission(scope, "supplier_returns.resolve")

    const resolvedAt = new Date()
    const updated = await prisma.$transaction(async (tx) => {
      const updatedReturn = await tx.supplierReturn.updateMany({
        where: { id: supplierReturn.id, status: { in: ["pending", "sent"] } },
        data: { status: "replaced", resolvedAt, resolvedById: scope.user.id },
      })
      if (updatedReturn.count !== 1) return false

      const updatedSparepart = await tx.inventoryItem.update({
        where: { id: supplierReturn.inventoryItemId },
        data: { stock: { increment: supplierReturn.qty } },
        select: { stock: true },
      })

      await tx.inventoryMovement.create({
        data: {
          storeId: scope.storeId,
          inventoryItemId: supplierReturn.inventoryItemId,
          type: "supplier_return_replacement",
          qtyChange: supplierReturn.qty,
          stockBefore: updatedSparepart.stock - supplierReturn.qty,
          stockAfter: updatedSparepart.stock,
          unitCostSnapshot: supplierReturn.inventoryItem.purchasePrice,
          unitPriceSnapshot: supplierReturn.inventoryItem.defaultPrice,
          referenceType: "supplier_return",
          referenceId: supplierReturn.id,
          note: "Supplier return replacement received",
          createdById: scope.user.id,
        },
      })

      await createActivityLog(tx, {
        storeId: scope.storeId,
        userId: scope.user.id,
        repairOrderId: supplierReturn.warrantyClaim?.repairOrderId ?? null,
        type: "supplier_return_replaced",
        title: "Supplier return replaced",
        payload: {
          supplierReturnId: supplierReturn.id,
          inventoryItemId: supplierReturn.inventoryItemId,
          inventoryItemName: supplierReturn.inventoryItem.name,
          qty: supplierReturn.qty,
          resolvedAt: resolvedAt.toISOString(),
        },
      })

      return true
    })

    if (!updated) return { success: false, error: "Retur supplier sudah selesai" }

    revalidateAfterSupplierReturnMutation(scope.storeId, supplierReturn.warrantyClaim?.repairOrderId)
    return { success: true }
  })
}

export async function markSupplierReturnRefunded(id: string, refundAmount: number): Promise<ActionResult> {
  const validated = refundSchema.safeParse({ id, refundAmount })
  if (!validated.success) return { success: false, error: validated.error.issues[0].message }

  const supplierReturn = await getSupplierReturnForMutation(validated.data.id)
  if (!supplierReturn) return { success: false, error: "Retur supplier tidak ditemukan" }
  if (supplierReturn.status !== "pending" && supplierReturn.status !== "sent") return { success: false, error: "Retur supplier sudah selesai" }

  return withScope(supplierReturn.storeId, { feature: "inventory.management" }, async (scope) => {
    assertPermission(scope, "supplier_returns.update")

    const resolvedAt = new Date()
    const updated = await prisma.$transaction(async (tx) => {
      const updated = await tx.supplierReturn.updateMany({
        where: { id: supplierReturn.id, status: { in: ["pending", "sent"] } },
        data: { status: "refunded", refundAmount: validated.data.refundAmount, resolvedAt, resolvedById: scope.user.id },
      })
      if (updated.count !== 1) return false

      await createActivityLog(tx, {
        storeId: scope.storeId,
        userId: scope.user.id,
        repairOrderId: supplierReturn.warrantyClaim?.repairOrderId ?? null,
        type: "supplier_return_refunded",
        title: "Supplier return refunded",
        payload: {
          supplierReturnId: supplierReturn.id,
          inventoryItemId: supplierReturn.inventoryItemId,
          qty: supplierReturn.qty,
          refundAmount: validated.data.refundAmount,
          resolvedAt: resolvedAt.toISOString(),
        },
      })

      return true
    })

    if (!updated) return { success: false, error: "Retur supplier sudah selesai" }

    revalidateAfterSupplierReturnMutation(scope.storeId, supplierReturn.warrantyClaim?.repairOrderId)
    return { success: true }
  })
}

export async function markSupplierReturnRejected(id: string, note?: string): Promise<ActionResult> {
  const validated = rejectedSchema.safeParse({ id, note })
  if (!validated.success) return { success: false, error: validated.error.issues[0].message }

  const supplierReturn = await getSupplierReturnForMutation(validated.data.id)
  if (!supplierReturn) return { success: false, error: "Retur supplier tidak ditemukan" }
  if (supplierReturn.status !== "pending" && supplierReturn.status !== "sent") return { success: false, error: "Retur supplier sudah selesai" }

  return withScope(supplierReturn.storeId, { feature: "inventory.management" }, async (scope) => {
    assertPermission(scope, "supplier_returns.update")

    const resolvedAt = new Date()
    const nextNote = validated.data.note || supplierReturn.note
    const updated = await prisma.$transaction(async (tx) => {
      const updated = await tx.supplierReturn.updateMany({
        where: { id: supplierReturn.id, status: { in: ["pending", "sent"] } },
        data: { status: "rejected", note: nextNote || null, resolvedAt, resolvedById: scope.user.id },
      })
      if (updated.count !== 1) return false

      await createActivityLog(tx, {
        storeId: scope.storeId,
        userId: scope.user.id,
        repairOrderId: supplierReturn.warrantyClaim?.repairOrderId ?? null,
        type: "supplier_return_rejected",
        title: "Supplier return rejected",
        payload: {
          supplierReturnId: supplierReturn.id,
          inventoryItemId: supplierReturn.inventoryItemId,
          qty: supplierReturn.qty,
          note: nextNote || null,
          resolvedAt: resolvedAt.toISOString(),
        },
      })

      return true
    })

    if (!updated) return { success: false, error: "Retur supplier sudah selesai" }

    revalidateAfterSupplierReturnMutation(scope.storeId, supplierReturn.warrantyClaim?.repairOrderId)
    return { success: true }
  })
}
