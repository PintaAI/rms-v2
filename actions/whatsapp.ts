"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import {
  connectWhatsappInstance,
  createWhatsappInstance,
  deleteWhatsappInstance,
  fetchWhatsappInstances,
  getWhatsappConnectionState,
} from "@/lib/evolution";
import { assertPermission } from "@/lib/auth/request-scope";
import { withScope } from "@/lib/auth/wrapper";
import type { ActionResultWithData } from "@/lib/auth/authorization";

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
  connectedNumber: string | null;
  connectedProfileName: string | null;
  notifyDone: boolean;
  notifyFailed: boolean;
  doneMessageTemplate: string | null;
  failedMessageTemplate: string | null;
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

function extractNumberFromJid(jid: string): string {
  return jid.split("@")[0] ?? jid;
}

function getConnectedNumber(response: unknown) {
  if (!response || typeof response !== "object") return null;

  const record = response as Record<string, unknown>;
  const instance = record.instance;

  if (typeof record.number === "string") return record.number;
  if (typeof record.connectedNumber === "string") return record.connectedNumber;
  if (typeof record.ownerJid === "string") return extractNumberFromJid(record.ownerJid);
  if (instance && typeof instance === "object") {
    const instanceRecord = instance as Record<string, unknown>;
    if (typeof instanceRecord.owner === "string") return instanceRecord.owner;
    if (typeof instanceRecord.profileName === "string") return instanceRecord.profileName;
  }

  return null;
}

function getProfileName(response: unknown): string | null {
  if (!response || typeof response !== "object") return null;

  const record = response as Record<string, unknown>;
  if (typeof record.profileName === "string") return record.profileName;
  if (typeof record.name === "string") return record.name;

  const instance = record.instance;
  if (instance && typeof instance === "object") {
    const instanceRecord = instance as Record<string, unknown>;
    if (typeof instanceRecord.profileName === "string") return instanceRecord.profileName;
    if (typeof instanceRecord.name === "string") return instanceRecord.name;
  }

  return null;
}

function findInstanceFromFetch(instances: unknown[], instanceName: string): Record<string, unknown> | null {
  const match = instances.find((inst): inst is Record<string, unknown> => {
    if (typeof inst !== "object" || inst === null) return false;
    const record = inst as Record<string, unknown>;
    return typeof record.name === "string" && record.name === instanceName;
  });
  return match ?? null;
}

function serializeSetting(setting: {
  tokoId: string;
  toko: { name: string };
  instanceName: string;
  enabled: boolean;
  connectedNumber: string | null;
  connectedProfileName: string | null;
  notifyDone: boolean;
  notifyFailed: boolean;
  doneMessageTemplate: string | null;
  failedMessageTemplate: string | null;
  createdAt: Date;
  updatedAt: Date;
}): TokoWhatsappSettingData {
  return {
    tokoId: setting.tokoId,
    tokoName: setting.toko.name,
    instanceName: setting.instanceName,
    enabled: setting.enabled,
    connectedNumber: setting.connectedNumber,
    connectedProfileName: setting.connectedProfileName,
    notifyDone: setting.notifyDone,
    notifyFailed: setting.notifyFailed,
    doneMessageTemplate: setting.doneMessageTemplate,
    failedMessageTemplate: setting.failedMessageTemplate,
    createdAt: setting.createdAt.toISOString(),
    updatedAt: setting.updatedAt.toISOString(),
  };
}

async function getSettingByTokoId(tokoId: string) {
  return prisma.tokoWhatsappSetting.findUnique({
    where: { tokoId },
    include: { toko: { select: { name: true } } },
  });
}

export interface WhatsappLiveState {
  state: string | null;
  connectedNumber: string | null;
  connectedProfileName: string | null;
}

export async function getTokoWhatsappSetting(
  tokoId: string
): Promise<ActionResultWithData<TokoWhatsappSettingData | null>> {
  return withScope(tokoId, {}, async (scope) => {
    assertPermission(scope, "whatsapp.view");
    const setting = await getSettingByTokoId(tokoId);
    return setting ? serializeSetting(setting) : null;
  });
}

export async function getWhatsappState(
  tokoId: string
): Promise<ActionResultWithData<WhatsappLiveState>> {
  return withScope(tokoId, {}, async (scope) => {
    assertPermission(scope, "whatsapp.view");
    const setting = await getSettingByTokoId(tokoId);
    if (!setting) throw new Error("WhatsApp setting not found");

    const stateResponse = await getWhatsappConnectionState(setting.instanceName);
    const state = getConnectionState(stateResponse) ?? "unknown";

    if (state !== "open") {
      return { state, connectedNumber: null, connectedProfileName: null };
    }

    const instances = await fetchWhatsappInstances();
    const match = findInstanceFromFetch(instances, setting.instanceName);

    return {
      state,
      connectedNumber: match ? getConnectedNumber(match) : null,
      connectedProfileName: match ? getProfileName(match) : null,
    };
  });
}

export async function connectTokoWhatsapp(
  tokoId: string
): Promise<ActionResultWithData<{ qr: unknown }>> {
  return withScope(tokoId, {}, async (scope) => {
    assertPermission(scope, "whatsapp.manageSettings");
    const toko = await prisma.toko.findUnique({ where: { id: tokoId }, select: { id: true } });
    if (!toko) throw new Error("Toko not found");

    const instanceName = getInstanceName(tokoId);

    try {
      await deleteWhatsappInstance(instanceName);
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      if (!message.includes("404") && !message.includes("not found")) throw error;
    }

    try {
      await createWhatsappInstance(instanceName);
    } catch (error) {
      if (!isExistingInstanceError(error)) throw error;
    }

    const connectResponse = await connectWhatsappInstance(instanceName);

    await prisma.tokoWhatsappSetting.upsert({
      where: { tokoId },
      create: { tokoId, instanceName, connectedNumber: null, connectedProfileName: null },
      update: { instanceName, connectedNumber: null, connectedProfileName: null },
    });

    revalidatePath(`/${tokoId}/admin`);

    return { qr: connectResponse };
  });
}

export async function refreshTokoWhatsappConnection(
  tokoId: string
): Promise<ActionResultWithData<WhatsappLiveState>> {
  return withScope(tokoId, {}, async (scope) => {
    assertPermission(scope, "whatsapp.manageSettings");
    const setting = await getSettingByTokoId(tokoId);
    if (!setting) throw new Error("WhatsApp setting not found");

    const stateResponse = await getWhatsappConnectionState(setting.instanceName);
    const state = getConnectionState(stateResponse) ?? "unknown";

    if (state !== "open") {
      return { state, connectedNumber: null, connectedProfileName: null };
    }

    const instances = await fetchWhatsappInstances();
    const match = findInstanceFromFetch(instances, setting.instanceName);

    const connectedNumber = match ? getConnectedNumber(match) : null;
    const connectedProfileName = match ? getProfileName(match) : null;

    if (connectedNumber || connectedProfileName) {
      await prisma.tokoWhatsappSetting.update({
        where: { tokoId },
        data: {
          connectedNumber: connectedNumber ?? undefined,
          connectedProfileName: connectedProfileName ?? undefined,
        },
      });
    }

    revalidatePath(`/${tokoId}/admin`);

    return { state, connectedNumber, connectedProfileName };
  });
}

export async function updateTokoWhatsappSetting(
  tokoId: string,
  input: UpdateTokoWhatsappSettingInput
): Promise<ActionResultWithData<TokoWhatsappSettingData>> {
  const parsed = updateWhatsappSettingSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  return withScope(tokoId, {}, async (scope) => {
    assertPermission(scope, "whatsapp.manageSettings");
    const toko = await prisma.toko.findUnique({ where: { id: tokoId }, select: { id: true } });
    if (!toko) throw new Error("Toko not found");

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

    return serializeSetting(setting);
  });
}

export async function disconnectTokoWhatsapp(
  tokoId: string
): Promise<ActionResultWithData<TokoWhatsappSettingData>> {
  return withScope(tokoId, {}, async (scope) => {
    assertPermission(scope, "whatsapp.manageSettings");
    const setting = await getSettingByTokoId(tokoId);
    const instanceName = setting?.instanceName ?? getInstanceName(tokoId);

    try {
      await deleteWhatsappInstance(instanceName);
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      if (!message.includes("404") && !message.includes("not found")) throw error;
    }

    const updated = await prisma.tokoWhatsappSetting.upsert({
      where: { tokoId },
      create: { tokoId, instanceName },
      update: { instanceName, connectedNumber: null, connectedProfileName: null },
      include: { toko: { select: { name: true } } },
    });

    revalidatePath(`/${tokoId}/admin`);

    return serializeSetting(updated);
  });
}
