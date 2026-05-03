import prisma from "@/lib/prisma";
import { getRequestUser } from "@/lib/auth/request-user";
import type { Prisma } from "@/prisma/generated/prisma/client";
import type { PaymentStatus, ServiceStatus } from "@/prisma/generated/prisma/enums";
import type { JsonValue } from "@/prisma/generated/prisma/internal/prismaNamespace";
import type { ServiceItem, ServiceListItem, TimeFilter } from "./service-types";

export const technicianAvailableStatuses: ServiceStatus[] = ["received", "repairing"];
export const technicianTaskListLimit = 20;

export const serviceSelectBase = {
  id: true,
  customerName: true,
  noWa: true,
  complaint: true,
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
  hpCatalog: {
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
} satisfies Prisma.ServiceSelect;

export const serviceItemSelect = {
  id: true,
  type: true,
  name: true,
  qty: true,
  price: true,
  referenceId: true,
} satisfies Prisma.ServiceItemSelect;

export type ServiceWithSelectBase = {
  id: string;
  customerName: string | null;
  noWa: string;
  complaint: string;
  includedItems: JsonValue | null;
  status: ServiceStatus;
  isPickedUp: boolean;
  checkinAt: Date;
  doneAt: Date | null;
  warrantyUntil: Date | null;
  checkoutAt: Date | null;
  passwordPattern: string | null;
  imei: string | null;
  note: string | null;
  hpCatalog: {
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
    dpAmount: number;
    discountAmount: number;
    paidAt: Date | null;
    createdAt: Date;
    items: Array<{
      id: string;
      type: ServiceItem["type"];
      name: string;
      qty: number;
      price: number;
    }>;
  } | null;
};

export type ServiceWithItems = ServiceWithSelectBase & {
  tokoId: string;
  items: ServiceItem[];
};

export function mapServiceToListItem(service: ServiceWithSelectBase): ServiceListItem {
  return {
    id: service.id,
    hpCatalogId: service.hpCatalog.id,
    customerName: service.customerName,
    noWa: service.noWa,
    complaint: service.complaint,
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
    hpCatalog: {
      id: service.hpCatalog.id,
      modelName: service.hpCatalog.modelName,
      brand: { name: service.hpCatalog.brand.name },
    },
    technician: service.technician,
    createdBy: service.createdBy ?? undefined,
    invoice: service.invoice,
  };
}

export async function getAvailableTaskRecords(tokoId: string, userId: string, take?: number) {
  return prisma.service.findMany({
    where: {
      tokoId,
      status: { in: technicianAvailableStatuses },
      OR: [{ technicianId: null }, { technicianId: { not: userId } }],
    },
    orderBy: { checkinAt: "asc" },
    ...(take ? { take } : {}),
    select: serviceSelectBase,
  });
}

export async function getMyTaskRecords(
  tokoId: string,
  userId: string,
  statuses: ServiceStatus[],
  take: number | undefined,
  includeItems: true
): Promise<ServiceWithItems[]>;
export async function getMyTaskRecords(
  tokoId: string,
  userId: string,
  statuses: ServiceStatus[],
  take?: number,
  includeItems?: false
): Promise<ServiceWithSelectBase[]>;
export async function getMyTaskRecords(
  tokoId: string,
  userId: string,
  statuses: ServiceStatus[],
  take?: number,
  includeItems: boolean = false
): Promise<ServiceWithSelectBase[] | ServiceWithItems[]> {
  return prisma.service.findMany({
    where: {
      tokoId,
      technicianId: userId,
      status: { in: statuses },
    },
    orderBy: [{ status: "asc" }, { checkinAt: "asc" }],
    ...(take ? { take } : {}),
    select: includeItems
      ? {
          ...serviceSelectBase,
          tokoId: true,
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

export async function updateInvoiceTotal(serviceId: string) {
  const existingInvoice = await prisma.invoice.findUnique({
    where: { serviceId },
    select: { id: true, paymentStatus: true },
  });

  if (existingInvoice?.paymentStatus === "paid") {
    throw new Error("Cannot update items on a paid invoice");
  }

  await prisma.$transaction(async (tx) => {
    const items = await tx.serviceItem.findMany({
      where: { serviceId },
      select: { id: true, type: true, referenceId: true, name: true, qty: true, price: true },
      orderBy: { id: "asc" },
    });

    const grandTotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);

    const invoice = await tx.invoice.upsert({
      where: { serviceId },
      create: { serviceId, grandTotal, paymentStatus: "unpaid" },
      update: { grandTotal },
      select: { id: true },
    });

    await tx.invoiceItem.deleteMany({ where: { invoiceId: invoice.id } });

    if (items.length > 0) {
      await tx.invoiceItem.createMany({
        data: items.map((item) => ({
          invoiceId: invoice.id,
          serviceItemId: item.id,
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

export function isCompletingStatus(status: ServiceStatus) {
  return status === "done" || status === "failed";
}

export function getStatusActivityTitle(status: ServiceStatus | "picked_up") {
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

export async function getSessionAndTokos() {
  const user = await getRequestUser();

  if (!user) {
    return { user: null, tokoIds: [] };
  }

  return { user, tokoIds: user.tokoIds };
}

export function hasTokoAccess(tokoIds: string[], tokoId: string) {
  return tokoIds.includes(tokoId);
}

export function isStaffOrAdminRole(role: string | null | undefined) {
  return role === "admin" || role === "staff";
}

export function isTechnicianRole(role: string | null | undefined) {
  return role === "technician";
}

export function isTechnicianOrAdminRole(role: string | null | undefined) {
  return role === "technician" || role === "admin";
}
