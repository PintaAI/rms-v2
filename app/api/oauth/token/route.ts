import { NextResponse } from "next/server";
import { exchangeAuthorizationCode, exchangeRefreshToken, getClient } from "@/lib/oauth/server";

export async function POST(req: Request) {
  try {
    const body = await readBody(req);
    const basicAuth = extractBasicAuthClientCredentials(req.headers.get("authorization"));
    const clientId = body.client_id || basicAuth?.clientId;
    const clientSecret = body.client_secret || basicAuth?.clientSecret;
    const grantType = body.grant_type;

    if (!clientId) return tokenError(400, "invalid_client", "Client ID is required");

    const client = await getClient(clientId);
    if (!client) return tokenError(400, "invalid_client", "Unknown client");

    if (!client.isPublic && (!clientSecret || clientSecret !== client.clientSecret)) {
      return tokenError(401, "invalid_client", "Invalid client credentials");
    }

    if (grantType === "authorization_code") {
      if (!body.code) return tokenError(400, "invalid_request", "Authorization code is required");
      const result = await exchangeAuthorizationCode(clientId, body.code, body.code_verifier, body.redirect_uri || undefined, body.resource || undefined);
      return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
    }

    if (grantType === "refresh_token") {
      if (!body.refresh_token) return tokenError(400, "invalid_request", "Refresh token is required");
      const scopes = body.scope ? body.scope.split(/\s+/).filter(Boolean) : undefined;
      const result = await exchangeRefreshToken(clientId, body.refresh_token, scopes, body.resource || undefined);
      return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
    }

    return tokenError(400, "unsupported_grant_type", `Grant type '${grantType}' is not supported`);
  } catch (error) {
    console.error("Token endpoint error:", error);
    return tokenError(400, "invalid_grant", error instanceof Error ? error.message : "Token exchange failed");
  }
}

async function readBody(req: Request): Promise<Record<string, string>> {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(await req.text()).entries());
  }
  return req.json();
}

function extractBasicAuthClientCredentials(authHeader: string | null) {
  if (!authHeader?.startsWith("Basic ")) return undefined;
  try {
    const decoded = atob(authHeader.slice(6));
    const colonIndex = decoded.indexOf(":");
    if (colonIndex < 0) return { clientId: decoded, clientSecret: undefined };
    return {
      clientId: decoded.slice(0, colonIndex),
      clientSecret: decoded.slice(colonIndex + 1),
    };
  } catch {
    return undefined;
  }
}

function tokenError(status: number, error: string, description: string) {
  return NextResponse.json({ error, error_description: description }, { status, headers: { "Cache-Control": "no-store" } });
}
