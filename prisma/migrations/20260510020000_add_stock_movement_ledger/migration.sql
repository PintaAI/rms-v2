CREATE TYPE "StockMovementType" AS ENUM (
  'restock',
  'service_usage',
  'service_return',
  'service_delete_return',
  'retail_sale',
  'retail_void',
  'audit_adjustment'
);

CREATE TABLE "stock_movement" (
  "id" TEXT NOT NULL,
  "tokoId" TEXT NOT NULL,
  "sparepartId" TEXT NOT NULL,
  "type" "StockMovementType" NOT NULL,
  "qtyChange" INTEGER NOT NULL,
  "stockBefore" INTEGER NOT NULL,
  "stockAfter" INTEGER NOT NULL,
  "unitCostSnapshot" INTEGER,
  "unitPriceSnapshot" INTEGER,
  "referenceType" TEXT,
  "referenceId" TEXT,
  "note" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "stock_movement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "stock_movement_tokoId_idx" ON "stock_movement"("tokoId");
CREATE INDEX "stock_movement_sparepartId_idx" ON "stock_movement"("sparepartId");
CREATE INDEX "stock_movement_createdById_idx" ON "stock_movement"("createdById");
CREATE INDEX "stock_movement_type_idx" ON "stock_movement"("type");
CREATE INDEX "stock_movement_createdAt_idx" ON "stock_movement"("createdAt");
CREATE INDEX "stock_movement_tokoId_createdAt_idx" ON "stock_movement"("tokoId", "createdAt");
CREATE INDEX "stock_movement_tokoId_sparepartId_createdAt_idx" ON "stock_movement"("tokoId", "sparepartId", "createdAt");
CREATE INDEX "stock_movement_referenceType_referenceId_idx" ON "stock_movement"("referenceType", "referenceId");

ALTER TABLE "stock_movement"
ADD CONSTRAINT "stock_movement_tokoId_fkey"
FOREIGN KEY ("tokoId") REFERENCES "toko"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "stock_movement"
ADD CONSTRAINT "stock_movement_sparepartId_fkey"
FOREIGN KEY ("sparepartId") REFERENCES "sparepart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_movement"
ADD CONSTRAINT "stock_movement_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
