import { NextResponse } from "next/server";
import { getClient, revokeToken } from "@/lib/oauth/server";

export async function POST(req: Request) {
  try {
    const body = await readBody(req);
    const token = body.token;
    const clientId = body.client_id || extractBasicAuthClientId(req.headers.get("authorization"));

    if (!token) return NextResponse.json({ error: "invalid_request", error_description: "Token is required" }, { status: 400 });
    if (!clientId) return NextResponse.json({ error: "invalid_client", error_description: "Client ID is required" }, { status: 400 });

    const client = await getClient(clientId);
    if (!client) return NextResponse.json({ error: "invalid_client", error_description: "Unknown client" }, { status: 401 });

    await revokeToken(clientId, token);
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error("Revoke endpoint error:", error);
    return NextResponse.json({ error: "server_error", error_description: "Token revocation failed" }, { status: 500 });
  }
}

async function readBody(req: Request): Promise<Record<string, string>> {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(await req.text()).entries());
  }
  return req.json();
}

function extractBasicAuthClientId(authHeader: string | null) {
  if (!authHeader?.startsWith("Basic ")) return undefined;
  try {
    const decoded = atob(authHeader.slice(6));
    const colonIndex = decoded.indexOf(":");
    return colonIndex >= 0 ? decoded.slice(0, colonIndex) : decoded;
  } catch {
    return undefined;
  }
}
