import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import prisma from "@/lib/prisma";
import { ok, toolError, getMcpScope } from "@/lib/mcp/tools/utils";

export function registerStoreTools(server: McpServer) {
  server.registerTool(
    "get_store_context",
    {
      title: "Get Store Context",
      description: "Get the current RMS store, authenticated user, plan, available permissions, and enabled features for this MCP session.",
      inputSchema: {},
    },
    async () => {
      try {
        const scope = await getMcpScope();
        const store = await prisma.store.findUnique({
          where: { id: scope.storeId },
          select: { id: true, name: true, address: true, phone: true, status: true },
        });
        const accessibleStores = await prisma.store.findMany({
          where: { id: { in: scope.user.storeIds } },
          orderBy: { name: "asc" },
          select: { id: true, name: true, address: true, phone: true, status: true },
        });

        return ok("Resolved MCP store context.", {
          currentStore: store,
          accessibleStores,
          storeSelection: {
            currentStoreId: scope.storeId,
            note: "OAuth authenticates the user. store_id is optional and only selects which accessible store tools operate on.",
          },
          user: {
            id: scope.user.id,
            name: scope.user.name,
            email: scope.user.email,
            role: scope.user.role,
          },
          plan: scope.plan,
          subscriptionStatus: scope.subscriptionStatus,
          permissions: Object.fromEntries(
            Object.entries(scope.permissionAccess)
              .filter(([, access]) => access.allowed)
              .map(([key]) => [key, true])
          ),
          features: Object.fromEntries(
            Object.entries(scope.featureAccess)
              .filter(([, enabled]) => enabled)
              .map(([key]) => [key, true])
          ),
        });
      } catch (error) {
        return toolError(error);
      }
    }
  );
}
