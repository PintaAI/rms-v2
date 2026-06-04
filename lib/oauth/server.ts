import "server-only";
import crypto from "node:crypto";
import prisma from "@/lib/prisma";
import {
  AUTH_CODE_EXPIRY_SECONDS,
  SCOPES_SUPPORTED,
  TOKEN_EXPIRY_SECONDS,
  parseScopeString,
  isOAuthAccessToken,
  type AuthorizationRequest,
  type OAuthClientInfo,
  type TokenResponse,
} from "@/lib/oauth/types";

export { isOAuthAccessToken } from "@/lib/oauth/types";

function generateAccessToken() {
  return `oat_${crypto.randomBytes(32).toString("hex")}`;
}

function generateRefreshToken() {
  return `ort_${crypto.randomBytes(32).toString("hex")}`;
}

function generateAuthorizationCode() {
  return `oac_${crypto.randomBytes(24).toString("hex")}`;
}

function dateAdd(date: Date, seconds: number) {
  return new Date(date.getTime() + seconds * 1000);
}

function base64UrlEncode(buffer: Buffer) {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function verifyPkceChallenge(codeVerifier: string, codeChallenge: string, codeChallengeMethod?: string | null) {
  const expected = codeChallengeMethod === "S256"
    ? base64UrlEncode(crypto.createHash("sha256").update(codeVerifier).digest())
    : codeVerifier;
  return expected === codeChallenge;
}

function toClientInfo(client: {
  clientId: string;
  clientSecret: string | null;
  clientName: string;
  clientUri: string | null;
  logoUri: string | null;
  redirectUris: string[];
  grantTypes: string[];
  responseTypes: string[];
  scope: string | null;
  isPublic: boolean;
}): OAuthClientInfo {
  return {
    clientId: client.clientId,
    clientSecret: client.clientSecret ?? undefined,
    clientName: client.clientName,
    clientUri: client.clientUri ?? undefined,
    logoUri: client.logoUri ?? undefined,
    redirectUris: client.redirectUris,
    grantTypes: client.grantTypes,
    responseTypes: client.responseTypes,
    scope: client.scope ?? undefined,
    isPublic: client.isPublic,
  };
}

export async function getClient(clientId: string): Promise<OAuthClientInfo | null> {
  const client = await prisma.oAuthClient.findUnique({ where: { clientId } });
  if (client) return toClientInfo(client);

  if (clientId.startsWith("https://")) {
    let clientName = "MCP Client";
    let clientUri = clientId;
    try {
      const res = await fetch(clientId, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const meta = await res.json();
        clientName = meta.client_name || meta.name || "MCP Client";
        clientUri = meta.client_uri || meta.uri || clientId;
      }
    } catch {}

    const existing = await prisma.oAuthClient.findUnique({ where: { clientId } });
    if (existing) return toClientInfo(existing);

    const created = await prisma.oAuthClient.create({
      data: {
        clientId,
        clientName,
        clientUri,
        redirectUris: [],
        grantTypes: ["authorization_code", "refresh_token"],
        responseTypes: ["code"],
        scope: SCOPES_SUPPORTED.join(" "),
        isPublic: true,
      },
    });
    return toClientInfo(created);
  }

  return null;
}

function normalizeGrantTypes(grantTypes?: string[]) {
  const supported = new Set(["authorization_code", "refresh_token"]);
  const normalized = grantTypes?.filter((grantType) => supported.has(grantType)) ?? [];
  return normalized.length > 0 ? normalized : ["authorization_code", "refresh_token"];
}

function normalizeResponseTypes(responseTypes?: string[]) {
  const normalized = responseTypes?.filter((responseType) => responseType === "code") ?? [];
  return normalized.length > 0 ? normalized : ["code"];
}

function normalizeScope(scope?: string) {
  const requested = parseScopeString(scope);
  const normalized = requested.filter((value) => SCOPES_SUPPORTED.some((supportedScope) => supportedScope === value));
  return (normalized.length > 0 ? normalized : SCOPES_SUPPORTED).join(" ");
}

export function validateAuthorizationRequest(client: OAuthClientInfo, params: AuthorizationRequest): string | null {
  if (!client.responseTypes.includes(params.responseType)) return "Unsupported response type";
  if (client.redirectUris.length > 0) {
    if (!client.redirectUris.includes(params.redirectUri)) return "Mismatched redirect URI";
  } else if (client.clientId.startsWith("https://")) {
    if (new URL(client.clientId).origin !== new URL(params.redirectUri).origin) return "Mismatched redirect URI";
  } else {
    return "No redirect URIs registered for this client";
  }
  if (params.codeChallengeMethod && params.codeChallengeMethod !== "S256") return "Unsupported code challenge method. Only S256 is supported.";
  return null;
}

export function getRequestedScopes(scopeParam: string | undefined, client: OAuthClientInfo) {
  const requested = parseScopeString(scopeParam);
  if (requested.length === 0) return parseScopeString(client.scope);
  const clientScopes = parseScopeString(client.scope);
  return requested.filter((scope) => clientScopes.includes(scope));
}

export async function createAuthorizationCode(clientId: string, userId: string, params: AuthorizationRequest) {
  const code = generateAuthorizationCode();
  const client = await getClient(clientId);

  if (client && clientId.startsWith("https://") && !client.redirectUris.includes(params.redirectUri)) {
    await prisma.oAuthClient.update({
      where: { clientId },
      data: { redirectUris: [...client.redirectUris, params.redirectUri] },
    });
  }

  await prisma.oAuthAuthorizationCode.create({
    data: {
      code,
      clientId,
      userId,
      redirectUri: params.redirectUri,
      codeChallenge: params.codeChallenge ?? null,
      codeChallengeMethod: params.codeChallengeMethod ?? null,
      scopes: getRequestedScopes(params.scope, client ?? { clientId, clientName: "Unknown", redirectUris: [], grantTypes: [], responseTypes: [], isPublic: true }),
      resource: params.resource ?? null,
      expiresAt: dateAdd(new Date(), AUTH_CODE_EXPIRY_SECONDS),
    },
  });

  return code;
}

export async function exchangeAuthorizationCode(clientId: string, code: string, codeVerifier?: string, redirectUri?: string, resource?: string): Promise<TokenResponse> {
  const authCode = await prisma.oAuthAuthorizationCode.findUnique({ where: { code } });
  if (!authCode) throw new Error("Invalid authorization code");
  if (authCode.clientId !== clientId) throw new Error("Authorization code was issued to a different client");
  if (authCode.used) throw new Error("Authorization code has already been used");
  if (authCode.expiresAt < new Date()) throw new Error("Authorization code has expired");
  if (redirectUri && authCode.redirectUri !== redirectUri) throw new Error("Mismatched redirect URI");
  if (authCode.codeChallenge) {
    if (!codeVerifier) throw new Error("PKCE code verifier is required");
    if (!verifyPkceChallenge(codeVerifier, authCode.codeChallenge, authCode.codeChallengeMethod)) throw new Error("PKCE verification failed");
  }

  await prisma.oAuthAuthorizationCode.update({ where: { id: authCode.id }, data: { used: true } });

  const accessToken = generateAccessToken();
  const refreshToken = generateRefreshToken();
  await prisma.oAuthToken.create({
    data: {
      accessToken,
      refreshToken,
      clientId,
      userId: authCode.userId,
      scopes: authCode.scopes,
      resource: authCode.resource ?? resource ?? null,
      expiresAt: dateAdd(new Date(), TOKEN_EXPIRY_SECONDS),
    },
  });

  return { access_token: accessToken, token_type: "Bearer", expires_in: TOKEN_EXPIRY_SECONDS, refresh_token: refreshToken, scope: authCode.scopes.join(" ") };
}

export async function exchangeRefreshToken(clientId: string, refreshToken: string, scopes?: string[], resource?: string): Promise<TokenResponse> {
  const existing = await prisma.oAuthToken.findUnique({ where: { refreshToken } });
  if (!existing) throw new Error("Invalid refresh token");
  if (existing.clientId !== clientId) throw new Error("Refresh token was issued to a different client");
  if (existing.revokedAt) throw new Error("Refresh token has been revoked");
  if (existing.expiresAt < new Date()) throw new Error("Refresh token has expired");

  const requestedScopes = scopes?.length ? scopes.filter((scope) => existing.scopes.includes(scope)) : existing.scopes;
  const accessToken = generateAccessToken();
  const newRefreshToken = generateRefreshToken();

  await prisma.oAuthToken.update({ where: { id: existing.id }, data: { revokedAt: new Date() } });
  await prisma.oAuthToken.create({
    data: {
      accessToken,
      refreshToken: newRefreshToken,
      clientId,
      userId: existing.userId,
      scopes: requestedScopes,
      resource: resource ?? existing.resource ?? null,
      expiresAt: dateAdd(new Date(), TOKEN_EXPIRY_SECONDS),
    },
  });

  return { access_token: accessToken, token_type: "Bearer", expires_in: TOKEN_EXPIRY_SECONDS, refresh_token: newRefreshToken, scope: requestedScopes.join(" ") };
}

export async function verifyAccessToken(token: string) {
  if (!isOAuthAccessToken(token)) return null;
  const tokenRecord = await prisma.oAuthToken.findUnique({ where: { accessToken: token } });
  if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt < new Date()) return null;
  return { userId: tokenRecord.userId, scopes: tokenRecord.scopes };
}

export async function revokeToken(clientId: string, token: string) {
  const tokenRecord = await prisma.oAuthToken.findFirst({
    where: { OR: [{ accessToken: token }, { refreshToken: token }], clientId },
  });
  if (tokenRecord && !tokenRecord.revokedAt) {
    await prisma.oAuthToken.update({ where: { id: tokenRecord.id }, data: { revokedAt: new Date() } });
  }
}

export async function registerClient(info: { clientName: string; clientUri?: string; logoUri?: string; redirectUris: string[]; grantTypes?: string[]; responseTypes?: string[]; scope?: string; tokenEndpointAuthMethod?: string; }) {
  const clientSecret = crypto.randomBytes(32).toString("hex");
  const client = await prisma.oAuthClient.create({
    data: {
      clientId: `mcp_${crypto.randomBytes(16).toString("hex")}`,
      clientSecret,
      clientName: info.clientName,
      clientUri: info.clientUri ?? null,
      logoUri: info.logoUri ?? null,
      redirectUris: info.redirectUris,
      grantTypes: normalizeGrantTypes(info.grantTypes),
      responseTypes: normalizeResponseTypes(info.responseTypes),
      scope: normalizeScope(info.scope),
      isPublic: info.tokenEndpointAuthMethod === "none" || !info.tokenEndpointAuthMethod,
    },
  });
  return { ...toClientInfo(client), clientSecret };
}

export async function checkExistingConsent(clientId: string, userId: string, requiredScopes: string[]) {
  const consent = await prisma.oAuthConsent.findUnique({ where: { clientId_userId: { clientId, userId } } });
  if (!consent) return false;
  return requiredScopes.every((scope) => consent.scopes.includes(scope));
}

export async function recordConsent(clientId: string, userId: string, scopes: string[], approved: boolean) {
  if (!approved) {
    await prisma.oAuthConsent.deleteMany({ where: { clientId, userId } });
    return;
  }
  await prisma.oAuthConsent.upsert({
    where: { clientId_userId: { clientId, userId } },
    update: { scopes, updatedAt: new Date() },
    create: { clientId, userId, scopes },
  });
}

export function buildRedirectUri(baseUri: string, params: Record<string, string>) {
  const url = new URL(baseUri);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}
