import { AsyncLocalStorage } from "node:async_hooks";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { buildMcpScope } from "@/lib/mcp/scope";
import type { RequestScope } from "@/lib/auth/request-scope";

type McpContext = {
  userId: string;
  storeId: string;
  scopes: string[];
};

export const mcpContext = new AsyncLocalStorage<McpContext>();

export function ok(message: string, data?: unknown): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: data === undefined ? message : `${message}\n\n${JSON.stringify(data, null, 2)}`,
      },
    ],
    ...(data === undefined ? {} : { structuredContent: { data } }),
  };
}

export function toolError(error: unknown): CallToolResult {
  const message = error instanceof Error ? error.message : "Unknown error";
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

export function getMcpContext(): McpContext {
  const context = mcpContext.getStore();
  if (!context) throw new Error("No MCP request context");
  return context;
}

export async function getMcpScope(): Promise<RequestScope> {
  const context = getMcpContext();
  return buildMcpScope(context.userId, context.storeId);
}

export function assertMcpWriteScope() {
  const context = getMcpContext();
  if (!context.scopes.includes("rms:write")) {
    throw new Error("MCP client is missing required scope: rms:write");
  }
}
