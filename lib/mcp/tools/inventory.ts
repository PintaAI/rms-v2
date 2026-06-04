import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v3";
import prisma from "@/lib/prisma";
import { assertFeature, assertPermission } from "@/lib/auth/request-scope";
import { ok, toolError, getMcpScope } from "@/lib/mcp/tools/utils";
import type { Prisma } from "@/prisma/generated/prisma/client";

const inventoryTypeSchema = z.enum(["repair_part", "retail_product", "phone_unit"]);

export function registerInventoryTools(server: McpServer) {
  server.registerTool(
    "list_inventory_items",
    {
      title: "List Inventory Items",
      description: "List inventory items for the current RMS store with optional search, type, stock status, category, and pagination filters.",
      inputSchema: {
        query: z.string().trim().optional().describe("Search by name, barcode, supplier, or category."),
        type: inventoryTypeSchema.optional().describe("Inventory type. Defaults to repair_part."),
        categoryId: z.string().trim().optional().describe("Optional inventory category ID."),
        stockStatus: z.enum(["all", "safe", "critical", "out"]).optional().describe("Stock health filter. Defaults to all."),
        pageSize: z.number().int().min(1).max(50).optional().describe("Items per page. Defaults to 20."),
        skip: z.number().int().min(0).optional().describe("Number of items to skip. Defaults to 0."),
      },
    },
    async ({ query, type = "repair_part", categoryId, stockStatus = "all", pageSize = 20, skip = 0 }) => {
      try {
        const scope = await getMcpScope();
        if (type === "retail_product") {
          assertFeature(scope, "retail.sales");
          assertPermission(scope, "inventory.manageRetail");
        } else if (type === "phone_unit") {
          assertFeature(scope, "inventory.management");
          assertPermission(scope, "inventory.managePhoneUnits");
        } else {
          assertFeature(scope, "inventory.management");
          assertPermission(scope, "inventory.view");
        }

        const trimmedQuery = query?.trim();
        const where: Prisma.InventoryItemWhereInput = {
          storeId: scope.storeId,
          type,
          ...(categoryId ? { categoryId } : {}),
          ...(trimmedQuery
            ? {
                OR: [
                  { name: { contains: trimmedQuery, mode: "insensitive" as const } },
                  { barcode: { contains: trimmedQuery, mode: "insensitive" as const } },
                  { supplierName: { contains: trimmedQuery, mode: "insensitive" as const } },
                  { category: { name: { contains: trimmedQuery, mode: "insensitive" as const } } },
                ],
              }
            : {}),
        };

        const allItems = await prisma.inventoryItem.findMany({
          where,
          orderBy: { name: "asc" },
          take: 500,
          select: {
            id: true,
            barcode: true,
            name: true,
            type: true,
            stock: true,
            criticalStock: true,
            defaultPrice: true,
            purchasePrice: true,
            supplierName: true,
            warrantyDays: true,
            isUniversal: true,
            category: { select: { id: true, name: true, kind: true } },
            deviceModel: {
              select: {
                id: true,
                modelName: true,
                brand: { select: { id: true, name: true } },
              },
            },
          },
        });

        const filteredItems = allItems.filter((item) => {
          if (stockStatus === "out") return item.stock <= 0;
          if (stockStatus === "critical") return item.stock > 0 && item.stock <= item.criticalStock;
          if (stockStatus === "safe") return item.stock > item.criticalStock;
          return true;
        });
        const total = filteredItems.length;
        const items = filteredItems.slice(skip, skip + pageSize);

        return ok(`Found ${items.length} inventory items.`, { items, total, pageSize, skip, hasMore: skip + items.length < total });
      } catch (error) {
        return toolError(error);
      }
    }
  );
}
