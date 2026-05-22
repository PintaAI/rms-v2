"use server"

import prisma from "@/lib/prisma"
import { actionError, type ActionResult, type ActionResultWithData } from "@/lib/auth/authorization"
import { assertFeature, assertPermission, getRequestScope } from "@/lib/auth/request-scope"
import { revalidatePath } from "next/cache"
import { z } from "zod"

type SupplierPayableStatus = "unpaid" | "partial" | "paid"

export type SupplierOption = {
  id: string
  name: string
  phone: string | null
}

export type SupplierPayableListItem = {
  id: string
  supplierId: string
  supplierName: string
  invoiceNumber: string | null
  description: string | null
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  dueDate: Date | null
  status: SupplierPayableStatus
  paymentCount: number
  createdAt: Date
}

export type SupplierPayableListResult = {
  items: SupplierPayableListItem[]
  totalDebtAmount: number
  totalPaidAmount: number
  totalRemainingAmount: number
  activeDebtCount: number
}

const optionalDateSchema = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value),
  z.coerce.date().nullable()
)

const createSupplierSchema = z.object({
  storeId: z.string().min(1, "Toko wajib diisi"),
  name: z.string().trim().min(1, "Nama supplier wajib diisi"),
  phone: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  note: z.string().trim().optional().nullable(),
})

const createSupplierPayableSchema = z.object({
  storeId: z.string().min(1, "Toko wajib diisi"),
  supplierId: z.string().min(1, "Supplier wajib dipilih"),
  invoiceNumber: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  totalAmount: z.number().int("Total hutang harus berupa angka bulat"),
  paidAmount: z.number().int("Jumlah dibayar harus berupa angka bulat").optional(),
  dueDate: optionalDateSchema.optional(),
})

const updateSupplierPayableSchema = z.object({
  id: z.string().min(1, "Hutang supplier wajib dipilih"),
  supplierId: z.string().min(1, "Supplier wajib dipilih"),
  invoiceNumber: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  totalAmount: z.number().int("Total hutang harus berupa angka bulat"),
  dueDate: optionalDateSchema.optional(),
})

const addSupplierPayablePaymentSchema = z.object({
  payableId: z.string().min(1, "Hutang supplier wajib dipilih"),
  amount: z.number().int("Jumlah pembayaran harus berupa angka bulat"),
  paymentDate: optionalDateSchema.optional(),
  note: z.string().trim().optional().nullable(),
})

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>
export type CreateSupplierPayableInput = z.infer<typeof createSupplierPayableSchema>
export type UpdateSupplierPayableInput = z.infer<typeof updateSupplierPayableSchema>
export type AddSupplierPayablePaymentInput = z.infer<typeof addSupplierPayablePaymentSchema>

class SupplierPayableActionError extends Error {}

async function assertSupplierPayableAccess(storeId: string, permissionKey: Parameters<typeof assertPermission>[1]) {
  const scope = await getRequestScope(storeId)
  assertFeature(scope, "inventory.management")
  assertPermission(scope, permissionKey)
  return scope
}

function getSupplierPayableStatus(totalAmount: number, paidAmount: number): SupplierPayableStatus {
  if (paidAmount >= totalAmount) return "paid"
  if (paidAmount > 0) return "partial"
  return "unpaid"
}

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function validateSupplierPayableAmounts(totalAmount: number, paidAmount: number): void {
  if (totalAmount <= 0) throw new SupplierPayableActionError("Total hutang harus lebih dari 0")
  if (paidAmount < 0) throw new SupplierPayableActionError("Jumlah dibayar tidak boleh negatif")
  if (paidAmount > totalAmount) throw new SupplierPayableActionError("Jumlah dibayar tidak boleh melebihi total hutang")
}

function validateSupplierPayablePaymentAmount(amount: number, remainingAmount: number): void {
  if (amount <= 0) throw new SupplierPayableActionError("Jumlah pembayaran harus lebih dari 0")
  if (amount > remainingAmount) throw new SupplierPayableActionError("Jumlah pembayaran tidak boleh melebihi sisa hutang")
}

function revalidateSupplierPayablePaths(storeId: string) {
  revalidatePath(`/${storeId}/supplier-debts`)
}

async function getDebtTokoId(payableId: string) {
  const debt = await prisma.supplierPayable.findUnique({
    where: { id: payableId },
    select: { storeId: true },
  })

  if (!debt) throw new SupplierPayableActionError("Hutang supplier tidak ditemukan")
  return debt.storeId
}

function toSupplierPayableListItem(debt: {
  id: string
  supplierId: string
  invoiceNumber: string | null
  description: string | null
  totalAmount: number
  paidAmount: number
  dueDate: Date | null
  status: SupplierPayableStatus
  createdAt: Date
  supplier: { name: string }
  _count: { payments: number }
}): SupplierPayableListItem {
  return {
    id: debt.id,
    supplierId: debt.supplierId,
    supplierName: debt.supplier.name,
    invoiceNumber: debt.invoiceNumber,
    description: debt.description,
    totalAmount: debt.totalAmount,
    paidAmount: debt.paidAmount,
    remainingAmount: debt.totalAmount - debt.paidAmount,
    dueDate: debt.dueDate,
    status: debt.status,
    paymentCount: debt._count.payments,
    createdAt: debt.createdAt,
  }
}

async function assertSupplierBelongsToToko(supplierId: string, storeId: string): Promise<void> {
  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, storeId },
    select: { id: true },
  })

  if (!supplier) throw new SupplierPayableActionError("Supplier tidak ditemukan di toko ini")
}

export async function getSuppliers(storeId: string): Promise<ActionResultWithData<SupplierOption[]>> {
  try {
    await assertSupplierPayableAccess(storeId, "supplier_debts.view")

    const suppliers = await prisma.supplier.findMany({
      where: { storeId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true },
    })

    return { success: true, data: suppliers }
  } catch (error) {
    if (error instanceof SupplierPayableActionError) return { success: false, error: error.message }
    return actionError(error) as ActionResultWithData<SupplierOption[]>
  }
}

export async function createSupplier(input: CreateSupplierInput): Promise<ActionResultWithData<SupplierOption>> {
  try {
    const validated = createSupplierSchema.parse(input)
    await assertSupplierPayableAccess(validated.storeId, "supplier_debts.create")

    const existing = await prisma.supplier.findFirst({
      where: { storeId: validated.storeId, name: validated.name },
      select: { id: true },
    })

    if (existing) throw new SupplierPayableActionError("Nama supplier sudah digunakan di toko ini")

    const supplier = await prisma.supplier.create({
      data: {
        storeId: validated.storeId,
        name: validated.name,
        phone: normalizeOptionalText(validated.phone),
        address: normalizeOptionalText(validated.address),
        note: normalizeOptionalText(validated.note),
      },
      select: { id: true, name: true, phone: true },
    })

    revalidateSupplierPayablePaths(validated.storeId)

    return { success: true, data: supplier }
  } catch (error) {
    if (error instanceof z.ZodError) return { success: false, error: error.issues[0].message }
    if (error instanceof SupplierPayableActionError) return { success: false, error: error.message }
    return actionError(error) as ActionResultWithData<SupplierOption>
  }
}

export async function getSupplierPayables(storeId: string): Promise<ActionResultWithData<SupplierPayableListResult>> {
  try {
    await assertSupplierPayableAccess(storeId, "supplier_debts.view")

    const debts = await prisma.supplierPayable.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
      include: {
        supplier: { select: { name: true } },
        _count: { select: { payments: true } },
      },
    })

    const items = debts.map((debt) => toSupplierPayableListItem(debt))

    return {
      success: true,
      data: {
        items,
        totalDebtAmount: items.reduce((total, debt) => total + debt.totalAmount, 0),
        totalPaidAmount: items.reduce((total, debt) => total + debt.paidAmount, 0),
        totalRemainingAmount: items.reduce(
          (total, debt) => total + (debt.status === "paid" ? 0 : debt.remainingAmount),
          0
        ),
        activeDebtCount: items.filter((debt) => debt.status !== "paid" && debt.remainingAmount > 0).length,
      },
    }
  } catch (error) {
    if (error instanceof SupplierPayableActionError) return { success: false, error: error.message }
    return actionError(error) as ActionResultWithData<SupplierPayableListResult>
  }
}

export async function createSupplierPayable(input: CreateSupplierPayableInput): Promise<ActionResultWithData<SupplierPayableListItem>> {
  try {
    const validated = createSupplierPayableSchema.parse(input)
    await assertSupplierPayableAccess(validated.storeId, "supplier_debts.create")

    const paidAmount = validated.paidAmount ?? 0
    validateSupplierPayableAmounts(validated.totalAmount, paidAmount)
    await assertSupplierBelongsToToko(validated.supplierId, validated.storeId)

    const debt = await prisma.$transaction(async (tx) => {
      const createdDebt = await tx.supplierPayable.create({
        data: {
          storeId: validated.storeId,
          supplierId: validated.supplierId,
          invoiceNumber: normalizeOptionalText(validated.invoiceNumber),
          description: normalizeOptionalText(validated.description),
          totalAmount: validated.totalAmount,
          paidAmount,
          dueDate: validated.dueDate ?? null,
          status: getSupplierPayableStatus(validated.totalAmount, paidAmount),
          payments: paidAmount > 0
            ? {
                create: {
                  amount: paidAmount,
                  note: "Pembayaran awal",
                },
              }
            : undefined,
        },
        include: {
          supplier: { select: { name: true } },
          _count: { select: { payments: true } },
        },
      })

      return createdDebt
    })

    revalidateSupplierPayablePaths(validated.storeId)

    return { success: true, data: toSupplierPayableListItem(debt) }
  } catch (error) {
    if (error instanceof z.ZodError) return { success: false, error: error.issues[0].message }
    if (error instanceof SupplierPayableActionError) return { success: false, error: error.message }
    return actionError(error) as ActionResultWithData<SupplierPayableListItem>
  }
}

export async function updateSupplierPayable(input: UpdateSupplierPayableInput): Promise<ActionResultWithData<SupplierPayableListItem>> {
  try {
    const validated = updateSupplierPayableSchema.parse(input)
    const storeId = await getDebtTokoId(validated.id)
    await assertSupplierPayableAccess(storeId, "supplier_debts.update")
    await assertSupplierBelongsToToko(validated.supplierId, storeId)

    const debt = await prisma.$transaction(async (tx) => {
      const existingDebt = await tx.supplierPayable.findUnique({
        where: { id: validated.id },
        select: { paidAmount: true },
      })

      if (!existingDebt) throw new SupplierPayableActionError("Hutang supplier tidak ditemukan")
      validateSupplierPayableAmounts(validated.totalAmount, existingDebt.paidAmount)

      return tx.supplierPayable.update({
        where: { id: validated.id },
        data: {
          supplierId: validated.supplierId,
          invoiceNumber: normalizeOptionalText(validated.invoiceNumber),
          description: normalizeOptionalText(validated.description),
          totalAmount: validated.totalAmount,
          dueDate: validated.dueDate ?? null,
          status: getSupplierPayableStatus(validated.totalAmount, existingDebt.paidAmount),
        },
        include: {
          supplier: { select: { name: true } },
          _count: { select: { payments: true } },
        },
      })
    })

    revalidateSupplierPayablePaths(storeId)

    return { success: true, data: toSupplierPayableListItem(debt) }
  } catch (error) {
    if (error instanceof z.ZodError) return { success: false, error: error.issues[0].message }
    if (error instanceof SupplierPayableActionError) return { success: false, error: error.message }
    return actionError(error) as ActionResultWithData<SupplierPayableListItem>
  }
}

export async function deleteSupplierPayable(id: string): Promise<ActionResult> {
  try {
    const storeId = await getDebtTokoId(id)
    await assertSupplierPayableAccess(storeId, "supplier_debts.delete")

    const debt = await prisma.supplierPayable.findUnique({
      where: { id },
      select: { _count: { select: { payments: true } } },
    })

    if (!debt) throw new SupplierPayableActionError("Hutang supplier tidak ditemukan")
    if (debt._count.payments > 0) throw new SupplierPayableActionError("Hutang dengan riwayat pembayaran tidak dapat dihapus")

    await prisma.supplierPayable.delete({ where: { id } })
    revalidateSupplierPayablePaths(storeId)

    return { success: true }
  } catch (error) {
    if (error instanceof SupplierPayableActionError) return { success: false, error: error.message }
    return actionError(error)
  }
}

export async function addSupplierPayablePayment(input: AddSupplierPayablePaymentInput): Promise<ActionResultWithData<SupplierPayableListItem>> {
  try {
    const validated = addSupplierPayablePaymentSchema.parse(input)
    const storeId = await getDebtTokoId(validated.payableId)
    await assertSupplierPayableAccess(storeId, "supplier_debts.pay")

    const debt = await prisma.$transaction(async (tx) => {
      const existingDebt = await tx.supplierPayable.findUnique({
        where: { id: validated.payableId },
        select: {
          id: true,
          totalAmount: true,
          paidAmount: true,
          status: true,
        },
      })

      if (!existingDebt) throw new SupplierPayableActionError("Hutang supplier tidak ditemukan")
      if (existingDebt.status === "paid") throw new SupplierPayableActionError("Hutang supplier sudah lunas")

      const remainingAmount = existingDebt.totalAmount - existingDebt.paidAmount
      validateSupplierPayablePaymentAmount(validated.amount, remainingAmount)

      const nextPaidAmount = existingDebt.paidAmount + validated.amount

      await tx.supplierPayablePayment.create({
        data: {
          payableId: validated.payableId,
          amount: validated.amount,
          paymentDate: validated.paymentDate ?? new Date(),
          note: normalizeOptionalText(validated.note),
        },
      })

      return tx.supplierPayable.update({
        where: { id: validated.payableId },
        data: {
          paidAmount: nextPaidAmount,
          status: getSupplierPayableStatus(existingDebt.totalAmount, nextPaidAmount),
        },
        include: {
          supplier: { select: { name: true } },
          _count: { select: { payments: true } },
        },
      })
    })

    revalidateSupplierPayablePaths(storeId)

    return { success: true, data: toSupplierPayableListItem(debt) }
  } catch (error) {
    if (error instanceof z.ZodError) return { success: false, error: error.issues[0].message }
    if (error instanceof SupplierPayableActionError) return { success: false, error: error.message }
    return actionError(error) as ActionResultWithData<SupplierPayableListItem>
  }
}
