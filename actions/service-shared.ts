import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import type { PaymentStatus, ServiceStatus } from "@/prisma/generated/prisma/enums";
import type { ServiceItem, ServiceListItem, TimeFilter } from "./service-types";

export const technicianAvailableStatuses: ServiceStatus[] = ["received", "repairing"];
export const technicianTaskListLimit = 20;

export const serviceSelectBase = {
  id: true,
  customerName: true,
  noWa: true,
  complaint: true,
  status: true,
  isPickedUp: true,
  checkinAt: true,
  doneAt: true,
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
    },
  },
};

export const serviceItemSelect = {
  id: true,
  type: true,
  name: true,
  qty: true,
  price: true,
  referenceId: true,
};

export type ServiceWithSelectBase = {
  id: string;
  customerName: string | null;
  noWa: string;
  complaint: string;
  status: ServiceStatus;
  isPickedUp: boolean;
  checkinAt: Date;
  doneAt: Date | null;
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
    note: service.note,
    status: service.status,
    isPickedUp: service.isPickedUp,
    checkinAt: service.checkinAt,
    doneAt: service.doneAt,
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
    select: { id: true },
  });

  const items = await prisma.serviceItem.findMany({
    where: { serviceId },
    select: { qty: true, price: true },
  });

  const grandTotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  await prisma.invoice.upsert({
    where: { serviceId },
    create: { serviceId, grandTotal, paymentStatus: "unpaid" },
    update: { grandTotal },
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
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user) {
    return { user: null, tokoIds: [] };
  }

  const userTokoAssignments = await prisma.userToko.findMany({
    where: { userId: session.user.id },
    select: { tokoId: true },
  });

  const tokoIds = userTokoAssignments.map((a) => a.tokoId);

  return { user: session.user, tokoIds };
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
