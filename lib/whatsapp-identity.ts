import prisma from "@/lib/prisma";
import { checkWhatsappNumbers } from "@/lib/evolution";
import { normalizeWhatsappNumber } from "@/lib/whatsapp-number";

export function phoneNumberFromWhatsappJid(jid: string | null | undefined) {
  if (!jid?.endsWith("@s.whatsapp.net")) return null;
  const number = jid.split("@")[0];
  return number ? normalizeWhatsappNumber(number) : null;
}

export function phoneJidFromNumber(phoneNumber: string | null | undefined) {
  if (!phoneNumber) return null;
  const normalized = normalizeWhatsappNumber(phoneNumber);
  return normalized ? `${normalized}@s.whatsapp.net` : null;
}

export async function upsertWhatsappIdentity(input: {
  storeId: string;
  phoneNumber?: string | null;
  phoneJid?: string | null;
  lidJid?: string | null;
  displayName?: string | null;
}) {
  const phoneNumber = input.phoneNumber
    ? normalizeWhatsappNumber(input.phoneNumber)
    : phoneNumberFromWhatsappJid(input.phoneJid);

  if (!phoneNumber) return null;

  return prisma.storeWhatsappIdentity.upsert({
    where: { storeId_phoneNumber: { storeId: input.storeId, phoneNumber } },
    create: {
      storeId: input.storeId,
      phoneNumber,
      phoneJid: input.phoneJid ?? phoneJidFromNumber(phoneNumber),
      lidJid: input.lidJid ?? null,
      displayName: input.displayName ?? null,
      lastSeenAt: new Date(),
    },
    update: {
      phoneJid: input.phoneJid ?? phoneJidFromNumber(phoneNumber) ?? undefined,
      lidJid: input.lidJid ?? undefined,
      displayName: input.displayName ?? undefined,
      lastSeenAt: new Date(),
    },
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function getString(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export async function syncWhatsappIdentityFromPhone(input: {
  storeId: string;
  phoneNumber: string;
  displayName?: string | null;
}) {
  const phoneNumber = normalizeWhatsappNumber(input.phoneNumber);
  if (!phoneNumber) return null;

  const setting = await prisma.storeWhatsappSetting.findUnique({
    where: { storeId: input.storeId },
    select: { instanceName: true, enabled: true },
  });

  if (!setting?.enabled) {
    return upsertWhatsappIdentity({
      storeId: input.storeId,
      phoneNumber,
      phoneJid: phoneJidFromNumber(phoneNumber),
      displayName: input.displayName ?? null,
    });
  }

  const response = await checkWhatsappNumbers({ instanceName: setting.instanceName, numbers: [phoneNumber] });
  const first = Array.isArray(response) ? asRecord(response[0]) : asRecord(response);
  const exists = first?.exists === true;
  const jid = exists ? getString(first, "jid") : null;
  const resolvedNumber = getString(first, "number") ?? phoneNumber;
  const name = getString(first, "name") ?? input.displayName ?? null;

  return upsertWhatsappIdentity({
    storeId: input.storeId,
    phoneNumber: resolvedNumber,
    phoneJid: jid ?? phoneJidFromNumber(phoneNumber),
    displayName: name,
  });
}
