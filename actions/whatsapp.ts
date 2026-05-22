"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import {
  connectWhatsappInstance,
  createWhatsappInstance,
  deleteWhatsappInstance,
  findWhatsappChats,
  findWhatsappMessages,
  getEvolutionPublicUrl,
  getWhatsappConnectionState,
  markWhatsappMessagesAsRead,
  sendWhatsappText,
  setWhatsappWebsocket,
} from "@/lib/evolution";
import { assertPermission } from "@/lib/auth/request-scope";
import { withScope } from "@/lib/auth/wrapper";
import { normalizeWhatsappNumber } from "@/lib/whatsapp-number";
import type { ActionResultWithData } from "@/lib/auth/authorization";

const WHATSAPP_DEBUG = process.env.WHATSAPP_DEBUG === "true";
const WHATSAPP_STATUS_DEBUG = WHATSAPP_DEBUG || process.env.NODE_ENV !== "production";
const DEFAULT_INBOX_CHAT_LIMIT = 10;
const MAX_INBOX_CHAT_LIMIT = 10;
const DEFAULT_INBOX_MESSAGE_LIMIT = 50;
const MAX_INBOX_MESSAGE_LIMIT = 100;

const updateWhatsappSettingSchema = z.object({
  enabled: z.boolean().optional(),
  notifyDone: z.boolean().optional(),
  notifyFailed: z.boolean().optional(),
  doneMessageTemplate: z.string().trim().nullable().optional(),
  failedMessageTemplate: z.string().trim().nullable().optional(),
});

export interface StoreWhatsappSettingData {
  storeId: string;
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

export interface WhatsappRealtimeConfig {
  evolutionUrl: string;
  instanceName: string;
  instanceToken: string;
}

export interface WhatsappInboxChat {
  remoteJid: string;
  alternateJid: string | null;
  name: string;
  number: string | null;
  profilePictureUrl: string | null;
  unreadCount: number;
  lastMessage: string | null;
  lastMessageAt: string | null;
  linkedService: WhatsappInboxLinkedService | null;
}

export interface WhatsappInboxLinkedService {
  id: string;
  customerName: string | null;
  deviceName: string;
  status: string;
  checkinAt: string;
}

export type WhatsappInboxMessageStatus = "ERROR" | "PENDING" | "SERVER_ACK" | "DELIVERY_ACK" | "READ" | "PLAYED";

export interface WhatsappInboxMessage {
  id: string;
  remoteJid: string;
  fromMe: boolean;
  text: string;
  senderName: string | null;
  timestamp: string | null;
  status: WhatsappInboxMessageStatus | null;
}

export interface WhatsappInboxChatsResponse {
  items: WhatsappInboxChat[];
  nextCursor: number | null;
  raw: unknown;
}

export interface WhatsappInboxMessagesResponse {
  items: WhatsappInboxMessage[];
  nextCursor: number | null;
  raw: unknown;
}

export interface WhatsappInboxSendResponse {
  message: WhatsappInboxMessage;
  raw: unknown;
}

export interface WhatsappInboxMarkReadMessageInput {
  id: string;
  remoteJid: string;
  fromMe: boolean;
}

export interface WhatsappInboxMarkReadResponse {
  raw: unknown;
}

export type UpdateStoreWhatsappSettingInput = z.infer<typeof updateWhatsappSettingSchema>;

function getInstanceName(storeId: string) {
  return `rms-store-${storeId}`;
}

function isExistingInstanceError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes("already") || message.includes("exist") || message.includes("409");
}

function isMissingEvolutionInstanceError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes("404") || message.includes("not found") || message.includes("instance does not exist");
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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;

  const record = asRecord(value);
  if (!record) return [];

  for (const key of ["chats", "messages", "data", "records"] as const) {
    const candidate = record[key];
    if (Array.isArray(candidate)) return candidate;
    if (candidate && typeof candidate === "object") {
      const nested = asArray(candidate);
      if (nested.length > 0) return nested;
    }
  }

  return [];
}

function getString(record: Record<string, unknown> | null, keys: string[]) {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

function isSelfDisplayName(value: string | null) {
  if (!value) return false;
  return ["you", "voce", "você"].includes(value.trim().toLowerCase());
}

function getContactDisplayName(record: Record<string, unknown> | null) {
  const name = getString(record, ["name", "pushName", "displayName", "verifiedName", "notify", "businessName"]);
  return isSelfDisplayName(name) ? null : name;
}

function findContactDisplayNameDeep(value: unknown) {
  const name = findStringDeep(value, ["pushName", "displayName", "verifiedName", "notify", "businessName"]);
  return isSelfDisplayName(name) ? null : name;
}

function findStringDeep(value: unknown, keys: string[], depth = 0): string | null {
  if (depth > 4) return null;
  const record = asRecord(value);
  if (!record) return null;

  const direct = getString(record, keys);
  if (direct) return direct;

  for (const entry of Object.values(record)) {
    if (!entry || typeof entry !== "object") continue;
    const found = findStringDeep(entry, keys, depth + 1);
    if (found) return found;
  }

  return null;
}

function getNumber(record: Record<string, unknown> | null, keys: string[]) {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.length > 0 && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

function normalizeMessageStatus(value: unknown): WhatsappInboxMessageStatus | null {
  if (typeof value === "number") {
    if (value === 0) return "ERROR";
    if (value === 1) return "PENDING";
    if (value === 2) return "SERVER_ACK";
    if (value === 3) return "DELIVERY_ACK";
    if (value === 4) return "READ";
    if (value === 5) return "PLAYED";
    return null;
  }

  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  if (["ERROR", "PENDING", "SERVER_ACK", "DELIVERY_ACK", "READ", "PLAYED"].includes(normalized)) {
    return normalized as WhatsappInboxMessageStatus;
  }
  if (normalized === "SENT") return "SERVER_ACK";
  if (normalized === "DELIVERED") return "DELIVERY_ACK";
  return null;
}

function getBestMessageStatus(statuses: Array<WhatsappInboxMessageStatus | null>) {
  const priority: WhatsappInboxMessageStatus[] = ["ERROR", "PENDING", "SERVER_ACK", "DELIVERY_ACK", "READ", "PLAYED"];
  return statuses.reduce<WhatsappInboxMessageStatus | null>((best, status) => {
    if (!status) return best;
    if (!best) return status;
    return priority.indexOf(status) > priority.indexOf(best) ? status : best;
  }, null);
}

function getMessageUpdateStatus(value: unknown) {
  if (Array.isArray(value)) {
    return getBestMessageStatus(value.map((item) => {
      const record = asRecord(item);
      return normalizeMessageStatus(record?.status ?? record?.messageStatus ?? record?.ack);
    }));
  }

  const record = asRecord(value);
  return normalizeMessageStatus(record?.status ?? record?.messageStatus ?? record?.ack);
}

function getMessageStatus(record: Record<string, unknown> | null): WhatsappInboxMessageStatus | null {
  if (!record) return null;
  const direct = normalizeMessageStatus(record.status ?? record.messageStatus ?? record.ack);
  if (direct) return direct;

  const update = asRecord(record.update);
  const updateStatus = normalizeMessageStatus(update?.status ?? update?.messageStatus ?? update?.ack);
  if (updateStatus) return updateStatus;

  const messageUpdateStatus = getMessageUpdateStatus(record.MessageUpdate);
  if (messageUpdateStatus) return messageUpdateStatus;

  const message = asRecord(record.message);
  const messageStatus = normalizeMessageStatus(message?.status ?? message?.messageStatus ?? message?.ack);
  if (messageStatus) return messageStatus;

  return null;
}

function getMessageStatusDebug(record: Record<string, unknown> | null) {
  const key = asRecord(record?.key);
  const update = asRecord(record?.update);
  const messageUpdate = record?.MessageUpdate;
  const message = asRecord(record?.message);

  return {
    keys: record ? Object.keys(record) : [],
    keyKeys: key ? Object.keys(key) : [],
    updateKeys: update ? Object.keys(update) : [],
    messageUpdateKeys: Array.isArray(messageUpdate) ? messageUpdate.map((_, index) => String(index)) : asRecord(messageUpdate) ? Object.keys(asRecord(messageUpdate)!) : [],
    messageKeys: message ? Object.keys(message) : [],
    id: getString(key, ["id"]) ?? getString(record, ["id", "messageId"]),
    remoteJid: getString(key, ["remoteJid"]) ?? getString(record, ["remoteJid"]),
    fromMe: key?.fromMe === true || record?.fromMe === true,
    parsedStatus: getMessageStatus(record),
    direct: {
      status: record?.status ?? null,
      messageStatus: record?.messageStatus ?? null,
      ack: record?.ack ?? null,
    },
    update: {
      status: update?.status ?? null,
      messageStatus: update?.messageStatus ?? null,
      ack: update?.ack ?? null,
    },
    MessageUpdate: messageUpdate ?? null,
    message: {
      status: message?.status ?? null,
      messageStatus: message?.messageStatus ?? null,
      ack: message?.ack ?? null,
    },
  };
}

function normalizeRemoteJid(value: string | null) {
  if (!value) return null;
  if (value.includes("@")) return value;
  if (!/^\d+$/.test(value)) return null;
  return `${value}@s.whatsapp.net`;
}

function isPhoneJid(value: string | null | undefined) {
  return Boolean(value?.endsWith("@s.whatsapp.net"));
}

function isLidJid(value: string | null | undefined) {
  return Boolean(value?.endsWith("@lid"));
}

function numberFromRemoteJid(remoteJid: string) {
  if (!remoteJid.endsWith("@s.whatsapp.net")) return null;
  return remoteJid.split("@")[0] ?? null;
}

function displayIdFromRemoteJid(remoteJid: string, alternateJid: string | null) {
  return numberFromRemoteJid(alternateJid ?? "") ?? numberFromRemoteJid(remoteJid) ?? alternateJid ?? remoteJid;
}

function sendTargetFromRemoteJid(remoteJid: string) {
  const number = numberFromRemoteJid(remoteJid);
  if (number) return number;
  if (remoteJid.endsWith("@lid")) return remoteJid;
  return null;
}

function getPhoneLookupVariants(phoneNumber: string) {
  const normalized = normalizeWhatsappNumber(phoneNumber);
  if (!normalized) return [];

  const local = normalized.startsWith("62") ? `0${normalized.slice(2)}` : null;
  return [normalized, local].filter((item, index, values): item is string => Boolean(item) && values.indexOf(item) === index);
}

function normalizePageInput(input?: { cursor?: number | null; limit?: number }, defaults = { limit: DEFAULT_INBOX_CHAT_LIMIT, maxLimit: MAX_INBOX_CHAT_LIMIT }) {
  const cursor = input?.cursor && Number.isFinite(input.cursor) && input.cursor > 0 ? Math.floor(input.cursor) : 0;
  const requestedLimit = input?.limit && Number.isFinite(input.limit) ? Math.floor(input.limit) : defaults.limit;
  const limit = Math.min(Math.max(requestedLimit, 1), defaults.maxLimit);
  return { cursor, limit };
}

function timestampToIso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  const timestamp = typeof value === "number" ? value : typeof value === "string" ? Number(value) : null;
  if (!timestamp || !Number.isFinite(timestamp)) return null;
  const millis = timestamp < 10_000_000_000 ? timestamp * 1000 : timestamp;
  return new Date(millis).toISOString();
}

function extractMessageText(message: Record<string, unknown> | null): string | null {
  if (!message) return null;
  if (typeof message.conversation === "string") return message.conversation;

  for (const key of ["extendedTextMessage", "imageMessage", "videoMessage", "documentMessage", "audioMessage"] as const) {
    const nested = asRecord(message[key]);
    const text = getString(nested, ["text", "caption", "fileName"]);
    if (text) return text;
  }

  if (message.stickerMessage) return "[Sticker]";
  if (message.audioMessage) return "[Audio]";
  if (message.imageMessage) return "[Gambar]";
  if (message.videoMessage) return "[Video]";
  if (message.documentMessage) return "[Dokumen]";
  return null;
}

function getRemoteJidAliases(value: unknown) {
  const record = asRecord(value);
  const key = asRecord(record?.key);
  const candidates = [
    getString(record, ["remoteJidAlt", "senderPn", "phoneJid", "jidAlt"]),
    getString(key, ["remoteJidAlt", "senderPn", "phoneJid", "jidAlt"]),
    findStringDeep(record, ["remoteJidAlt", "senderPn", "phoneJid", "jidAlt"]),
    getString(record, ["remoteJid", "jid"]),
    getString(key, ["remoteJid"]),
    findStringDeep(record, ["remoteJid"]),
    getString(record, ["previousRemoteJid", "lidJid"]),
    getString(key, ["previousRemoteJid", "lidJid"]),
    findStringDeep(record, ["previousRemoteJid", "lidJid"]),
  ].map(normalizeRemoteJid);
  const phoneJid = candidates.find(isPhoneJid) ?? null;
  const lidJid = candidates.find(isLidJid) ?? null;
  const fallbackJid = candidates.find((jid): jid is string => Boolean(jid)) ?? null;

  return {
    remoteJid: phoneJid ?? lidJid ?? fallbackJid,
    alternateJid: phoneJid ? lidJid : null,
  };
}

function getContactKeyCandidates(value: unknown) {
  const { remoteJid, alternateJid } = getRemoteJidAliases(value);
  return [remoteJid, alternateJid].filter((item): item is string => Boolean(item));
}

function buildContactMap(response: unknown) {
  const contacts = new Map<string, Record<string, unknown>>();

  for (const contact of asArray(response)) {
    const record = asRecord(contact);
    if (!record) continue;

    for (const key of getContactKeyCandidates(record)) {
      contacts.set(key, record);
    }
  }

  return contacts;
}

function serializeChat(value: unknown, contacts = new Map<string, Record<string, unknown>>(), profilePictureUrl?: string | null): WhatsappInboxChat | null {
  const record = asRecord(value);
  if (!record) return null;

  const { remoteJid, alternateJid } = getRemoteJidAliases(record);
  if (!remoteJid || remoteJid.endsWith("@g.us")) return null;

  const contact = contacts.get(remoteJid) ?? (alternateJid ? contacts.get(alternateJid) : undefined) ?? null;

  const lastMessageRecord = asRecord(record.lastMessage) ?? asRecord(record.message);
  const lastMessageContent = asRecord(lastMessageRecord?.message) ?? lastMessageRecord;
  const lastMessage = extractMessageText(lastMessageContent);
  const timestamp = record.updatedAt ?? record.messageTimestamp ?? lastMessageRecord?.messageTimestamp;
  const name = getContactDisplayName(record)
    ?? getContactDisplayName(contact)
    ?? findContactDisplayNameDeep(contact)
    ?? displayIdFromRemoteJid(remoteJid, alternateJid);
  const resolvedProfilePictureUrl = profilePictureUrl
    ?? getString(record, ["profilePictureUrl", "profilePicUrl", "pictureUrl", "imageUrl"])
    ?? getString(contact, ["profilePictureUrl", "profilePicUrl", "pictureUrl", "imageUrl"])
    ?? findStringDeep(record, ["profilePictureUrl", "profilePicUrl", "pictureUrl", "imageUrl"])
    ?? findStringDeep(contact, ["profilePictureUrl", "profilePicUrl", "pictureUrl", "imageUrl"]);

  return {
    remoteJid,
    alternateJid,
    name,
    number: numberFromRemoteJid(alternateJid ?? "") ?? numberFromRemoteJid(remoteJid),
    profilePictureUrl: resolvedProfilePictureUrl ?? null,
    unreadCount: getNumber(record, ["unreadCount", "unreadMessages"]) ?? 0,
    lastMessage,
    lastMessageAt: timestampToIso(timestamp),
    linkedService: null,
  };
}

function chatIdentityKey(chat: WhatsappInboxChat) {
  return chat.number ?? chat.alternateJid ?? chat.remoteJid;
}

function mergeChatAliases(chats: WhatsappInboxChat[]) {
  const merged = new Map<string, WhatsappInboxChat>();

  for (const chat of chats) {
    const key = chatIdentityKey(chat);
    const current = merged.get(key);
    if (!current) {
      merged.set(key, chat);
      continue;
    }

    const allJids = [current.remoteJid, current.alternateJid, chat.remoteJid, chat.alternateJid];
    const phoneJid = allJids.find(isPhoneJid) ?? null;
    const lidJid = allJids.find(isLidJid) ?? null;
    const latestChat = (chat.lastMessageAt ?? "") > (current.lastMessageAt ?? "") ? chat : current;

    merged.set(key, {
      ...latestChat,
      remoteJid: phoneJid ?? lidJid ?? latestChat.remoteJid,
      alternateJid: phoneJid ? lidJid : null,
      number: current.number ?? chat.number,
      linkedService: latestChat.linkedService ?? current.linkedService ?? chat.linkedService,
    });
  }

  return Array.from(merged.values());
}

async function attachLinkedServices(storeId: string, chats: WhatsappInboxChat[]) {
  if (chats.length === 0) return chats;

  const phoneNumbers = chats.map((chat) => chat.number).filter((number): number is string => Boolean(number));
  const servicePhoneCandidates = phoneNumbers.flatMap(getPhoneLookupVariants);
  const services = servicePhoneCandidates.length > 0 ? await prisma.repairOrder.findMany({
    where: {
      storeId,
      noWa: { in: servicePhoneCandidates },
    },
    orderBy: { checkinAt: "desc" },
    select: {
      id: true,
      customerName: true,
      noWa: true,
      status: true,
      checkinAt: true,
      deviceModel: { select: { modelName: true, brand: { select: { name: true } } } },
    },
  }) : [];

  const serviceByPhone = new Map<string, WhatsappInboxLinkedService>();
  for (const service of services) {
    const phone = normalizeWhatsappNumber(service.noWa);
    if (serviceByPhone.has(phone)) continue;
    serviceByPhone.set(phone, {
      id: service.id,
      customerName: service.customerName,
      deviceName: `${service.deviceModel.brand.name} ${service.deviceModel.modelName}`,
      status: service.status,
      checkinAt: service.checkinAt.toISOString(),
    });
  }

  return chats.map((chat) => {
    return {
      ...chat,
      linkedService: chat.number ? serviceByPhone.get(chat.number) ?? null : null,
    };
  });
}

function serializeMessage(value: unknown): WhatsappInboxMessage | null {
  const record = asRecord(value);
  if (!record) return null;

  const key = asRecord(record.key);
  const remoteJid = normalizeRemoteJid(getString(key, ["remoteJid"]));
  if (!remoteJid) return null;

  const message = asRecord(record.message);
  const text = extractMessageText(message) ?? "[Pesan tidak didukung]";
  const id = getString(key, ["id"]) ?? getString(record, ["id"]) ?? `${remoteJid}-${record.messageTimestamp ?? Date.now()}`;

  return {
    id,
    remoteJid,
    fromMe: key?.fromMe === true || record.fromMe === true,
    text,
    senderName: getString(record, ["pushName", "participant", "sender"]),
    timestamp: timestampToIso(record.messageTimestamp ?? record.createdAt),
    status: getMessageStatus(record),
  };
}

function uniqueMessagesById(messages: WhatsappInboxMessage[]) {
  const seen = new Set<string>();
  const unique: WhatsappInboxMessage[] = [];

  for (const message of messages) {
    if (seen.has(message.id)) continue;
    seen.add(message.id);
    unique.push(message);
  }

  return unique;
}

function redactEvolutionDebugValue(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[Max depth]";
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => redactEvolutionDebugValue(item, depth + 1));

  const record = asRecord(value);
  if (!record) return value;

  return Object.fromEntries(Object.entries(record).map(([key, entry]) => {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes("apikey") || lowerKey.includes("token") || lowerKey.includes("hash")) {
      return [key, "[REDACTED]"];
    }

    return [key, redactEvolutionDebugValue(entry, depth + 1)];
  }));
}

function summarizeChatDebug(chatsResponse: unknown, contactsResponse: unknown) {
  const chats = asArray(chatsResponse);
  const contacts = asArray(contactsResponse);

  return {
    chatCount: chats.length,
    contactCount: contacts.length,
    chats: chats.slice(0, 10).map((chat) => {
      const record = asRecord(chat);
      const { remoteJid, alternateJid } = getRemoteJidAliases(record);
      return {
        remoteJid,
        alternateJid,
        name: getContactDisplayName(record),
        updatedAt: record?.updatedAt ?? record?.messageTimestamp ?? null,
      };
    }),
  };
}

function summarizeChatCounts(chatsResponse: unknown, contactsResponse: unknown) {
  return {
    chatCount: asArray(chatsResponse).length,
    contactCount: asArray(contactsResponse).length,
  };
}

function summarizeMessageDebug(remoteJid: string, alternateJid: string | null, attempts: { jid: string; count: number; statuses: Array<{ id: string; status: WhatsappInboxMessageStatus | null; fromMe: boolean }> }[]) {
  return { remoteJid, alternateJid, attempts };
}

function logWhatsappAction(_action: string, _details: Record<string, unknown>) {
  // noop
}

function serializeSetting(setting: {
  storeId: string;
  store: { name: string };
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
}): StoreWhatsappSettingData {
  return {
    storeId: setting.storeId,
    tokoName: setting.store.name,
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

async function getSettingByTokoId(storeId: string) {
  return prisma.storeWhatsappSetting.findUnique({
    where: { storeId },
    include: { store: { select: { name: true } } },
  });
}

export interface WhatsappLiveState {
  state: string | null;
  connectedNumber: string | null;
  connectedProfileName: string | null;
}

export async function getStoreWhatsappSetting(
  storeId: string
): Promise<ActionResultWithData<StoreWhatsappSettingData | null>> {
  return withScope(storeId, {}, async (scope) => {
    assertPermission(scope, "whatsapp.view");
    const setting = await getSettingByTokoId(storeId);
    return setting ? serializeSetting(setting) : null;
  });
}

export async function getWhatsappState(
  storeId: string
): Promise<ActionResultWithData<WhatsappLiveState>> {
  return withScope(storeId, {}, async (scope) => {
    assertPermission(scope, "whatsapp.view");
    const setting = await getSettingByTokoId(storeId);
    if (!setting) throw new Error("WhatsApp setting not found");

    let stateResponse: unknown;

    try {
      stateResponse = await getWhatsappConnectionState(setting.instanceName);
    } catch (error) {
      if (!isMissingEvolutionInstanceError(error)) throw error;
      return { state: "close", connectedNumber: null, connectedProfileName: null };
    }

    const state = getConnectionState(stateResponse) ?? "unknown";

    if (state !== "open") {
      return { state, connectedNumber: null, connectedProfileName: null };
    }

    return {
      state,
      connectedNumber: getConnectedNumber(stateResponse) ?? setting.connectedNumber,
      connectedProfileName: getProfileName(stateResponse) ?? setting.connectedProfileName,
    };
  });
}

export async function connectTokoWhatsapp(
  storeId: string
): Promise<ActionResultWithData<{ qr: unknown; setting: StoreWhatsappSettingData }>> {
  return withScope(storeId, {}, async (scope) => {
    assertPermission(scope, "whatsapp.manageSettings");
    const toko = await prisma.store.findUnique({ where: { id: storeId }, select: { id: true } });
    if (!toko) throw new Error("Toko not found");

    const instanceName = getInstanceName(storeId);

    try {
      await deleteWhatsappInstance(instanceName);
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      if (!message.includes("404") && !message.includes("not found")) throw error;
    }

    let instanceToken: string | null = null;

    try {
      const createResponse = await createWhatsappInstance(instanceName);
      instanceToken = typeof createResponse.hash === "string" ? createResponse.hash : null;
    } catch (error) {
      if (!isExistingInstanceError(error)) throw error;
    }

    try {
      await setWhatsappWebsocket({ instanceName });
    } catch {
      // Keep QR pairing usable even if the Evolution server websocket env is not enabled yet.
    }

    const connectResponse = await connectWhatsappInstance(instanceName);

    const setting = await prisma.storeWhatsappSetting.upsert({
      where: { storeId },
      create: { storeId, instanceName, instanceToken, connectedNumber: null, connectedProfileName: null },
      update: { instanceName, instanceToken, connectedNumber: null, connectedProfileName: null },
      include: { store: { select: { name: true } } },
    });

    revalidatePath(`/${storeId}/admin`);

    return { qr: connectResponse, setting: serializeSetting(setting) };
  });
}

export async function getWhatsappRealtimeConfig(
  storeId: string
): Promise<ActionResultWithData<WhatsappRealtimeConfig | null>> {
  return withScope(storeId, {}, async (scope) => {
    assertPermission(scope, "whatsapp.view");
    const setting = await getSettingByTokoId(storeId);

    if (!setting?.instanceToken) {
      logWhatsappAction("realtime.config", { storeId, hasSetting: Boolean(setting), result: "missing-instance-token" });
      return null;
    }

    const config = {
      evolutionUrl: getEvolutionPublicUrl(),
      instanceName: setting.instanceName,
      instanceToken: setting.instanceToken,
    };

    logWhatsappAction("realtime.config", { storeId, instanceName: setting.instanceName, result: "ready" });
    return config;
  });
}

export async function getWhatsappInboxChats(
  storeId: string,
  input?: { cursor?: number | null; limit?: number }
): Promise<ActionResultWithData<WhatsappInboxChatsResponse>> {
  return withScope(storeId, {}, async (scope) => {
    assertPermission(scope, "whatsapp.view");
    const setting = await getSettingByTokoId(storeId);
    if (!setting) return { items: [], nextCursor: null, raw: null };

    const { cursor, limit } = normalizePageInput(input);

    let response: unknown;

    try {
      response = await findWhatsappChats(setting.instanceName, limit * 3, cursor);
    } catch (error) {
      if (!isMissingEvolutionInstanceError(error)) throw error;
      return { items: [], nextCursor: null, raw: { status: "not-paired" } };
    }

    const contactsResponse = null;
    const contactMap = buildContactMap(contactsResponse);
    const baseItems = mergeChatAliases(asArray(response)
      .map((chat) => serializeChat(chat, contactMap))
      .filter((chat): chat is WhatsappInboxChat => Boolean(chat))
      .sort((a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? "")))
      .sort((a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""))
      .slice(0, limit);
    const items = await attachLinkedServices(storeId, baseItems);
    const nextCursor = items.length === limit ? cursor + limit : null;

    const raw = WHATSAPP_DEBUG ? summarizeChatDebug(response, contactsResponse) : summarizeChatCounts(response, contactsResponse);
    logWhatsappAction("inbox.chats", { storeId, instanceName: setting.instanceName, chatCount: items.length, raw });
    return { items, nextCursor, raw };
  });
}

export async function getWhatsappInboxMessages(
  storeId: string,
  remoteJid: string,
  alternateJid?: string | null,
  input?: { cursor?: number | null; limit?: number }
): Promise<ActionResultWithData<WhatsappInboxMessagesResponse>> {
  return withScope(storeId, {}, async (scope) => {
    assertPermission(scope, "whatsapp.view");
    const setting = await getSettingByTokoId(storeId);
    const normalizedRemoteJid = normalizeRemoteJid(remoteJid);
    const normalizedAlternateJid = normalizeRemoteJid(alternateJid ?? null);
    if (!setting || !normalizedRemoteJid) return { items: [], nextCursor: null, raw: null };

    const { cursor, limit } = normalizePageInput(input, { limit: DEFAULT_INBOX_MESSAGE_LIMIT, maxLimit: MAX_INBOX_MESSAGE_LIMIT });

    const candidates = [
      normalizedAlternateJid?.endsWith("@s.whatsapp.net") ? normalizedAlternateJid : null,
      normalizedRemoteJid,
      normalizedAlternateJid,
    ].filter((jid, index, values): jid is string => Boolean(jid) && values.indexOf(jid) === index);

    const attempts: { jid: string; count: number; statuses: Array<{ id: string; status: WhatsappInboxMessageStatus | null; fromMe: boolean }> }[] = [];
    const foundMessages: WhatsappInboxMessage[] = [];

    for (const jid of candidates) {
      let response: unknown;

      try {
        response = await findWhatsappMessages({ instanceName: setting.instanceName, remoteJid: jid, limit, offset: cursor });
      } catch (error) {
        if (!isMissingEvolutionInstanceError(error)) throw error;
        return { items: [], nextCursor: null, raw: { status: "not-paired" } };
      }

      if (WHATSAPP_STATUS_DEBUG) {
        // noop
      }

      const aliasItems = asArray(response)
        .map(serializeMessage)
        .filter((message): message is WhatsappInboxMessage => Boolean(message))
        .sort((a, b) => (a.timestamp ?? "").localeCompare(b.timestamp ?? ""))
        .slice(-limit);
      attempts.push({
        jid,
        count: aliasItems.length,
        statuses: aliasItems.slice(-10).map((message) => ({ id: message.id, status: message.status, fromMe: message.fromMe })),
      });
      foundMessages.push(...aliasItems);
    }

    const items = uniqueMessagesById(foundMessages)
      .sort((a, b) => (a.timestamp ?? "").localeCompare(b.timestamp ?? ""))
      .slice(-limit);

    const nextCursor = attempts.some((attempt) => attempt.count === limit) ? cursor + limit : null;

    logWhatsappAction("inbox.messages", { storeId, instanceName: setting.instanceName, remoteJid: normalizedRemoteJid, alternateJid: normalizedAlternateJid, attempts });
    return {
      items,
      nextCursor,
      raw: WHATSAPP_DEBUG ? summarizeMessageDebug(normalizedRemoteJid, normalizedAlternateJid, attempts) : { attempts: attempts.map((attempt) => ({ count: attempt.count })) },
    };
  });
}

export async function sendWhatsappInboxMessage(
  storeId: string,
  remoteJid: string,
  alternateJid: string | null | undefined,
  text: string
): Promise<ActionResultWithData<WhatsappInboxSendResponse>> {
  const trimmedText = text.trim();
  if (!trimmedText) return { success: false, error: "Pesan tidak boleh kosong" };

  return withScope(storeId, {}, async (scope) => {
    assertPermission(scope, "whatsapp.send");
    const setting = await getSettingByTokoId(storeId);
    const normalizedRemoteJid = normalizeRemoteJid(remoteJid);
    const normalizedAlternateJid = normalizeRemoteJid(alternateJid ?? null);
    if (!setting || !normalizedRemoteJid) throw new Error("WhatsApp setting not found");

    const sendRemoteJid = normalizedAlternateJid?.endsWith("@s.whatsapp.net") ? normalizedAlternateJid : normalizedRemoteJid;
    const sendTarget = sendTargetFromRemoteJid(sendRemoteJid);
    if (!sendTarget) throw new Error("Chat grup belum didukung untuk pengiriman dari inbox");

    let response: unknown;

    try {
      response = await sendWhatsappText({ instanceName: setting.instanceName, number: sendTarget, text: trimmedText });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.toLowerCase().includes("timeout")) {
        throw new Error("Pengiriman WhatsApp timeout. Coba kirim ulang beberapa saat lagi.");
      }
      throw error;
    }

    const sentRemoteJid = sendTarget.includes("@") ? sendTarget : sendRemoteJid;
    const serializedMessage = serializeMessage(response);
    if (WHATSAPP_STATUS_DEBUG) {
      // noop
    }

    const sentMessage: WhatsappInboxMessage = serializedMessage ? { ...serializedMessage, status: "SERVER_ACK" } : {
      id: `${sentRemoteJid}-${Date.now()}`,
      remoteJid: sentRemoteJid,
      fromMe: true,
      text: trimmedText,
      senderName: null,
      timestamp: new Date().toISOString(),
      status: "SERVER_ACK",
    };

    logWhatsappAction("inbox.send", { storeId, instanceName: setting.instanceName, remoteJid: normalizedRemoteJid, alternateJid: normalizedAlternateJid, sendRemoteJid, textLength: trimmedText.length });
    return { message: sentMessage, raw: WHATSAPP_DEBUG ? redactEvolutionDebugValue(response) : null };
  });
}

export async function markWhatsappInboxMessagesAsRead(
  storeId: string,
  messages: WhatsappInboxMarkReadMessageInput[]
): Promise<ActionResultWithData<WhatsappInboxMarkReadResponse>> {
  return withScope(storeId, {}, async (scope) => {
    assertPermission(scope, "whatsapp.view");
    const setting = await getSettingByTokoId(storeId);
    if (!setting) throw new Error("WhatsApp setting not found");

    const readMessages = messages
      .filter((message) => !message.fromMe && message.id && message.remoteJid)
      .map((message) => ({
        id: message.id,
        fromMe: false,
        remoteJid: normalizeRemoteJid(message.remoteJid) ?? message.remoteJid,
      }));

    if (readMessages.length === 0) return { raw: null };

    const response = await markWhatsappMessagesAsRead({ instanceName: setting.instanceName, readMessages });
    logWhatsappAction("inbox.markRead", { storeId, instanceName: setting.instanceName, count: readMessages.length });
    return { raw: WHATSAPP_DEBUG ? redactEvolutionDebugValue(response) : null };
  });
}

export async function refreshTokoWhatsappConnection(
  storeId: string
): Promise<ActionResultWithData<WhatsappLiveState>> {
  return withScope(storeId, {}, async (scope) => {
    assertPermission(scope, "whatsapp.manageSettings");
    const setting = await getSettingByTokoId(storeId);
    if (!setting) throw new Error("WhatsApp setting not found");

    let stateResponse: unknown;

    try {
      stateResponse = await getWhatsappConnectionState(setting.instanceName);
    } catch (error) {
      if (!isMissingEvolutionInstanceError(error)) throw error;
      return { state: "close", connectedNumber: null, connectedProfileName: null };
    }

    const state = getConnectionState(stateResponse) ?? "unknown";

    if (state !== "open") {
      return { state, connectedNumber: null, connectedProfileName: null };
    }

    const connectedNumber = getConnectedNumber(stateResponse) ?? setting.connectedNumber;
    const connectedProfileName = getProfileName(stateResponse) ?? setting.connectedProfileName;

    if (connectedNumber !== setting.connectedNumber || connectedProfileName !== setting.connectedProfileName) {
      await prisma.storeWhatsappSetting.update({
        where: { storeId },
        data: {
          connectedNumber,
          connectedProfileName,
        },
      });
    }

    revalidatePath(`/${storeId}/admin`);

    return { state, connectedNumber, connectedProfileName };
  });
}

export async function updateStoreWhatsappSetting(
  storeId: string,
  input: UpdateStoreWhatsappSettingInput
): Promise<ActionResultWithData<StoreWhatsappSettingData>> {
  const parsed = updateWhatsappSettingSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  return withScope(storeId, {}, async (scope) => {
    assertPermission(scope, "whatsapp.manageSettings");
    const toko = await prisma.store.findUnique({ where: { id: storeId }, select: { id: true } });
    if (!toko) throw new Error("Toko not found");

    const data = parsed.data;
    const setting = await prisma.storeWhatsappSetting.upsert({
      where: { storeId },
      create: {
        storeId,
        instanceName: getInstanceName(storeId),
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
      include: { store: { select: { name: true } } },
    });

    revalidatePath(`/${storeId}/admin`);

    return serializeSetting(setting);
  });
}

export async function disconnectTokoWhatsapp(
  storeId: string
): Promise<ActionResultWithData<StoreWhatsappSettingData>> {
  return withScope(storeId, {}, async (scope) => {
    assertPermission(scope, "whatsapp.manageSettings");
    const setting = await getSettingByTokoId(storeId);
    const instanceName = setting?.instanceName ?? getInstanceName(storeId);

    try {
      await deleteWhatsappInstance(instanceName);
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      if (!message.includes("404") && !message.includes("not found")) throw error;
    }

    const updated = await prisma.storeWhatsappSetting.upsert({
      where: { storeId },
      create: { storeId, instanceName, instanceToken: null },
      update: { instanceName, instanceToken: null, connectedNumber: null, connectedProfileName: null },
      include: { store: { select: { name: true } } },
    });

    revalidatePath(`/${storeId}/admin`);

    return serializeSetting(updated);
  });
}
