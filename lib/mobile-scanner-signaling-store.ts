import { createHash, randomBytes } from "crypto";
import { kv } from "@vercel/kv";

export const MOBILE_SCANNER_SESSION_TTL_SECONDS = 90;
const MOBILE_SCANNER_PENDING_TTL_SECONDS = 90;

export interface MobileScannerSession {
  code: string;
  token: string;
  tokenHash: string;
  tokoId: string;
  ownerUserId: string;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
}

export interface MobileScannerDevice {
  id: string;
  tokoId: string;
  ownerUserId: string;
  name: string;
  tokenHash: string;
  createdAt: number;
  updatedAt: number;
  lastSeenAt: number | null;
  revokedAt: number | null;
}

interface CreateMobileScannerSessionInput {
  tokoId: string;
  ownerUserId: string;
}

function sessionKey(code: string) {
  return `mobile-scanner:session:${code}`;
}

function latestSessionKey(ownerUserId: string, tokoId: string) {
  return `mobile-scanner:latest:${ownerUserId}:${tokoId}`;
}

function deviceKey(deviceId: string) {
  return `mobile-scanner:device:${deviceId}`;
}

function ownerDeviceIdsKey(ownerUserId: string, tokoId: string) {
  return `mobile-scanner:devices:owner:${ownerUserId}:${tokoId}`;
}

function tokoDeviceIdsKey(tokoId: string) {
  return `mobile-scanner:devices:toko:${tokoId}`;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createPairCode() {
  return randomBytes(4).readUInt32BE(0).toString().padStart(10, "0").slice(0, 6);
}

function createToken() {
  return randomBytes(32).toString("base64url");
}

function createDeviceId() {
  return randomBytes(16).toString("base64url");
}

function isTokenValid(record: { tokenHash: string }, token: string) {
  return record.tokenHash === hashToken(token);
}

function publicMobileScannerSession(session: MobileScannerSession, token: string) {
  return {
    code: session.code,
    token,
    room: `scanner-${session.code}`,
    tokoId: session.tokoId,
    expiresAt: session.expiresAt,
    expiresIn: MOBILE_SCANNER_SESSION_TTL_SECONDS,
  };
}

export async function createMobileScannerSession(input: CreateMobileScannerSessionInput) {
  const token = createToken();
  const now = Date.now();
  const expiresAt = now + MOBILE_SCANNER_SESSION_TTL_SECONDS * 1000;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = createPairCode();
    const existing = await kv.get<MobileScannerSession>(sessionKey(code));

    if (existing) continue;

    const session: MobileScannerSession = {
      code,
      token,
      tokenHash: hashToken(token),
      tokoId: input.tokoId,
      ownerUserId: input.ownerUserId,
      createdAt: now,
      updatedAt: now,
      expiresAt,
    };

    await Promise.all([
      kv.set(sessionKey(code), session, { ex: MOBILE_SCANNER_SESSION_TTL_SECONDS }),
      kv.set(latestSessionKey(input.ownerUserId, input.tokoId), code, { ex: MOBILE_SCANNER_PENDING_TTL_SECONDS }),
    ]);

    return publicMobileScannerSession(session, token);
  }

  throw new Error("Unable to create mobile scanner session");
}

export async function getMobileScannerSessionForHost(code: string, userId: string) {
  const session = await kv.get<MobileScannerSession>(sessionKey(code));

  if (!session || session.ownerUserId !== userId || session.expiresAt <= Date.now()) {
    return null;
  }

  return session;
}

export async function getMobileScannerSessionForGuest(code: string, token: string) {
  const session = await kv.get<MobileScannerSession>(sessionKey(code));

  if (!session || session.expiresAt <= Date.now() || !isTokenValid(session, token)) {
    return null;
  }

  return session;
}

export async function getLatestMobileScannerSessionForDevice(deviceId: string, token: string) {
  const device = await getMobileScannerDeviceByToken(deviceId, token);

  if (!device) {
    return null;
  }

  const code = await kv.get<string>(latestSessionKey(device.ownerUserId, device.tokoId));

  if (!code) {
    return { device, session: null, token: null };
  }

  const session = await kv.get<MobileScannerSession>(sessionKey(code));

  if (!session || session.ownerUserId !== device.ownerUserId || session.tokoId !== device.tokoId || session.expiresAt <= Date.now()) {
    return { device, session: null, token: null };
  }

  await markMobileScannerDeviceSeen(device.id);

  return { device, session, token: session.token };
}

export async function createMobileScannerDeviceFromSession(code: string, sessionToken: string, name: string) {
  const session = await getMobileScannerSessionForGuest(code, sessionToken);

  if (!session) {
    return null;
  }

  const deviceToken = createToken();
  const now = Date.now();
  const device: MobileScannerDevice = {
    id: createDeviceId(),
    tokoId: session.tokoId,
    ownerUserId: session.ownerUserId,
    name: name.trim().slice(0, 80) || "Phone scanner",
    tokenHash: hashToken(deviceToken),
    createdAt: now,
    updatedAt: now,
    lastSeenAt: now,
    revokedAt: null,
  };

  await Promise.all([
    kv.set(deviceKey(device.id), device),
    kv.sadd(ownerDeviceIdsKey(device.ownerUserId, device.tokoId), device.id),
    kv.sadd(tokoDeviceIdsKey(device.tokoId), device.id),
  ]);

  return { device: publicMobileScannerDevice(device), token: deviceToken };
}

export async function getMobileScannerDeviceByToken(deviceId: string, token: string) {
  const device = await kv.get<MobileScannerDevice>(deviceKey(deviceId));

  if (!device || device.revokedAt || !isTokenValid(device, token)) {
    return null;
  }

  return device;
}

async function markMobileScannerDeviceSeen(deviceId: string) {
  const device = await kv.get<MobileScannerDevice>(deviceKey(deviceId));

  if (!device || device.revokedAt) return;

  const now = Date.now();
  await kv.set(deviceKey(deviceId), { ...device, lastSeenAt: now, updatedAt: now });
}

export async function deleteMobileScannerSession(code: string, userId: string) {
  const session = await getMobileScannerSessionForHost(code, userId);

  if (!session) {
    return false;
  }

  await kv.del(sessionKey(code));
  return true;
}

export function publicMobileScannerDevice(device: MobileScannerDevice) {
  return {
    id: device.id,
    tokoId: device.tokoId,
    ownerUserId: device.ownerUserId,
    name: device.name,
    createdAt: device.createdAt,
    lastSeenAt: device.lastSeenAt,
    revokedAt: device.revokedAt,
  };
}

export async function listMobileScannerDevicesForUser(input: {
  userId: string;
  role: string;
  tokoId: string;
}) {
  const ids = input.role === "admin"
    ? await kv.smembers<string[]>(tokoDeviceIdsKey(input.tokoId))
    : await kv.smembers<string[]>(ownerDeviceIdsKey(input.userId, input.tokoId));

  const devices = await Promise.all((ids ?? []).map((id) => kv.get<MobileScannerDevice>(deviceKey(id))));

  return devices
    .filter((device): device is MobileScannerDevice => Boolean(device && !device.revokedAt))
    .filter((device) => device.tokoId === input.tokoId && (input.role === "admin" || device.ownerUserId === input.userId))
    .map(publicMobileScannerDevice)
    .sort((a, b) => (b.lastSeenAt ?? b.createdAt) - (a.lastSeenAt ?? a.createdAt));
}

export async function revokeMobileScannerDevice(input: {
  deviceId: string;
  userId: string;
  role: string;
  tokoIds: string[];
}) {
  const device = await kv.get<MobileScannerDevice>(deviceKey(input.deviceId));

  if (!device || device.revokedAt) {
    return false;
  }

  const canRevoke = device.ownerUserId === input.userId || (input.role === "admin" && input.tokoIds.includes(device.tokoId));

  if (!canRevoke) {
    return false;
  }

  await kv.set(deviceKey(input.deviceId), { ...device, revokedAt: Date.now(), updatedAt: Date.now() });
  return true;
}
