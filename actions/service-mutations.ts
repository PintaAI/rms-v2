"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { createActivityLog, preserveDeletedServiceActivityLogs } from "@/lib/activity-log";
import { ensureMonthlyActivityLimit } from "@/lib/auth/enforcement";
import { revalidateServicePaths } from "@/lib/revalidation";
import { sendServiceStatusWhatsappNotification } from "@/lib/service-whatsapp-notifications";
import { validateIndonesianWhatsappNumber } from "@/lib/whatsapp-number";
import { getRequestUser } from "@/lib/auth/request-user";
import { withScope } from "@/lib/auth/wrapper";
import { assertFeature } from "@/lib/auth/request-scope";
import type { ServiceStatus } from "@/prisma/generated/prisma/enums";
import type { SubscriptionPlan } from "@/lib/features";
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
  serviceId: string,
  currentStatus: string,
  currentTechnicianId: string | null,
  userId: string,
  tokoId: string,
) {
  if (currentStatus === "received") {
    await tx.service.update({
      where: { id: serviceId },
      data: { status: "repairing", ...(currentTechnicianId !== userId ? { technicianId: userId, assignedAt: new Date() } : {}) },
    });
    await createActivityLog(tx, {
      tokoId, userId, serviceId,
      type: "service_status_changed", title: getStatusActivityTitle("repairing"),
      payload: { previousStatus: "received", nextStatus: "repairing", reason: "First repair item added" },
    });
  } else if (currentTechnicianId !== userId) {
    await tx.service.update({
      where: { id: serviceId },
      data: { technicianId: userId, assignedAt: new Date() },
    });
  }
}

const createServiceSchema = z.object({
  hpCatalogId: z.string().min(1),
  customerName: z.string().optional(),
  noWa: z.string().min(1).refine((value) => validateIndonesianWhatsappNumber(value).valid, {
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
  serviceId: z.string(),
  type: z.enum(["sparepart", "service"]),
  sparepartId: z.string().optional(),
  servicePricelistId: z.string().optional(),
  name: z.string().min(1),
  qty: z.number().int().min(1),
  price: z.number().int().min(0),
});

const payInvoiceSchema = z.object({
  discountAmount: z.number().int().min(0).optional(),
});

async function updateInvoiceIfAllowed(user: { plan: SubscriptionPlan; id: string }, serviceId: string, tokoId: string): Promise<void> {
  const limitError = await ensureMonthlyActivityLimit(user, "maxInvoicesMonthly", "invoice_created", tokoId);
  if (limitError) throw new Error(limitError.error);

  const invoiceResult = await updateInvoiceTotal(serviceId);

  if (invoiceResult.created) {
    await createActivityLog(prisma, {
      tokoId,
      userId: user.id,
      serviceId,
      type: "invoice_created",
      title: "Invoice created",
    });
  }
}

export async function createService(
  data: z.infer<typeof createServiceSchema>,
  tokoId?: string
): Promise<ActionResultWithData<{ id: string }>> {
  const validated = createServiceSchema.safeParse(data);
  if (!validated.success) return { success: false, error: validated.error.issues[0].message };

  if (!tokoId) {
    const user = await getRequestUser();
    if (!user) return { success: false, error: "Unauthorized" };
    tokoId = user.tokoIds[0];
    if (!tokoId) return { success: false, error: "No toko found" };
  }

  return withScope(tokoId, { role: ["admin", "staff"] }, async (scope) => {
    const limitError = await ensureMonthlyActivityLimit(scope.user, "maxServicesMonthly", "service_created", scope.tokoId);
    if (limitError) throw new Error(limitError.error);

    const hpCatalog = await prisma.hpCatalog.findUnique({
      where: { id: validated.data.hpCatalogId },
    });
    if (!hpCatalog) throw new Error("Device not found");

    const service = await prisma.$transaction(async (tx) => {
      const createdService = await tx.service.create({
        data: {
          tokoId: scope.tokoId,
          hpCatalogId: validated.data.hpCatalogId,
          createdById: scope.user.id,
          customerName: validated.data.customerName || null,
          noWa: validated.data.noWa,
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
        await tx.invoice.create({
          data: {
            serviceId: createdService.id,
            grandTotal: 0,
            paymentStatus: "dp",
            dpAmount: validated.data.dpAmount,
          },
        });

        await createActivityLog(tx, {
          tokoId: scope.tokoId,
          userId: scope.user.id,
          serviceId: createdService.id,
          type: "invoice_dp",
          title: "Invoice marked as DP",
          payload: { dpAmount: validated.data.dpAmount },
        });
      }

      await createActivityLog(tx, {
        tokoId: scope.tokoId,
        userId: scope.user.id,
        serviceId: createdService.id,
        type: "service_created",
        title: "Service created",
        payload: {
          hpCatalogId: validated.data.hpCatalogId,
          customerName: validated.data.customerName || null,
          noWa: validated.data.noWa,
          complaint: validated.data.complaint,
          handlingNote: validated.data.handlingNote || null,
          includedItems: validated.data.includedItems || undefined,
        },
      });

      return createdService;
    });

    revalidateServicePaths(scope.tokoId);

    return { id: service.id };
  });
}

export async function updateService(
  serviceId: string,
  data: z.infer<typeof updateServiceSchema>
): Promise<ActionResult> {
  const validated = updateServiceSchema.safeParse(data);
  if (!validated.success) return { success: false, error: validated.error.issues[0].message };

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { tokoId: true, isPickedUp: true },
  });
  if (!service) return { success: false, error: "Service not found" };
  if (service.isPickedUp) return { success: false, error: "Cannot update a service that has been picked up" };

  return withScope(service.tokoId, { role: ["admin", "staff"] }, async (scope) => {
    const hpCatalog = await prisma.hpCatalog.findUnique({
      where: { id: validated.data.hpCatalogId },
    });
    if (!hpCatalog) throw new Error("Device not found");

    await prisma.$transaction(async (tx) => {
      await tx.service.update({
        where: { id: serviceId },
        data: {
          hpCatalogId: validated.data.hpCatalogId,
          customerName: validated.data.customerName || null,
          noWa: validated.data.noWa,
          complaint: validated.data.complaint,
          handlingNote: validated.data.handlingNote || null,
          includedItems: validated.data.includedItems || undefined,
          passwordPattern: validated.data.passwordPattern || null,
          imei: validated.data.imei || null,
        },
      });

      if (validated.data.dpAmount && validated.data.dpAmount > 0) {
        const existingInvoice = await tx.invoice.findUnique({
          where: { serviceId },
          select: { id: true },
        });

        if (existingInvoice) {
          await tx.invoice.update({
            where: { serviceId },
            data: { dpAmount: validated.data.dpAmount, paymentStatus: "dp" },
          });
        } else {
          await tx.invoice.create({
            data: {
              serviceId,
              grandTotal: 0,
              paymentStatus: "dp",
              dpAmount: validated.data.dpAmount,
            },
          });
        }

        await createActivityLog(tx, {
          tokoId: scope.tokoId,
          userId: scope.user.id,
          serviceId,
          type: "invoice_dp",
          title: "Invoice marked as DP",
          payload: { dpAmount: validated.data.dpAmount },
        });
      }

      await createActivityLog(tx, {
        tokoId: scope.tokoId,
        userId: scope.user.id,
        serviceId,
        type: "service_updated",
        title: "Service details updated",
        payload: {
          hpCatalogId: validated.data.hpCatalogId,
          customerName: validated.data.customerName || null,
          noWa: validated.data.noWa,
          complaint: validated.data.complaint,
          handlingNote: validated.data.handlingNote || null,
          includedItems: validated.data.includedItems || undefined,
          imei: validated.data.imei || null,
          hasPasswordPattern: Boolean(validated.data.passwordPattern),
        },
      });
    });

    revalidateServicePaths(scope.tokoId);

    return { success: true };
  });
}

export async function deleteService(serviceId: string): Promise<ActionResult> {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: {
      id: true, tokoId: true, customerName: true, noWa: true, complaint: true, handlingNote: true, status: true, isPickedUp: true, imei: true, note: true,
      hpCatalog: { select: { id: true, modelName: true, brand: { select: { name: true } } } },
      invoice: { select: { paymentStatus: true } },
    },
  });
  if (!service) return { success: false, error: "Service not found" };
  if (service.isPickedUp) return { success: false, error: "Cannot delete a service that has been picked up" };
  if (service.invoice?.paymentStatus === "paid" || service.invoice?.paymentStatus === "dp") {
    return { success: false, error: "Cannot delete a service with a paid invoice" };
  }

  return withScope(service.tokoId, { role: ["admin", "staff"] }, async () => {
    const serviceItems = await prisma.serviceItem.findMany({
      where: { serviceId },
      select: { id: true, type: true, qty: true, referenceId: true },
    });

    await prisma.$transaction(async (tx) => {
      await preserveDeletedServiceActivityLogs(tx, serviceId, service);

      for (const item of serviceItems) {
        if (item.type === "sparepart" && item.referenceId) {
          await tx.sparepart.update({
            where: { id: item.referenceId },
            data: { stock: { increment: item.qty } },
          });
        }
      }

      await tx.serviceItem.deleteMany({ where: { serviceId } });
      await tx.invoice.deleteMany({ where: { serviceId } });
      await tx.service.delete({ where: { id: serviceId } });
    });

    revalidateServicePaths(service.tokoId);

    return { success: true };
  });
}

export async function takeService(serviceId: string): Promise<ActionResult> {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { tokoId: true, status: true, technicianId: true },
  });
  if (!service) return { success: false, error: "Service not found" };
  if (!technicianAvailableStatuses.includes(service.status)) {
    return { success: false, error: "Service is not available for takeover" };
  }

  return withScope(service.tokoId, { role: ["admin", "technician"], feature: "technician.workflow" }, async (scope) => {
    if (service.technicianId === scope.user.id) {
      return { success: false, error: "Service is already assigned to you" };
    }

    const assignedAt = new Date();
    const nextStatus = service.status === "received" && !service.technicianId ? "repairing" : service.status;

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.service.updateMany({
        where: {
          id: serviceId,
          tokoId: scope.tokoId,
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
        tokoId: scope.tokoId,
        userId: scope.user.id,
        serviceId,
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

    if (!updated) throw new Error("Service is no longer available for takeover");

    revalidateServicePaths(scope.tokoId, true);

    return { success: true };
  });
}

export async function updateStatus(
  serviceId: string,
  status: ServiceStatus,
  note?: string,
  warrantyUntil?: Date | null,
  options?: { takeOwnership?: boolean }
): Promise<ActionResult> {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { tokoId: true, technicianId: true, status: true, isPickedUp: true, invoice: { select: { paymentStatus: true } } },
  });
  if (!service) return { success: false, error: "Service not found" };
  if (service.isPickedUp) return { success: false, error: "Cannot update a service that has been picked up" };

  const isUndoingCompletedStatus = isCompletingStatus(service.status) && !isCompletingStatus(status);
  if (isUndoingCompletedStatus && service.invoice?.paymentStatus === "paid") {
    return { success: false, error: "Cannot undo status for a paid invoice" };
  }

  const warrantyDate = status === "done" && warrantyUntil ? new Date(warrantyUntil) : null;
  if (warrantyDate && Number.isNaN(warrantyDate.getTime())) {
    return { success: false, error: "Invalid warranty date" };
  }

  return withScope(service.tokoId, { role: ["admin", "technician"] }, async (scope) => {
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
      await tx.service.update({
        where: { id: serviceId },
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
        tokoId: scope.tokoId,
        userId: scope.user.id,
        serviceId,
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
      await updateInvoiceTotal(serviceId);
      await sendServiceStatusWhatsappNotification({ serviceId, status });
    }

    revalidateServicePaths(scope.tokoId, true);

    return { success: true };
  });
}

export async function pickupService(serviceId: string): Promise<ActionResult> {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { tokoId: true, status: true, isPickedUp: true },
  });
  if (!service) return { success: false, error: "Service not found" };
  if (service.isPickedUp) return { success: false, error: "Service has already been picked up" };
  if (service.status !== "done" && service.status !== "failed") {
    return { success: false, error: "Only completed services can be marked as picked up" };
  }

  return withScope(service.tokoId, { role: ["admin", "staff"] }, async (scope) => {
    const pickedUpAt = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.service.update({
        where: { id: serviceId },
        data: { isPickedUp: true, checkoutAt: pickedUpAt },
      });

      await createActivityLog(tx, {
        tokoId: scope.tokoId,
        userId: scope.user.id,
        serviceId,
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

    revalidateServicePaths(scope.tokoId);

    return { success: true };
  });
}

export async function assignTechnician(
  serviceId: string,
  technicianId: string | null
): Promise<ActionResult> {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { tokoId: true, technicianId: true, status: true, isPickedUp: true },
  });
  if (!service) return { success: false, error: "Service not found" };
  if (service.isPickedUp) return { success: false, error: "Cannot update a service that has been picked up" };

  return withScope(service.tokoId, { role: ["admin", "staff"], feature: "technician.workflow" }, async (scope) => {
    if (technicianId) {
      const technician = await prisma.user.findUnique({
        where: { id: technicianId },
        select: { role: true, tokoAssignments: { select: { tokoId: true } } },
      });
      if (!technician || technician.role !== "technician") throw new Error("Invalid technician");
      const technicianTokoIds = technician.tokoAssignments.map((a) => a.tokoId);
      if (!technicianTokoIds.includes(scope.tokoId)) throw new Error("Technician does not belong to this toko");
    }

    const assignedAt = technicianId ? new Date() : null;
    const nextStatus = technicianId && service.status === "received" ? "repairing" : service.status;

    await prisma.$transaction(async (tx) => {
      await tx.service.update({
        where: { id: serviceId },
        data: { technicianId, assignedAt, status: nextStatus },
      });

      await createActivityLog(tx, {
        tokoId: scope.tokoId,
        userId: scope.user.id,
        serviceId,
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

    revalidateServicePaths(scope.tokoId, true);

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

  const service = await prisma.service.findUnique({
    where: { id: data.serviceId },
    select: {
      tokoId: true, status: true, isPickedUp: true, technicianId: true, hpCatalogId: true,
      invoice: { select: { paymentStatus: true } },
    },
  });
  if (!service) return { success: false, error: "Service not found" };
  if (service.isPickedUp) return { success: false, error: "Cannot update a service that has been picked up" };
  if (service.invoice?.paymentStatus === "paid") return { success: false, error: "Cannot update items on a paid invoice" };
  if (validated.data.type === "sparepart" && validated.data.servicePricelistId) {
    return { success: false, error: "Sparepart item cannot use a service pricelist" };
  }
  if (validated.data.type === "service" && validated.data.sparepartId) {
    return { success: false, error: "Service item cannot use a sparepart" };
  }

  return withScope(service.tokoId, { role: ["admin", "technician"] }, async (scope) => {
    let createdItem: { id: string; type: string; name: string; qty: number; price: number } | null = null;

    if (validated.data.type === "sparepart" && validated.data.sparepartId) {
      assertFeature(scope, "inventory.management");

      const sparepart = await prisma.sparepart.findUnique({
        where: { id: validated.data.sparepartId },
        select: {
          stock: true, name: true, defaultPrice: true, tokoId: true, isUniversal: true,
          compatibilities: {
            where: { hpCatalogId: service.hpCatalogId },
            select: { hpCatalogId: true },
          },
        },
      });
      if (!sparepart || sparepart.tokoId !== service.tokoId) throw new Error("Sparepart not found");
      if (!sparepart.isUniversal && sparepart.compatibilities.length === 0) {
        throw new Error("Sparepart is not compatible with this device");
      }

      await prisma.$transaction(async (tx) => {
        const stockUpdate = await tx.sparepart.updateMany({
          where: { id: validated.data.sparepartId, tokoId: service.tokoId, stock: { gte: validated.data.qty } },
          data: { stock: { decrement: validated.data.qty } },
        });
        if (stockUpdate.count !== 1) throw new Error(`Insufficient stock. Available: ${sparepart.stock}`);

        createdItem = await tx.serviceItem.create({
          data: {
            serviceId: validated.data.serviceId,
            type: validated.data.type,
            name: sparepart.name,
            qty: validated.data.qty,
            price: sparepart.defaultPrice,
            referenceId: validated.data.sparepartId,
          },
        });

        await promoteServiceOnFirstItem(tx, validated.data.serviceId, service.status, service.technicianId, scope.user.id, scope.tokoId);

        await createActivityLog(tx, {
          tokoId: scope.tokoId, userId: scope.user.id, serviceId: validated.data.serviceId,
          type: "sparepart_stock_out", title: "Sparepart used in service",
          payload: { sparepartId: validated.data.sparepartId, sparepartName: sparepart.name, qty: validated.data.qty, price: sparepart.defaultPrice },
        });
      });
    } else {
      assertFeature(scope, "service.manualItems");

      let itemName = validated.data.name;
      let itemPrice = validated.data.price;

      if (validated.data.type === "service" && validated.data.servicePricelistId) {
        const pricelist = await prisma.servicePricelist.findUnique({
          where: { id: validated.data.servicePricelistId },
          select: { title: true, defaultPrice: true, tokoId: true },
        });
        if (!pricelist || pricelist.tokoId !== service.tokoId) throw new Error("Service pricelist not found");
        itemName = pricelist.title;
        itemPrice = pricelist.defaultPrice;
      }

      await prisma.$transaction(async (tx) => {
        createdItem = await tx.serviceItem.create({
          data: { serviceId: validated.data.serviceId, type: validated.data.type, name: itemName, qty: validated.data.qty, price: itemPrice, referenceId: null },
        });

        await promoteServiceOnFirstItem(tx, validated.data.serviceId, service.status, service.technicianId, scope.user.id, scope.tokoId);
      });
    }

    await updateInvoiceIfAllowed(scope.user, validated.data.serviceId, scope.tokoId);
    revalidateServicePaths(scope.tokoId);

    return createdItem!;
  });
}

export async function removeItem(itemId: string): Promise<ActionResult> {
  const item = await prisma.serviceItem.findUnique({
    where: { id: itemId },
    select: {
      id: true, type: true, qty: true, referenceId: true, serviceId: true,
      service: { select: { tokoId: true, isPickedUp: true, technicianId: true, invoice: { select: { paymentStatus: true } } } },
    },
  });
  if (!item) return { success: false, error: "Item not found" };
  if (item.service.isPickedUp) return { success: false, error: "Cannot update a service that has been picked up" };
  if (item.service.invoice?.paymentStatus === "paid") return { success: false, error: "Cannot update items on a paid invoice" };

  return withScope(item.service.tokoId, { role: ["admin", "staff", "technician"] }, async (scope) => {
    if (isTechnicianRole(scope.user.role) && item.service.technicianId !== scope.user.id) {
      throw new Error("Access denied");
    }

    if (item.type === "sparepart" && item.referenceId) {
      await prisma.$transaction(async (tx) => {
        await tx.serviceItem.delete({ where: { id: itemId } });
        await tx.sparepart.update({
          where: { id: item.referenceId! },
          data: { stock: { increment: item.qty } },
        });
        await createActivityLog(tx, {
          tokoId: scope.tokoId, userId: scope.user.id, serviceId: item.serviceId,
          type: "sparepart_stock_in", title: "Sparepart returned to inventory",
          payload: { sparepartId: item.referenceId, qty: item.qty },
        });
      });
    } else {
      await prisma.serviceItem.delete({ where: { id: itemId } });
    }

    await updateInvoiceIfAllowed(scope.user, item.serviceId, scope.tokoId);
    revalidateServicePaths(scope.tokoId);

    return { success: true };
  });
}

export async function payInvoice(invoiceId: string, data: z.infer<typeof payInvoiceSchema> = {}): Promise<ActionResult> {
  const validated = payInvoiceSchema.safeParse(data);
  if (!validated.success) return { success: false, error: validated.error.issues[0].message };

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      grandTotal: true, paymentStatus: true, dpAmount: true,
      service: { select: { id: true, tokoId: true, status: true, isPickedUp: true } },
    },
  });
  if (!invoice) return { success: false, error: "Invoice not found" };
  if (invoice.paymentStatus === "paid") return { success: false, error: "Invoice has already been paid" };
  if (invoice.service.status !== "done" && invoice.service.status !== "failed") {
    return { success: false, error: "Only completed services can be marked as paid" };
  }
  if (invoice.service.isPickedUp) return { success: false, error: "Service has already been picked up" };

  const discountAmount = validated.data.discountAmount ?? 0;
  const maxDiscount = Math.max(invoice.grandTotal - invoice.dpAmount, 0);
  if (discountAmount > maxDiscount) return { success: false, error: "Discount cannot exceed remaining invoice total" };

  return withScope(invoice.service.tokoId, { role: ["admin", "staff"] }, async (scope) => {
    const paidAt = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { paymentStatus: "paid", paidAt, discountAmount },
      });

      await createActivityLog(tx, {
        tokoId: scope.tokoId, userId: scope.user.id, serviceId: invoice.service.id,
        type: "invoice_paid", title: "Invoice marked as paid",
        payload: { invoiceId, discountAmount, paidAt: paidAt.toISOString() },
      });
    });

    revalidateServicePaths(scope.tokoId);
    return { success: true };
  });
}

export async function markDpInvoice(invoiceId: string, dpAmount: number): Promise<ActionResult> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      paymentStatus: true,
      service: { select: { id: true, tokoId: true, status: true, isPickedUp: true } },
    },
  });
  if (!invoice) return { success: false, error: "Invoice not found" };
  if (invoice.paymentStatus === "paid" || invoice.paymentStatus === "dp") return { success: false, error: "Invoice already has DP or is paid" };
  if (dpAmount <= 0) return { success: false, error: "DP amount must be greater than zero" };

  return withScope(invoice.service.tokoId, { role: ["admin", "staff"] }, async (scope) => {
    await prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { paymentStatus: "dp", dpAmount },
      });

      await createActivityLog(tx, {
        tokoId: scope.tokoId, userId: scope.user.id, serviceId: invoice.service.id,
        type: "invoice_dp", title: "Invoice marked as DP",
        payload: { invoiceId, dpAmount },
      });
    });

    revalidateServicePaths(scope.tokoId);
    return { success: true };
  });
}
