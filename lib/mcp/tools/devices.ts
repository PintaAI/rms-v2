import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { ok, toolError } from "@/lib/mcp/tools/utils";

export function registerDeviceTools(server: McpServer) {
  server.registerTool(
    "search_device_catalog",
    {
      title: "Search Device Catalog",
      description: "Search global phone brands and models available when creating repair orders. Images are intentionally omitted.",
      inputSchema: {
        query: z.string().trim().min(1).describe("Brand or model search query, for example iPhone 11 or Samsung A12."),
        limit: z.number().int().min(1).max(50).optional().describe("Maximum number of models to return. Defaults to 20."),
      },
    },
    async ({ query, limit = 20 }) => {
      try {
        const devices = await prisma.deviceModel.findMany({
          where: {
            OR: [
              { modelName: { contains: query, mode: "insensitive" } },
              { modelNumber: { contains: query, mode: "insensitive" } },
              { brand: { name: { contains: query, mode: "insensitive" } } },
            ],
          },
          orderBy: [{ brand: { name: "asc" } }, { modelName: "asc" }],
          take: limit,
          select: {
            id: true,
            modelName: true,
            modelNumber: true,
            brand: { select: { id: true, name: true } },
          },
        });

        return ok(`Found ${devices.length} device models.`, { devices });
      } catch (error) {
        return toolError(error);
      }
    }
  );
}
