"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { createActivityLog } from "@/lib/activity-log";
import { assertFeature, assertPermission } from "@/lib/auth/request-scope";
import { withScope } from "@/lib/auth/wrapper";
import { revalidateServicePaths } from "@/lib/revalidation";
import type { ActionResult, ActionResultWithData } from "./service-types";

const createWarrantyClaimSchema = z.object({
  repairOrderId: z.string().min(1),
  reason: z.string().trim().min(3, "Alasan klaim wajib diisi"),
  customerNote: z.string().trim().optional(),
});

const resolveWarrantyClaimSchema = z.object({
  claimId: z.string().min(1),
  resolution: z.enum(["free_repair", "replace_part", "cash_refund", "no_action"]),
  refundAmount: z.number().int().min(0).optional(),
  technicianNote: z.string().trim().optional(),
  resolvedNote: z.string().trim().optional(),
  items: z.array(z.object({
    inventoryItemId: z.string().min(1),
    qty: z.number().int().min(1),
  })).optional(),
  supplierReturn: z.object({
    inventoryItemId: z.string().min(1),
    qty: z.number().int().min(1),
    supplierName: z.string().trim().optional(),
    reason: z.string().trim().min(3, "Alasan retur wajib diisi"),
    note: z.string().trim().optional(),
  }).optional(),
});

export async function createWarrantyClaim(
  data: z.infer<typeof createWarrantyClaimSchema>
): Promise<ActionResultWithData<{ id: string }>> {
  const validated = createWarrantyClaimSchema.safeParse(data);
  if (!validated.success) return { success: false, error: validated.error.issues[0].message };

  const service = await prisma.repairOrder.findUnique({
    where: { id: validated.data.repairOrderId },
    select: {
      id: true,
      storeId: true,
      status: true,
      isPickedUp: true,
      warrantyUntil: true,
      warrantyClaims: { where: { status: "open" }, select: { id: true }, take: 1 },
    },
  });
  if (!service) return { success: false, error: "Service tidak ditemukan" };
  if (!service.isPickedUp) return { success: false, error: "Klaim hanya bisa dibuat setelah service diambil" };
  if (service.status !== "done" && service.status !== "failed") return { success: false, error: "Klaim hanya bisa dibuat untuk service selesai" };
  if (service.warrantyClaims.length > 0) return { success: false, error: "Masih ada klaim terbuka untuk service ini" };

  return withScope(service.storeId, {}, async (scope) => {
    assertPermission(scope, "warranty.create");

    const claim = await prisma.$transaction(async (tx) => {
      const created = await tx.warrantyClaim.create({
        data: {
          storeId: scope.storeId,
          repairOrderId: service.id,
          reason: validated.data.reason,
          customerNote: validated.data.customerNote || null,
          createdById: scope.user.id,
        },
        select: { id: true },
      });

      await createActivityLog(tx, {
        storeId: scope.storeId,
        userId: scope.user.id,
        repairOrderId: service.id,
        type: "warranty_claim_created",
        title: "Warranty claim created",
        payload: {
          claimId: created.id,
          reason: validated.data.reason,
          customerNote: validated.data.customerNote || null,
          warrantyUntil: service.warrantyUntil?.toISOString() ?? null,
        },
      });

      return created;
    });

    revalidateServicePaths(scope.storeId);
    return claim;
  });
}

export async function resolveWarrantyClaim(
  data: z.infer<typeof resolveWarrantyClaimSchema>
): Promise<ActionResult> {
  const validated = resolveWarrantyClaimSchema.safeParse(data);
  if (!validated.success) return { success: false, error: validated.error.issues[0].message };

  const claim = await prisma.warrantyClaim.findUnique({
    where: { id: validated.data.claimId },
    select: {
      id: true,
      storeId: true,
      status: true,
      repairOrderId: true,
      repairOrder: { select: { deviceModelId: true } },
    },
  });
  if (!claim) return { success: false, error: "Klaim tidak ditemukan" };
  if (claim.status !== "open") return { success: false, error: "Klaim sudah ditutup" };

  const resolution = validated.data.resolution;
  const refundAmount = validated.data.refundAmount ?? 0;
  const items = validated.data.items ?? [];
  const supplierReturn = validated.data.supplierReturn;

  if (resolution === "cash_refund" && refundAmount <= 0) {
    return { success: false, error: "Nominal refund wajib lebih dari nol" };
  }
  if (resolution === "replace_part" && items.length === 0) {
    return { success: false, error: "Pilih minimal satu sparepart pengganti" };
  }
  if (resolution !== "replace_part" && items.length > 0) {
    return { success: false, error: "Sparepart hanya boleh dipilih untuk solusi ganti sparepart" };
  }
  if (supplierReturn && resolution !== "replace_part") {
    return { success: false, error: "Retur supplier hanya boleh dibuat untuk solusi ganti sparepart" };
  }

  return withScope(claim.storeId, {}, async (scope) => {
    assertPermission(scope, "warranty.resolve");

    if (resolution === "replace_part") assertFeature(scope, "inventory.management");

    const resolvedAt = new Date();
    const nextStatus = resolution === "no_action" ? "rejected" as const : "resolved" as const;
    const claimItems: Array<{ inventoryItemId: string; name: string; qty: number; price: number }> = [];

    await prisma.$transaction(async (tx) => {
      if (resolution === "replace_part") {
        for (const item of items) {
          const inventoryItem = await tx.inventoryItem.findUnique({
            where: { id: item.inventoryItemId },
            select: {
              id: true,
              storeId: true,
              name: true,
              stock: true,
              defaultPrice: true,
              purchasePrice: true,
              isUniversal: true,
              compatibilities: {
                where: { deviceModelId: claim.repairOrder.deviceModelId },
                select: { deviceModelId: true },
              },
            },
          });
          if (!inventoryItem || inventoryItem.storeId !== claim.storeId) throw new Error("Sparepart tidak ditemukan");
          if (!inventoryItem.isUniversal && inventoryItem.compatibilities.length === 0) {
            throw new Error(`Sparepart ${inventoryItem.name} tidak kompatibel dengan device ini`);
          }

          const stockUpdate = await tx.inventoryItem.updateMany({
            where: { id: item.inventoryItemId, storeId: claim.storeId, stock: { gte: item.qty } },
            data: { stock: { decrement: item.qty } },
          });
          if (stockUpdate.count !== 1) throw new Error(`Stok ${inventoryItem.name} tidak cukup. Tersedia: ${inventoryItem.stock}`);

          const updatedSparepart = await tx.inventoryItem.findUniqueOrThrow({
            where: { id: item.inventoryItemId },
            select: { stock: true },
          });

          const claimItem = await tx.warrantyClaimItem.create({
            data: {
              warrantyClaimId: claim.id,
              inventoryItemId: inventoryItem.id,
              name: inventoryItem.name,
              qty: item.qty,
              price: inventoryItem.defaultPrice,
            },
            select: { id: true },
          });

          await tx.inventoryMovement.create({
            data: {
              storeId: claim.storeId,
              inventoryItemId: inventoryItem.id,
              type: "repair_usage",
              qtyChange: -item.qty,
              stockBefore: updatedSparepart.stock + item.qty,
              stockAfter: updatedSparepart.stock,
              unitCostSnapshot: inventoryItem.purchasePrice,
              unitPriceSnapshot: inventoryItem.defaultPrice,
              referenceType: "warranty_claim_item",
              referenceId: claimItem.id,
              note: "Sparepart used in warranty claim",
              createdById: scope.user.id,
            },
          });

          claimItems.push({
            inventoryItemId: inventoryItem.id,
            name: inventoryItem.name,
            qty: item.qty,
            price: inventoryItem.defaultPrice,
          });
        }
      }

      if (supplierReturn) {
        const returnedSparepart = await tx.inventoryItem.findUnique({
          where: { id: supplierReturn.inventoryItemId },
          select: { id: true, storeId: true, name: true, type: true },
        });
        if (!returnedSparepart || returnedSparepart.storeId !== claim.storeId || returnedSparepart.type !== "repair_part") {
          throw new Error("Sparepart retur tidak ditemukan");
        }

        const createdSupplierReturn = await tx.supplierReturn.create({
          data: {
            storeId: claim.storeId,
            warrantyClaimId: claim.id,
            inventoryItemId: returnedSparepart.id,
            qty: supplierReturn.qty,
            supplierName: supplierReturn.supplierName || null,
            reason: supplierReturn.reason,
            note: supplierReturn.note || null,
            createdById: scope.user.id,
          },
          select: { id: true },
        });

        await createActivityLog(tx, {
          storeId: scope.storeId,
          userId: scope.user.id,
          repairOrderId: claim.repairOrderId,
          type: "supplier_return_created",
          title: "Supplier return created from warranty claim",
          payload: {
            supplierReturnId: createdSupplierReturn.id,
            warrantyClaimId: claim.id,
            inventoryItemId: returnedSparepart.id,
            qty: supplierReturn.qty,
            supplierName: supplierReturn.supplierName || null,
            reason: supplierReturn.reason,
          },
        });
      }

      await tx.warrantyClaim.update({
        where: { id: claim.id },
        data: {
          status: nextStatus,
          resolution,
          refundAmount: resolution === "cash_refund" ? refundAmount : 0,
          technicianNote: validated.data.technicianNote || null,
          resolvedNote: validated.data.resolvedNote || null,
          resolvedBy: { connect: { id: scope.user.id } },
          resolvedAt,
        },
      });

      await createActivityLog(tx, {
        storeId: scope.storeId,
        userId: scope.user.id,
        repairOrderId: claim.repairOrderId,
        type: "warranty_claim_resolved",
        title: nextStatus === "rejected" ? "Warranty claim rejected" : "Warranty claim resolved",
        payload: {
          claimId: claim.id,
          status: nextStatus,
          resolution,
          refundAmount: resolution === "cash_refund" ? refundAmount : 0,
          items: claimItems,
          technicianNote: validated.data.technicianNote || null,
          resolvedNote: validated.data.resolvedNote || null,
          resolvedAt: resolvedAt.toISOString(),
        },
      });

      for (const item of claimItems) {
        await createActivityLog(tx, {
          storeId: scope.storeId,
          userId: scope.user.id,
          repairOrderId: claim.repairOrderId,
          type: "sparepart_stock_out",
          title: "Sparepart used in warranty claim",
          payload: { claimId: claim.id, inventoryItemId: item.inventoryItemId, inventoryItemName: item.name, qty: item.qty, price: item.price },
        });
      }
    });

    revalidateServicePaths(scope.storeId);
    return { success: true };
  });
}
