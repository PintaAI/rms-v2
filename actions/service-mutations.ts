"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { createActivityLog, preserveDeletedServiceActivityLogs } from "@/lib/activity-log";
import { ensureMonthlyActivityLimit } from "@/lib/auth/enforcement";
import { revalidateServicePaths } from "@/lib/revalidation";
import { sendRepairOrderStatusWhatsappNotification } from "@/lib/service-whatsapp-notifications";
import { syncWhatsappIdentityFromPhone } from "@/lib/whatsapp-identity";
import { validateIndonesianWhatsappNumber } from "@/lib/whatsapp-number";
import { getRequestUser } from "@/lib/auth/request-user";
import { withScope } from "@/lib/auth/wrapper";
import { AuthError } from "@/lib/auth/authorization";
import { assertFeature, assertPermission, type RequestScope } from "@/lib/auth/request-scope";
import type { RepairOrderStatus } from "@/prisma/generated/prisma/enums";
import type { Prisma } from "@/prisma/generated/prisma/client";
import {
  getStatusActivityTitle,
  isCompletingStatus,
  isTechnicianRole,
  technicianAvailableStatuses,
  updateInvoiceTotal,
} from "./service-shared";
import type { ActionResult, ActionResultWithData } from "./service-types";

async function promoteServiceOnFirstItem(
  tx: Prisma.TransactionClient,
  repairOrderId: string,
  currentStatus: string,
  currentTechnicianId: string | null,
  userId: string,
  actorTechnicianId: string | null,
  storeId: string,
) {
  if (currentStatus === "received") {
    await tx.repairOrder.update({
      where: { id: repairOrderId },
      data: {
        status: "repairing",
        ...(actorTechnicianId && currentTechnicianId !== actorTechnicianId ? { technicianId: actorTechnicianId, assignedAt: new Date() } : {}),
      },
    });
    await createActivityLog(tx, {
      storeId, userId, repairOrderId,
      type: "service_status_changed", title: getStatusActivityTitle("repairing"),
      payload: { previousStatus: "received", nextStatus: "repairing", reason: "First repair item added" },
    });
  } else if (actorTechnicianId && currentTechnicianId !== actorTechnicianId) {
    await tx.repairOrder.update({
      where: { id: repairOrderId },
      data: { technicianId: actorTechnicianId, assignedAt: new Date() },
    });
  }
}

const createServiceSchema = z.object({
  deviceModelId: z.string().min(1),
  customerName: z.string().optional(),
  noWa: z.string().trim().optional().refine((value) => !value || validateIndonesianWhatsappNumber(value).valid, {
    message: "Format WhatsApp harus nomor Indonesia aktif, contoh 08123456789 atau 6281234567890",
  }),
  complaint: z.string().min(1),
  handlingNote: z.string().optional(),
  includedItems: z.array(z.string()).optional(),
  passwordPattern: z.string().optional(),
  imei: z.string().optional(),
  dpAmount: z.number().int().min(0).optional(),
});

const updateServiceSchema = createServiceSchema;

const addItemSchema = z.object({
  repairOrderId: z.string(),
  type: z.enum(["inventory_item", "service_catalog_item"]),
  inventoryItemId: z.string().optional(),
  serviceCatalogItemId: z.string().optional(),
  name: z.string().min(1),
  qty: z.number().int().min(1),
  price: z.number().int().min(0),
});

const payInvoiceSchema = z.object({
  discountAmount: z.number().int().min(0).optional(),
  paymentMethod: z.enum(["cash", "transfer", "qris", "debit"]).optional(),
});

async function assertInvoiceMutationPermissions(scope: RequestScope, repairOrderId: string): Promise<void> {
  assertPermission(scope, "service.manageItems");
  assertPermission(scope, "service.manageInvoice");

  const invoice = await prisma.repairInvoice.findUnique({
    where: { repairOrderId },
    select: { id: true },
  });

  if (!invoice) {
    assertPermission(scope, "service.createInvoice");
  }
}

async function updateInvoiceIfAllowed(scope: RequestScope, repairOrderId: string): Promise<void> {
  const limitError = await ensureMonthlyActivityLimit(scope.user, "maxInvoicesMonthly", "invoice_created", scope.storeId);
  if (limitError) throw new Error(limitError.error);

  const invoiceResult = await updateInvoiceTotal(repairOrderId);

  if (invoiceResult.created) {
    await createActivityLog(prisma, {
      storeId: scope.storeId,
      userId: scope.user.id,
      repairOrderId,
      type: "invoice_created",
      title: "Invoice created",
    });
  }
}

export async function createService(
  data: z.infer<typeof createServiceSchema>,
  storeId?: string
): Promise<ActionResultWithData<{ id: string }>> {
  const validated = createServiceSchema.safeParse(data);
  if (!validated.success) return { success: false, error: validated.error.issues[0].message };

  if (!storeId) {
    const user = await getRequestUser();
    if (!user) return { success: false, error: "Tidak memiliki akses" };
    storeId = user.storeIds[0];
    if (!storeId) return { success: false, error: "Toko tidak ditemukan" };
  }

  return withScope(storeId, {}, async (scope) => {
    assertPermission(scope, "service.create");
    if (validated.data.dpAmount && validated.data.dpAmount > 0) {
      assertPermission(scope, "service.createInvoice");
      assertPermission(scope, "service.manageInvoice");
    }

    const limitError = await ensureMonthlyActivityLimit(scope.user, "maxServicesMonthly", "service_created", scope.storeId);
    if (limitError) throw new Error(limitError.error);

    const deviceModel = await prisma.deviceModel.findUnique({
      where: { id: validated.data.deviceModelId },
    });
    if (!deviceModel) throw new Error("Device not found");
    const noWa = validated.data.noWa ?? "";

    const service = await prisma.$transaction(async (tx) => {
      const createdService = await tx.repairOrder.create({
        data: {
          storeId: scope.storeId,
          deviceModelId: validated.data.deviceModelId,
          createdById: scope.user.id,
          customerName: validated.data.customerName || null,
          noWa,
          complaint: validated.data.complaint,
          handlingNote: validated.data.handlingNote || null,
          includedItems: validated.data.includedItems || undefined,
          passwordPattern: validated.data.passwordPattern || null,
          imei: validated.data.imei || null,
          status: "received",
        },
        select: { id: true },
      });

      if (validated.data.dpAmount && validated.data.dpAmount > 0) {
        await tx.repairInvoice.create({
          data: {
            repairOrderId: createdService.id,
            grandTotal: 0,
            paymentStatus: "dp",
            dpAmount: validated.data.dpAmount,
          },
        });

        await createActivityLog(tx, {
          storeId: scope.storeId,
          userId: scope.user.id,
          repairOrderId: createdService.id,
          type: "invoice_dp",
          title: "Invoice marked as DP",
          payload: { dpAmount: validated.data.dpAmount },
        });
      }

      await createActivityLog(tx, {
        storeId: scope.storeId,
        userId: scope.user.id,
        repairOrderId: createdService.id,
        type: "service_created",
        title: "Service created",
        payload: {
          deviceModelId: validated.data.deviceModelId,
          customerName: validated.data.customerName || null,
          noWa,
          complaint: validated.data.complaint,
          handlingNote: validated.data.handlingNote || null,
          includedItems: validated.data.includedItems || undefined,
        },
      });

      return createdService;
    });

    revalidateServicePaths(scope.storeId);

    if (noWa) {
      syncWhatsappIdentityFromPhone({
        storeId: scope.storeId,
        phoneNumber: noWa,
        displayName: validated.data.customerName || null,
      }).catch((error) => console.warn("[WhatsApp:identity.serviceCreate]", error));
    }

    return { id: service.id };
  });
}

export async function updateService(
  repairOrderId: string,
  data: z.infer<typeof updateServiceSchema>
): Promise<ActionResult> {
  const validated = updateServiceSchema.safeParse(data);
  if (!validated.success) return { success: false, error: validated.error.issues[0].message };

  const service = await prisma.repairOrder.findUnique({
    where: { id: repairOrderId },
    select: { storeId: true, isPickedUp: true },
  });
  if (!service) return { success: false, error: "Service tidak ditemukan" };
  if (service.isPickedUp) return { success: false, error: "Tidak dapat memperbarui service yang sudah diambil" };

  return withScope(service.storeId, {}, async (scope) => {
    assertPermission(scope, "service.update");

    const deviceModel = await prisma.deviceModel.findUnique({
      where: { id: validated.data.deviceModelId },
    });
    if (!deviceModel) throw new Error("Device not found");
    const noWa = validated.data.noWa ?? "";

    await prisma.$transaction(async (tx) => {
      await tx.repairOrder.update({
        where: { id: repairOrderId },
        data: {
          deviceModelId: validated.data.deviceModelId,
          customerName: validated.data.customerName || null,
          noWa,
          complaint: validated.data.complaint,
          handlingNote: validated.data.handlingNote || null,
          includedItems: validated.data.includedItems || undefined,
          passwordPattern: validated.data.passwordPattern || null,
          imei: validated.data.imei || null,
        },
      });

      if (validated.data.dpAmount && validated.data.dpAmount > 0) {
        assertPermission(scope, "service.manageInvoice");
        const existingInvoice = await tx.repairInvoice.findUnique({
          where: { repairOrderId },
          select: { id: true },
        });

        if (!existingInvoice) {
          assertPermission(scope, "service.createInvoice");
        }

        if (existingInvoice) {
          await tx.repairInvoice.update({
            where: { repairOrderId },
            data: { dpAmount: validated.data.dpAmount, paymentStatus: "dp" },
          });
        } else {
          await tx.repairInvoice.create({
            data: {
              repairOrderId,
              grandTotal: 0,
              paymentStatus: "dp",
              dpAmount: validated.data.dpAmount,
            },
          });
        }

        await createActivityLog(tx, {
          storeId: scope.storeId,
          userId: scope.user.id,
          repairOrderId,
          type: "invoice_dp",
          title: "Invoice marked as DP",
          payload: { dpAmount: validated.data.dpAmount },
        });
      }

      await createActivityLog(tx, {
        storeId: scope.storeId,
        userId: scope.user.id,
        repairOrderId,
        type: "service_updated",
        title: "Service details updated",
        payload: {
          deviceModelId: validated.data.deviceModelId,
          customerName: validated.data.customerName || null,
          noWa,
          complaint: validated.data.complaint,
          handlingNote: validated.data.handlingNote || null,
          includedItems: validated.data.includedItems || undefined,
          imei: validated.data.imei || null,
          hasPasswordPattern: Boolean(validated.data.passwordPattern),
        },
      });
    });

    revalidateServicePaths(scope.storeId);

    if (noWa) {
      syncWhatsappIdentityFromPhone({
        storeId: scope.storeId,
        phoneNumber: noWa,
        displayName: validated.data.customerName || null,
      }).catch((error) => console.warn("[WhatsApp:identity.serviceUpdate]", error));
    }

    return { success: true };
  });
}

export async function deleteService(repairOrderId: string): Promise<ActionResult> {
  const service = await prisma.repairOrder.findUnique({
    where: { id: repairOrderId },
    select: {
      id: true, storeId: true, customerName: true, noWa: true, complaint: true, handlingNote: true, status: true, isPickedUp: true, imei: true, note: true,
      deviceModel: { select: { id: true, modelName: true, brand: { select: { name: true } } } },
      invoice: { select: { paymentStatus: true } },
    },
  });
  if (!service) return { success: false, error: "Service tidak ditemukan" };
  if (service.isPickedUp) return { success: false, error: "Tidak dapat menghapus service yang sudah diambil" };
  if (service.invoice?.paymentStatus === "paid" || service.invoice?.paymentStatus === "dp") {
    return { success: false, error: "Tidak dapat menghapus service dengan invoice lunas" };
  }

  return withScope(service.storeId, {}, async (scope) => {
    assertPermission(scope, "service.delete");

    const serviceItems = await prisma.repairOrderItem.findMany({
      where: { repairOrderId },
      select: {
        id: true,
        type: true,
        qty: true,
        referenceId: true,
        inventoryItem: { select: { stock: true, purchasePrice: true, defaultPrice: true } },
      },
    });

    await prisma.$transaction(async (tx) => {
      await createActivityLog(tx, {
        storeId: service.storeId,
        userId: scope.user.id,
        repairOrderId,
        type: "service_deleted",
        title: "Service deleted",
      });

      await preserveDeletedServiceActivityLogs(tx, repairOrderId, service);

      for (const item of serviceItems) {
        if (item.type === "inventory_item" && item.referenceId && item.inventoryItem) {
          const updatedSparepart = await tx.inventoryItem.update({
            where: { id: item.referenceId },
            data: { stock: { increment: item.qty } },
          });

          await tx.inventoryMovement.create({
            data: {
              storeId: service.storeId,
              inventoryItemId: item.referenceId,
              type: "repair_delete_return",
              qtyChange: item.qty,
              stockBefore: updatedSparepart.stock - item.qty,
              stockAfter: updatedSparepart.stock,
              unitCostSnapshot: item.inventoryItem.purchasePrice,
              unitPriceSnapshot: item.inventoryItem.defaultPrice,
              referenceType: "service",
              referenceId: repairOrderId,
              note: "Service deleted, stock returned",
              createdById: scope.user.id,
            },
          });
        }
      }

      await tx.repairOrderItem.deleteMany({ where: { repairOrderId } });
      await tx.repairInvoice.deleteMany({ where: { repairOrderId } });
      await tx.repairOrder.delete({ where: { id: repairOrderId } });
    });

    revalidateServicePaths(service.storeId);

    return { success: true };
  });
}

export async function takeService(repairOrderId: string): Promise<ActionResult> {
  const service = await prisma.repairOrder.findUnique({
    where: { id: repairOrderId },
    select: { storeId: true, status: true, technicianId: true },
  });
  if (!service) return { success: false, error: "Service tidak ditemukan" };
  if (!technicianAvailableStatuses.includes(service.status)) {
    return { success: false, error: "Service tidak tersedia untuk diambil alih" };
  }

  return withScope(service.storeId, { feature: "technician.workflow" }, async (scope) => {
    assertPermission(scope, "service.takeOverTask");

    if (service.technicianId === scope.user.id) {
      return { success: false, error: "Service sudah ditugaskan kepada Anda" };
    }

    const assignedAt = new Date();
    const nextStatus = service.status === "received" && !service.technicianId ? "repairing" : service.status;

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.repairOrder.updateMany({
        where: {
          id: repairOrderId,
          storeId: scope.storeId,
          status: service.status,
          technicianId: service.technicianId,
        },
        data: {
          technicianId: scope.user.id,
          status: service.status === "received" && !service.technicianId ? "repairing" : undefined,
          assignedAt,
        },
      });

      if (result.count !== 1) return false;

      await createActivityLog(tx, {
        storeId: scope.storeId,
        userId: scope.user.id,
        repairOrderId,
        type: "service_taken_over",
        title: "Service taken over by technician",
        payload: {
          technicianId: scope.user.id,
          previousTechnicianId: service.technicianId,
          previousStatus: service.status,
          nextStatus,
          assignedAt: assignedAt.toISOString(),
        },
      });

      return true;
    });

    if (!updated) throw new Error("Service sudah tidak tersedia untuk diambil alih");

    revalidateServicePaths(scope.storeId, true);

    return { success: true };
  });
}

export async function updateStatus(
  repairOrderId: string,
  status: RepairOrderStatus,
  note?: string,
  warrantyUntil?: Date | null,
  options?: { takeOwnership?: boolean }
): Promise<ActionResult> {
  const service = await prisma.repairOrder.findUnique({
    where: { id: repairOrderId },
    select: { storeId: true, technicianId: true, status: true, isPickedUp: true, invoice: { select: { paymentStatus: true } } },
  });
  if (!service) return { success: false, error: "Service tidak ditemukan" };
  if (service.isPickedUp) return { success: false, error: "Tidak dapat memperbarui service yang sudah diambil" };

  const isUndoingCompletedStatus = isCompletingStatus(service.status) && !isCompletingStatus(status);
  if (isUndoingCompletedStatus && service.invoice?.paymentStatus === "paid") {
    return { success: false, error: "Tidak dapat mengembalikan status untuk invoice lunas" };
  }

  const warrantyDate = status === "done" && warrantyUntil ? new Date(warrantyUntil) : null;
  if (warrantyDate && Number.isNaN(warrantyDate.getTime())) {
    return { success: false, error: "Tanggal garansi tidak valid" };
  }

  return withScope(service.storeId, {}, async (scope) => {
    assertPermission(scope, "service.updateStatus");

    if (isTechnicianRole(scope.user.role) && service.technicianId !== scope.user.id) {
      throw new Error("Access denied");
    }

    const changedAt = new Date();

    const isCompleting = isCompletingStatus(status);
    const shouldAssignActor =
      isCompleting &&
      (isTechnicianRole(scope.user.role) ||
        (scope.user.role === "admin" && options?.takeOwnership === true && (!service.technicianId || status === "done")));

    if (isCompleting && scope.user.role === "admin" && !service.technicianId && !options?.takeOwnership) {
      return {
        success: false,
        error: "Service belum memiliki penanggung jawab. Centang konfirmasi bahwa Anda yang menangani service ini.",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.repairOrder.update({
        where: { id: repairOrderId },
        data: {
          status,
          doneAt: isCompleting ? changedAt : null,
          warrantyUntil: status === "done" ? warrantyDate : null,
          ...(note !== undefined ? { note } : {}),
          ...(shouldAssignActor
            ? { technicianId: scope.user.id, assignedAt: changedAt }
            : {}),
        },
      });

      await createActivityLog(tx, {
        storeId: scope.storeId,
        userId: scope.user.id,
        repairOrderId,
        type: "service_status_changed",
        title: getStatusActivityTitle(status),
        payload: {
          previousStatus: service.status,
          nextStatus: status,
          previousTechnicianId: service.technicianId,
          note: note ?? null,
          warrantyUntil: warrantyDate?.toISOString() ?? null,
          assignedActor: shouldAssignActor,
          technicianId: shouldAssignActor ? scope.user.id : service.technicianId,
        },
      });
    });

    if (isCompleting) {
      await updateInvoiceTotal(repairOrderId);
      await sendRepairOrderStatusWhatsappNotification({ repairOrderId, status });
    }

    revalidateServicePaths(scope.storeId, true);

    return { success: true };
  });
}

export async function pickupService(repairOrderId: string): Promise<ActionResult> {
  const service = await prisma.repairOrder.findUnique({
    where: { id: repairOrderId },
    select: { storeId: true, status: true, isPickedUp: true },
  });
  if (!service) return { success: false, error: "Service tidak ditemukan" };
  if (service.isPickedUp) return { success: false, error: "Service sudah diambil" };
  if (service.status !== "done" && service.status !== "failed") {
    return { success: false, error: "Hanya service selesai yang dapat ditandai diambil" };
  }

  return withScope(service.storeId, {}, async (scope) => {
    assertPermission(scope, "service.pickup");

    const pickedUpAt = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.repairOrder.update({
        where: { id: repairOrderId },
        data: { isPickedUp: true, checkoutAt: pickedUpAt },
      });

      await createActivityLog(tx, {
        storeId: scope.storeId,
        userId: scope.user.id,
        repairOrderId,
        type: "service_status_changed",
        title: getStatusActivityTitle("picked_up"),
        payload: {
          previousStatus: service.status,
          nextStatus: service.status,
          isPickedUp: true,
          checkoutAt: pickedUpAt.toISOString(),
        },
      });
    });

    revalidateServicePaths(scope.storeId);

    return { success: true };
  });
}

export async function assignTechnician(
  repairOrderId: string,
  technicianId: string | null
): Promise<ActionResult> {
  const service = await prisma.repairOrder.findUnique({
    where: { id: repairOrderId },
    select: { storeId: true, technicianId: true, status: true, isPickedUp: true },
  });
  if (!service) return { success: false, error: "Service tidak ditemukan" };
  if (service.isPickedUp) return { success: false, error: "Tidak dapat memperbarui service yang sudah diambil" };

  return withScope(service.storeId, { feature: "service.technicianAssignment" }, async (scope) => {
    assertPermission(scope, "service.assignTechnician");

    if (technicianId) {
      const technician = await prisma.user.findUnique({
        where: { id: technicianId },
        select: { role: true, storeAssignments: { select: { storeId: true } } },
      });
      if (!technician || technician.role !== "technician") throw new Error("Invalid technician");
      const technicianTokoIds = technician.storeAssignments.map((a) => a.storeId);
      if (!technicianTokoIds.includes(scope.storeId)) throw new Error("Technician does not belong to this toko");
    }

    const assignedAt = technicianId ? new Date() : null;
    const nextStatus = technicianId && service.status === "received" ? "repairing" : service.status;

    await prisma.$transaction(async (tx) => {
      await tx.repairOrder.update({
        where: { id: repairOrderId },
        data: { technicianId, assignedAt, status: nextStatus },
      });

      await createActivityLog(tx, {
        storeId: scope.storeId,
        userId: scope.user.id,
        repairOrderId,
        type: "service_assigned",
        title: technicianId ? "Technician assigned" : "Technician removed",
        payload: {
          technicianId,
          previousTechnicianId: service.technicianId,
          assignedAt: assignedAt?.toISOString() ?? null,
          nextStatus,
        },
      });
    });

    revalidateServicePaths(scope.storeId, true);

    return { success: true };
  });
}

export async function addItem(data: z.infer<typeof addItemSchema>): Promise<ActionResultWithData<{
  id: string;
  type: string;
  name: string;
  qty: number;
  price: number;
}>> {
  const validated = addItemSchema.safeParse(data);
  if (!validated.success) return { success: false, error: validated.error.issues[0].message };

  const service = await prisma.repairOrder.findUnique({
    where: { id: data.repairOrderId },
    select: {
      storeId: true, status: true, isPickedUp: true, technicianId: true, deviceModelId: true,
      invoice: { select: { paymentStatus: true } },
    },
  });
  if (!service) return { success: false, error: "Service tidak ditemukan" };
  if (service.isPickedUp) return { success: false, error: "Tidak dapat memperbarui service yang sudah diambil" };
  if (service.invoice?.paymentStatus === "paid") return { success: false, error: "Tidak dapat memperbarui item pada invoice lunas" };
  if (validated.data.type === "inventory_item" && validated.data.serviceCatalogItemId) {
    return { success: false, error: "Item sparepart tidak dapat menggunakan pricelist jasa" };
  }
  if (validated.data.type === "service_catalog_item" && validated.data.inventoryItemId) {
    return { success: false, error: "Item jasa tidak dapat menggunakan sparepart" };
  }

  return withScope(service.storeId, {}, async (scope) => {
    await assertInvoiceMutationPermissions(scope, validated.data.repairOrderId);

    let createdItem: { id: string; type: string; name: string; qty: number; price: number } | null = null;
    const actorTechnicianId = isTechnicianRole(scope.user.role) ? scope.user.id : null;

    if (validated.data.type === "inventory_item" && validated.data.inventoryItemId) {
      assertFeature(scope, "inventory.management");
      const inventoryItemId = validated.data.inventoryItemId;

      const inventoryItem = await prisma.inventoryItem.findUnique({
        where: { id: inventoryItemId },
        select: {
          stock: true, name: true, defaultPrice: true, purchasePrice: true, storeId: true, isUniversal: true, type: true,
          compatibilities: {
            where: { deviceModelId: service.deviceModelId },
            select: { deviceModelId: true },
          },
        },
      });
      if (!inventoryItem || inventoryItem.storeId !== service.storeId) throw new AuthError("forbidden", "Sparepart tidak ditemukan");
      if (inventoryItem.type !== "repair_part") throw new AuthError("forbidden", "Barang retail tidak bisa dipakai sebagai sparepart service");
      if (!inventoryItem.isUniversal && inventoryItem.compatibilities.length === 0) {
        throw new AuthError("forbidden", "Sparepart tidak kompatibel dengan perangkat ini");
      }

      await prisma.$transaction(async (tx) => {
        const stockUpdate = await tx.inventoryItem.updateMany({
          where: { id: inventoryItemId, storeId: service.storeId, stock: { gte: validated.data.qty } },
          data: { stock: { decrement: validated.data.qty } },
        });
        if (stockUpdate.count !== 1) throw new AuthError("forbidden", `Stok tidak cukup. Tersedia: ${inventoryItem.stock}`);

        const updatedSparepart = await tx.inventoryItem.findUniqueOrThrow({
          where: { id: inventoryItemId },
          select: { stock: true },
        });

        createdItem = await tx.repairOrderItem.create({
          data: {
            repairOrderId: validated.data.repairOrderId,
            type: validated.data.type,
            name: inventoryItem.name,
            qty: validated.data.qty,
            price: inventoryItem.defaultPrice,
            referenceId: inventoryItemId,
          },
        });

        await tx.inventoryMovement.create({
          data: {
            storeId: service.storeId,
            inventoryItemId,
            type: "repair_usage",
            qtyChange: -validated.data.qty,
            stockBefore: updatedSparepart.stock + validated.data.qty,
            stockAfter: updatedSparepart.stock,
            unitCostSnapshot: inventoryItem.purchasePrice,
            unitPriceSnapshot: inventoryItem.defaultPrice,
            referenceType: "service_item",
            referenceId: createdItem.id,
            note: "Sparepart used in service",
            createdById: scope.user.id,
          },
        });

        await promoteServiceOnFirstItem(tx, validated.data.repairOrderId, service.status, service.technicianId, scope.user.id, actorTechnicianId, scope.storeId);

        await createActivityLog(tx, {
          storeId: scope.storeId, userId: scope.user.id, repairOrderId: validated.data.repairOrderId,
          type: "sparepart_stock_out", title: "Sparepart used in service",
          payload: { inventoryItemId, inventoryItemName: inventoryItem.name, qty: validated.data.qty, price: inventoryItem.defaultPrice },
        });
      });
    } else if (validated.data.type === "service_catalog_item" && validated.data.serviceCatalogItemId) {
      const pricelist = await prisma.serviceCatalogItem.findUnique({
        where: { id: validated.data.serviceCatalogItemId },
        select: { title: true, defaultPrice: true, storeId: true },
      });
      if (!pricelist || pricelist.storeId !== service.storeId) {
        throw new AuthError("forbidden", "Pricelist jasa tidak ditemukan");
      }

      await prisma.$transaction(async (tx) => {
        createdItem = await tx.repairOrderItem.create({
          data: {
            repairOrderId: validated.data.repairOrderId,
            type: validated.data.type,
            name: pricelist.title,
            qty: validated.data.qty,
            price: validated.data.price,
            referenceId: null,
          },
        });

        await promoteServiceOnFirstItem(tx, validated.data.repairOrderId, service.status, service.technicianId, scope.user.id, actorTechnicianId, scope.storeId);
      });
    } else {
      assertFeature(scope, "service.manualItems");

      const itemName = validated.data.name;
      const itemPrice = validated.data.price;

      await prisma.$transaction(async (tx) => {
        createdItem = await tx.repairOrderItem.create({
          data: { repairOrderId: validated.data.repairOrderId, type: validated.data.type, name: itemName, qty: validated.data.qty, price: itemPrice, referenceId: null },
        });

        await promoteServiceOnFirstItem(tx, validated.data.repairOrderId, service.status, service.technicianId, scope.user.id, actorTechnicianId, scope.storeId);
      });
    }

    await updateInvoiceIfAllowed(scope, validated.data.repairOrderId);
    revalidateServicePaths(scope.storeId);

    return createdItem!;
  });
}

export async function removeItem(itemId: string): Promise<ActionResult> {
  const item = await prisma.repairOrderItem.findUnique({
    where: { id: itemId },
    select: {
      id: true, type: true, qty: true, referenceId: true, repairOrderId: true,
      repairOrder: { select: { storeId: true, isPickedUp: true, technicianId: true, invoice: { select: { paymentStatus: true } } } },
    },
  });
  if (!item) return { success: false, error: "Item tidak ditemukan" };
  if (item.repairOrder.isPickedUp) return { success: false, error: "Tidak dapat memperbarui service yang sudah diambil" };
  if (item.repairOrder.invoice?.paymentStatus === "paid") return { success: false, error: "Tidak dapat memperbarui item pada invoice lunas" };

  return withScope(item.repairOrder.storeId, {}, async (scope) => {
    await assertInvoiceMutationPermissions(scope, item.repairOrderId);
    assertPermission(scope, "service.manageItems");
    assertPermission(scope, "service.manageInvoice");

    if (isTechnicianRole(scope.user.role) && item.repairOrder.technicianId !== scope.user.id) {
      throw new Error("Access denied");
    }

    if (item.type === "inventory_item" && item.referenceId) {
      await prisma.$transaction(async (tx) => {
        await tx.repairOrderItem.delete({ where: { id: itemId } });
        const inventoryItem = await tx.inventoryItem.findUniqueOrThrow({
          where: { id: item.referenceId! },
          select: { stock: true, purchasePrice: true, defaultPrice: true },
        });
        const updatedSparepart = await tx.inventoryItem.update({
          where: { id: item.referenceId! },
          data: { stock: { increment: item.qty } },
        });
        await tx.inventoryMovement.create({
          data: {
            storeId: scope.storeId,
            inventoryItemId: item.referenceId!,
            type: "repair_return",
            qtyChange: item.qty,
            stockBefore: updatedSparepart.stock - item.qty,
            stockAfter: updatedSparepart.stock,
            unitCostSnapshot: inventoryItem.purchasePrice,
            unitPriceSnapshot: inventoryItem.defaultPrice,
            referenceType: "service_item",
            referenceId: itemId,
            note: "Service item removed, stock returned",
            createdById: scope.user.id,
          },
        });
        await createActivityLog(tx, {
          storeId: scope.storeId, userId: scope.user.id, repairOrderId: item.repairOrderId,
          type: "sparepart_stock_in", title: "Sparepart returned to inventory",
          payload: { inventoryItemId: item.referenceId, qty: item.qty },
        });
      });
    } else {
      await prisma.repairOrderItem.delete({ where: { id: itemId } });
    }

    await updateInvoiceIfAllowed(scope, item.repairOrderId);
    revalidateServicePaths(scope.storeId);

    return { success: true };
  });
}

export async function payInvoice(repairInvoiceId: string, data: z.infer<typeof payInvoiceSchema> = {}): Promise<ActionResult> {
  const validated = payInvoiceSchema.safeParse(data);
  if (!validated.success) return { success: false, error: validated.error.issues[0].message };

  const invoice = await prisma.repairInvoice.findUnique({
    where: { id: repairInvoiceId },
    select: {
      grandTotal: true, paymentStatus: true, dpAmount: true,
      repairOrder: { select: { id: true, storeId: true, status: true, isPickedUp: true } },
    },
  });
  if (!invoice) return { success: false, error: "Invoice tidak ditemukan" };
  if (invoice.paymentStatus === "paid") return { success: false, error: "Invoice sudah lunas" };
  if (invoice.repairOrder.status !== "done" && invoice.repairOrder.status !== "failed") {
    return { success: false, error: "Hanya service selesai yang dapat ditandai lunas" };
  }
  if (invoice.repairOrder.isPickedUp) return { success: false, error: "Service sudah diambil" };

  const discountAmount = validated.data.discountAmount ?? 0;
  const paymentMethod = validated.data.paymentMethod;
  const shouldCheckoutOnPayment = paymentMethod === "cash" || paymentMethod === "qris";
  const maxDiscount = Math.max(invoice.grandTotal - invoice.dpAmount, 0);
  if (discountAmount > maxDiscount) return { success: false, error: "Diskon tidak boleh melebihi sisa total invoice" };

  return withScope(invoice.repairOrder.storeId, {}, async (scope) => {
    assertPermission(scope, "service.manageInvoice");

    const paidAt = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.repairInvoice.update({
        where: { id: repairInvoiceId },
        data: { paymentStatus: "paid", paidAt, discountAmount },
      });

      if (shouldCheckoutOnPayment) {
        await tx.repairOrder.update({
          where: { id: invoice.repairOrder.id },
          data: { checkoutAt: paidAt },
        });
      }

      await createActivityLog(tx, {
        storeId: scope.storeId, userId: scope.user.id, repairOrderId: invoice.repairOrder.id,
        type: "invoice_paid", title: "Invoice marked as paid",
        payload: { repairInvoiceId, discountAmount, paymentMethod, paidAt: paidAt.toISOString() },
      });
    });

    revalidateServicePaths(scope.storeId);
    return { success: true };
  });
}

export async function markDpInvoice(repairInvoiceId: string, dpAmount: number): Promise<ActionResult> {
  const invoice = await prisma.repairInvoice.findUnique({
    where: { id: repairInvoiceId },
    select: {
      paymentStatus: true,
      repairOrder: { select: { id: true, storeId: true, status: true, isPickedUp: true } },
    },
  });
  if (!invoice) return { success: false, error: "Invoice tidak ditemukan" };
  if (invoice.paymentStatus === "paid" || invoice.paymentStatus === "dp") return { success: false, error: "Invoice sudah memiliki DP atau lunas" };
  if (dpAmount <= 0) return { success: false, error: "Jumlah DP harus lebih dari nol" };

  return withScope(invoice.repairOrder.storeId, {}, async (scope) => {
    assertPermission(scope, "service.manageInvoice");

    await prisma.$transaction(async (tx) => {
      await tx.repairInvoice.update({
        where: { id: repairInvoiceId },
        data: { paymentStatus: "dp", dpAmount },
      });

      await createActivityLog(tx, {
        storeId: scope.storeId, userId: scope.user.id, repairOrderId: invoice.repairOrder.id,
        type: "invoice_dp", title: "Invoice marked as DP",
        payload: { repairInvoiceId, dpAmount },
      });
    });

    revalidateServicePaths(scope.storeId);
    return { success: true };
  });
}
