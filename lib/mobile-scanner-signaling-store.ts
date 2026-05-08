import { randomBytes } from "crypto";
import { kv } from "@vercel/kv";

export const MOBILE_SCANNER_SESSION_TTL_SECONDS = 90;

export interface MobileScannerSession {
  code: string;
  ownerUserId: string;
  expiresAt: number;
}

interface CreateMobileScannerSessionInput {
  ownerUserId: string;
}

function sessionKey(code: string) {
  return `mobile-scanner:session:${code}`;
}

function createPairCode() {
  return randomBytes(4).readUInt32BE(0).toString().padStart(10, "0").slice(0, 6);
}

function createToken() {
  return randomBytes(32).toString("base64url");
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
      ownerUserId: input.ownerUserId,
      expiresAt,
    };

    await kv.set(sessionKey(code), session, { ex: MOBILE_SCANNER_SESSION_TTL_SECONDS });

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

export async function deleteMobileScannerSession(code: string, userId: string) {
  const session = await getMobileScannerSessionForHost(code, userId);

  if (!session) {
    return false;
  }

  await kv.del(sessionKey(code));
  return true;
}
