"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ServiceStatus, PaymentStatus, ItemType } from "@/prisma/generated/prisma/enums";

export type TimeFilter = "daily" | "weekly" | "monthly" | "all";

export interface ActionResult {
  success: boolean;
  error?: string;
}

export interface ActionResultWithData<T> extends ActionResult {
  data?: T;
}

export interface ServiceListItem {
  id: string;
  hpCatalogId: string;
  customerName: string | null;
  noWa: string;
  complaint: string;
  note: string | null;
  status: ServiceStatus;
  checkinAt: Date;
  doneAt: Date | null;
  checkoutAt: Date | null;
  passwordPattern: string | null;
  imei: string | null;
  hpCatalog: {
    id: string;
    modelName: string;
    brand: { name: string };
  };
  technician: { id: string; name: string } | null;
  createdBy: { name: string } | undefined;
  invoice: {
    id: string;
    grandTotal: number;
    paymentStatus: PaymentStatus;
  } | null;
}

export interface ServiceDetail extends ServiceListItem {
  tokoId: string;
  items: ServiceItem[];
}

export interface ServiceItem {
  id: string;
  type: ItemType;
  name: string;
  qty: number;
  price: number;
  referenceId: string | null;
}

export interface ServiceStats {
  total: number;
  received: number;
  repairing: number;
  done: number;
  pickedUp: number;
  failed: number;
  history?: number;
}

export interface TechnicianStats {
  totalAssigned: number;
  availableCount: number;
  inProgressCount: number;
  doneCount: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TechnicianDashboardData {
  stats: TechnicianStats;
  availableServices: ServiceListItem[];
  myTasks: ServiceDetail[];
}

const serviceSelectBase = {
  id: true,
  customerName: true,
  noWa: true,
  complaint: true,
  status: true,
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

const serviceItemSelect = {
  id: true,
  type: true,
  name: true,
  qty: true,
  price: true,
  referenceId: true,
};

function mapServiceToListItem(service: any): ServiceListItem {
  return {
    id: service.id,
    hpCatalogId: service.hpCatalog.id,
    customerName: service.customerName,
    noWa: service.noWa,
    complaint: service.complaint,
    note: service.note,
    status: service.status,
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

function buildTimeFilter(filter?: TimeFilter): Record<string, unknown> {
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

async function updateInvoiceTotal(serviceId: string) {
  const items = await prisma.serviceItem.aggregate({
    where: { serviceId },
    _sum: { price: true },
  });

  const grandTotal = (items._sum.price as number) || 0;

  await prisma.invoice.upsert({
    where: { serviceId },
    create: { serviceId, grandTotal, paymentStatus: "unpaid" },
    update: { grandTotal },
  });
}

async function getSessionAndTokos() {
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

const createServiceSchema = z.object({
  hpCatalogId: z.string().min(1),
  customerName: z.string().optional(),
  noWa: z.string().min(1),
  complaint: z.string().min(1),
  passwordPattern: z.string().optional(),
  imei: z.string().optional(),
});

const updateServiceSchema = createServiceSchema;

const addItemSchema = z.object({
  serviceId: z.string(),
  type: z.enum(["sparepart", "service"]),
  sparepartId: z.string().optional(),
  name: z.string().min(1),
  qty: z.number().int().min(1),
  price: z.number().int().min(0),
});

export async function getServiceList(
  tokoId?: string,
  timeFilter?: TimeFilter,
  page: number = 1,
  pageSize: number = 15,
  statusFilter?: ServiceStatus[]
): Promise<ActionResultWithData<PaginatedResult<ServiceListItem>>> {
  try {
    const { user, tokoIds } = await getSessionAndTokos();
    if (!user) return { success: false, error: "Unauthorized" };

    const targetTokoId = tokoId ?? tokoIds[0];
    if (!targetTokoId) return { success: false, error: "No toko found" };
    if (!tokoIds.includes(targetTokoId)) return { success: false, error: "Access denied" };

    const timeFilterCondition = buildTimeFilter(timeFilter);
    const statusCondition =
      statusFilter && statusFilter.length > 0 ? { status: { in: statusFilter } } : {};

    const totalCount = await prisma.service.count({
      where: { tokoId: targetTokoId, ...timeFilterCondition, ...statusCondition },
    });

    const skip = (page - 1) * pageSize;
    const totalPages = Math.ceil(totalCount / pageSize);

    const services = await prisma.service.findMany({
      where: { tokoId: targetTokoId, ...timeFilterCondition, ...statusCondition },
      orderBy: { checkinAt: "desc" },
      skip,
      take: pageSize,
      select: serviceSelectBase,
    });

    return {
      success: true,
      data: {
        data: services.map(mapServiceToListItem),
        total: totalCount,
        page,
        pageSize,
        totalPages,
      },
    };
  } catch (error) {
    console.error("Error fetching service list:", error);
    return { success: false, error: "Failed to fetch service list" };
  }
}

export async function getService(
  serviceId: string
): Promise<ActionResultWithData<ServiceDetail>> {
  try {
    const { user, tokoIds } = await getSessionAndTokos();
    if (!user) return { success: false, error: "Unauthorized" };

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: {
        ...serviceSelectBase,
        tokoId: true,
        items: { select: serviceItemSelect },
      },
    });

    if (!service) return { success: false, error: "Service not found" };
    if (!tokoIds.includes(service.tokoId)) return { success: false, error: "Access denied" };

    return {
      success: true,
      data: {
        ...mapServiceToListItem(service),
        tokoId: service.tokoId,
        items: service.items,
      },
    };
  } catch (error) {
    console.error("Error fetching service:", error);
    return { success: false, error: "Failed to fetch service" };
  }
}

export async function getCompletedServices(
  tokoId?: string
): Promise<ActionResultWithData<ServiceListItem[]>> {
  try {
    const { user, tokoIds } = await getSessionAndTokos();
    if (!user) return { success: false, error: "Unauthorized" };

    const targetTokoId = tokoId ?? tokoIds[0];
    if (!targetTokoId) return { success: false, error: "No toko found" };
    if (!tokoIds.includes(targetTokoId)) return { success: false, error: "Access denied" };

    const services = await prisma.service.findMany({
      where: { tokoId: targetTokoId, status: { in: ["done", "failed"] } },
      orderBy: { doneAt: "desc" },
      select: serviceSelectBase,
    });

    return { success: true, data: services.map(mapServiceToListItem) };
  } catch (error) {
    console.error("Error fetching completed services:", error);
    return { success: false, error: "Failed to fetch completed services" };
  }
}

export async function getPickedUpServices(
  tokoId?: string
): Promise<ActionResultWithData<ServiceListItem[]>> {
  try {
    const { user, tokoIds } = await getSessionAndTokos();
    if (!user) return { success: false, error: "Unauthorized" };

    const targetTokoId = tokoId ?? tokoIds[0];
    if (!targetTokoId) return { success: false, error: "No toko found" };
    if (!tokoIds.includes(targetTokoId)) return { success: false, error: "Access denied" };

    const services = await prisma.service.findMany({
      where: { tokoId: targetTokoId, status: "picked_up" },
      orderBy: { checkoutAt: "desc" },
      select: serviceSelectBase,
    });

    return { success: true, data: services.map(mapServiceToListItem) };
  } catch (error) {
    console.error("Error fetching picked up services:", error);
    return { success: false, error: "Failed to fetch picked up services" };
  }
}

export async function getAvailableTasks(
  tokoId?: string
): Promise<ActionResultWithData<ServiceListItem[]>> {
  try {
    const { user, tokoIds } = await getSessionAndTokos();
    if (!user) return { success: false, error: "Unauthorized" };

    const targetTokoId = tokoId ?? tokoIds[0];
    if (!targetTokoId) return { success: false, error: "No toko found" };
    if (!tokoIds.includes(targetTokoId)) return { success: false, error: "Access denied" };

    const services = await prisma.service.findMany({
      where: {
        tokoId: targetTokoId,
        status: "received",
        technicianId: null,
      },
      orderBy: { checkinAt: "asc" },
      take: 10,
      select: serviceSelectBase,
    });

    return { success: true, data: services.map(mapServiceToListItem) };
  } catch (error) {
    console.error("Error fetching available tasks:", error);
    return { success: false, error: "Failed to fetch available tasks" };
  }
}

export async function getMyTasks(): Promise<ActionResultWithData<ServiceDetail[]>> {
  try {
    const { user, tokoIds } = await getSessionAndTokos();
    if (!user) return { success: false, error: "Unauthorized" };

    const services = await prisma.service.findMany({
      where: { technicianId: user.id },
      orderBy: [{ status: "asc" }, { checkinAt: "asc" }],
      select: {
        ...serviceSelectBase,
        tokoId: true,
        items: { select: serviceItemSelect },
      },
    });

    return {
      success: true,
      data: services.map((s) => ({
        ...mapServiceToListItem(s),
        tokoId: s.tokoId,
        items: s.items,
      })),
    };
  } catch (error) {
    console.error("Error fetching my tasks:", error);
    return { success: false, error: "Failed to fetch tasks" };
  }
}

export async function getAllTasks(
  tokoId: string
): Promise<ActionResultWithData<ServiceDetail[]>> {
  try {
    const { user, tokoIds } = await getSessionAndTokos();
    if (!user) return { success: false, error: "Unauthorized" };
    if (!tokoIds.includes(tokoId)) return { success: false, error: "Access denied" };

    const services = await prisma.service.findMany({
      where: { tokoId, technicianId: { not: null } },
      orderBy: [{ status: "asc" }, { checkinAt: "asc" }],
      select: {
        ...serviceSelectBase,
        tokoId: true,
        items: { select: serviceItemSelect },
      },
    });

    return {
      success: true,
      data: services.map((s) => ({
        ...mapServiceToListItem(s),
        tokoId: s.tokoId,
        items: s.items,
      })),
    };
  } catch (error) {
    console.error("Error fetching all tasks:", error);
    return { success: false, error: "Failed to fetch tasks" };
  }
}

export async function getMyStats(): Promise<ActionResultWithData<TechnicianStats>> {
  try {
    const { user, tokoIds } = await getSessionAndTokos();
    if (!user) return { success: false, error: "Unauthorized" };

    const userTokoId = tokoIds[0];
    if (!userTokoId) return { success: false, error: "No toko found" };

    const [totalAssigned, availableCount, inProgressCount, doneCount] = await Promise.all([
      prisma.service.count({ where: { technicianId: user.id } }),
      prisma.service.count({
        where: { tokoId: userTokoId, status: "received", technicianId: null },
      }),
      prisma.service.count({ where: { technicianId: user.id, status: "repairing" } }),
      prisma.service.count({
        where: { technicianId: user.id, status: { in: ["done", "picked_up"] } },
      }),
    ]);

    return {
      success: true,
      data: { totalAssigned, availableCount, inProgressCount, doneCount },
    };
  } catch (error) {
    console.error("Error fetching stats:", error);
    return { success: false, error: "Failed to fetch stats" };
  }
}

export async function getTechnicianDashboard(): Promise<ActionResultWithData<TechnicianDashboardData>> {
  try {
    const { user, tokoIds } = await getSessionAndTokos();
    if (!user) return { success: false, error: "Unauthorized" };

    const userTokoId = tokoIds[0];
    if (!userTokoId) return { success: false, error: "No toko found" };

    const [
      totalAssigned,
      availableCount,
      inProgressCount,
      doneCount,
      availableServices,
      myTasks,
    ] = await Promise.all([
      prisma.service.count({ where: { technicianId: user.id } }),
      prisma.service.count({
        where: { tokoId: userTokoId, status: "received", technicianId: null },
      }),
      prisma.service.count({ where: { technicianId: user.id, status: "repairing" } }),
      prisma.service.count({
        where: { technicianId: user.id, status: { in: ["done", "picked_up"] } },
      }),
      prisma.service.findMany({
        where: { tokoId: userTokoId, status: "received", technicianId: null },
        orderBy: { checkinAt: "asc" },
        take: 10,
        select: serviceSelectBase,
      }),
      prisma.service.findMany({
        where: { technicianId: user.id, status: { in: ["received", "repairing"] } },
        orderBy: { checkinAt: "asc" },
        take: 10,
        select: {
          ...serviceSelectBase,
          tokoId: true,
          items: { select: serviceItemSelect },
        },
      }),
    ]);

    const stats: TechnicianStats = {
      totalAssigned,
      availableCount,
      inProgressCount,
      doneCount,
    };

    return {
      success: true,
      data: {
        stats,
        availableServices: availableServices.map(mapServiceToListItem),
        myTasks: myTasks.map((s) => ({
          ...mapServiceToListItem(s),
          tokoId: s.tokoId,
          items: s.items,
        })),
      },
    };
  } catch (error) {
    console.error("Error fetching technician dashboard:", error);
    return { success: false, error: "Failed to fetch dashboard data" };
  }
}

export async function getTechniciansByToko(
  tokoId: string
): Promise<ActionResultWithData<{ id: string; name: string; email: string }[]>> {
  try {
    const { user, tokoIds } = await getSessionAndTokos();
    if (!user) return { success: false, error: "Unauthorized" };
    if (!tokoIds.includes(tokoId)) return { success: false, error: "Access denied" };

    const technicians = await prisma.userToko.findMany({
      where: {
        tokoId,
        user: { role: "technician" },
      },
      select: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { user: { name: "asc" } },
    });

    return { success: true, data: technicians.map((t) => t.user) };
  } catch (error) {
    console.error("Error fetching technicians:", error);
    return { success: false, error: "Failed to fetch technicians" };
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
    if (!tokoIds.includes(targetTokoId)) return { success: false, error: "Access denied" };

    const validated = createServiceSchema.parse(data);

    const hpCatalog = await prisma.hpCatalog.findUnique({
      where: { id: validated.hpCatalogId },
    });
    if (!hpCatalog) return { success: false, error: "Device not found" };

    const service = await prisma.service.create({
      data: {
        tokoId: targetTokoId,
        hpCatalogId: validated.hpCatalogId,
        createdById: user.id,
        customerName: validated.customerName || null,
        noWa: validated.noWa,
        complaint: validated.complaint,
        passwordPattern: validated.passwordPattern || null,
        imei: validated.imei || null,
        status: "received",
      },
      select: { id: true },
    });

    revalidatePath(`/${targetTokoId}/admin/service`);
    revalidatePath(`/${targetTokoId}/admin`);

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
      select: { tokoId: true },
    });
    if (!service) return { success: false, error: "Service not found" };
    if (!tokoIds.includes(service.tokoId)) return { success: false, error: "Access denied" };

    const validated = updateServiceSchema.parse(data);

    const hpCatalog = await prisma.hpCatalog.findUnique({
      where: { id: validated.hpCatalogId },
    });
    if (!hpCatalog) return { success: false, error: "Device not found" };

    await prisma.service.update({
      where: { id: serviceId },
      data: {
        hpCatalogId: validated.hpCatalogId,
        customerName: validated.customerName || null,
        noWa: validated.noWa,
        complaint: validated.complaint,
        passwordPattern: validated.passwordPattern || null,
        imei: validated.imei || null,
      },
    });

    revalidatePath(`/${service.tokoId}/admin/service`);
    revalidatePath(`/${service.tokoId}/admin`);

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
      select: { tokoId: true, status: true, invoice: { select: { paymentStatus: true } } },
    });
    if (!service) return { success: false, error: "Service not found" };
    if (!tokoIds.includes(service.tokoId)) return { success: false, error: "Access denied" };

    if (service.status === "picked_up") {
      return { success: false, error: "Cannot delete a service that has been picked up" };
    }

    if (service.invoice?.paymentStatus === "paid") {
      return { success: false, error: "Cannot delete a service with a paid invoice" };
    }

    await prisma.$transaction([
      prisma.serviceItem.deleteMany({ where: { serviceId } }),
      prisma.invoice.deleteMany({ where: { serviceId } }),
      prisma.serviceLog.deleteMany({ where: { serviceId } }),
      prisma.notificationLog.deleteMany({ where: { serviceId } }),
      prisma.service.delete({ where: { id: serviceId } }),
    ]);

    revalidatePath(`/${service.tokoId}/admin/service`);
    revalidatePath(`/${service.tokoId}/admin`);

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

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { tokoId: true, status: true, technicianId: true },
    });
    if (!service) return { success: false, error: "Service not found" };
    if (!tokoIds.includes(service.tokoId)) return { success: false, error: "Access denied" };

    if (service.status !== "received") {
      return { success: false, error: "Service is not available" };
    }

    if (service.technicianId) {
      return { success: false, error: "Service already has a technician" };
    }

    await prisma.service.update({
      where: { id: serviceId },
      data: {
        technicianId: user.id,
        status: "repairing",
        assignedAt: new Date(),
      },
    });

    revalidatePath(`/${service.tokoId}/admin/service`);
    revalidatePath(`/${service.tokoId}/admin`);
    revalidatePath(`/${service.tokoId}/staff/tasks`);

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

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { tokoId: true },
    });
    if (!service) return { success: false, error: "Service not found" };
    if (!tokoIds.includes(service.tokoId)) return { success: false, error: "Access denied" };

    await prisma.service.update({
      where: { id: serviceId },
      data: {
        status,
        ...(status === "done" || status === "failed" ? { doneAt: new Date() } : {}),
        ...(note !== undefined ? { note } : {}),
      },
    });

    revalidatePath(`/${service.tokoId}/admin/service`);
    revalidatePath(`/${service.tokoId}/admin`);
    revalidatePath(`/${service.tokoId}/staff/tasks`);

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

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { tokoId: true, status: true },
    });
    if (!service) return { success: false, error: "Service not found" };
    if (!tokoIds.includes(service.tokoId)) return { success: false, error: "Access denied" };

    if (service.status !== "done" && service.status !== "failed") {
      return { success: false, error: "Only completed services can be marked as picked up" };
    }

    await prisma.$transaction([
      prisma.service.update({
        where: { id: serviceId },
        data: { status: "picked_up", checkoutAt: new Date() },
      }),
      prisma.invoice.updateMany({
        where: { serviceId },
        data: { paymentStatus: "paid", paidAt: new Date() },
      }),
    ]);

    revalidatePath(`/${service.tokoId}/admin/service`);
    revalidatePath(`/${service.tokoId}/admin`);

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

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { tokoId: true, technicianId: true, status: true },
    });
    if (!service) return { success: false, error: "Service not found" };
    if (!tokoIds.includes(service.tokoId)) return { success: false, error: "Access denied" };

    if (technicianId) {
      const technician = await prisma.user.findUnique({
        where: { id: technicianId },
        select: { role: true, tokoAssignments: { select: { tokoId: true } } },
      });
      if (!technician || technician.role !== "technician") {
        return { success: false, error: "Invalid technician" };
      }
      const technicianTokoIds = technician.tokoAssignments.map((a) => a.tokoId);
      if (!technicianTokoIds.includes(service.tokoId)) {
        return { success: false, error: "Technician does not belong to this toko" };
      }
    }

    await prisma.service.update({
      where: { id: serviceId },
      data: {
        technicianId,
        assignedAt: technicianId ? new Date() : null,
        status: technicianId && service.status === "received" ? "repairing" : undefined,
      },
    });

    revalidatePath(`/${service.tokoId}/admin/service`);
    revalidatePath(`/${service.tokoId}/admin`);
    revalidatePath(`/${service.tokoId}/staff/tasks`);

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
      select: { tokoId: true },
    });
    if (!service) return { success: false, error: "Service not found" };
    if (!tokoIds.includes(service.tokoId)) return { success: false, error: "Access denied" };

    const validated = addItemSchema.parse(data);

    if (validated.type === "sparepart" && validated.sparepartId) {
      const sparepart = await prisma.sparepart.findUnique({
        where: { id: validated.sparepartId },
        select: { stock: true },
      });
      if (!sparepart) return { success: false, error: "Sparepart not found" };
      if (sparepart.stock < validated.qty) {
        return { success: false, error: `Insufficient stock. Available: ${sparepart.stock}` };
      }

      await prisma.$transaction([
        prisma.serviceItem.create({
          data: {
            serviceId: validated.serviceId,
            type: validated.type,
            name: validated.name,
            qty: validated.qty,
            price: validated.price,
            referenceId: validated.sparepartId,
          },
        }),
        prisma.sparepart.update({
          where: { id: validated.sparepartId },
          data: { stock: { decrement: validated.qty } },
        }),
      ]);
    } else {
      await prisma.serviceItem.create({
        data: {
          serviceId: validated.serviceId,
          type: validated.type,
          name: validated.name,
          qty: validated.qty,
          price: validated.price,
          referenceId: validated.sparepartId || null,
        },
      });
    }

    await updateInvoiceTotal(validated.serviceId);

    revalidatePath(`/${service.tokoId}/admin/service`);
    revalidatePath(`/${service.tokoId}/admin`);

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
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
        service: { select: { tokoId: true } },
      },
    });
    if (!item) return { success: false, error: "Item not found" };
    if (!tokoIds.includes(item.service.tokoId)) return { success: false, error: "Access denied" };

    if (item.type === "sparepart" && item.referenceId) {
      await prisma.$transaction([
        prisma.serviceItem.delete({ where: { id: itemId } }),
        prisma.sparepart.update({
          where: { id: item.referenceId },
          data: { stock: { increment: item.qty } },
        }),
      ]);
    } else {
      await prisma.serviceItem.delete({ where: { id: itemId } });
    }

    await updateInvoiceTotal(item.serviceId);

    revalidatePath(`/${item.service.tokoId}/admin/service`);
    revalidatePath(`/${item.service.tokoId}/admin`);

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

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { service: { select: { tokoId: true } } },
    });
    if (!invoice) return { success: false, error: "Invoice not found" };
    if (!tokoIds.includes(invoice.service.tokoId)) return { success: false, error: "Access denied" };

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { paymentStatus: "paid", paidAt: new Date() },
    });

    revalidatePath(`/${invoice.service.tokoId}/admin/service`);
    revalidatePath(`/${invoice.service.tokoId}/admin`);

    return { success: true };
  } catch (error) {
    console.error("Error paying invoice:", error);
    return { success: false, error: "Failed to pay invoice" };
  }
}

export interface TechnicianTaskStats {
  tersedia: number;
  repairing: number;
  selesai: number;
  gagal: number;
  history: number;
  total: number;
}

export async function getNavBadgeStats(tokoId: string): Promise<ActionResultWithData<ServiceStats>> {
  try {
    const { user, tokoIds } = await getSessionAndTokos();
    if (!user) return { success: false, error: "Unauthorized" };
    if (!tokoIds.includes(tokoId)) return { success: false, error: "Access denied" };

    const [received, repairing, done, picked_up, failed, history, total] = await Promise.all([
      prisma.service.count({ where: { tokoId, status: "received" } }),
      prisma.service.count({ where: { tokoId, status: "repairing" } }),
      prisma.service.count({ where: { tokoId, status: "done" } }),
      prisma.service.count({ where: { tokoId, status: "picked_up" } }),
      prisma.service.count({ where: { tokoId, status: "failed" } }),
      prisma.service.count({ where: { tokoId, status: { in: ["done", "picked_up", "failed"] } } }),
      prisma.service.count({ where: { tokoId } }),
    ]);

    return {
      success: true,
      data: { received, repairing, done, pickedUp: picked_up, failed, history, total },
    };
  } catch (error) {
    console.error("Error fetching nav badge stats:", error);
    return { success: false, error: "Failed to fetch stats" };
  }
}

export async function getTechnicianTaskBadgeStats(
  tokoId: string
): Promise<ActionResultWithData<TechnicianTaskStats>> {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const userTokoAssignments = await prisma.userToko.findMany({
      where: { userId: session.user.id },
      select: { tokoId: true },
    });
    const tokoIds = userTokoAssignments.map((a) => a.tokoId);
    if (!tokoIds.includes(tokoId)) return { success: false, error: "Access denied" };

    const [tersedia, repairing, selesai, gagal, history, total] = await Promise.all([
      prisma.service.count({
        where: { tokoId, status: "received", technicianId: null },
      }),
      prisma.service.count({
        where: { technicianId: session.user.id, status: "repairing" },
      }),
      prisma.service.count({
        where: { technicianId: session.user.id, status: { in: ["done", "picked_up"] } },
      }),
      prisma.service.count({
        where: { technicianId: session.user.id, status: "failed" },
      }),
      prisma.service.count({
        where: { technicianId: session.user.id, status: { in: ["done", "picked_up", "failed"] } },
      }),
      prisma.service.count({
        where: { technicianId: session.user.id },
      }),
    ]);

    return {
      success: true,
      data: { tersedia, repairing, selesai, gagal, history, total },
    };
  } catch (error) {
    console.error("Error fetching technician task stats:", error);
    return { success: false, error: "Failed to fetch stats" };
  }
}