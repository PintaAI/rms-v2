"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import {
  connectWhatsappInstance,
  createWhatsappInstance,
  deleteWhatsappInstance,
  getWhatsappConnectionState,
} from "@/lib/evolution";
import { canAccessToko, getAuthUser, isAdmin, type ActionResultWithData } from "@/lib/rbac";

const updateWhatsappSettingSchema = z.object({
  enabled: z.boolean().optional(),
  notifyDone: z.boolean().optional(),
  notifyFailed: z.boolean().optional(),
  doneMessageTemplate: z.string().trim().nullable().optional(),
  failedMessageTemplate: z.string().trim().nullable().optional(),
});

export interface TokoWhatsappSettingData {
  tokoId: string;
  tokoName: string;
  instanceName: string;
  enabled: boolean;
  connectionState: string | null;
  connectedNumber: string | null;
  notifyDone: boolean;
  notifyFailed: boolean;
  doneMessageTemplate: string | null;
  failedMessageTemplate: string | null;
  lastConnectedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type UpdateTokoWhatsappSettingInput = z.infer<typeof updateWhatsappSettingSchema>;

function getInstanceName(tokoId: string) {
  return `rms-store-${tokoId}`;
}

function isExistingInstanceError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes("already") || message.includes("exist") || message.includes("409");
}

function getConnectionState(response: unknown) {
  if (!response || typeof response !== "object") return null;

  const record = response as Record<string, unknown>;
  const instance = record.instance;

  if (typeof record.state === "string") return record.state;
  if (typeof record.connectionState === "string") return record.connectionState;
  if (instance && typeof instance === "object") {
    const instanceRecord = instance as Record<string, unknown>;
    if (typeof instanceRecord.state === "string") return instanceRecord.state;
    if (typeof instanceRecord.connectionStatus === "string") return instanceRecord.connectionStatus;
  }

  return null;
}

function getConnectedNumber(response: unknown) {
  if (!response || typeof response !== "object") return null;

  const record = response as Record<string, unknown>;
  const instance = record.instance;

  if (typeof record.number === "string") return record.number;
  if (typeof record.connectedNumber === "string") return record.connectedNumber;
  if (instance && typeof instance === "object") {
    const instanceRecord = instance as Record<string, unknown>;
    if (typeof instanceRecord.owner === "string") return instanceRecord.owner;
    if (typeof instanceRecord.profileName === "string") return instanceRecord.profileName;
  }

  return null;
}

function serializeSetting(setting: {
  tokoId: string;
  toko: { name: string };
  instanceName: string;
  enabled: boolean;
  connectionState: string | null;
  connectedNumber: string | null;
  notifyDone: boolean;
  notifyFailed: boolean;
  doneMessageTemplate: string | null;
  failedMessageTemplate: string | null;
  lastConnectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): TokoWhatsappSettingData {
  return {
    tokoId: setting.tokoId,
    tokoName: setting.toko.name,
    instanceName: setting.instanceName,
    enabled: setting.enabled,
    connectionState: setting.connectionState,
    connectedNumber: setting.connectedNumber,
    notifyDone: setting.notifyDone,
    notifyFailed: setting.notifyFailed,
    doneMessageTemplate: setting.doneMessageTemplate,
    failedMessageTemplate: setting.failedMessageTemplate,
    lastConnectedAt: setting.lastConnectedAt?.toISOString() ?? null,
    createdAt: setting.createdAt.toISOString(),
    updatedAt: setting.updatedAt.toISOString(),
  };
}

async function authorizeWhatsappAdmin(tokoId: string) {
  const user = await getAuthUser();

  if (!user) return { success: false as const, error: "Unauthorized" };
  if (!isAdmin(user)) return { success: false as const, error: "Only admins can manage WhatsApp settings" };
  if (!canAccessToko(user, tokoId)) return { success: false as const, error: "Access denied" };

  return { success: true as const, user };
}

async function getSettingByTokoId(tokoId: string) {
  return prisma.tokoWhatsappSetting.findUnique({
    where: { tokoId },
    include: { toko: { select: { name: true } } },
  });
}

export async function getTokoWhatsappSetting(
  tokoId: string
): Promise<ActionResultWithData<TokoWhatsappSettingData | null>> {
  const auth = await authorizeWhatsappAdmin(tokoId);
  if (!auth.success) return auth;

  const setting = await getSettingByTokoId(tokoId);

  return { success: true, data: setting ? serializeSetting(setting) : null };
}

export async function createOrConnectTokoWhatsapp(
  tokoId: string
): Promise<ActionResultWithData<{ setting: TokoWhatsappSettingData; qr: unknown }>> {
  const auth = await authorizeWhatsappAdmin(tokoId);
  if (!auth.success) return auth;

  try {
    const toko = await prisma.toko.findUnique({ where: { id: tokoId }, select: { id: true } });
    if (!toko) return { success: false, error: "Toko not found" };

    const instanceName = getInstanceName(tokoId);
    await prisma.tokoWhatsappSetting.upsert({
      where: { tokoId },
      create: { tokoId, instanceName },
      update: { instanceName },
    });

    let createResponse: unknown = null;

    try {
      createResponse = await createWhatsappInstance(instanceName);
    } catch (error) {
      if (!isExistingInstanceError(error)) throw error;
    }

    const connectResponse = await connectWhatsappInstance(instanceName);
    const setting = await getSettingByTokoId(tokoId);

    if (!setting) return { success: false, error: "WhatsApp setting not found" };

    revalidatePath(`/${tokoId}/admin`);

    return { success: true, data: { setting: serializeSetting(setting), qr: { connectResponse, createResponse } } };
  } catch (error) {
    console.error("Failed to connect WhatsApp:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to connect WhatsApp" };
  }
}

export async function resetTokoWhatsappConnection(
  tokoId: string
): Promise<ActionResultWithData<{ setting: TokoWhatsappSettingData; qr: unknown }>> {
  const auth = await authorizeWhatsappAdmin(tokoId);
  if (!auth.success) return auth;

  try {
    const setting = await getSettingByTokoId(tokoId);
    const instanceName = setting?.instanceName ?? getInstanceName(tokoId);

    try {
      await deleteWhatsappInstance(instanceName);
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      if (!message.includes("404") && !message.includes("not found")) throw error;
    }

    const createResponse = await createWhatsappInstance(instanceName);
    const connectResponse = await connectWhatsappInstance(instanceName);

    const updated = await prisma.tokoWhatsappSetting.upsert({
      where: { tokoId },
      create: {
        tokoId,
        instanceName,
        connectionState: "connecting",
      },
      update: {
        instanceName,
        connectionState: "connecting",
        connectedNumber: null,
        lastConnectedAt: null,
      },
      include: { toko: { select: { name: true } } },
    });

    revalidatePath(`/${tokoId}/admin`);

    return { success: true, data: { setting: serializeSetting(updated), qr: { connectResponse, createResponse } } };
  } catch (error) {
    console.error("Failed to reset WhatsApp connection:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to reset WhatsApp connection" };
  }
}

export async function refreshTokoWhatsappConnection(
  tokoId: string
): Promise<ActionResultWithData<TokoWhatsappSettingData>> {
  const auth = await authorizeWhatsappAdmin(tokoId);
  if (!auth.success) return auth;

  try {
    const setting = await getSettingByTokoId(tokoId);
    if (!setting) return { success: false, error: "WhatsApp setting not found" };

    const response = await getWhatsappConnectionState(setting.instanceName);
    const connectionState = getConnectionState(response) ?? "unknown";
    const connectedNumber = getConnectedNumber(response);

    const updated = await prisma.tokoWhatsappSetting.update({
      where: { tokoId },
      data: {
        connectionState,
        connectedNumber: connectedNumber ?? undefined,
        lastConnectedAt: connectionState === "open" ? new Date() : undefined,
      },
      include: { toko: { select: { name: true } } },
    });

    revalidatePath(`/${tokoId}/admin`);

    return { success: true, data: serializeSetting(updated) };
  } catch (error) {
    console.error("Failed to refresh WhatsApp connection:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to refresh WhatsApp status" };
  }
}

export async function updateTokoWhatsappSetting(
  tokoId: string,
  input: UpdateTokoWhatsappSettingInput
): Promise<ActionResultWithData<TokoWhatsappSettingData>> {
  const auth = await authorizeWhatsappAdmin(tokoId);
  if (!auth.success) return auth;

  const parsed = updateWhatsappSettingSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  try {
    const toko = await prisma.toko.findUnique({ where: { id: tokoId }, select: { id: true } });
    if (!toko) return { success: false, error: "Toko not found" };

    const data = parsed.data;
    const setting = await prisma.tokoWhatsappSetting.upsert({
      where: { tokoId },
      create: {
        tokoId,
        instanceName: getInstanceName(tokoId),
        enabled: data.enabled,
        notifyDone: data.notifyDone,
        notifyFailed: data.notifyFailed,
        doneMessageTemplate: data.doneMessageTemplate || null,
        failedMessageTemplate: data.failedMessageTemplate || null,
      },
      update: {
        enabled: data.enabled,
        notifyDone: data.notifyDone,
        notifyFailed: data.notifyFailed,
        doneMessageTemplate: data.doneMessageTemplate || null,
        failedMessageTemplate: data.failedMessageTemplate || null,
      },
      include: { toko: { select: { name: true } } },
    });

    revalidatePath(`/${tokoId}/admin`);

    return { success: true, data: serializeSetting(setting) };
  } catch (error) {
    console.error("Failed to update WhatsApp setting:", error);
    return { success: false, error: "Failed to update WhatsApp setting" };
  }
}
