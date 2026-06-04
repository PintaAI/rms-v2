import { protectedResourceHandler } from "mcp-handler";

function getBaseUrl() {
  return process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

const handler = protectedResourceHandler({
  authServerUrls: [getBaseUrl()],
});

export async function GET(req: Request) {
  return handler(req);
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
