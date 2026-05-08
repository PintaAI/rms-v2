import { createHash, randomBytes } from "crypto";
import { kv } from "@vercel/kv";

export const MOBILE_SCANNER_SESSION_TTL_SECONDS = 90;

export interface MobileScannerSession {
  code: string;
  token: string;
  tokoId: string;
  ownerUserId: string;
  expiresAt: number;
}

interface CreateMobileScannerSessionInput {
  tokoId: string;
  ownerUserId: string;
}

interface MobileScannerDevice {
  id: string;
  tokenHash: string;
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
    expiresAt: session.expiresAt,
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
      tokoId: input.tokoId,
      ownerUserId: input.ownerUserId,
      expiresAt,
    };

    await Promise.all([
      kv.set(sessionKey(code), session, { ex: MOBILE_SCANNER_SESSION_TTL_SECONDS }),
      kv.set(latestSessionKey(input.ownerUserId, input.tokoId), code, { ex: MOBILE_SCANNER_SESSION_TTL_SECONDS }),
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

export async function createMobileScannerDeviceFromSession(code: string, token: string) {
  const session = await kv.get<MobileScannerSession>(sessionKey(code));

  if (!session || session.token !== token || session.expiresAt <= Date.now()) {
    return null;
  }

  const deviceToken = createToken();
  const device: MobileScannerDevice = {
    id: createDeviceId(),
    tokenHash: hashToken(deviceToken),
    tokoId: session.tokoId,
    ownerUserId: session.ownerUserId,
  };

  await kv.set(deviceKey(device.id), device);

  return { deviceId: device.id, token: deviceToken };
}

export async function getLatestMobileScannerSessionForDevice(deviceId: string, token: string) {
  const device = await kv.get<MobileScannerDevice>(deviceKey(deviceId));

  if (!device || !isTokenValid(device, token)) {
    return null;
  }

  const code = await kv.get<string>(latestSessionKey(device.ownerUserId, device.tokoId));
  if (!code) return { session: null };

  const session = await kv.get<MobileScannerSession>(sessionKey(code));
  if (!session || session.ownerUserId !== device.ownerUserId || session.tokoId !== device.tokoId || session.expiresAt <= Date.now()) {
    return { session: null };
  }

  return { session: publicMobileScannerSession(session, session.token) };
}

export async function deleteMobileScannerSession(code: string, userId: string) {
  const session = await getMobileScannerSessionForHost(code, userId);

  if (!session) {
    return false;
  }

  await kv.del(sessionKey(code));
  return true;
}
