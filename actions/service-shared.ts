import prisma from "@/lib/prisma";
import type { Prisma } from "@/prisma/generated/prisma/client";
import type { PaymentStatus, RepairOrderStatus, SalesPaymentMethod } from "@/prisma/generated/prisma/enums";
import type { JsonValue } from "@/prisma/generated/prisma/internal/prismaNamespace";
import type { RepairOrderItem, ServiceListItem, TimeFilter } from "./service-types";

export const technicianAvailableStatuses: RepairOrderStatus[] = ["received", "repairing"];
export const technicianTaskListLimit = 20;

export const serviceSelectBase = {
  id: true,
  customerName: true,
  noWa: true,
  complaint: true,
  handlingNote: true,
  includedItems: true,
  status: true,
  isPickedUp: true,
  checkinAt: true,
  doneAt: true,
  warrantyUntil: true,
  checkoutAt: true,
  passwordPattern: true,
  imei: true,
  note: true,
  deviceModel: {
    select: {
      id: true,
      modelName: true,
      brand: { select: { name: true } },
    },
  },
  technician: {
    select: { id: true, name: true },
  },
  createdBy: {
    select: { name: true },
  },
  invoice: {
    select: {
      id: true,
      grandTotal: true,
      paymentStatus: true,
      paymentMethod: true,
      dpAmount: true,
      discountAmount: true,
      paidAt: true,
      createdAt: true,
      items: {
        select: {
          id: true,
          type: true,
          name: true,
          qty: true,
          price: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  },
  warrantyClaims: {
    select: {
      id: true,
      status: true,
      resolution: true,
      reason: true,
      customerNote: true,
      technicianNote: true,
      refundAmount: true,
      resolvedNote: true,
      createdAt: true,
      resolvedAt: true,
      createdBy: { select: { name: true } },
      resolvedBy: { select: { name: true } },
      items: {
        select: {
          id: true,
          inventoryItemId: true,
          name: true,
          qty: true,
          price: true,
        },
      },
      supplierReturns: {
        select: {
          id: true,
          status: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  },
} satisfies Prisma.RepairOrderSelect;

export const serviceItemSelect = {
  id: true,
  type: true,
  name: true,
  qty: true,
  price: true,
  referenceId: true,
} satisfies Prisma.RepairOrderItemSelect;

export type ServiceWithSelectBase = {
  id: string;
  customerName: string | null;
  noWa: string;
  complaint: string;
  handlingNote: string | null;
  includedItems: JsonValue | null;
  status: RepairOrderStatus;
  isPickedUp: boolean;
  checkinAt: Date;
  doneAt: Date | null;
  warrantyUntil: Date | null;
  checkoutAt: Date | null;
  passwordPattern: string | null;
  imei: string | null;
  note: string | null;
  deviceModel: {
    id: string;
    modelName: string;
    brand: { name: string };
  };
  technician: { id: string; name: string } | null;
  createdBy: { name: string } | null;
  invoice: {
    id: string;
    grandTotal: number;
    paymentStatus: PaymentStatus;
    paymentMethod: SalesPaymentMethod | null;
    dpAmount: number;
    discountAmount: number;
    paidAt: Date | null;
    createdAt: Date;
    items: Array<{
      id: string;
      type: RepairOrderItem["type"];
      name: string;
      qty: number;
      price: number;
    }>;
  } | null;
  warrantyClaims: ServiceListItem["warrantyClaims"];
};

export type ServiceWithItems = ServiceWithSelectBase & {
  storeId: string;
  items: RepairOrderItem[];
};

export function mapServiceToListItem(service: ServiceWithSelectBase): ServiceListItem {
  return {
    id: service.id,
    deviceModelId: service.deviceModel.id,
    customerName: service.customerName,
    noWa: service.noWa,
    complaint: service.complaint,
    handlingNote: service.handlingNote,
    includedItems: service.includedItems as string[] | null,
    note: service.note,
    status: service.status,
    isPickedUp: service.isPickedUp,
    checkinAt: service.checkinAt,
    doneAt: service.doneAt,
    warrantyUntil: service.warrantyUntil,
    checkoutAt: service.checkoutAt,
    passwordPattern: service.passwordPattern,
    imei: service.imei,
    deviceModel: {
      id: service.deviceModel.id,
      modelName: service.deviceModel.modelName,
      brand: { name: service.deviceModel.brand.name },
    },
    technician: service.technician,
    createdBy: service.createdBy ?? undefined,
    invoice: service.invoice,
    warrantyClaims: service.warrantyClaims,
  };
}

export async function getAvailableTaskRecords(storeId: string, userId: string, take?: number) {
  return prisma.repairOrder.findMany({
    where: {
      storeId,
      status: { in: technicianAvailableStatuses },
      OR: [{ technicianId: null }, { technicianId: { not: userId } }],
    },
    orderBy: { checkinAt: "asc" },
    ...(take ? { take } : {}),
    select: serviceSelectBase,
  });
}

export async function getMyTaskRecords(
  storeId: string,
  userId: string,
  statuses: RepairOrderStatus[],
  take: number | undefined,
  includeItems: true
): Promise<ServiceWithItems[]>;
export async function getMyTaskRecords(
  storeId: string,
  userId: string,
  statuses: RepairOrderStatus[],
  take?: number,
  includeItems?: false
): Promise<ServiceWithSelectBase[]>;
export async function getMyTaskRecords(
  storeId: string,
  userId: string,
  statuses: RepairOrderStatus[],
  take?: number,
  includeItems: boolean = false
): Promise<ServiceWithSelectBase[] | ServiceWithItems[]> {
  return prisma.repairOrder.findMany({
    where: {
      storeId,
      technicianId: userId,
      status: { in: statuses },
    },
    orderBy: [{ status: "asc" }, { checkinAt: "asc" }],
    ...(take ? { take } : {}),
    select: includeItems
      ? {
          ...serviceSelectBase,
          storeId: true,
          items: { select: serviceItemSelect },
        }
      : serviceSelectBase,
  });
}

export function buildTimeFilter(filter?: TimeFilter): Record<string, unknown> {
  if (!filter || filter === "all") return {};

  const now = new Date();
  let startDate: Date;

  switch (filter) {
    case "daily":
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "weekly":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "monthly":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      return {};
  }

  return { checkinAt: { gte: startDate } };
}

export async function updateInvoiceTotal(repairOrderId: string) {
  const existingInvoice = await prisma.repairInvoice.findUnique({
    where: { repairOrderId },
    select: { id: true, paymentStatus: true },
  });

  if (existingInvoice?.paymentStatus === "paid") {
    throw new Error("Cannot update items on a paid invoice");
  }

  await prisma.$transaction(async (tx) => {
    const items = await tx.repairOrderItem.findMany({
      where: { repairOrderId },
      select: { id: true, type: true, referenceId: true, name: true, qty: true, price: true },
      orderBy: { id: "asc" },
    });

    const grandTotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);

    const invoice = await tx.repairInvoice.upsert({
      where: { repairOrderId },
      create: { repairOrderId, grandTotal, paymentStatus: "unpaid" },
      update: { grandTotal },
      select: { id: true },
    });

    await tx.repairInvoiceItem.deleteMany({ where: { repairInvoiceId: invoice.id } });

    if (items.length > 0) {
      await tx.repairInvoiceItem.createMany({
        data: items.map((item) => ({
          repairInvoiceId: invoice.id,
          repairOrderItemId: item.id,
          type: item.type,
          referenceId: item.referenceId,
          name: item.name,
          qty: item.qty,
          price: item.price,
        })),
      });
    }
  });

  return { created: !existingInvoice };
}

export function isCompletingStatus(status: RepairOrderStatus) {
  return status === "done" || status === "failed";
}

export function getStatusActivityTitle(status: RepairOrderStatus | "picked_up") {
  switch (status) {
    case "done":
      return "Service marked as done";
    case "failed":
      return "Service marked as failed";
    case "picked_up":
      return "Service marked as picked up";
    case "repairing":
      return "Service moved to repairing";
    case "received":
      return "Service moved to received";
    default:
      return `Service status changed to ${status}`;
  }
}

export function isTechnicianRole(role: string | null | undefined) {
  return role === "technician";
}
