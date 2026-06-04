import { NextResponse } from "next/server";
import { SCOPES_SUPPORTED } from "@/lib/oauth/types";

function getBaseUrl() {
  return process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export async function GET() {
  const baseUrl = getBaseUrl();

  return NextResponse.json(
    {
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/oauth/authorize`,
      token_endpoint: `${baseUrl}/api/oauth/token`,
      revocation_endpoint: `${baseUrl}/api/oauth/revoke`,
      registration_endpoint: `${baseUrl}/api/oauth/register`,
      scopes_supported: SCOPES_SUPPORTED,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none", "client_secret_basic"],
      revocation_endpoint_auth_methods_supported: ["none", "client_secret_basic"],
      client_id_metadata_document_supported: true,
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}
