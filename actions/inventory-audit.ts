"use server";

import { z } from "zod";
import { createActivityLog } from "@/lib/activity-log";
import prisma from "@/lib/prisma";
import { canAccessToko, getAuthUser, isAdmin, type ActionResult, type ActionResultWithData } from "@/lib/rbac";
import { revalidateInventoryPaths } from "@/lib/revalidation";
import { Prisma } from "@/prisma/generated/prisma/client";

const mismatchReasons = [
  "used_in_service_not_recorded",
  "lost",
  "damaged",
  "incoming_stock_not_recorded",
  "previous_stock_error",
  "physical_count_error",
  "other",
] as const;

const tokoIdSchema = z.string().min(1, "Toko is required");
const sessionIdSchema = z.string().min(1, "Audit session is required");

const updateInventoryAuditItemSchema = z.object({
  itemId: z.string().min(1, "Audit item is required"),
  physicalStock: z.number().int().min(0, "Physical stock must be 0 or greater").nullable(),
  mismatchReason: z.enum(mismatchReasons).optional().nullable(),
  note: z.string().trim().max(500, "Note must be 500 characters or fewer").optional().nullable(),
});

export type InventoryAuditMismatchReason = (typeof mismatchReasons)[number];

export type InventoryAuditItemData = {
  id: string;
  sessionId: string;
  sparepartId: string;
  sparepartName: string;
  systemStock: number;
  physicalStock: number | null;
  snapshotPrice: number;
  status: "pending" | "matched" | "discrepancy";
  mismatchReason: InventoryAuditMismatchReason | null;
  note: string | null;
  difference: number;
  missingQty: number;
  excessQty: number;
  differenceValue: number;
  potentialLostValue: number;
};

export type InventoryAuditSessionData = {
  id: string;
  tokoId: string;
  createdById: string;
  status: "active" | "completed" | "cancelled";
  startedAt: Date;
  completedAt: Date | null;
  cancelledAt: Date | null;
  createdBy: { id: string; name: string };
  items: InventoryAuditItemData[];
  summary: InventoryAuditSummary;
};

export type InventoryAuditSummary = {
  totalItems: number;
  countedItems: number;
  pendingItems: number;
  discrepancyItems: number;
  missingQty: number;
  excessQty: number;
  differenceValue: number;
  potentialLostValue: number;
};

export type InventoryAuditOverview = {
  activeSession: InventoryAuditSessionData | null;
  recentSessions: InventoryAuditSessionData[];
};

async function getInventoryAuditUser(tokoId: string, requireWriteAccess = false) {
  const user = await getAuthUser();

  if (!user) {
    return { success: false as const, error: "Unauthorized" };
  }

  if (!canAccessToko(user, tokoId)) {
    return { success: false as const, error: "Access denied" };
  }

  if (requireWriteAccess && !isAdmin(user)) {
    return { success: false as const, error: "Only admins can manage inventory audits" };
  }

  return { success: true as const, user };
}

function calculateItemValues(systemStock: number, physicalStock: number, snapshotPrice: number) {
  const difference = physicalStock - systemStock;
  const missingQty = Math.max(-difference, 0);
  const excessQty = Math.max(difference, 0);

  return {
    difference,
    missingQty,
    excessQty,
    differenceValue: Math.abs(difference) * snapshotPrice,
    potentialLostValue: missingQty * snapshotPrice,
    status: difference === 0 ? "matched" as const : "discrepancy" as const,
  };
}

function buildSummary(items: InventoryAuditItemData[]): InventoryAuditSummary {
  return items.reduce<InventoryAuditSummary>(
    (summary, item) => ({
      totalItems: summary.totalItems + 1,
      countedItems: summary.countedItems + (item.physicalStock === null ? 0 : 1),
      pendingItems: summary.pendingItems + (item.status === "pending" ? 1 : 0),
      discrepancyItems: summary.discrepancyItems + (item.status === "discrepancy" ? 1 : 0),
      missingQty: summary.missingQty + item.missingQty,
      excessQty: summary.excessQty + item.excessQty,
      differenceValue: summary.differenceValue + item.differenceValue,
      potentialLostValue: summary.potentialLostValue + item.potentialLostValue,
    }),
    {
      totalItems: 0,
      countedItems: 0,
      pendingItems: 0,
      discrepancyItems: 0,
      missingQty: 0,
      excessQty: 0,
      differenceValue: 0,
      potentialLostValue: 0,
    }
  );
}

type SessionWithItems = Awaited<ReturnType<typeof findAuditSessions>>[number];

function mapSession(session: SessionWithItems): InventoryAuditSessionData {
  const items = session.items.map((item) => ({
    id: item.id,
    sessionId: item.sessionId,
    sparepartId: item.sparepartId,
    sparepartName: item.sparepartName,
    systemStock: item.systemStock,
    physicalStock: item.physicalStock,
    snapshotPrice: item.snapshotPrice,
    status: item.status,
    mismatchReason: item.mismatchReason,
    note: item.note,
    difference: item.difference,
    missingQty: item.missingQty,
    excessQty: item.excessQty,
    differenceValue: item.differenceValue,
    potentialLostValue: item.potentialLostValue,
  }));

  return {
    id: session.id,
    tokoId: session.tokoId,
    createdById: session.createdById,
    status: session.status,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    cancelledAt: session.cancelledAt,
    createdBy: session.createdBy,
    items,
    summary: buildSummary(items),
  };
}

function findAuditSessions(tokoId: string) {
  return prisma.inventoryAuditSession.findMany({
    where: { tokoId },
    orderBy: { startedAt: "desc" },
    take: 10,
    include: {
      createdBy: { select: { id: true, name: true } },
      items: { orderBy: { sparepartName: "asc" } },
    },
  });
}

export async function getInventoryAuditOverview(
  tokoId: string
): Promise<ActionResultWithData<InventoryAuditOverview>> {
  try {
    const validatedTokoId = tokoIdSchema.parse(tokoId);
    const access = await getInventoryAuditUser(validatedTokoId);
    if (!access.success) return access;

    const sessions = await findAuditSessions(validatedTokoId);
    const mappedSessions = sessions.map(mapSession);

    return {
      success: true,
      data: {
        activeSession: mappedSessions.find((session) => session.status === "active") ?? null,
        recentSessions: mappedSessions.filter((session) => session.status !== "active"),
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error fetching inventory audit overview:", error);
    return { success: false, error: "Failed to fetch inventory audit overview" };
  }
}

export async function startInventoryAudit(
  tokoId: string
): Promise<ActionResultWithData<InventoryAuditSessionData>> {
  try {
    const validatedTokoId = tokoIdSchema.parse(tokoId);
    const access = await getInventoryAuditUser(validatedTokoId, true);
    if (!access.success) return access;

    const session = await prisma.$transaction(
      async (tx) => {
        const activeSession = await tx.inventoryAuditSession.findFirst({
          where: { tokoId: validatedTokoId, status: "active" },
          select: { id: true },
        });

        if (activeSession) {
          throw new Error("An active inventory audit already exists for this toko");
        }

        const spareparts = await tx.sparepart.findMany({
          where: { tokoId: validatedTokoId },
          orderBy: { name: "asc" },
          select: { id: true, name: true, stock: true, defaultPrice: true },
        });

        const createdSession = await tx.inventoryAuditSession.create({
          data: {
            tokoId: validatedTokoId,
            createdById: access.user.id,
            items: {
              create: spareparts.map((sparepart) => ({
                sparepartId: sparepart.id,
                sparepartName: sparepart.name,
                systemStock: sparepart.stock,
                snapshotPrice: sparepart.defaultPrice,
              })),
            },
          },
          include: {
            createdBy: { select: { id: true, name: true } },
            items: { orderBy: { sparepartName: "asc" } },
          },
        });

        await createActivityLog(tx, {
          tokoId: validatedTokoId,
          userId: access.user.id,
          type: "inventory_audit_started",
          title: "Inventory audit started",
          payload: {
            sessionId: createdSession.id,
            totalItems: spareparts.length,
          },
        });

        return createdSession;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    revalidateInventoryPaths(validatedTokoId);

    return { success: true, data: mapSession(session) };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    if (error instanceof Error && error.message) {
      return { success: false, error: error.message };
    }
    console.error("Error starting inventory audit:", error);
    return { success: false, error: "Failed to start inventory audit" };
  }
}

export async function updateInventoryAuditItem(
  data: z.infer<typeof updateInventoryAuditItemSchema>
): Promise<ActionResultWithData<InventoryAuditItemData>> {
  try {
    const validated = updateInventoryAuditItemSchema.parse(data);

    const item = await prisma.inventoryAuditItem.findUnique({
      where: { id: validated.itemId },
      include: { session: { select: { tokoId: true, status: true } } },
    });

    if (!item) {
      return { success: false, error: "Inventory audit item not found" };
    }

    const access = await getInventoryAuditUser(item.session.tokoId, true);
    if (!access.success) return access;

    if (item.session.status !== "active") {
      return { success: false, error: "Only active inventory audits can be updated" };
    }

    const calculated = validated.physicalStock === null
      ? {
          difference: 0,
          missingQty: 0,
          excessQty: 0,
          differenceValue: 0,
          potentialLostValue: 0,
          status: "pending" as const,
        }
      : calculateItemValues(item.systemStock, validated.physicalStock, item.snapshotPrice);
    const updated = await prisma.inventoryAuditItem.update({
      where: { id: item.id },
      data: {
        physicalStock: validated.physicalStock,
        status: calculated.status,
        mismatchReason: calculated.status === "discrepancy" ? validated.mismatchReason ?? null : null,
        note: validated.note || null,
        difference: calculated.difference,
        missingQty: calculated.missingQty,
        excessQty: calculated.excessQty,
        differenceValue: calculated.differenceValue,
        potentialLostValue: calculated.potentialLostValue,
      },
    });

    revalidateInventoryPaths(item.session.tokoId);

    return {
      success: true,
      data: {
        id: updated.id,
        sessionId: updated.sessionId,
        sparepartId: updated.sparepartId,
        sparepartName: updated.sparepartName,
        systemStock: updated.systemStock,
        physicalStock: updated.physicalStock,
        snapshotPrice: updated.snapshotPrice,
        status: updated.status,
        mismatchReason: updated.mismatchReason,
        note: updated.note,
        difference: updated.difference,
        missingQty: updated.missingQty,
        excessQty: updated.excessQty,
        differenceValue: updated.differenceValue,
        potentialLostValue: updated.potentialLostValue,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error updating inventory audit item:", error);
    return { success: false, error: "Failed to update inventory audit item" };
  }
}

export async function completeInventoryAudit(sessionId: string): Promise<ActionResult> {
  try {
    const validatedSessionId = sessionIdSchema.parse(sessionId);

    const session = await prisma.inventoryAuditSession.findUnique({
      where: { id: validatedSessionId },
      include: { items: true },
    });

    if (!session) {
      return { success: false, error: "Inventory audit session not found" };
    }

    const access = await getInventoryAuditUser(session.tokoId, true);
    if (!access.success) return access;

    if (session.status !== "active") {
      return { success: false, error: "Only active inventory audits can be completed" };
    }

    if (session.items.some((item) => item.physicalStock === null || item.status === "pending")) {
      return { success: false, error: "All audit items must be counted before completing" };
    }

    if (session.items.some((item) => item.status === "discrepancy" && !item.mismatchReason)) {
      return { success: false, error: "All mismatched audit items must have a reason" };
    }

    const completedAt = new Date();

    await prisma.$transaction(
      async (tx) => {
        for (const item of session.items) {
          const update = await tx.sparepart.updateMany({
            where: {
              id: item.sparepartId,
              tokoId: session.tokoId,
              stock: item.systemStock,
            },
            data: { stock: item.physicalStock! },
          });

          if (update.count !== 1) {
            throw new Error(
              `Stock changed during audit for ${item.sparepartName}. Review the audit and restart if needed.`
            );
          }

          if (item.difference !== 0) {
            await createActivityLog(tx, {
              tokoId: session.tokoId,
              userId: access.user.id,
              type: "inventory_audit_stock_adjusted",
              title: "Inventory audit stock adjusted",
              payload: {
                sessionId: session.id,
                sparepartId: item.sparepartId,
                sparepartName: item.sparepartName,
                systemStock: item.systemStock,
                physicalStock: item.physicalStock,
                difference: item.difference,
                mismatchReason: item.mismatchReason,
              },
            });
          }
        }

        await tx.inventoryAuditSession.update({
          where: { id: session.id },
          data: { status: "completed", completedAt },
        });

        const summary = buildSummary(session.items.map((item) => ({ ...item, status: item.status })));

        await createActivityLog(tx, {
          tokoId: session.tokoId,
          userId: access.user.id,
          type: "inventory_audit_completed",
          title: "Inventory audit completed",
          payload: {
            sessionId: session.id,
            completedAt: completedAt.toISOString(),
            ...summary,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    revalidateInventoryPaths(session.tokoId);

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    if (error instanceof Error && error.message) {
      return { success: false, error: error.message };
    }
    console.error("Error completing inventory audit:", error);
    return { success: false, error: "Failed to complete inventory audit" };
  }
}

export async function cancelInventoryAudit(sessionId: string): Promise<ActionResult> {
  try {
    const validatedSessionId = sessionIdSchema.parse(sessionId);

    const session = await prisma.inventoryAuditSession.findUnique({
      where: { id: validatedSessionId },
      select: { id: true, tokoId: true, status: true },
    });

    if (!session) {
      return { success: false, error: "Inventory audit session not found" };
    }

    const access = await getInventoryAuditUser(session.tokoId, true);
    if (!access.success) return access;

    if (session.status !== "active") {
      return { success: false, error: "Only active inventory audits can be cancelled" };
    }

    const cancelledAt = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.inventoryAuditSession.update({
        where: { id: session.id },
        data: { status: "cancelled", cancelledAt },
      });

      await createActivityLog(tx, {
        tokoId: session.tokoId,
        userId: access.user.id,
        type: "inventory_audit_cancelled",
        title: "Inventory audit cancelled",
        payload: {
          sessionId: session.id,
          cancelledAt: cancelledAt.toISOString(),
        },
      });
    });

    revalidateInventoryPaths(session.tokoId);

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error cancelling inventory audit:", error);
    return { success: false, error: "Failed to cancel inventory audit" };
  }
}
