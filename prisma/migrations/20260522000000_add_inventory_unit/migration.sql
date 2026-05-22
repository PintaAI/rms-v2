-- Add InventoryUnit for serialized phone tracking.
-- Direct link to device_model (hp catalog), no InventoryItem dependency.

BEGIN;

-- Add new enums for unit condition and status.
CREATE TYPE "InventoryUnitCondition" AS ENUM ('new', 'used_good', 'used_fair', 'refurbished', 'damaged');
CREATE TYPE "InventoryUnitStatus" AS ENUM ('available', 'reserved', 'sold', 'returned', 'defective');

-- Add new movement types for serialized units.
ALTER TYPE "InventoryMovementType" ADD VALUE 'unit_acquired';
ALTER TYPE "InventoryMovementType" ADD VALUE 'unit_sold';
ALTER TYPE "InventoryMovementType" ADD VALUE 'unit_returned';
ALTER TYPE "InventoryMovementType" ADD VALUE 'unit_adjusted';

-- Create inventory_unit table with direct device_model link.
CREATE TABLE "inventory_unit" (
  "id" TEXT NOT NULL,
  "deviceModelId" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "imei" TEXT,
  "serialNumber" TEXT,
  "condition" "InventoryUnitCondition" NOT NULL DEFAULT 'used_good',
  "status" "InventoryUnitStatus" NOT NULL DEFAULT 'available',
  "purchasePrice" INTEGER NOT NULL,
  "sellingPrice" INTEGER NOT NULL,
  "warrantyDays" INTEGER,
  "warrantyUntil" TIMESTAMP(3),
  "notes" TEXT,
  "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "soldAt" TIMESTAMP(3),
  "returnedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "inventory_unit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_unit_deviceModelId_fkey" 
    FOREIGN KEY ("deviceModelId") REFERENCES "device_model"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "inventory_unit_storeId_fkey" 
    FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Unique constraints for IMEI and serial number.
ALTER TABLE "inventory_unit" ADD CONSTRAINT "inventory_unit_imei_key" UNIQUE ("imei");
ALTER TABLE "inventory_unit" ADD CONSTRAINT "inventory_unit_serialNumber_key" UNIQUE ("serialNumber");

-- Indexes for efficient queries.
CREATE INDEX "inventory_unit_storeId_idx" ON "inventory_unit"("storeId");
CREATE INDEX "inventory_unit_deviceModelId_idx" ON "inventory_unit"("deviceModelId");
CREATE INDEX "inventory_unit_status_idx" ON "inventory_unit"("status");
CREATE INDEX "inventory_unit_condition_idx" ON "inventory_unit"("condition");
CREATE INDEX "inventory_unit_imei_idx" ON "inventory_unit"("imei");
CREATE INDEX "inventory_unit_serialNumber_idx" ON "inventory_unit"("serialNumber");
CREATE INDEX "inventory_unit_acquiredAt_idx" ON "inventory_unit"("acquiredAt");
CREATE INDEX "inventory_unit_storeId_status_idx" ON "inventory_unit"("storeId", "status");

-- Add inventoryUnitId to sales_order_item for linking sold units.
ALTER TABLE "sales_order_item" ADD COLUMN "inventoryUnitId" TEXT;
ALTER TABLE "sales_order_item" ADD CONSTRAINT "sales_order_item_inventoryUnitId_key" UNIQUE ("inventoryUnitId");
ALTER TABLE "sales_order_item"
  ADD CONSTRAINT "sales_order_item_inventoryUnitId_fkey"
  FOREIGN KEY ("inventoryUnitId") REFERENCES "inventory_unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "sales_order_item_inventoryUnitId_idx" ON "sales_order_item"("inventoryUnitId");

-- Add inventoryUnitId to inventory_movement for tracking unit movements.
-- Also make inventoryItemId nullable since unit movements don't need it.
ALTER TABLE "inventory_movement" ADD COLUMN "inventoryUnitId" TEXT;
ALTER TABLE "inventory_movement" DROP CONSTRAINT "inventory_movement_inventoryItemId_fkey";
ALTER TABLE "inventory_movement" ALTER COLUMN "inventoryItemId" DROP NOT NULL;
ALTER TABLE "inventory_movement"
  ADD CONSTRAINT "inventory_movement_inventoryItemId_fkey"
  FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_movement"
  ADD CONSTRAINT "inventory_movement_inventoryUnitId_fkey"
  FOREIGN KEY ("inventoryUnitId") REFERENCES "inventory_unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "inventory_movement_inventoryUnitId_idx" ON "inventory_movement"("inventoryUnitId");
CREATE INDEX "inventory_movement_storeId_inventoryUnitId_createdAt_idx" ON "inventory_movement"("storeId", "inventoryUnitId", "createdAt");

COMMIT;