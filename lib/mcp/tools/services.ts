import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { assertFeature, assertPermission, can, type RequestScope } from "@/lib/auth/request-scope";
import { ensureMonthlyActivityLimit } from "@/lib/auth/enforcement";
import { createActivityLog, preserveDeletedServiceActivityLogs } from "@/lib/activity-log";
import { revalidateServicePaths } from "@/lib/revalidation";
import { syncWhatsappIdentityFromPhone } from "@/lib/whatsapp-identity";
import { validateIndonesianWhatsappNumber } from "@/lib/whatsapp-number";
import { ok, toolError, getMcpScope, assertMcpWriteScope, parseDateFilter } from "@/lib/mcp/tools/utils";
import type { RepairOrderStatus } from "@/prisma/generated/prisma/enums";
import type { Prisma } from "@/prisma/generated/prisma/client";

const statusSchema = z.enum(["received", "repairing", "done", "failed"]);
const availableTaskStatuses: RepairOrderStatus[] = ["received", "repairing"];
const repairOrderInputSchema = {
  deviceModelId: z.string().trim().min(1).describe("Device model ID from search_device_catalog."),
  customerName: z.string().trim().optional().describe("Customer name."),
  noWa: z.string().trim().min(1).describe("Indonesian WhatsApp number, for example 08123456789 or 6281234567890."),
  complaint: z.string().trim().min(1).describe("Customer complaint or repair issue."),
  handlingNote: z.string().trim().optional().describe("Internal handling note."),
  includedItems: z.array(z.string().trim().min(1)).optional().describe("Items received with the device, for example charger or case."),
  passwordPattern: z.string().trim().optional().describe("Device password or pattern note, if provided by customer."),
  imei: z.string().trim().optional().describe("Device IMEI or serial identifier."),
  dpAmount: z.number().int().min(0).optional().describe("Down payment amount. Requires invoice permissions."),
};

type RepairOrderInput = {
  deviceModelId: string;
  customerName?: string;
  noWa: string;
  complaint: string;
  handlingNote?: string;
  includedItems?: string[];
  passwordPattern?: string;
  imei?: string;
  dpAmount?: number;
};

type ActivityDbClient = Parameters<typeof createActivityLog>[0];

function validateRepairOrderInput(data: RepairOrderInput) {
  const whatsapp = validateIndonesianWhatsappNumber(data.noWa);
  if (!whatsapp.valid) {
    throw new Error("Format WhatsApp harus nomor Indonesia aktif, contoh 08123456789 atau 6281234567890");
  }
}

async function assertRepairOrderWriteAccess(scope: RequestScope, permission: "service.create" | "service.update" | "service.delete") {
  assertMcpWriteScope();
  assertFeature(scope, "service.management");
  assertPermission(scope, permission);
}

async function ensureDeviceModelExists(deviceModelId: string) {
  const deviceModel = await prisma.deviceModel.findUnique({
    where: { id: deviceModelId },
    select: { id: true },
  });
  if (!deviceModel) throw new Error("Device not found");
}

async function createOrUpdateDpInvoice(
  tx: ActivityDbClient,
  scope: RequestScope,
  repairOrderId: string,
  dpAmount?: number,
) {
  if (!dpAmount || dpAmount <= 0) return;

  assertPermission(scope, "service.manageInvoice");
  const existingInvoice = await tx.repairInvoice.findUnique({
    where: { repairOrderId },
    select: { id: true },
  });

  if (!existingInvoice) assertPermission(scope, "service.createInvoice");

  if (existingInvoice) {
    await tx.repairInvoice.update({
      where: { repairOrderId },
      data: { dpAmount, paymentStatus: "dp" },
    });
  } else {
    await tx.repairInvoice.create({
      data: { repairOrderId, grandTotal: 0, paymentStatus: "dp", dpAmount },
    });
  }

  await createActivityLog(tx, {
    storeId: scope.storeId,
    userId: scope.user.id,
    repairOrderId,
    type: "invoice_dp",
    title: "Invoice marked as DP",
    payload: { dpAmount },
  });
}

export function registerServiceTools(server: McpServer) {
  server.registerTool(
    "create_repair_order",
    {
      title: "Create Repair Order",
      description: "Create a new repair order in the current RMS store. Requires OAuth scope rms:write and service.create permission.",
      inputSchema: repairOrderInputSchema,
    },
    async (input) => {
      try {
        const scope = await getMcpScope();
        await assertRepairOrderWriteAccess(scope, "service.create");
        validateRepairOrderInput(input);

        if (input.dpAmount && input.dpAmount > 0) {
          assertPermission(scope, "service.createInvoice");
          assertPermission(scope, "service.manageInvoice");
        }

        const limitError = await ensureMonthlyActivityLimit(scope.user, "maxServicesMonthly", "service_created", scope.storeId);
        if (limitError) throw new Error(limitError.error);

        await ensureDeviceModelExists(input.deviceModelId);

        const repairOrder = await prisma.$transaction(async (tx) => {
          const created = await tx.repairOrder.create({
            data: {
              storeId: scope.storeId,
              deviceModelId: input.deviceModelId,
              createdById: scope.user.id,
              customerName: input.customerName || null,
              noWa: input.noWa,
              complaint: input.complaint,
              handlingNote: input.handlingNote || null,
              includedItems: input.includedItems || undefined,
              passwordPattern: input.passwordPattern || null,
              imei: input.imei || null,
              status: "received",
            },
            select: { id: true },
          });

          await createOrUpdateDpInvoice(tx, scope, created.id, input.dpAmount);
          await createActivityLog(tx, {
            storeId: scope.storeId,
            userId: scope.user.id,
            repairOrderId: created.id,
            type: "service_created",
            title: "Service created",
            payload: {
              source: "mcp",
              deviceModelId: input.deviceModelId,
              customerName: input.customerName || null,
              noWa: input.noWa,
              complaint: input.complaint,
              handlingNote: input.handlingNote || null,
              includedItems: input.includedItems || undefined,
            },
          });

          return created;
        });

        revalidateServicePaths(scope.storeId);
        syncWhatsappIdentityFromPhone({
          storeId: scope.storeId,
          phoneNumber: input.noWa,
          displayName: input.customerName || null,
        }).catch((error) => console.warn("[WhatsApp:identity.mcpServiceCreate]", error));

        return ok("Created repair order.", { id: repairOrder.id });
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    "update_repair_order",
    {
      title: "Update Repair Order",
      description: "Update repair order details in the current RMS store. Requires OAuth scope rms:write and service.update permission. Picked-up repairs cannot be updated.",
      inputSchema: {
        id: z.string().trim().min(1).describe("Repair order ID."),
        ...repairOrderInputSchema,
      },
    },
    async ({ id, ...input }) => {
      try {
        const scope = await getMcpScope();
        await assertRepairOrderWriteAccess(scope, "service.update");
        validateRepairOrderInput(input);

        const existing = await prisma.repairOrder.findFirst({
          where: { id, storeId: scope.storeId },
          select: { id: true, isPickedUp: true },
        });
        if (!existing) throw new Error("Service tidak ditemukan");
        if (existing.isPickedUp) throw new Error("Tidak dapat memperbarui service yang sudah diambil");

        await ensureDeviceModelExists(input.deviceModelId);

        await prisma.$transaction(async (tx) => {
          await tx.repairOrder.update({
            where: { id },
            data: {
              deviceModelId: input.deviceModelId,
              customerName: input.customerName || null,
              noWa: input.noWa,
              complaint: input.complaint,
              handlingNote: input.handlingNote || null,
              includedItems: input.includedItems || undefined,
              passwordPattern: input.passwordPattern || null,
              imei: input.imei || null,
            },
          });

          await createOrUpdateDpInvoice(tx, scope, id, input.dpAmount);
          await createActivityLog(tx, {
            storeId: scope.storeId,
            userId: scope.user.id,
            repairOrderId: id,
            type: "service_updated",
            title: "Service details updated",
            payload: {
              source: "mcp",
              deviceModelId: input.deviceModelId,
              customerName: input.customerName || null,
              noWa: input.noWa,
              complaint: input.complaint,
              handlingNote: input.handlingNote || null,
              includedItems: input.includedItems || undefined,
              imei: input.imei || null,
              hasPasswordPattern: Boolean(input.passwordPattern),
            },
          });
        });

        revalidateServicePaths(scope.storeId);
        syncWhatsappIdentityFromPhone({
          storeId: scope.storeId,
          phoneNumber: input.noWa,
          displayName: input.customerName || null,
        }).catch((error) => console.warn("[WhatsApp:identity.mcpServiceUpdate]", error));

        return ok("Updated repair order.", { id });
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    "delete_repair_order",
    {
      title: "Delete Repair Order",
      description: "Permanently delete a repair order in the current RMS store. This cannot be undone. Requires OAuth scope rms:write and service.delete permission. Picked-up or paid/DP repairs cannot be deleted.",
      inputSchema: {
        id: z.string().trim().min(1).describe("Repair order ID to permanently delete."),
      },
    },
    async ({ id }) => {
      try {
        const scope = await getMcpScope();
        await assertRepairOrderWriteAccess(scope, "service.delete");

        const service = await prisma.repairOrder.findFirst({
          where: { id, storeId: scope.storeId },
          select: {
            id: true,
            storeId: true,
            customerName: true,
            noWa: true,
            complaint: true,
            handlingNote: true,
            status: true,
            isPickedUp: true,
            imei: true,
            note: true,
            deviceModel: { select: { id: true, modelName: true, brand: { select: { name: true } } } },
            invoice: { select: { paymentStatus: true } },
          },
        });
        if (!service) throw new Error("Service tidak ditemukan");
        if (service.isPickedUp) throw new Error("Tidak dapat menghapus service yang sudah diambil");
        if (service.invoice?.paymentStatus === "paid" || service.invoice?.paymentStatus === "dp") {
          throw new Error("Tidak dapat menghapus service dengan invoice lunas");
        }

        const serviceItems = await prisma.repairOrderItem.findMany({
          where: { repairOrderId: id },
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
            storeId: scope.storeId,
            userId: scope.user.id,
            repairOrderId: id,
            type: "service_deleted",
            title: "Service deleted",
            payload: { source: "mcp" },
          });

          await preserveDeletedServiceActivityLogs(tx, id, service);

          for (const item of serviceItems) {
            if (item.type === "inventory_item" && item.referenceId && item.inventoryItem) {
              const updatedInventoryItem = await tx.inventoryItem.update({
                where: { id: item.referenceId },
                data: { stock: { increment: item.qty } },
              });

              await tx.inventoryMovement.create({
                data: {
                  storeId: scope.storeId,
                  inventoryItemId: item.referenceId,
                  type: "repair_delete_return",
                  qtyChange: item.qty,
                  stockBefore: updatedInventoryItem.stock - item.qty,
                  stockAfter: updatedInventoryItem.stock,
                  unitCostSnapshot: item.inventoryItem.purchasePrice,
                  unitPriceSnapshot: item.inventoryItem.defaultPrice,
                  referenceType: "service",
                  referenceId: id,
                  note: "Service deleted by MCP, stock returned",
                  createdById: scope.user.id,
                },
              });
            }
          }

          await tx.repairOrderItem.deleteMany({ where: { repairOrderId: id } });
          await tx.repairInvoice.deleteMany({ where: { repairOrderId: id } });
          await tx.repairOrder.delete({ where: { id } });
        });

        revalidateServicePaths(scope.storeId);
        return ok("Deleted repair order.", { id });
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    "list_repair_orders",
    {
      title: "List Repair Orders",
      description: "List repair orders for the current RMS store with optional status, customer, device, technician, and date filters.",
      inputSchema: {
        query: z.string().trim().optional().describe("Search customer name, WhatsApp number, IMEI, complaint, notes, technician, brand, or model."),
        statuses: z.array(statusSchema).optional().describe("Filter by one or more repair statuses."),
        from: z.string().optional().describe("Check-in start date/time. Accepts YYYY-MM-DD (interpreted as local start-of-day) or a full ISO 8601 timestamp."),
        to: z.string().optional().describe("Check-in end date/time. Accepts YYYY-MM-DD (interpreted as local end-of-day, 23:59:59.999) or a full ISO 8601 timestamp."),
        pageSize: z.number().int().min(1).max(50).optional().describe("Items per page. Defaults to 20."),
        skip: z.number().int().min(0).optional().describe("Number of repair orders to skip. Defaults to 0."),
      },
    },
    async ({ query, statuses, from, to, pageSize = 20, skip = 0 }) => {
      try {
        const scope = await getMcpScope();
        assertPermission(scope, "service.view");

        const shouldLimitToAssignedTasks = can(scope, "service.takeOverTask") && !can(scope, "service.create");
        const trimmedQuery = query?.trim();
        const checkinAt: Prisma.DateTimeFilter = {
          ...(from ? { gte: parseDateFilter(from, "start") } : {}),
          ...(to ? { lte: parseDateFilter(to, "end") } : {}),
        };
        const where: Prisma.RepairOrderWhereInput = {
          storeId: scope.storeId,
          ...(statuses?.length ? { status: { in: statuses as RepairOrderStatus[] } } : {}),
          ...(Object.keys(checkinAt).length ? { checkinAt } : {}),
          ...(shouldLimitToAssignedTasks
            ? {
                OR: [
                  { technicianId: scope.user.id },
                  { technicianId: null, status: { in: availableTaskStatuses } },
                ],
              }
            : {}),
          ...(trimmedQuery
            ? {
                AND: [
                  {
                    OR: [
                      { customerName: { contains: trimmedQuery, mode: "insensitive" as const } },
                      { noWa: { contains: trimmedQuery, mode: "insensitive" as const } },
                      { imei: { contains: trimmedQuery, mode: "insensitive" as const } },
                      { complaint: { contains: trimmedQuery, mode: "insensitive" as const } },
                      { handlingNote: { contains: trimmedQuery, mode: "insensitive" as const } },
                      { note: { contains: trimmedQuery, mode: "insensitive" as const } },
                      { technician: { name: { contains: trimmedQuery, mode: "insensitive" as const } } },
                      { deviceModel: { modelName: { contains: trimmedQuery, mode: "insensitive" as const } } },
                      { deviceModel: { brand: { name: { contains: trimmedQuery, mode: "insensitive" as const } } } },
                    ],
                  },
                ],
              }
            : {}),
        };

        const [total, repairOrders] = await Promise.all([
          prisma.repairOrder.count({ where }),
          prisma.repairOrder.findMany({
            where,
            orderBy: { checkinAt: "desc" },
            skip,
            take: pageSize,
            select: {
              id: true,
              customerName: true,
              noWa: true,
              imei: true,
              complaint: true,
              handlingNote: true,
              status: true,
              isPickedUp: true,
              checkinAt: true,
              assignedAt: true,
              doneAt: true,
              warrantyUntil: true,
              deviceModel: {
                select: {
                  id: true,
                  modelName: true,
                  brand: { select: { id: true, name: true } },
                },
              },
              technician: { select: { id: true, name: true, email: true } },
              createdBy: { select: { id: true, name: true, email: true } },
              invoice: { select: { id: true, grandTotal: true, paymentStatus: true, dpAmount: true, discountAmount: true, paidAt: true } },
            },
          }),
        ]);

        return ok(`Found ${repairOrders.length} repair orders.`, { repairOrders, total, pageSize, skip, hasMore: skip + repairOrders.length < total });
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    "get_repair_order",
    {
      title: "Get Repair Order",
      description: "Get one repair order with its line items and invoice for the current RMS store.",
      inputSchema: {
        id: z.string().trim().min(1).describe("Repair order ID."),
      },
    },
    async ({ id }) => {
      try {
        const scope = await getMcpScope();
        assertPermission(scope, "service.view");

        const repairOrder = await prisma.repairOrder.findFirst({
          where: { id, storeId: scope.storeId },
          select: {
            id: true,
            customerName: true,
            noWa: true,
            imei: true,
            complaint: true,
            handlingNote: true,
            includedItems: true,
            passwordPattern: true,
            note: true,
            status: true,
            isPickedUp: true,
            checkinAt: true,
            assignedAt: true,
            doneAt: true,
            warrantyUntil: true,
            checkoutAt: true,
            deviceModel: {
              select: {
                id: true,
                modelName: true,
                modelNumber: true,
                brand: { select: { id: true, name: true } },
              },
            },
            technician: { select: { id: true, name: true, email: true } },
            createdBy: { select: { id: true, name: true, email: true } },
            items: { select: { id: true, type: true, referenceId: true, name: true, qty: true, price: true } },
            invoice: {
              select: {
                id: true,
                grandTotal: true,
                paymentStatus: true,
                dpAmount: true,
                discountAmount: true,
                paidAt: true,
                createdAt: true,
                items: { select: { id: true, type: true, referenceId: true, name: true, qty: true, price: true } },
              },
            },
          },
        });

        if (!repairOrder) throw new Error("Repair order tidak ditemukan");
        return ok("Found repair order.", repairOrder);
      } catch (error) {
        return toolError(error);
      }
    }
  );
}
