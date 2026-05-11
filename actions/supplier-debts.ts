"use server"

import prisma from "@/lib/prisma"
import { actionError, type ActionResult, type ActionResultWithData } from "@/lib/auth/authorization"
import { assertFeature, assertRole, getRequestScope } from "@/lib/auth/request-scope"
import { revalidatePath } from "next/cache"
import { z } from "zod"

type SupplierDebtStatus = "unpaid" | "partial" | "paid"

export type SupplierOption = {
  id: string
  name: string
  phone: string | null
}

export type SupplierDebtListItem = {
  id: string
  supplierId: string
  supplierName: string
  invoiceNumber: string | null
  description: string | null
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  dueDate: Date | null
  status: SupplierDebtStatus
  paymentCount: number
  createdAt: Date
}

export type SupplierDebtListResult = {
  items: SupplierDebtListItem[]
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
  tokoId: z.string().min(1, "Toko wajib diisi"),
  name: z.string().trim().min(1, "Nama supplier wajib diisi"),
  phone: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  note: z.string().trim().optional().nullable(),
})

const createSupplierDebtSchema = z.object({
  tokoId: z.string().min(1, "Toko wajib diisi"),
  supplierId: z.string().min(1, "Supplier wajib dipilih"),
  invoiceNumber: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  totalAmount: z.number().int("Total hutang harus berupa angka bulat"),
  paidAmount: z.number().int("Jumlah dibayar harus berupa angka bulat").optional(),
  dueDate: optionalDateSchema.optional(),
})

const updateSupplierDebtSchema = z.object({
  id: z.string().min(1, "Hutang supplier wajib dipilih"),
  supplierId: z.string().min(1, "Supplier wajib dipilih"),
  invoiceNumber: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  totalAmount: z.number().int("Total hutang harus berupa angka bulat"),
  dueDate: optionalDateSchema.optional(),
})

const addSupplierDebtPaymentSchema = z.object({
  debtId: z.string().min(1, "Hutang supplier wajib dipilih"),
  amount: z.number().int("Jumlah pembayaran harus berupa angka bulat"),
  paymentDate: optionalDateSchema.optional(),
  note: z.string().trim().optional().nullable(),
})

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>
export type CreateSupplierDebtInput = z.infer<typeof createSupplierDebtSchema>
export type UpdateSupplierDebtInput = z.infer<typeof updateSupplierDebtSchema>
export type AddSupplierDebtPaymentInput = z.infer<typeof addSupplierDebtPaymentSchema>

class SupplierDebtActionError extends Error {}

async function assertSupplierDebtAccess(tokoId: string) {
  const scope = await getRequestScope(tokoId)
  assertRole(scope, ["admin"])
  assertFeature(scope, "inventory.management")
  return scope
}

function getSupplierDebtStatus(totalAmount: number, paidAmount: number): SupplierDebtStatus {
  if (paidAmount >= totalAmount) return "paid"
  if (paidAmount > 0) return "partial"
  return "unpaid"
}

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function validateSupplierDebtAmounts(totalAmount: number, paidAmount: number): void {
  if (totalAmount <= 0) throw new SupplierDebtActionError("Total hutang harus lebih dari 0")
  if (paidAmount < 0) throw new SupplierDebtActionError("Jumlah dibayar tidak boleh negatif")
  if (paidAmount > totalAmount) throw new SupplierDebtActionError("Jumlah dibayar tidak boleh melebihi total hutang")
}

function validateSupplierDebtPaymentAmount(amount: number, remainingAmount: number): void {
  if (amount <= 0) throw new SupplierDebtActionError("Jumlah pembayaran harus lebih dari 0")
  if (amount > remainingAmount) throw new SupplierDebtActionError("Jumlah pembayaran tidak boleh melebihi sisa hutang")
}

function revalidateSupplierDebtPaths(tokoId: string) {
  revalidatePath(`/${tokoId}/admin/supplier-debts`)
}

async function getDebtTokoId(debtId: string) {
  const debt = await prisma.supplierDebt.findUnique({
    where: { id: debtId },
    select: { tokoId: true },
  })

  if (!debt) throw new SupplierDebtActionError("Hutang supplier tidak ditemukan")
  return debt.tokoId
}

function toSupplierDebtListItem(debt: {
  id: string
  supplierId: string
  invoiceNumber: string | null
  description: string | null
  totalAmount: number
  paidAmount: number
  dueDate: Date | null
  status: SupplierDebtStatus
  createdAt: Date
  supplier: { name: string }
  _count: { payments: number }
}): SupplierDebtListItem {
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

async function assertSupplierBelongsToToko(supplierId: string, tokoId: string): Promise<void> {
  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, tokoId },
    select: { id: true },
  })

  if (!supplier) throw new SupplierDebtActionError("Supplier tidak ditemukan di toko ini")
}

export async function getSuppliers(tokoId: string): Promise<ActionResultWithData<SupplierOption[]>> {
  try {
    await assertSupplierDebtAccess(tokoId)

    const suppliers = await prisma.supplier.findMany({
      where: { tokoId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true },
    })

    return { success: true, data: suppliers }
  } catch (error) {
    if (error instanceof SupplierDebtActionError) return { success: false, error: error.message }
    return actionError(error) as ActionResultWithData<SupplierOption[]>
  }
}

export async function createSupplier(input: CreateSupplierInput): Promise<ActionResultWithData<SupplierOption>> {
  try {
    const validated = createSupplierSchema.parse(input)
    await assertSupplierDebtAccess(validated.tokoId)

    const existing = await prisma.supplier.findFirst({
      where: { tokoId: validated.tokoId, name: validated.name },
      select: { id: true },
    })

    if (existing) throw new SupplierDebtActionError("Nama supplier sudah digunakan di toko ini")

    const supplier = await prisma.supplier.create({
      data: {
        tokoId: validated.tokoId,
        name: validated.name,
        phone: normalizeOptionalText(validated.phone),
        address: normalizeOptionalText(validated.address),
        note: normalizeOptionalText(validated.note),
      },
      select: { id: true, name: true, phone: true },
    })

    revalidateSupplierDebtPaths(validated.tokoId)

    return { success: true, data: supplier }
  } catch (error) {
    if (error instanceof z.ZodError) return { success: false, error: error.issues[0].message }
    if (error instanceof SupplierDebtActionError) return { success: false, error: error.message }
    return actionError(error) as ActionResultWithData<SupplierOption>
  }
}

export async function getSupplierDebts(tokoId: string): Promise<ActionResultWithData<SupplierDebtListResult>> {
  try {
    await assertSupplierDebtAccess(tokoId)

    const debts = await prisma.supplierDebt.findMany({
      where: { tokoId },
      orderBy: { createdAt: "desc" },
      include: {
        supplier: { select: { name: true } },
        _count: { select: { payments: true } },
      },
    })

    const items = debts.map((debt) => toSupplierDebtListItem(debt))

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
    if (error instanceof SupplierDebtActionError) return { success: false, error: error.message }
    return actionError(error) as ActionResultWithData<SupplierDebtListResult>
  }
}

export async function createSupplierDebt(input: CreateSupplierDebtInput): Promise<ActionResultWithData<SupplierDebtListItem>> {
  try {
    const validated = createSupplierDebtSchema.parse(input)
    await assertSupplierDebtAccess(validated.tokoId)

    const paidAmount = validated.paidAmount ?? 0
    validateSupplierDebtAmounts(validated.totalAmount, paidAmount)
    await assertSupplierBelongsToToko(validated.supplierId, validated.tokoId)

    const debt = await prisma.$transaction(async (tx) => {
      const createdDebt = await tx.supplierDebt.create({
        data: {
          tokoId: validated.tokoId,
          supplierId: validated.supplierId,
          invoiceNumber: normalizeOptionalText(validated.invoiceNumber),
          description: normalizeOptionalText(validated.description),
          totalAmount: validated.totalAmount,
          paidAmount,
          dueDate: validated.dueDate ?? null,
          status: getSupplierDebtStatus(validated.totalAmount, paidAmount),
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

    revalidateSupplierDebtPaths(validated.tokoId)

    return { success: true, data: toSupplierDebtListItem(debt) }
  } catch (error) {
    if (error instanceof z.ZodError) return { success: false, error: error.issues[0].message }
    if (error instanceof SupplierDebtActionError) return { success: false, error: error.message }
    return actionError(error) as ActionResultWithData<SupplierDebtListItem>
  }
}

export async function updateSupplierDebt(input: UpdateSupplierDebtInput): Promise<ActionResultWithData<SupplierDebtListItem>> {
  try {
    const validated = updateSupplierDebtSchema.parse(input)
    const tokoId = await getDebtTokoId(validated.id)
    await assertSupplierDebtAccess(tokoId)
    await assertSupplierBelongsToToko(validated.supplierId, tokoId)

    const debt = await prisma.$transaction(async (tx) => {
      const existingDebt = await tx.supplierDebt.findUnique({
        where: { id: validated.id },
        select: { paidAmount: true },
      })

      if (!existingDebt) throw new SupplierDebtActionError("Hutang supplier tidak ditemukan")
      validateSupplierDebtAmounts(validated.totalAmount, existingDebt.paidAmount)

      return tx.supplierDebt.update({
        where: { id: validated.id },
        data: {
          supplierId: validated.supplierId,
          invoiceNumber: normalizeOptionalText(validated.invoiceNumber),
          description: normalizeOptionalText(validated.description),
          totalAmount: validated.totalAmount,
          dueDate: validated.dueDate ?? null,
          status: getSupplierDebtStatus(validated.totalAmount, existingDebt.paidAmount),
        },
        include: {
          supplier: { select: { name: true } },
          _count: { select: { payments: true } },
        },
      })
    })

    revalidateSupplierDebtPaths(tokoId)

    return { success: true, data: toSupplierDebtListItem(debt) }
  } catch (error) {
    if (error instanceof z.ZodError) return { success: false, error: error.issues[0].message }
    if (error instanceof SupplierDebtActionError) return { success: false, error: error.message }
    return actionError(error) as ActionResultWithData<SupplierDebtListItem>
  }
}

export async function deleteSupplierDebt(id: string): Promise<ActionResult> {
  try {
    const tokoId = await getDebtTokoId(id)
    await assertSupplierDebtAccess(tokoId)

    const debt = await prisma.supplierDebt.findUnique({
      where: { id },
      select: { _count: { select: { payments: true } } },
    })

    if (!debt) throw new SupplierDebtActionError("Hutang supplier tidak ditemukan")
    if (debt._count.payments > 0) throw new SupplierDebtActionError("Hutang dengan riwayat pembayaran tidak dapat dihapus")

    await prisma.supplierDebt.delete({ where: { id } })
    revalidateSupplierDebtPaths(tokoId)

    return { success: true }
  } catch (error) {
    if (error instanceof SupplierDebtActionError) return { success: false, error: error.message }
    return actionError(error)
  }
}

export async function addSupplierDebtPayment(input: AddSupplierDebtPaymentInput): Promise<ActionResultWithData<SupplierDebtListItem>> {
  try {
    const validated = addSupplierDebtPaymentSchema.parse(input)
    const tokoId = await getDebtTokoId(validated.debtId)
    await assertSupplierDebtAccess(tokoId)

    const debt = await prisma.$transaction(async (tx) => {
      const existingDebt = await tx.supplierDebt.findUnique({
        where: { id: validated.debtId },
        select: {
          id: true,
          totalAmount: true,
          paidAmount: true,
          status: true,
        },
      })

      if (!existingDebt) throw new SupplierDebtActionError("Hutang supplier tidak ditemukan")
      if (existingDebt.status === "paid") throw new SupplierDebtActionError("Hutang supplier sudah lunas")

      const remainingAmount = existingDebt.totalAmount - existingDebt.paidAmount
      validateSupplierDebtPaymentAmount(validated.amount, remainingAmount)

      const nextPaidAmount = existingDebt.paidAmount + validated.amount

      await tx.supplierDebtPayment.create({
        data: {
          debtId: validated.debtId,
          amount: validated.amount,
          paymentDate: validated.paymentDate ?? new Date(),
          note: normalizeOptionalText(validated.note),
        },
      })

      return tx.supplierDebt.update({
        where: { id: validated.debtId },
        data: {
          paidAmount: nextPaidAmount,
          status: getSupplierDebtStatus(existingDebt.totalAmount, nextPaidAmount),
        },
        include: {
          supplier: { select: { name: true } },
          _count: { select: { payments: true } },
        },
      })
    })

    revalidateSupplierDebtPaths(tokoId)

    return { success: true, data: toSupplierDebtListItem(debt) }
  } catch (error) {
    if (error instanceof z.ZodError) return { success: false, error: error.issues[0].message }
    if (error instanceof SupplierDebtActionError) return { success: false, error: error.message }
    return actionError(error) as ActionResultWithData<SupplierDebtListItem>
  }
}
