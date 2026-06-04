import { createMcpHandler, withMcpAuth } from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { registerRmsTools } from "@/lib/mcp/tools";
import { resolveMcpStoreId } from "@/lib/mcp/scope";
import { mcpContext } from "@/lib/mcp/tools/utils";
import { verifyAccessToken, isOAuthAccessToken } from "@/lib/oauth/server";
import { SCOPES } from "@/lib/oauth/types";

export const maxDuration = 60;

function getRequestToken(request: Request, bearerToken?: string) {
  if (bearerToken) return bearerToken;

  const authorization = request.headers.get("authorization");
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (bearer) return bearer;

  return undefined;
}

async function verifyToken(
  request: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> {
  const token = getRequestToken(request, bearerToken);
  if (!token) return undefined;

  if (!isOAuthAccessToken(token)) return undefined;

  const tokenInfo = await verifyAccessToken(token);
  if (!tokenInfo) return undefined;

  return {
    token,
    clientId: tokenInfo.userId,
    scopes: tokenInfo.scopes,
  };
}

const handler = createMcpHandler(
  (server) => {
    registerRmsTools(server);
  },
  {
    serverInfo: {
      name: "rms-v2",
      version: "0.1.0",
    },
  },
  {
    basePath: "/api",
    maxDuration: 60,
    verboseLogs: process.env.NODE_ENV === "development",
  },
);

const authHandler = withMcpAuth(handler, verifyToken, {
  required: true,
  requiredScopes: [SCOPES.READ],
  resourceMetadataPath: "/.well-known/oauth-protected-resource",
});

async function scopedHandler(request: Request) {
  const token = getRequestToken(request);
  if (!token) return authHandler(request);

  const tokenInfo = await verifyAccessToken(token);
  if (!tokenInfo) return authHandler(request);

  const url = new URL(request.url);
  const storeId = await resolveMcpStoreId(
    tokenInfo.userId,
    url.searchParams.get("store_id") ?? url.searchParams.get("tokoid"),
  );

  return mcpContext.run({ userId: tokenInfo.userId, storeId, scopes: tokenInfo.scopes }, () => authHandler(request));
}

export { scopedHandler as DELETE, scopedHandler as GET, scopedHandler as POST };
