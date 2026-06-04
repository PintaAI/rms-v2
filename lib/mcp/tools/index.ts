import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerDeviceTools } from "@/lib/mcp/tools/devices";
import { registerInventoryTools } from "@/lib/mcp/tools/inventory";
import { registerServiceTools } from "@/lib/mcp/tools/services";
import { registerStoreTools } from "@/lib/mcp/tools/store";

export function registerRmsTools(server: McpServer) {
  registerStoreTools(server);
  registerDeviceTools(server);
  registerInventoryTools(server);
  registerServiceTools(server);
}
