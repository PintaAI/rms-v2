"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { createActivityLog, preserveDeletedServiceActivityLogs } from "@/lib/activity-log";
import { ensureFeatureAccess, ensureMonthlyActivityLimit } from "@/lib/feature-enforcement";
import { canUseFeature } from "@/lib/features";
import { revalidateServicePaths } from "@/lib/revalidation";
import { sendServiceStatusWhatsappNotification } from "@/lib/service-whatsapp-notifications";
import { getEffectivePlanForToko, type AuthUser } from "@/lib/rbac";
import { getDisabledFeaturesForToko } from "./feature-settings";
import type { ServiceStatus } from "@/prisma/generated/prisma/enums";
import {
  getSessionAndTokos,
  getStatusActivityTitle,
  hasTokoAccess,
  isCompletingStatus,
  isStaffOrAdminRole,
  isTechnicianOrAdminRole,
  isTechnicianRole,
  technicianAvailableStatuses,
  updateInvoiceTotal,
} from "./service-shared";
import type { ActionResult, ActionResultWithData } from "./service-types";

const createServiceSchema = z.object({
  hpCatalogId: z.string().min(1),
  customerName: z.string().optional(),
  noWa: z.string().min(1),
  complaint: z.string().min(1),
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

async function getTokoScopedUser(user: AuthUser, tokoId: string): Promise<AuthUser> {
  return { ...user, plan: await getEffectivePlanForToko(user, tokoId) };
}

async function updateInvoiceIfAllowed(user: AuthUser, serviceId: string, tokoId: string): Promise<void> {
  const scopedUser = await getTokoScopedUser(user, tokoId);
  const disabledFeatures = await getDisabledFeaturesForToko(tokoId);

  if (!canUseFeature({ plan: scopedUser.plan, role: scopedUser.role, feature: "service.invoice", disabledFeatures })) {
    return;
  }

  const limitError = await ensureMonthlyActivityLimit(scopedUser, "maxInvoicesMonthly", "invoice_created", tokoId);
  if (limitError) {
    throw new Error(limitError.error);
  }

  const invoiceResult = await updateInvoiceTotal(serviceId);

  if (invoiceResult.created) {
    await createActivityLog(prisma, {
      tokoId,
      userId: scopedUser.id,
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
  try {
    const { user, tokoIds } = await getSessionAndTokos();
    if (!user) return { success: false, error: "Unauthorized" };

    const targetTokoId = tokoId ?? tokoIds[0];
    if (!targetTokoId) return { success: false, error: "No toko found" };
    if (!hasTokoAccess(tokoIds, targetTokoId) || !isStaffOrAdminRole(user.role)) {
      return { success: false, error: "Access denied" };
    }

    const limitError = await ensureMonthlyActivityLimit(user, "maxServicesMonthly", "service_created", targetTokoId);
    if (limitError) return limitError;

    const validated = createServiceSchema.parse(data);

    const hpCatalog = await prisma.hpCatalog.findUnique({
      where: { id: validated.hpCatalogId },
    });
    if (!hpCatalog) return { success: false, error: "Device not found" };

      const service = await prisma.$transaction(async (tx) => {
        const createdService = await tx.service.create({
          data: {
            tokoId: targetTokoId,
            hpCatalogId: validated.hpCatalogId,
            createdById: user.id,
            customerName: validated.customerName || null,
            noWa: validated.noWa,
            complaint: validated.complaint,
            includedItems: validated.includedItems || undefined,
            passwordPattern: validated.passwordPattern || null,
            imei: validated.imei || null,
            status: "received",
          },
          select: { id: true },
        });

        if (validated.dpAmount && validated.dpAmount > 0) {
          await tx.invoice.create({
            data: {
              serviceId: createdService.id,
              grandTotal: 0,
              paymentStatus: "dp",
              dpAmount: validated.dpAmount,
            },
          });

          await createActivityLog(tx, {
            tokoId: targetTokoId,
            userId: user.id,
            serviceId: createdService.id,
            type: "invoice_dp",
            title: "Invoice marked as DP",
            payload: { dpAmount: validated.dpAmount },
          });
        }

        await createActivityLog(tx, {
          tokoId: targetTokoId,
          userId: user.id,
          serviceId: createdService.id,
          type: "service_created",
          title: "Service created",
          payload: {
            hpCatalogId: validated.hpCatalogId,
            customerName: validated.customerName || null,
            noWa: validated.noWa,
            complaint: validated.complaint,
            includedItems: validated.includedItems || undefined,
          },
        });

        return createdService;
      });

    revalidateServicePaths(targetTokoId);

    return { success: true, data: { id: service.id } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error creating service:", error);
    return { success: false, error: "Failed to create service" };
  }
}

export async function updateService(
  serviceId: string,
  data: z.infer<typeof updateServiceSchema>
): Promise<ActionResult> {
  try {
    const { user, tokoIds } = await getSessionAndTokos();
    if (!user) return { success: false, error: "Unauthorized" };

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { tokoId: true, isPickedUp: true },
    });
    if (!service) return { success: false, error: "Service not found" };
    if (!hasTokoAccess(tokoIds, service.tokoId) || !isStaffOrAdminRole(user.role)) {
      return { success: false, error: "Access denied" };
    }
    if (service.isPickedUp) return { success: false, error: "Cannot update a service that has been picked up" };

    const validated = updateServiceSchema.parse(data);

    const hpCatalog = await prisma.hpCatalog.findUnique({
      where: { id: validated.hpCatalogId },
    });
    if (!hpCatalog) return { success: false, error: "Device not found" };

    await prisma.$transaction(async (tx) => {
      await tx.service.update({
        where: { id: serviceId },
        data: {
          hpCatalogId: validated.hpCatalogId,
          customerName: validated.customerName || null,
          noWa: validated.noWa,
          complaint: validated.complaint,
          includedItems: validated.includedItems || undefined,
          passwordPattern: validated.passwordPattern || null,
          imei: validated.imei || null,
        },
      });

      if (validated.dpAmount && validated.dpAmount > 0) {
        const existingInvoice = await tx.invoice.findUnique({
          where: { serviceId },
          select: { id: true },
        });

        if (existingInvoice) {
          await tx.invoice.update({
            where: { serviceId },
            data: { dpAmount: validated.dpAmount, paymentStatus: "dp" },
          });
        } else {
          await tx.invoice.create({
            data: {
              serviceId,
              grandTotal: 0,
              paymentStatus: "dp",
              dpAmount: validated.dpAmount,
            },
          });
        }

        await createActivityLog(tx, {
          tokoId: service.tokoId,
          userId: user.id,
          serviceId,
          type: "invoice_dp",
          title: "Invoice marked as DP",
          payload: { dpAmount: validated.dpAmount },
        });
      }

      await createActivityLog(tx, {
        tokoId: service.tokoId,
        userId: user.id,
        serviceId,
        type: "service_updated",
        title: "Service details updated",
        payload: {
          hpCatalogId: validated.hpCatalogId,
          customerName: validated.customerName || null,
          noWa: validated.noWa,
          complaint: validated.complaint,
          includedItems: validated.includedItems || undefined,
          imei: validated.imei || null,
          hasPasswordPattern: Boolean(validated.passwordPattern),
        },
      });
    });

    revalidateServicePaths(service.tokoId);

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error updating service:", error);
    return { success: false, error: "Failed to update service" };
  }
}

export async function deleteService(serviceId: string): Promise<ActionResult> {
  try {
    const { user, tokoIds } = await getSessionAndTokos();
    if (!user) return { success: false, error: "Unauthorized" };

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: {
        id: true,
        tokoId: true,
        customerName: true,
        noWa: true,
        complaint: true,
        status: true,
        isPickedUp: true,
        imei: true,
        note: true,
        hpCatalog: {
          select: {
            id: true,
            modelName: true,
            brand: { select: { name: true } },
          },
        },
        invoice: { select: { paymentStatus: true } },
      },
    });
    if (!service) return { success: false, error: "Service not found" };
    if (!hasTokoAccess(tokoIds, service.tokoId) || !isStaffOrAdminRole(user.role)) {
      return { success: false, error: "Access denied" };
    }

    if (service.isPickedUp) {
      return { success: false, error: "Cannot delete a service that has been picked up" };
    }

    if (service.invoice?.paymentStatus === "paid" || service.invoice?.paymentStatus === "dp") {
      return { success: false, error: "Cannot delete a service with a paid invoice" };
    }

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
  } catch (error) {
    console.error("Error deleting service:", error);
    return { success: false, error: "Failed to delete service" };
  }
}

export async function takeService(serviceId: string): Promise<ActionResult> {
  try {
    const { user, tokoIds } = await getSessionAndTokos();
    if (!user) return { success: false, error: "Unauthorized" };
    if (!isTechnicianOrAdminRole(user.role)) return { success: false, error: "Access denied" };

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { tokoId: true, status: true, technicianId: true },
    });
    if (!service) return { success: false, error: "Service not found" };
    if (!hasTokoAccess(tokoIds, service.tokoId)) return { success: false, error: "Access denied" };

    const workflowError = ensureFeatureAccess(
      await getTokoScopedUser(user, service.tokoId),
      "technician.workflow",
      await getDisabledFeaturesForToko(service.tokoId)
    );
    if (workflowError) return workflowError;

    if (!technicianAvailableStatuses.includes(service.status)) {
      return { success: false, error: "Service is not available for takeover" };
    }

    if (service.technicianId === user.id) {
      return { success: false, error: "Service is already assigned to you" };
    }

    const assignedAt = new Date();
    const nextStatus = service.status === "received" && !service.technicianId ? "repairing" : service.status;

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.service.updateMany({
        where: {
          id: serviceId,
          tokoId: service.tokoId,
          status: service.status,
          technicianId: service.technicianId,
        },
        data: {
          technicianId: user.id,
          status: service.status === "received" && !service.technicianId ? "repairing" : undefined,
          assignedAt,
        },
      });

      if (result.count !== 1) {
        return false;
      }

      await createActivityLog(tx, {
        tokoId: service.tokoId,
        userId: user.id,
        serviceId,
        type: "service_taken_over",
        title: "Service taken over by technician",
        payload: {
          technicianId: user.id,
          previousTechnicianId: service.technicianId,
          previousStatus: service.status,
          nextStatus,
          assignedAt: assignedAt.toISOString(),
        },
      });

      return true;
    });

    if (!updated) {
      return { success: false, error: "Service is no longer available for takeover" };
    }

    revalidateServicePaths(service.tokoId, true);

    return { success: true };
  } catch (error) {
    console.error("Error taking service:", error);
    return { success: false, error: "Failed to take service" };
  }
}

export async function updateStatus(
  serviceId: string,
  status: ServiceStatus,
  note?: string
): Promise<ActionResult> {
  try {
    const { user, tokoIds } = await getSessionAndTokos();
    if (!user) return { success: false, error: "Unauthorized" };
    if (!isTechnicianOrAdminRole(user.role)) return { success: false, error: "Access denied" };

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { tokoId: true, technicianId: true, status: true, isPickedUp: true },
    });
    if (!service) return { success: false, error: "Service not found" };
    if (!hasTokoAccess(tokoIds, service.tokoId)) return { success: false, error: "Access denied" };
    if (isTechnicianRole(user.role) && service.technicianId !== user.id) {
      return { success: false, error: "Access denied" };
    }

    if (service.isPickedUp) {
      return { success: false, error: "Cannot update a service that has been picked up" };
    }

    const changedAt = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.service.update({
        where: { id: serviceId },
        data: {
          status,
          doneAt: isCompletingStatus(status) ? changedAt : null,
          ...(note !== undefined ? { note } : {}),
          ...(isCompletingStatus(status)
            ? {
                technicianId: user.id,
                assignedAt: changedAt,
              }
            : {}),
        },
      });

      await createActivityLog(tx, {
        tokoId: service.tokoId,
        userId: user.id,
        serviceId,
        type: "service_status_changed",
        title: getStatusActivityTitle(status),
        payload: {
          previousStatus: service.status,
          nextStatus: status,
          previousTechnicianId: service.technicianId,
          note: note ?? null,
          assignedActor: isCompletingStatus(status),
          technicianId: user.id,
        },
      });
    });

    if (isCompletingStatus(status)) {
      await sendServiceStatusWhatsappNotification({ serviceId, status });
    }

    revalidateServicePaths(service.tokoId, true);

    return { success: true };
  } catch (error) {
    console.error("Error updating status:", error);
    return { success: false, error: "Failed to update status" };
  }
}

export async function pickupService(serviceId: string): Promise<ActionResult> {
  try {
    const { user, tokoIds } = await getSessionAndTokos();
    if (!user) return { success: false, error: "Unauthorized" };
    if (!isStaffOrAdminRole(user.role)) return { success: false, error: "Access denied" };

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { tokoId: true, status: true, isPickedUp: true },
    });
    if (!service) return { success: false, error: "Service not found" };
    if (!hasTokoAccess(tokoIds, service.tokoId)) return { success: false, error: "Access denied" };
    if (service.isPickedUp) {
      return { success: false, error: "Service has already been picked up" };
    }

    if (service.status !== "done" && service.status !== "failed") {
      return { success: false, error: "Only completed services can be marked as picked up" };
    }

    const pickedUpAt = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.service.update({
        where: { id: serviceId },
        data: { isPickedUp: true, checkoutAt: pickedUpAt },
      });

      await createActivityLog(tx, {
        tokoId: service.tokoId,
        userId: user.id,
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

    revalidateServicePaths(service.tokoId);

    return { success: true };
  } catch (error) {
    console.error("Error picking up service:", error);
    return { success: false, error: "Failed to mark as picked up" };
  }
}

export async function assignTechnician(
  serviceId: string,
  technicianId: string | null
): Promise<ActionResult> {
  try {
    const { user, tokoIds } = await getSessionAndTokos();
    if (!user) return { success: false, error: "Unauthorized" };
    if (!isStaffOrAdminRole(user.role)) return { success: false, error: "Access denied" };

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { tokoId: true, technicianId: true, status: true, isPickedUp: true },
    });
    if (!service) return { success: false, error: "Service not found" };
    if (!hasTokoAccess(tokoIds, service.tokoId)) return { success: false, error: "Access denied" };
    const disabledFeatures = await getDisabledFeaturesForToko(service.tokoId);
    const assignmentError = ensureFeatureAccess(
      await getTokoScopedUser(user, service.tokoId),
      "technician.workflow",
      disabledFeatures
    );
    if (assignmentError) return assignmentError;

    if (service.isPickedUp) {
      return { success: false, error: "Cannot update a service that has been picked up" };
    }

    if (technicianId) {
      const technician = await prisma.user.findUnique({
        where: { id: technicianId },
        select: { role: true, tokoAssignments: { select: { tokoId: true } } },
      });
      if (!technician || technician.role !== "technician") {
        return { success: false, error: "Invalid technician" };
      }
      const technicianTokoIds = technician.tokoAssignments.map((assignment) => assignment.tokoId);
      if (!technicianTokoIds.includes(service.tokoId)) {
        return { success: false, error: "Technician does not belong to this toko" };
      }
    }

    const assignedAt = technicianId ? new Date() : null;
    const nextStatus = technicianId && service.status === "received" ? "repairing" : service.status;

    await prisma.$transaction(async (tx) => {
      await tx.service.update({
        where: { id: serviceId },
        data: {
          technicianId,
          assignedAt,
          status: technicianId && service.status === "received" ? "repairing" : undefined,
        },
      });

      await createActivityLog(tx, {
        tokoId: service.tokoId,
        userId: user.id,
        serviceId,
        type: "service_assigned",
        title: technicianId ? "Technician assigned to service" : "Technician unassigned from service",
        payload: {
          previousTechnicianId: service.technicianId,
          technicianId,
          previousStatus: service.status,
          nextStatus,
          assignedAt: assignedAt?.toISOString() ?? null,
        },
      });
    });

    revalidateServicePaths(service.tokoId, true);

    return { success: true };
  } catch (error) {
    console.error("Error assigning technician:", error);
    return { success: false, error: "Failed to assign technician" };
  }
}

export async function addItem(data: z.infer<typeof addItemSchema>): Promise<ActionResult> {
  try {
    const { user, tokoIds } = await getSessionAndTokos();
    if (!user) return { success: false, error: "Unauthorized" };

    const service = await prisma.service.findUnique({
      where: { id: data.serviceId },
      select: { tokoId: true, status: true, isPickedUp: true, technicianId: true, hpCatalogId: true },
    });
    if (!service) return { success: false, error: "Service not found" };
    if (!hasTokoAccess(tokoIds, service.tokoId)) return { success: false, error: "Access denied" };
    if (!isStaffOrAdminRole(user.role) && !(isTechnicianRole(user.role) && service.technicianId === user.id)) {
      return { success: false, error: "Access denied" };
    }

    if (service.isPickedUp) {
      return { success: false, error: "Cannot update a service that has been picked up" };
    }

    const validated = addItemSchema.parse(data);
    const scopedUser = await getTokoScopedUser(user, service.tokoId);
    const disabledFeatures = await getDisabledFeaturesForToko(service.tokoId);

    if (validated.type === "sparepart" && validated.servicePricelistId) {
      return { success: false, error: "Sparepart item cannot use a service pricelist" };
    }

    if (validated.type === "service" && validated.sparepartId) {
      return { success: false, error: "Service item cannot use a sparepart" };
    }

    if (validated.type === "sparepart" && validated.sparepartId) {
      const featureError = ensureFeatureAccess(scopedUser, "inventory.management", disabledFeatures);
      if (featureError) return featureError;

      const sparepart = await prisma.sparepart.findUnique({
        where: { id: validated.sparepartId },
        select: {
          stock: true,
          name: true,
          defaultPrice: true,
          tokoId: true,
          isUniversal: true,
          compatibilities: {
            where: { hpCatalogId: service.hpCatalogId },
            select: { hpCatalogId: true },
          },
        },
      });
      if (!sparepart) return { success: false, error: "Sparepart not found" };
      if (sparepart.tokoId !== service.tokoId) {
        return { success: false, error: "Sparepart not found" };
      }
      if (!sparepart.isUniversal && sparepart.compatibilities.length === 0) {
        return { success: false, error: "Sparepart is not compatible with this device" };
      }

      await prisma.$transaction(async (tx) => {
        const stockUpdate = await tx.sparepart.updateMany({
          where: {
            id: validated.sparepartId,
            tokoId: service.tokoId,
            stock: { gte: validated.qty },
          },
          data: { stock: { decrement: validated.qty } },
        });

        if (stockUpdate.count !== 1) {
          throw new Error(`Insufficient stock. Available: ${sparepart.stock}`);
        }

        await tx.serviceItem.create({
          data: {
            serviceId: validated.serviceId,
            type: validated.type,
            name: sparepart.name,
            qty: validated.qty,
            price: sparepart.defaultPrice,
            referenceId: validated.sparepartId,
          },
        });

        if (service.status === "received") {
          await tx.service.update({
            where: { id: validated.serviceId },
            data: { status: "repairing" },
          });
        }

        await createActivityLog(tx, {
          tokoId: service.tokoId,
          userId: user.id,
          serviceId: validated.serviceId,
          type: "sparepart_stock_out",
          title: "Sparepart used in service",
          payload: {
            sparepartId: validated.sparepartId,
            sparepartName: sparepart.name,
            qty: validated.qty,
            price: sparepart.defaultPrice,
          },
        });

        if (service.status === "received") {
          await createActivityLog(tx, {
            tokoId: service.tokoId,
            userId: user.id,
            serviceId: validated.serviceId,
            type: "service_status_changed",
            title: getStatusActivityTitle("repairing"),
            payload: {
              previousStatus: "received",
              nextStatus: "repairing",
              reason: "First repair item added",
            },
          });
        }
      });
    } else {
      const featureError = ensureFeatureAccess(scopedUser, "service.manualItems", disabledFeatures);
      if (featureError) return featureError;

      let itemName = validated.name;
      let itemPrice = validated.price;

      if (validated.type === "service" && validated.servicePricelistId) {
        const pricelist = await prisma.servicePricelist.findUnique({
          where: { id: validated.servicePricelistId },
          select: { title: true, defaultPrice: true, tokoId: true },
        });

        if (!pricelist || pricelist.tokoId !== service.tokoId) {
          return { success: false, error: "Service pricelist not found" };
        }

        itemName = pricelist.title;
        itemPrice = pricelist.defaultPrice;
      }

      await prisma.$transaction(async (tx) => {
        await tx.serviceItem.create({
          data: {
            serviceId: validated.serviceId,
            type: validated.type,
            name: itemName,
            qty: validated.qty,
            price: itemPrice,
            referenceId: null,
          },
        });

        if (service.status === "received") {
          await tx.service.update({
            where: { id: validated.serviceId },
            data: { status: "repairing" },
          });

          await createActivityLog(tx, {
            tokoId: service.tokoId,
            userId: user.id,
            serviceId: validated.serviceId,
            type: "service_status_changed",
            title: getStatusActivityTitle("repairing"),
            payload: {
              previousStatus: "received",
              nextStatus: "repairing",
              reason: "First repair item added",
            },
          });
        }
      });
    }

    await updateInvoiceIfAllowed(user, validated.serviceId, service.tokoId);

    revalidateServicePaths(service.tokoId);

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    if (error instanceof Error && error.message) {
      return { success: false, error: error.message };
    }
    console.error("Error adding item:", error);
    return { success: false, error: "Failed to add item" };
  }
}

export async function removeItem(itemId: string): Promise<ActionResult> {
  try {
    const { user, tokoIds } = await getSessionAndTokos();
    if (!user) return { success: false, error: "Unauthorized" };

    const item = await prisma.serviceItem.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        type: true,
        qty: true,
        referenceId: true,
        serviceId: true,
        service: { select: { tokoId: true, isPickedUp: true, technicianId: true } },
      },
    });
    if (!item) return { success: false, error: "Item not found" };
    if (!hasTokoAccess(tokoIds, item.service.tokoId)) return { success: false, error: "Access denied" };
    if (!isStaffOrAdminRole(user.role) && !(isTechnicianRole(user.role) && item.service.technicianId === user.id)) {
      return { success: false, error: "Access denied" };
    }
    if (item.service.isPickedUp) {
      return { success: false, error: "Cannot update a service that has been picked up" };
    }

    if (item.type === "sparepart" && item.referenceId) {
      await prisma.$transaction(async (tx) => {
        await tx.serviceItem.delete({ where: { id: itemId } });
        await tx.sparepart.update({
          where: { id: item.referenceId! },
          data: { stock: { increment: item.qty } },
        });

        await createActivityLog(tx, {
          tokoId: item.service.tokoId,
          userId: user.id,
          serviceId: item.serviceId,
          type: "sparepart_stock_in",
          title: "Sparepart returned to inventory",
          payload: {
            sparepartId: item.referenceId,
            qty: item.qty,
          },
        });
      });
    } else {
      await prisma.serviceItem.delete({ where: { id: itemId } });
    }

    await updateInvoiceIfAllowed(user, item.serviceId, item.service.tokoId);

    revalidateServicePaths(item.service.tokoId);

    return { success: true };
  } catch (error) {
    console.error("Error removing item:", error);
    return { success: false, error: "Failed to remove item" };
  }
}

export async function payInvoice(invoiceId: string): Promise<ActionResult> {
  try {
    const { user, tokoIds } = await getSessionAndTokos();
    if (!user) return { success: false, error: "Unauthorized" };
    if (!isStaffOrAdminRole(user.role)) return { success: false, error: "Access denied" };

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        paymentStatus: true,
        service: { select: { id: true, tokoId: true, status: true, isPickedUp: true } },
      },
    });
    if (!invoice) return { success: false, error: "Invoice not found" };
    if (!hasTokoAccess(tokoIds, invoice.service.tokoId)) return { success: false, error: "Access denied" };
    const scopedUser = await getTokoScopedUser(user, invoice.service.tokoId);
    const disabledFeatures = await getDisabledFeaturesForToko(invoice.service.tokoId);
    const invoiceError = ensureFeatureAccess(scopedUser, "service.invoice", disabledFeatures);
    if (invoiceError) return invoiceError;
    if (invoice.paymentStatus === "paid") return { success: false, error: "Invoice has already been paid" };
    if (invoice.service.status !== "done" && invoice.service.status !== "failed") {
      return { success: false, error: "Only completed services can be marked as paid" };
    }
    if (invoice.service.isPickedUp) return { success: false, error: "Service has already been picked up" };

    const paidAt = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { paymentStatus: "paid", paidAt },
      });

      await createActivityLog(tx, {
        tokoId: invoice.service.tokoId,
        userId: scopedUser.id,
        serviceId: invoice.service.id,
        type: "invoice_paid",
        title: "Invoice marked as paid",
        payload: {
          invoiceId,
          paidAt: paidAt.toISOString(),
        },
      });
    });

    revalidateServicePaths(invoice.service.tokoId);

    return { success: true };
  } catch (error) {
    console.error("Error paying invoice:", error);
    return { success: false, error: "Failed to pay invoice" };
  }
}

export async function markDpInvoice(invoiceId: string, dpAmount: number): Promise<ActionResult> {
  try {
    const { user, tokoIds } = await getSessionAndTokos();
    if (!user) return { success: false, error: "Unauthorized" };
    if (!isStaffOrAdminRole(user.role)) return { success: false, error: "Access denied" };

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        paymentStatus: true,
        service: { select: { id: true, tokoId: true, status: true, isPickedUp: true } },
      },
    });
    if (!invoice) return { success: false, error: "Invoice not found" };
    if (!hasTokoAccess(tokoIds, invoice.service.tokoId)) return { success: false, error: "Access denied" };
    const scopedUser = await getTokoScopedUser(user, invoice.service.tokoId);
    const disabledFeatures = await getDisabledFeaturesForToko(invoice.service.tokoId);
    const invoiceError = ensureFeatureAccess(scopedUser, "service.invoice", disabledFeatures);
    if (invoiceError) return invoiceError;
    if (invoice.paymentStatus === "paid" || invoice.paymentStatus === "dp") return { success: false, error: "Invoice already has DP or is paid" };
    if (dpAmount <= 0) return { success: false, error: "DP amount must be greater than zero" };

    await prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { paymentStatus: "dp", dpAmount },
      });

      await createActivityLog(tx, {
        tokoId: invoice.service.tokoId,
        userId: scopedUser.id,
        serviceId: invoice.service.id,
        type: "invoice_dp",
        title: "Invoice marked as DP",
        payload: { invoiceId, dpAmount },
      });
    });

    revalidateServicePaths(invoice.service.tokoId);

    return { success: true };
  } catch (error) {
    console.error("Error marking DP:", error);
    return { success: false, error: "Failed to mark DP" };
  }
}
