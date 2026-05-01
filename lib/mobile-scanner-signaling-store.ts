import { createHash, randomBytes } from "crypto";
import { kv } from "@vercel/kv";

export const MOBILE_SCANNER_SESSION_TTL_SECONDS = 600;

export interface MobileScannerSignalSession {
  code: string;
  tokenHash: string;
  tokoId: string;
  ownerUserId: string;
  offer: string;
  answer: string | null;
  createdAt: number;
  updatedAt: number;
}

interface CreateMobileScannerSessionInput {
  tokoId: string;
  ownerUserId: string;
  offer: string;
}

function sessionKey(code: string) {
  return `mobile-scanner:session:${code}`;
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

function isTokenValid(session: MobileScannerSignalSession, token: string) {
  return session.tokenHash === hashToken(token);
}

export async function createMobileScannerSession(input: CreateMobileScannerSessionInput) {
  const token = createToken();
  const now = Date.now();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = createPairCode();
    const existing = await kv.get<MobileScannerSignalSession>(sessionKey(code));

    if (existing) continue;

    const session: MobileScannerSignalSession = {
      code,
      tokenHash: hashToken(token),
      tokoId: input.tokoId,
      ownerUserId: input.ownerUserId,
      offer: input.offer,
      answer: null,
      createdAt: now,
      updatedAt: now,
    };

    await kv.set(sessionKey(code), session, { ex: MOBILE_SCANNER_SESSION_TTL_SECONDS });

    return { code, token, expiresIn: MOBILE_SCANNER_SESSION_TTL_SECONDS };
  }

  throw new Error("Unable to create mobile scanner session");
}

export async function getMobileScannerSessionForHost(code: string, userId: string) {
  const session = await kv.get<MobileScannerSignalSession>(sessionKey(code));

  if (!session || session.ownerUserId !== userId) {
    return null;
  }

  return session;
}

export async function getMobileScannerSessionForGuest(code: string, token: string) {
  const session = await kv.get<MobileScannerSignalSession>(sessionKey(code));

  if (!session || !isTokenValid(session, token)) {
    return null;
  }

  return session;
}

export async function setMobileScannerAnswer(code: string, token: string, answer: string) {
  const session = await getMobileScannerSessionForGuest(code, token);

  if (!session) {
    return false;
  }

  await kv.set(
    sessionKey(code),
    { ...session, answer, updatedAt: Date.now() },
    { ex: MOBILE_SCANNER_SESSION_TTL_SECONDS }
  );

  return true;
}

export async function deleteMobileScannerSession(code: string, userId: string) {
  const session = await getMobileScannerSessionForHost(code, userId);

  if (!session) {
    return false;
  }

  await kv.del(sessionKey(code));
  return true;
}
