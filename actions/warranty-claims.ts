"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { createActivityLog } from "@/lib/activity-log";
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
  resolution: z.enum(["free_repair", "cash_refund", "no_action"]),
  refundAmount: z.number().int().min(0).optional(),
  technicianNote: z.string().trim().optional(),
  resolvedNote: z.string().trim().optional(),
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
  if (!service) return { success: false, error: "Service tidak ditemukan" };
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
    },
  });
  if (!claim) return { success: false, error: "Klaim tidak ditemukan" };
  if (claim.status !== "open") return { success: false, error: "Klaim sudah ditutup" };

  const resolution = validated.data.resolution;
  const refundAmount = validated.data.refundAmount ?? 0;

  if (resolution === "cash_refund" && refundAmount <= 0) {
    return { success: false, error: "Nominal refund wajib lebih dari nol" };
  }

  return withScope(claim.tokoId, { role: ["admin", "staff"] }, async (scope) => {
    const resolvedAt = new Date();
    const nextStatus = resolution === "no_action" ? "rejected" as const : "resolved" as const;

    await prisma.$transaction(async (tx) => {
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
        tokoId: scope.tokoId,
        userId: scope.user.id,
        serviceId: claim.serviceId,
        type: "warranty_claim_resolved",
        title: nextStatus === "rejected" ? "Warranty claim rejected" : "Warranty claim resolved",
        payload: {
          claimId: claim.id,
          status: nextStatus,
          resolution,
          refundAmount: resolution === "cash_refund" ? refundAmount : 0,
          technicianNote: validated.data.technicianNote || null,
          resolvedNote: validated.data.resolvedNote || null,
          resolvedAt: resolvedAt.toISOString(),
        },
      });
    });

    revalidateServicePaths(scope.tokoId);
    return { success: true };
  });
}
