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

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDateOnly(value: string): boolean {
  if (!DATE_ONLY_RE.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function isFullIsoDateTime(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) && !Number.isNaN(new Date(value).getTime());
}

export function parseDateFilter(value: string | undefined, role: "start" | "end"): Date | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (isDateOnly(trimmed)) {
    const [year, month, day] = trimmed.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    if (role === "end") date.setHours(23, 59, 59, 999);
    return date;
  }

  if (isFullIsoDateTime(trimmed)) {
    const date = new Date(trimmed);
    if (!Number.isNaN(date.getTime())) return date;
  }

  throw new Error(
    `Invalid date filter: ${value}. Use YYYY-MM-DD for date-only or a full ISO 8601 timestamp.`,
  );
}
