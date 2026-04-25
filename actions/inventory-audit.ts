"use server";

import { z } from "zod";
import { createActivityLog } from "@/lib/activity-log";
import { ensureFeatureAccess } from "@/lib/feature-enforcement";
import { getDisabledFeaturesForToko } from "@/actions/feature-settings";
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

const completeInventoryAuditSchema = z.object({
  sessionId: sessionIdSchema,
  items: z.array(updateInventoryAuditItemSchema),
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
  matchedItems: number;
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

  const featureError = ensureFeatureAccess(user, "inventory.audit", await getDisabledFeaturesForToko(tokoId));
  if (featureError) return { success: false as const, error: featureError.error ?? "Access denied" };

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
      matchedItems: summary.matchedItems + (item.status === "matched" ? 1 : 0),
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
      matchedItems: 0,
      discrepancyItems: 0,
      missingQty: 0,
      excessQty: 0,
      differenceValue: 0,
      potentialLostValue: 0,
    }
  );
}

type SessionWithItems = NonNullable<Awaited<ReturnType<typeof findActiveAuditSession>>>;
type SessionWithSummary = Awaited<ReturnType<typeof findRecentAuditSessions>>[number];

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

function mapSessionSummary(session: SessionWithSummary): InventoryAuditSessionData {
  return {
    id: session.id,
    tokoId: session.tokoId,
    createdById: session.createdById,
    status: session.status,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    cancelledAt: session.cancelledAt,
    createdBy: session.createdBy,
    items: [],
    summary: {
      totalItems: session._count.items,
      countedItems: session.items.filter((item) => item.physicalStock !== null).length,
      pendingItems: session.items.filter((item) => item.status === "pending").length,
      matchedItems: session.items.filter((item) => item.status === "matched").length,
      discrepancyItems: session.items.filter((item) => item.status === "discrepancy").length,
      missingQty: session.items.reduce((total, item) => total + item.missingQty, 0),
      excessQty: session.items.reduce((total, item) => total + item.excessQty, 0),
      differenceValue: session.items.reduce((total, item) => total + item.differenceValue, 0),
      potentialLostValue: session.items.reduce((total, item) => total + item.potentialLostValue, 0),
    },
  };
}

function findActiveAuditSession(tokoId: string) {
  return prisma.inventoryAuditSession.findFirst({
    where: { tokoId, status: "active" },
    orderBy: { startedAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true } },
      items: { orderBy: { sparepartName: "asc" } },
    },
  });
}

function findRecentAuditSessions(tokoId: string) {
  return prisma.inventoryAuditSession.findMany({
    where: { tokoId, status: { not: "active" } },
    orderBy: { startedAt: "desc" },
    take: 10,
    include: {
      createdBy: { select: { id: true, name: true } },
      _count: { select: { items: true } },
      items: {
        select: {
          physicalStock: true,
          status: true,
          missingQty: true,
          excessQty: true,
          differenceValue: true,
          potentialLostValue: true,
        },
      },
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

    const [activeSession, recentSessions] = await Promise.all([
      findActiveAuditSession(validatedTokoId),
      findRecentAuditSessions(validatedTokoId),
    ]);

    return {
      success: true,
      data: {
        activeSession: activeSession ? mapSession(activeSession) : null,
        recentSessions: recentSessions.map(mapSessionSummary),
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
          },
          select: { id: true },
        });

        if (spareparts.length > 0) {
          await tx.inventoryAuditItem.createMany({
            data: spareparts.map((sparepart) => ({
              sessionId: createdSession.id,
              sparepartId: sparepart.id,
              sparepartName: sparepart.name,
              systemStock: sparepart.stock,
              snapshotPrice: sparepart.defaultPrice,
            })),
          });
        }

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

        const sessionWithItems = await tx.inventoryAuditSession.findUniqueOrThrow({
          where: { id: createdSession.id },
          include: {
            createdBy: { select: { id: true, name: true } },
            items: { orderBy: { sparepartName: "asc" } },
          },
        });

        return sessionWithItems;
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

export async function completeInventoryAudit(data: z.infer<typeof completeInventoryAuditSchema>): Promise<ActionResult> {
  try {
    const validated = completeInventoryAuditSchema.parse(data);

    const session = await prisma.inventoryAuditSession.findUnique({
      where: { id: validated.sessionId },
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

    if (validated.items.length !== session.items.length) {
      return { success: false, error: "All audit items must be submitted before completing" };
    }

    const submittedItems = new Map(validated.items.map((item) => [item.itemId, item]));
    if (submittedItems.size !== session.items.length) {
      return { success: false, error: "Audit items contain duplicates or unknown items" };
    }

    const sessionItemIds = new Set(session.items.map((item) => item.id));
    if (validated.items.some((item) => !sessionItemIds.has(item.itemId))) {
      return { success: false, error: "Audit items do not match this session" };
    }

    const items = session.items.map((item) => {
      const submitted = submittedItems.get(item.id);
      if (!submitted) throw new Error(`Missing submitted audit item ${item.sparepartName}`);

      const calculated = submitted.physicalStock === null
        ? {
            difference: 0,
            missingQty: 0,
            excessQty: 0,
            differenceValue: 0,
            potentialLostValue: 0,
            status: "pending" as const,
          }
        : calculateItemValues(item.systemStock, submitted.physicalStock, item.snapshotPrice);

      return {
        ...item,
        physicalStock: submitted.physicalStock,
        status: calculated.status,
        mismatchReason: calculated.status === "discrepancy" ? submitted.mismatchReason ?? null : null,
        note: submitted.note || null,
        difference: calculated.difference,
        missingQty: calculated.missingQty,
        excessQty: calculated.excessQty,
        differenceValue: calculated.differenceValue,
        potentialLostValue: calculated.potentialLostValue,
      };
    });

    if (items.some((item) => item.physicalStock === null || item.status === "pending")) {
      return { success: false, error: "All audit items must be counted before completing" };
    }

    if (items.some((item) => item.status === "discrepancy" && !item.mismatchReason)) {
      return { success: false, error: "All mismatched audit items must have a reason" };
    }

    const completedAt = new Date();

    await prisma.$transaction(
      async (tx) => {
        for (const item of items) {
          await tx.inventoryAuditItem.update({
            where: { id: item.id },
            data: {
              physicalStock: item.physicalStock,
              status: item.status,
              mismatchReason: item.mismatchReason,
              note: item.note,
              difference: item.difference,
              missingQty: item.missingQty,
              excessQty: item.excessQty,
              differenceValue: item.differenceValue,
              potentialLostValue: item.potentialLostValue,
            },
          });
        }

        if (items.length > 0) {
          const updatedStocks = await tx.$queryRaw<{ id: string }[]>`
            UPDATE "sparepart" AS s
            SET "stock" = v."physicalStock"
            FROM (VALUES ${Prisma.join(
              items.map((item) => Prisma.sql`(${item.sparepartId}, ${session.tokoId}, ${item.systemStock}, ${item.physicalStock!})`)
            )}) AS v("id", "tokoId", "systemStock", "physicalStock")
            WHERE s."id" = v."id"
              AND s."tokoId" = v."tokoId"
              AND s."stock" = v."systemStock"
            RETURNING s."id"
          `;

          if (updatedStocks.length !== items.length) {
            throw new Error("Stock changed during audit for one or more spareparts. Review the audit and restart if needed.");
          }
        }

        const adjustedItems = items.filter((item) => item.difference !== 0);
        if (adjustedItems.length > 0) {
          await tx.activityLog.createMany({
            data: adjustedItems.map((item) => ({
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
            })),
          });
        }

        await tx.inventoryAuditSession.update({
          where: { id: session.id },
          data: { status: "completed", completedAt },
        });

        const summary = buildSummary(items.map((item) => ({ ...item, status: item.status })));

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
