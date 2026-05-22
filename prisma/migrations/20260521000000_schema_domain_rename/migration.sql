-- Schema/domain rename migration.
-- Uses metadata renames to preserve existing rows, indexes, and constraints.
-- Preferred emergency rollback is restoring the pre-migration database backup with the previous app version.
-- Conditional reverse SQL is only safe if this migration completed and no writes occurred afterward.

BEGIN;

-- Enums: rename Prisma enum types, preserve stable ActivityType values.
ALTER TYPE "TokoStatus" RENAME TO "StoreStatus";
ALTER TYPE "TokoUserRole" RENAME TO "StoreUserRole";
ALTER TYPE "ServiceStatus" RENAME TO "RepairOrderStatus";
ALTER TYPE "StockMovementType" RENAME TO "InventoryMovementType";
ALTER TYPE "RetailSaleStatus" RENAME TO "SalesOrderStatus";
ALTER TYPE "RetailPaymentMethod" RENAME TO "SalesPaymentMethod";
ALTER TYPE "SupplierDebtStatus" RENAME TO "SupplierPayableStatus";

-- Inventory item type values: sparepart -> repair_part, retail_item -> retail_product, add phone_unit.
ALTER TABLE "sparepart" ALTER COLUMN "kind" DROP DEFAULT;
ALTER TYPE "InventoryItemKind" RENAME TO "InventoryItemType";
ALTER TYPE "InventoryItemType" RENAME VALUE 'sparepart' TO 'repair_part';
ALTER TYPE "InventoryItemType" RENAME VALUE 'retail_item' TO 'retail_product';
ALTER TYPE "InventoryItemType" ADD VALUE 'phone_unit';

-- Repair order item type is split from the old shared ItemType.
ALTER TYPE "ItemType" RENAME TO "RepairOrderItemType";
ALTER TYPE "RepairOrderItemType" RENAME VALUE 'sparepart' TO 'inventory_item';
ALTER TYPE "RepairOrderItemType" RENAME VALUE 'service' TO 'service_catalog_item';
CREATE TYPE "RepairInvoiceItemType" AS ENUM ('inventory_item', 'service_catalog_item');

-- Inventory movement values: service/retail terms become repair/sales terms.
ALTER TYPE "InventoryMovementType" RENAME VALUE 'service_usage' TO 'repair_usage';
ALTER TYPE "InventoryMovementType" RENAME VALUE 'service_return' TO 'repair_return';
ALTER TYPE "InventoryMovementType" RENAME VALUE 'service_delete_return' TO 'repair_delete_return';
ALTER TYPE "InventoryMovementType" RENAME VALUE 'retail_sale' TO 'sales_order';
ALTER TYPE "InventoryMovementType" RENAME VALUE 'retail_void' TO 'sales_order_void';

-- Subscription invoice snapshot columns: toko* -> store*.
ALTER TABLE "subscription_invoice" RENAME COLUMN "tokoCount" TO "storeCount";
ALTER TABLE "subscription_invoice" RENAME COLUMN "includedTokos" TO "includedStores";
ALTER TABLE "subscription_invoice" RENAME COLUMN "additionalTokos" TO "additionalStores";
ALTER TABLE "subscription_invoice" RENAME COLUMN "additionalTokoPrice" TO "additionalStorePrice";

-- Global device catalog tables.
ALTER TABLE "brand" RENAME TO "device_brand";
ALTER TABLE "hp_catalog" RENAME TO "device_model";

-- Store-scoped tables: toko -> store.
ALTER TABLE "toko" RENAME TO "store";
ALTER TABLE "user_toko" RENAME TO "user_store";
ALTER TABLE "user_store" RENAME COLUMN "tokoId" TO "storeId";
ALTER TABLE "toko_feature_setting" RENAME TO "store_feature_setting";
ALTER TABLE "store_feature_setting" RENAME COLUMN "tokoId" TO "storeId";
ALTER TABLE "toko_whatsapp_setting" RENAME TO "store_whatsapp_setting";
ALTER TABLE "store_whatsapp_setting" RENAME COLUMN "tokoId" TO "storeId";
ALTER TABLE "toko_whatsapp_identity" RENAME TO "store_whatsapp_identity";
ALTER TABLE "store_whatsapp_identity" RENAME COLUMN "tokoId" TO "storeId";
ALTER TABLE "toko_user_permission" RENAME TO "store_user_permission";
ALTER TABLE "store_user_permission" RENAME COLUMN "tokoId" TO "storeId";

-- Inventory tables.
ALTER TABLE "sparepart_category" RENAME TO "inventory_category";
ALTER TABLE "inventory_category" RENAME COLUMN "tokoId" TO "storeId";
ALTER TABLE "sparepart" RENAME TO "inventory_item";
ALTER TABLE "inventory_item" RENAME COLUMN "tokoId" TO "storeId";
ALTER TABLE "inventory_item" RENAME COLUMN "kind" TO "type";
ALTER TABLE "inventory_item" ADD COLUMN "deviceModelId" TEXT;
ALTER TABLE "inventory_item" ALTER COLUMN "type" SET DEFAULT 'repair_part';
ALTER TABLE "inventory_item"
  ADD CONSTRAINT "inventory_item_deviceModelId_fkey"
  FOREIGN KEY ("deviceModelId") REFERENCES "device_model"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "inventory_item_deviceModelId_idx" ON "inventory_item"("deviceModelId");

ALTER TABLE "sparepart_compatibility" RENAME TO "part_compatibility";
ALTER TABLE "part_compatibility" RENAME COLUMN "hpCatalogId" TO "deviceModelId";
ALTER TABLE "part_compatibility" RENAME COLUMN "sparepartId" TO "inventoryItemId";

-- Repair tables.
ALTER TABLE "service_pricelist" RENAME TO "service_catalog_item";
ALTER TABLE "service_catalog_item" RENAME COLUMN "tokoId" TO "storeId";
ALTER TABLE "service" RENAME TO "repair_order";
ALTER TABLE "repair_order" RENAME COLUMN "tokoId" TO "storeId";
ALTER TABLE "repair_order" RENAME COLUMN "hpCatalogId" TO "deviceModelId";
ALTER TABLE "service_item" RENAME TO "repair_order_item";
ALTER TABLE "repair_order_item" RENAME COLUMN "serviceId" TO "repairOrderId";
ALTER TABLE "invoice" RENAME TO "repair_invoice";
ALTER TABLE "repair_invoice" RENAME COLUMN "serviceId" TO "repairOrderId";
ALTER TABLE "invoice_item" RENAME TO "repair_invoice_item";
ALTER TABLE "repair_invoice_item" RENAME COLUMN "invoiceId" TO "repairInvoiceId";
ALTER TABLE "repair_invoice_item" RENAME COLUMN "serviceItemId" TO "repairOrderItemId";
ALTER TABLE "repair_invoice_item"
  ALTER COLUMN "type" TYPE "RepairInvoiceItemType"
  USING "type"::text::"RepairInvoiceItemType";

-- Sales tables.
ALTER TABLE "retail_sale" RENAME TO "sales_order";
ALTER TABLE "sales_order" RENAME COLUMN "tokoId" TO "storeId";
ALTER TABLE "retail_sale_item" RENAME TO "sales_order_item";
ALTER TABLE "sales_order_item" RENAME COLUMN "saleId" TO "salesOrderId";
ALTER TABLE "sales_order_item" RENAME COLUMN "sparepartId" TO "inventoryItemId";

-- Inventory movement table.
ALTER TABLE "stock_movement" RENAME TO "inventory_movement";
ALTER TABLE "inventory_movement" RENAME COLUMN "tokoId" TO "storeId";
ALTER TABLE "inventory_movement" RENAME COLUMN "sparepartId" TO "inventoryItemId";

-- Supplier payable tables.
ALTER TABLE "supplier_debt" RENAME TO "supplier_payable";
ALTER TABLE "supplier_payable" RENAME COLUMN "tokoId" TO "storeId";
ALTER TABLE "supplier_debt_payment" RENAME TO "supplier_payable_payment";
ALTER TABLE "supplier_payable_payment" RENAME COLUMN "debtId" TO "payableId";

-- Unchanged tables with renamed store/inventory/repair FK columns.
ALTER TABLE "supplier" RENAME COLUMN "tokoId" TO "storeId";
ALTER TABLE "supplier_return" RENAME COLUMN "tokoId" TO "storeId";
ALTER TABLE "supplier_return" RENAME COLUMN "sparepartId" TO "inventoryItemId";
ALTER TABLE "warranty_claim" RENAME COLUMN "tokoId" TO "storeId";
ALTER TABLE "warranty_claim" RENAME COLUMN "serviceId" TO "repairOrderId";
ALTER TABLE "warranty_claim_item" RENAME COLUMN "sparepartId" TO "inventoryItemId";
ALTER TABLE "inventory_audit_session" RENAME COLUMN "tokoId" TO "storeId";
ALTER TABLE "inventory_audit_item" RENAME COLUMN "sparepartId" TO "inventoryItemId";
ALTER TABLE "inventory_audit_item" RENAME COLUMN "sparepartName" TO "inventoryItemName";
ALTER TABLE "activity_log" RENAME COLUMN "tokoId" TO "storeId";
ALTER TABLE "activity_log" RENAME COLUMN "serviceId" TO "repairOrderId";

-- Constraint renames for clarity. Tables/columns were already renamed above.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'toko_pkey') THEN ALTER TABLE "store" RENAME CONSTRAINT "toko_pkey" TO "store_pkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_toko_pkey') THEN ALTER TABLE "user_store" RENAME CONSTRAINT "user_toko_pkey" TO "user_store_pkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_toko_userId_fkey') THEN ALTER TABLE "user_store" RENAME CONSTRAINT "user_toko_userId_fkey" TO "user_store_userId_fkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_toko_tokoId_fkey') THEN ALTER TABLE "user_store" RENAME CONSTRAINT "user_toko_tokoId_fkey" TO "user_store_storeId_fkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'toko_feature_setting_pkey') THEN ALTER TABLE "store_feature_setting" RENAME CONSTRAINT "toko_feature_setting_pkey" TO "store_feature_setting_pkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'toko_feature_setting_tokoId_fkey') THEN ALTER TABLE "store_feature_setting" RENAME CONSTRAINT "toko_feature_setting_tokoId_fkey" TO "store_feature_setting_storeId_fkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'toko_whatsapp_setting_pkey') THEN ALTER TABLE "store_whatsapp_setting" RENAME CONSTRAINT "toko_whatsapp_setting_pkey" TO "store_whatsapp_setting_pkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'toko_whatsapp_setting_tokoId_fkey') THEN ALTER TABLE "store_whatsapp_setting" RENAME CONSTRAINT "toko_whatsapp_setting_tokoId_fkey" TO "store_whatsapp_setting_storeId_fkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'toko_whatsapp_identity_pkey') THEN ALTER TABLE "store_whatsapp_identity" RENAME CONSTRAINT "toko_whatsapp_identity_pkey" TO "store_whatsapp_identity_pkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'toko_whatsapp_identity_tokoId_fkey') THEN ALTER TABLE "store_whatsapp_identity" RENAME CONSTRAINT "toko_whatsapp_identity_tokoId_fkey" TO "store_whatsapp_identity_storeId_fkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'toko_user_permission_pkey') THEN ALTER TABLE "store_user_permission" RENAME CONSTRAINT "toko_user_permission_pkey" TO "store_user_permission_pkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'toko_user_permission_tokoId_fkey') THEN ALTER TABLE "store_user_permission" RENAME CONSTRAINT "toko_user_permission_tokoId_fkey" TO "store_user_permission_storeId_fkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'brand_pkey') THEN ALTER TABLE "device_brand" RENAME CONSTRAINT "brand_pkey" TO "device_brand_pkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hp_catalog_pkey') THEN ALTER TABLE "device_model" RENAME CONSTRAINT "hp_catalog_pkey" TO "device_model_pkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hp_catalog_brandId_fkey') THEN ALTER TABLE "device_model" RENAME CONSTRAINT "hp_catalog_brandId_fkey" TO "device_model_brandId_fkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sparepart_pkey') THEN ALTER TABLE "inventory_item" RENAME CONSTRAINT "sparepart_pkey" TO "inventory_item_pkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sparepart_tokoId_fkey') THEN ALTER TABLE "inventory_item" RENAME CONSTRAINT "sparepart_tokoId_fkey" TO "inventory_item_storeId_fkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sparepart_categoryId_fkey') THEN ALTER TABLE "inventory_item" RENAME CONSTRAINT "sparepart_categoryId_fkey" TO "inventory_item_categoryId_fkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sparepart_category_pkey') THEN ALTER TABLE "inventory_category" RENAME CONSTRAINT "sparepart_category_pkey" TO "inventory_category_pkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sparepart_category_tokoId_fkey') THEN ALTER TABLE "inventory_category" RENAME CONSTRAINT "sparepart_category_tokoId_fkey" TO "inventory_category_storeId_fkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sparepart_compatibility_pkey') THEN ALTER TABLE "part_compatibility" RENAME CONSTRAINT "sparepart_compatibility_pkey" TO "part_compatibility_pkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sparepart_compatibility_hpCatalogId_fkey') THEN ALTER TABLE "part_compatibility" RENAME CONSTRAINT "sparepart_compatibility_hpCatalogId_fkey" TO "part_compatibility_deviceModelId_fkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sparepart_compatibility_sparepartId_fkey') THEN ALTER TABLE "part_compatibility" RENAME CONSTRAINT "sparepart_compatibility_sparepartId_fkey" TO "part_compatibility_inventoryItemId_fkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_pricelist_pkey') THEN ALTER TABLE "service_catalog_item" RENAME CONSTRAINT "service_pricelist_pkey" TO "service_catalog_item_pkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_pricelist_tokoId_fkey') THEN ALTER TABLE "service_catalog_item" RENAME CONSTRAINT "service_pricelist_tokoId_fkey" TO "service_catalog_item_storeId_fkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_pkey') THEN ALTER TABLE "repair_order" RENAME CONSTRAINT "service_pkey" TO "repair_order_pkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_tokoId_fkey') THEN ALTER TABLE "repair_order" RENAME CONSTRAINT "service_tokoId_fkey" TO "repair_order_storeId_fkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_hpCatalogId_fkey') THEN ALTER TABLE "repair_order" RENAME CONSTRAINT "service_hpCatalogId_fkey" TO "repair_order_deviceModelId_fkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_createdById_fkey') THEN ALTER TABLE "repair_order" RENAME CONSTRAINT "service_createdById_fkey" TO "repair_order_createdById_fkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_technicianId_fkey') THEN ALTER TABLE "repair_order" RENAME CONSTRAINT "service_technicianId_fkey" TO "repair_order_technicianId_fkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_item_pkey') THEN ALTER TABLE "repair_order_item" RENAME CONSTRAINT "service_item_pkey" TO "repair_order_item_pkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_item_serviceId_fkey') THEN ALTER TABLE "repair_order_item" RENAME CONSTRAINT "service_item_serviceId_fkey" TO "repair_order_item_repairOrderId_fkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_item_sparepart_fk') THEN ALTER TABLE "repair_order_item" RENAME CONSTRAINT "service_item_sparepart_fk" TO "repair_order_item_inventory_item_fk"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoice_pkey') THEN ALTER TABLE "repair_invoice" RENAME CONSTRAINT "invoice_pkey" TO "repair_invoice_pkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoice_serviceId_fkey') THEN ALTER TABLE "repair_invoice" RENAME CONSTRAINT "invoice_serviceId_fkey" TO "repair_invoice_repairOrderId_fkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoice_item_pkey') THEN ALTER TABLE "repair_invoice_item" RENAME CONSTRAINT "invoice_item_pkey" TO "repair_invoice_item_pkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoice_item_invoiceId_fkey') THEN ALTER TABLE "repair_invoice_item" RENAME CONSTRAINT "invoice_item_invoiceId_fkey" TO "repair_invoice_item_repairInvoiceId_fkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'retail_sale_pkey') THEN ALTER TABLE "sales_order" RENAME CONSTRAINT "retail_sale_pkey" TO "sales_order_pkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'retail_sale_tokoId_fkey') THEN ALTER TABLE "sales_order" RENAME CONSTRAINT "retail_sale_tokoId_fkey" TO "sales_order_storeId_fkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'retail_sale_createdById_fkey') THEN ALTER TABLE "sales_order" RENAME CONSTRAINT "retail_sale_createdById_fkey" TO "sales_order_createdById_fkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'retail_sale_item_pkey') THEN ALTER TABLE "sales_order_item" RENAME CONSTRAINT "retail_sale_item_pkey" TO "sales_order_item_pkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'retail_sale_item_saleId_fkey') THEN ALTER TABLE "sales_order_item" RENAME CONSTRAINT "retail_sale_item_saleId_fkey" TO "sales_order_item_salesOrderId_fkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'retail_sale_item_sparepartId_fkey') THEN ALTER TABLE "sales_order_item" RENAME CONSTRAINT "retail_sale_item_sparepartId_fkey" TO "sales_order_item_inventoryItemId_fkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_movement_pkey') THEN ALTER TABLE "inventory_movement" RENAME CONSTRAINT "stock_movement_pkey" TO "inventory_movement_pkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_movement_tokoId_fkey') THEN ALTER TABLE "inventory_movement" RENAME CONSTRAINT "stock_movement_tokoId_fkey" TO "inventory_movement_storeId_fkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_movement_sparepartId_fkey') THEN ALTER TABLE "inventory_movement" RENAME CONSTRAINT "stock_movement_sparepartId_fkey" TO "inventory_movement_inventoryItemId_fkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_movement_createdById_fkey') THEN ALTER TABLE "inventory_movement" RENAME CONSTRAINT "stock_movement_createdById_fkey" TO "inventory_movement_createdById_fkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'supplier_debt_pkey') THEN ALTER TABLE "supplier_payable" RENAME CONSTRAINT "supplier_debt_pkey" TO "supplier_payable_pkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'supplier_debt_tokoId_fkey') THEN ALTER TABLE "supplier_payable" RENAME CONSTRAINT "supplier_debt_tokoId_fkey" TO "supplier_payable_storeId_fkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'supplier_debt_supplierId_fkey') THEN ALTER TABLE "supplier_payable" RENAME CONSTRAINT "supplier_debt_supplierId_fkey" TO "supplier_payable_supplierId_fkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'supplier_debt_payment_pkey') THEN ALTER TABLE "supplier_payable_payment" RENAME CONSTRAINT "supplier_debt_payment_pkey" TO "supplier_payable_payment_pkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'supplier_debt_payment_debtId_fkey') THEN ALTER TABLE "supplier_payable_payment" RENAME CONSTRAINT "supplier_debt_payment_debtId_fkey" TO "supplier_payable_payment_payableId_fkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'supplier_tokoId_fkey') THEN ALTER TABLE "supplier" RENAME CONSTRAINT "supplier_tokoId_fkey" TO "supplier_storeId_fkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'supplier_return_tokoId_fkey') THEN ALTER TABLE "supplier_return" RENAME CONSTRAINT "supplier_return_tokoId_fkey" TO "supplier_return_storeId_fkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'supplier_return_sparepartId_fkey') THEN ALTER TABLE "supplier_return" RENAME CONSTRAINT "supplier_return_sparepartId_fkey" TO "supplier_return_inventoryItemId_fkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'warranty_claim_tokoId_fkey') THEN ALTER TABLE "warranty_claim" RENAME CONSTRAINT "warranty_claim_tokoId_fkey" TO "warranty_claim_storeId_fkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'warranty_claim_serviceId_fkey') THEN ALTER TABLE "warranty_claim" RENAME CONSTRAINT "warranty_claim_serviceId_fkey" TO "warranty_claim_repairOrderId_fkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'warranty_claim_item_sparepartId_fkey') THEN ALTER TABLE "warranty_claim_item" RENAME CONSTRAINT "warranty_claim_item_sparepartId_fkey" TO "warranty_claim_item_inventoryItemId_fkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_audit_session_tokoId_fkey') THEN ALTER TABLE "inventory_audit_session" RENAME CONSTRAINT "inventory_audit_session_tokoId_fkey" TO "inventory_audit_session_storeId_fkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_audit_item_sparepartId_fkey') THEN ALTER TABLE "inventory_audit_item" RENAME CONSTRAINT "inventory_audit_item_sparepartId_fkey" TO "inventory_audit_item_inventoryItemId_fkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'activity_log_tokoId_fkey') THEN ALTER TABLE "activity_log" RENAME CONSTRAINT "activity_log_tokoId_fkey" TO "activity_log_storeId_fkey"; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'activity_log_serviceId_fkey') THEN ALTER TABLE "activity_log" RENAME CONSTRAINT "activity_log_serviceId_fkey" TO "activity_log_repairOrderId_fkey"; END IF;
END $$;

-- Index and unique-constraint backing index renames for clarity.
ALTER INDEX IF EXISTS "toko_status_idx" RENAME TO "store_status_idx";
ALTER INDEX IF EXISTS "user_toko_userId_idx" RENAME TO "user_store_userId_idx";
ALTER INDEX IF EXISTS "user_toko_tokoId_idx" RENAME TO "user_store_storeId_idx";
ALTER INDEX IF EXISTS "toko_whatsapp_setting_instanceName_key" RENAME TO "store_whatsapp_setting_instanceName_key";
ALTER INDEX IF EXISTS "toko_whatsapp_identity_tokoId_phoneNumber_key" RENAME TO "store_whatsapp_identity_storeId_phoneNumber_key";
ALTER INDEX IF EXISTS "toko_whatsapp_identity_tokoId_phoneJid_idx" RENAME TO "store_whatsapp_identity_storeId_phoneJid_idx";
ALTER INDEX IF EXISTS "toko_whatsapp_identity_tokoId_lidJid_idx" RENAME TO "store_whatsapp_identity_storeId_lidJid_idx";
ALTER INDEX IF EXISTS "toko_user_permission_tokoId_userId_permissionKey_key" RENAME TO "store_user_permission_storeId_userId_permissionKey_key";
ALTER INDEX IF EXISTS "toko_user_permission_tokoId_userId_idx" RENAME TO "store_user_permission_storeId_userId_idx";
ALTER INDEX IF EXISTS "toko_user_permission_userId_idx" RENAME TO "store_user_permission_userId_idx";
ALTER INDEX IF EXISTS "brand_name_key" RENAME TO "device_brand_name_key";
ALTER INDEX IF EXISTS "hp_catalog_mobileApiId_key" RENAME TO "device_model_mobileApiId_key";
ALTER INDEX IF EXISTS "hp_catalog_brandId_modelName_key" RENAME TO "device_model_brandId_modelName_key";
ALTER INDEX IF EXISTS "hp_catalog_brandId_modelName_idx" RENAME TO "device_model_brandId_modelName_idx";
ALTER INDEX IF EXISTS "sparepart_tokoId_name_key" RENAME TO "inventory_item_storeId_name_key";
ALTER INDEX IF EXISTS "sparepart_tokoId_barcode_key" RENAME TO "inventory_item_storeId_barcode_key";
ALTER INDEX IF EXISTS "sparepart_tokoId_idx" RENAME TO "inventory_item_storeId_idx";
ALTER INDEX IF EXISTS "sparepart_categoryId_idx" RENAME TO "inventory_item_categoryId_idx";
ALTER INDEX IF EXISTS "sparepart_category_tokoId_name_key" RENAME TO "inventory_category_storeId_name_key";
ALTER INDEX IF EXISTS "sparepart_category_tokoId_idx" RENAME TO "inventory_category_storeId_idx";
ALTER INDEX IF EXISTS "service_pricelist_tokoId_title_key" RENAME TO "service_catalog_item_storeId_title_key";
ALTER INDEX IF EXISTS "service_pricelist_tokoId_idx" RENAME TO "service_catalog_item_storeId_idx";
ALTER INDEX IF EXISTS "service_tokoId_idx" RENAME TO "repair_order_storeId_idx";
ALTER INDEX IF EXISTS "service_status_idx" RENAME TO "repair_order_status_idx";
ALTER INDEX IF EXISTS "service_checkinAt_idx" RENAME TO "repair_order_checkinAt_idx";
ALTER INDEX IF EXISTS "service_noWa_idx" RENAME TO "repair_order_noWa_idx";
ALTER INDEX IF EXISTS "service_technicianId_idx" RENAME TO "repair_order_technicianId_idx";
ALTER INDEX IF EXISTS "service_tokoId_status_idx" RENAME TO "repair_order_storeId_status_idx";
ALTER INDEX IF EXISTS "service_tokoId_checkinAt_idx" RENAME TO "repair_order_storeId_checkinAt_idx";
ALTER INDEX IF EXISTS "service_tokoId_noWa_idx" RENAME TO "repair_order_storeId_noWa_idx";
ALTER INDEX IF EXISTS "service_item_serviceId_idx" RENAME TO "repair_order_item_repairOrderId_idx";
ALTER INDEX IF EXISTS "service_item_type_idx" RENAME TO "repair_order_item_type_idx";
ALTER INDEX IF EXISTS "service_item_referenceId_idx" RENAME TO "repair_order_item_referenceId_idx";
ALTER INDEX IF EXISTS "invoice_serviceId_key" RENAME TO "repair_invoice_repairOrderId_key";
ALTER INDEX IF EXISTS "invoice_item_invoiceId_idx" RENAME TO "repair_invoice_item_repairInvoiceId_idx";
ALTER INDEX IF EXISTS "invoice_item_serviceItemId_idx" RENAME TO "repair_invoice_item_repairOrderItemId_idx";
ALTER INDEX IF EXISTS "retail_sale_tokoId_idx" RENAME TO "sales_order_storeId_idx";
ALTER INDEX IF EXISTS "retail_sale_createdById_idx" RENAME TO "sales_order_createdById_idx";
ALTER INDEX IF EXISTS "retail_sale_status_idx" RENAME TO "sales_order_status_idx";
ALTER INDEX IF EXISTS "retail_sale_paymentMethod_idx" RENAME TO "sales_order_paymentMethod_idx";
ALTER INDEX IF EXISTS "retail_sale_paidAt_idx" RENAME TO "sales_order_paidAt_idx";
ALTER INDEX IF EXISTS "retail_sale_tokoId_paidAt_idx" RENAME TO "sales_order_storeId_paidAt_idx";
ALTER INDEX IF EXISTS "retail_sale_item_saleId_idx" RENAME TO "sales_order_item_salesOrderId_idx";
ALTER INDEX IF EXISTS "retail_sale_item_sparepartId_idx" RENAME TO "sales_order_item_inventoryItemId_idx";
ALTER INDEX IF EXISTS "retail_sale_item_kind_idx" RENAME TO "sales_order_item_kind_idx";
ALTER INDEX IF EXISTS "stock_movement_tokoId_idx" RENAME TO "inventory_movement_storeId_idx";
ALTER INDEX IF EXISTS "stock_movement_sparepartId_idx" RENAME TO "inventory_movement_inventoryItemId_idx";
ALTER INDEX IF EXISTS "stock_movement_createdById_idx" RENAME TO "inventory_movement_createdById_idx";
ALTER INDEX IF EXISTS "stock_movement_type_idx" RENAME TO "inventory_movement_type_idx";
ALTER INDEX IF EXISTS "stock_movement_createdAt_idx" RENAME TO "inventory_movement_createdAt_idx";
ALTER INDEX IF EXISTS "stock_movement_tokoId_createdAt_idx" RENAME TO "inventory_movement_storeId_createdAt_idx";
ALTER INDEX IF EXISTS "stock_movement_tokoId_sparepartId_createdAt_idx" RENAME TO "inventory_movement_storeId_inventoryItemId_createdAt_idx";
ALTER INDEX IF EXISTS "stock_movement_referenceType_referenceId_idx" RENAME TO "inventory_movement_referenceType_referenceId_idx";
ALTER INDEX IF EXISTS "supplier_tokoId_name_key" RENAME TO "supplier_storeId_name_key";
ALTER INDEX IF EXISTS "supplier_tokoId_idx" RENAME TO "supplier_storeId_idx";
ALTER INDEX IF EXISTS "supplier_debt_tokoId_idx" RENAME TO "supplier_payable_storeId_idx";
ALTER INDEX IF EXISTS "supplier_debt_supplierId_idx" RENAME TO "supplier_payable_supplierId_idx";
ALTER INDEX IF EXISTS "supplier_debt_status_idx" RENAME TO "supplier_payable_status_idx";
ALTER INDEX IF EXISTS "supplier_debt_dueDate_idx" RENAME TO "supplier_payable_dueDate_idx";
ALTER INDEX IF EXISTS "supplier_debt_payment_debtId_idx" RENAME TO "supplier_payable_payment_payableId_idx";
ALTER INDEX IF EXISTS "supplier_debt_payment_paymentDate_idx" RENAME TO "supplier_payable_payment_paymentDate_idx";
ALTER INDEX IF EXISTS "supplier_return_tokoId_idx" RENAME TO "supplier_return_storeId_idx";
ALTER INDEX IF EXISTS "supplier_return_sparepartId_idx" RENAME TO "supplier_return_inventoryItemId_idx";
ALTER INDEX IF EXISTS "warranty_claim_tokoId_idx" RENAME TO "warranty_claim_storeId_idx";
ALTER INDEX IF EXISTS "warranty_claim_serviceId_idx" RENAME TO "warranty_claim_repairOrderId_idx";
ALTER INDEX IF EXISTS "warranty_claim_item_sparepartId_idx" RENAME TO "warranty_claim_item_inventoryItemId_idx";
ALTER INDEX IF EXISTS "inventory_audit_session_tokoId_idx" RENAME TO "inventory_audit_session_storeId_idx";
ALTER INDEX IF EXISTS "inventory_audit_session_tokoId_status_idx" RENAME TO "inventory_audit_session_storeId_status_idx";
ALTER INDEX IF EXISTS "inventory_audit_session_tokoId_startedAt_idx" RENAME TO "inventory_audit_session_storeId_startedAt_idx";
ALTER INDEX IF EXISTS "inventory_audit_item_sessionId_sparepartId_key" RENAME TO "inventory_audit_item_sessionId_inventoryItemId_key";
ALTER INDEX IF EXISTS "inventory_audit_item_sessionId_sparepartName_idx" RENAME TO "inventory_audit_item_sessionId_inventoryItemName_idx";
ALTER INDEX IF EXISTS "inventory_audit_item_sparepartId_idx" RENAME TO "inventory_audit_item_inventoryItemId_idx";
ALTER INDEX IF EXISTS "activity_log_tokoId_idx" RENAME TO "activity_log_storeId_idx";
ALTER INDEX IF EXISTS "activity_log_serviceId_idx" RENAME TO "activity_log_repairOrderId_idx";
ALTER INDEX IF EXISTS "activity_log_tokoId_createdAt_idx" RENAME TO "activity_log_storeId_createdAt_idx";

COMMIT;
