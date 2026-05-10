CREATE TYPE "InventoryItemKind" AS ENUM ('sparepart', 'retail_item');

ALTER TABLE "sparepart"
ADD COLUMN "kind" "InventoryItemKind" NOT NULL DEFAULT 'sparepart';
