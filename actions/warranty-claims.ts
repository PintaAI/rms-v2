"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { createActivityLog } from "@/lib/activity-log";
import { assertFeature } from "@/lib/auth/request-scope";
import { withScope } from "@/lib/auth/wrapper";
import { revalidateServicePaths } from "@/lib/revalidation";
import type { ActionResult, ActionResultWithData } from "./service-types";

const createWarrantyClaimSchema = z.object({
  serviceId: z.string().min(1),
  reason: z.string().trim().min(3, "Alasan klaim wajib diisi"),
  customerNote: z.string().trim().optional(),
});

const resolveWarrantyClaimSchema = z.object({
  claimId: z.string().min(1),
  resolution: z.enum(["free_repair", "replace_part", "cash_refund", "partial_refund", "no_action"]),
  refundAmount: z.number().int().min(0).optional(),
  technicianNote: z.string().trim().optional(),
  resolvedNote: z.string().trim().optional(),
  items: z.array(z.object({
    sparepartId: z.string().min(1),
    qty: z.number().int().min(1),
  })).optional(),
});

export async function createWarrantyClaim(
  data: z.infer<typeof createWarrantyClaimSchema>
): Promise<ActionResultWithData<{ id: string }>> {
  const validated = createWarrantyClaimSchema.safeParse(data);
  if (!validated.success) return { success: false, error: validated.error.issues[0].message };

  const service = await prisma.service.findUnique({
    where: { id: validated.data.serviceId },
    select: {
      id: true,
      tokoId: true,
      status: true,
      isPickedUp: true,
      warrantyUntil: true,
      warrantyClaims: { where: { status: "open" }, select: { id: true }, take: 1 },
    },
  });
  if (!service) return { success: false, error: "Service not found" };
  if (!service.isPickedUp) return { success: false, error: "Klaim hanya bisa dibuat setelah service diambil" };
  if (service.status !== "done" && service.status !== "failed") return { success: false, error: "Klaim hanya bisa dibuat untuk service selesai" };
  if (service.warrantyClaims.length > 0) return { success: false, error: "Masih ada klaim terbuka untuk service ini" };

  return withScope(service.tokoId, { role: ["admin", "staff"] }, async (scope) => {
    const claim = await prisma.$transaction(async (tx) => {
      const created = await tx.warrantyClaim.create({
        data: {
          tokoId: scope.tokoId,
          serviceId: service.id,
          reason: validated.data.reason,
          customerNote: validated.data.customerNote || null,
          createdById: scope.user.id,
        },
        select: { id: true },
      });

      await createActivityLog(tx, {
        tokoId: scope.tokoId,
        userId: scope.user.id,
        serviceId: service.id,
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

    revalidateServicePaths(scope.tokoId);
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
      tokoId: true,
      status: true,
      serviceId: true,
      service: { select: { hpCatalogId: true } },
    },
  });
  if (!claim) return { success: false, error: "Klaim tidak ditemukan" };
  if (claim.status !== "open") return { success: false, error: "Klaim sudah ditutup" };

  const resolution = validated.data.resolution;
  const refundAmount = validated.data.refundAmount ?? 0;
  const items = validated.data.items ?? [];

  if ((resolution === "cash_refund" || resolution === "partial_refund") && refundAmount <= 0) {
    return { success: false, error: "Nominal refund wajib lebih dari nol" };
  }
  if (resolution === "replace_part" && items.length === 0) {
    return { success: false, error: "Pilih minimal satu sparepart pengganti" };
  }
  if (resolution !== "replace_part" && items.length > 0) {
    return { success: false, error: "Sparepart hanya boleh dipilih untuk solusi ganti sparepart" };
  }

  return withScope(claim.tokoId, { role: ["admin", "staff"] }, async (scope) => {
    if (resolution === "replace_part") assertFeature(scope, "inventory.management");

    const resolvedAt = new Date();
    const nextStatus = resolution === "no_action" ? "rejected" as const : "resolved" as const;
    const claimItems: Array<{ sparepartId: string; name: string; qty: number; price: number }> = [];

    await prisma.$transaction(async (tx) => {
      if (resolution === "replace_part") {
        for (const item of items) {
          const sparepart = await tx.sparepart.findUnique({
            where: { id: item.sparepartId },
            select: {
              id: true,
              tokoId: true,
              name: true,
              stock: true,
              defaultPrice: true,
              isUniversal: true,
              compatibilities: {
                where: { hpCatalogId: claim.service.hpCatalogId },
                select: { hpCatalogId: true },
              },
            },
          });
          if (!sparepart || sparepart.tokoId !== claim.tokoId) throw new Error("Sparepart tidak ditemukan");
          if (!sparepart.isUniversal && sparepart.compatibilities.length === 0) {
            throw new Error(`Sparepart ${sparepart.name} tidak kompatibel dengan device ini`);
          }

          const stockUpdate = await tx.sparepart.updateMany({
            where: { id: item.sparepartId, tokoId: claim.tokoId, stock: { gte: item.qty } },
            data: { stock: { decrement: item.qty } },
          });
          if (stockUpdate.count !== 1) throw new Error(`Stok ${sparepart.name} tidak cukup. Tersedia: ${sparepart.stock}`);

          claimItems.push({
            sparepartId: sparepart.id,
            name: sparepart.name,
            qty: item.qty,
            price: sparepart.defaultPrice,
          });
        }
      }

      await tx.warrantyClaim.update({
        where: { id: claim.id },
        data: {
          status: nextStatus,
          resolution,
          refundAmount,
          technicianNote: validated.data.technicianNote || null,
          resolvedNote: validated.data.resolvedNote || null,
          resolvedBy: { connect: { id: scope.user.id } },
          resolvedAt,
          items: claimItems.length > 0 ? {
            create: claimItems.map((item) => ({
              name: item.name,
              qty: item.qty,
              price: item.price,
              sparepart: { connect: { id: item.sparepartId } },
            })),
          } : undefined,
        },
      });

      await createActivityLog(tx, {
        tokoId: scope.tokoId,
        userId: scope.user.id,
        serviceId: claim.serviceId,
        type: "warranty_claim_resolved",
        title: nextStatus === "rejected" ? "Warranty claim rejected" : "Warranty claim resolved",
        payload: {
          claimId: claim.id,
          status: nextStatus,
          resolution,
          refundAmount,
          items: claimItems,
          technicianNote: validated.data.technicianNote || null,
          resolvedNote: validated.data.resolvedNote || null,
          resolvedAt: resolvedAt.toISOString(),
        },
      });

      if (claimItems.length > 0) {
        for (const item of claimItems) {
          await createActivityLog(tx, {
            tokoId: scope.tokoId,
            userId: scope.user.id,
            serviceId: claim.serviceId,
            type: "sparepart_stock_out",
            title: "Sparepart used in warranty claim",
            payload: { claimId: claim.id, sparepartId: item.sparepartId, sparepartName: item.name, qty: item.qty, price: item.price },
          });
        }
      }
    });

    revalidateServicePaths(scope.tokoId);
    return { success: true };
  });
}
