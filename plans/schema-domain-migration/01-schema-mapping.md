# 01 Schema Mapping

This file is the source of truth for old-to-new schema names. Migration SQL and code changes should follow this mapping exactly.

If a model, table, enum, field, or persisted string is not listed here, do not rename it without first updating this document.

## Models And Tables

| Current Prisma model | Target Prisma model | Current table | Target table |
|---|---|---|---|
| `Toko` | `Store` | `toko` | `store` |
| `UserToko` | `UserStore` | `user_toko` | `user_store` |
| `TokoFeatureSetting` | `StoreFeatureSetting` | `toko_feature_setting` | `store_feature_setting` |
| `TokoWhatsappSetting` | `StoreWhatsappSetting` | `toko_whatsapp_setting` | `store_whatsapp_setting` |
| `TokoWhatsappIdentity` | `StoreWhatsappIdentity` | `toko_whatsapp_identity` | `store_whatsapp_identity` |
| `TokoUserPermission` | `StoreUserPermission` | `toko_user_permission` | `store_user_permission` |
| `Brand` | `DeviceBrand` | `brand` | `device_brand` |
| `HpCatalog` | `DeviceModel` | `hp_catalog` | `device_model` |
| `Sparepart` | `InventoryItem` | `sparepart` | `inventory_item` |
| `SparepartCategory` | `InventoryCategory` | `sparepart_category` | `inventory_category` |
| `SparepartCompatibility` | `PartCompatibility` | `sparepart_compatibility` | `part_compatibility` |
| `ServicePricelist` | `ServiceCatalogItem` | `service_pricelist` | `service_catalog_item` |
| `Service` | `RepairOrder` | `service` | `repair_order` |
| `ServiceItem` | `RepairOrderItem` | `service_item` | `repair_order_item` |
| `Invoice` | `RepairInvoice` | `invoice` | `repair_invoice` |
| `InvoiceItem` | `RepairInvoiceItem` | `invoice_item` | `repair_invoice_item` |
| `RetailSale` | `SalesOrder` | `retail_sale` | `sales_order` |
| `RetailSaleItem` | `SalesOrderItem` | `retail_sale_item` | `sales_order_item` |
| `StockMovement` | `InventoryMovement` | `stock_movement` | `inventory_movement` |
| `SupplierDebt` | `SupplierPayable` | `supplier_debt` | `supplier_payable` |
| `SupplierDebtPayment` | `SupplierPayablePayment` | `supplier_debt_payment` | `supplier_payable_payment` |

## Prisma Delegate Names

| Current delegate | Target delegate |
|---|---|
| `prisma.toko` | `prisma.store` |
| `prisma.userToko` | `prisma.userStore` |
| `prisma.tokoFeatureSetting` | `prisma.storeFeatureSetting` |
| `prisma.tokoWhatsappSetting` | `prisma.storeWhatsappSetting` |
| `prisma.tokoWhatsappIdentity` | `prisma.storeWhatsappIdentity` |
| `prisma.tokoUserPermission` | `prisma.storeUserPermission` |
| `prisma.brand` | `prisma.deviceBrand` |
| `prisma.hpCatalog` | `prisma.deviceModel` |
| `prisma.sparepart` | `prisma.inventoryItem` |
| `prisma.sparepartCategory` | `prisma.inventoryCategory` |
| `prisma.sparepartCompatibility` | `prisma.partCompatibility` |
| `prisma.servicePricelist` | `prisma.serviceCatalogItem` |
| `prisma.service` | `prisma.repairOrder` |
| `prisma.serviceItem` | `prisma.repairOrderItem` |
| `prisma.invoice` | `prisma.repairInvoice` |
| `prisma.invoiceItem` | `prisma.repairInvoiceItem` |
| `prisma.retailSale` | `prisma.salesOrder` |
| `prisma.retailSaleItem` | `prisma.salesOrderItem` |
| `prisma.stockMovement` | `prisma.inventoryMovement` |
| `prisma.supplierDebt` | `prisma.supplierPayable` |
| `prisma.supplierDebtPayment` | `prisma.supplierPayablePayment` |

Unchanged tables for this migration:

- `user`
- `session`
- `account`
- `verification`
- `subscription`
- `subscription_invoice`
- `subscription_payment`
- `affiliator`
- `referral`
- `affiliate_commission`
- `supplier`
- `supplier_return`
- `warranty_claim`
- `warranty_claim_item`
- `inventory_audit_session`
- `inventory_audit_item`
- `activity_log`

## Enums

| Current enum | Target enum | Value migration |
|---|---|---|
| `TokoStatus` | `StoreStatus` | Values unchanged. |
| `TokoUserRole` | `StoreUserRole` | Values unchanged. |
| `ServiceStatus` | `RepairOrderStatus` | Values unchanged. |
| `InventoryItemKind` | `InventoryItemType` | Rename values below. |
| `StockMovementType` | `InventoryMovementType` | Rename values below. |
| `RetailSaleStatus` | `SalesOrderStatus` | Values unchanged. |
| `RetailPaymentMethod` | `SalesPaymentMethod` | Values unchanged. |
| `SupplierDebtStatus` | `SupplierPayableStatus` | Values unchanged. |

### InventoryItemType Values

| Current value | Target value |
|---|---|
| `sparepart` | `repair_part` |
| `retail_item` | `retail_product` |

Add new value:

- `phone_unit`

Do not auto-convert existing rows to `phone_unit` without a separate business rule.

### InventoryMovementType Values

| Current value | Target value |
|---|---|
| `restock` | `restock` |
| `service_usage` | `repair_usage` |
| `service_return` | `repair_return` |
| `service_delete_return` | `repair_delete_return` |
| `retail_sale` | `sales_order` |
| `retail_void` | `sales_order_void` |
| `audit_adjustment` | `audit_adjustment` |
| `supplier_return_replacement` | `supplier_return_replacement` |

### Repair Order And Invoice Item Types

Current `ItemType` is shared by `ServiceItem.type` and `InvoiceItem.type`. Split or rename it explicitly.

Recommended first migration:

- Create `RepairOrderItemType` for `RepairOrderItem.type`.
- Create `RepairInvoiceItemType` for `RepairInvoiceItem.type`.
- Use the same values in both enums for now: `inventory_item`, `service_catalog_item`.
- Defer `manual_item` unless manual rows already exist or the feature requires it immediately.

Value mapping:

| Current value | Target value |
|---|---|
| `sparepart` | `inventory_item` |
| `service` | `service_catalog_item` |

## Required Column Renames

Use physical `ALTER TABLE ... RENAME COLUMN ...` operations for these where the table is being renamed.

| Current table | Current column | Target table | Target column |
|---|---|---|---|
| `user_toko` | `tokoId` | `user_store` | `storeId` |
| `toko_feature_setting` | `tokoId` | `store_feature_setting` | `storeId` |
| `toko_whatsapp_setting` | `tokoId` | `store_whatsapp_setting` | `storeId` |
| `toko_whatsapp_identity` | `tokoId` | `store_whatsapp_identity` | `storeId` |
| `toko_user_permission` | `tokoId` | `store_user_permission` | `storeId` |
| `hp_catalog` | `brandId` | `device_model` | `brandId` |
| `sparepart` | `tokoId` | `inventory_item` | `storeId` |
| `sparepart` | `categoryId` | `inventory_item` | `categoryId` |
| `sparepart` | `kind` | `inventory_item` | `type` |
| `sparepart` | new | `inventory_item` | `deviceModelId` |
| `sparepart_category` | `tokoId` | `inventory_category` | `storeId` |
| `sparepart_compatibility` | `hpCatalogId` | `part_compatibility` | `deviceModelId` |
| `sparepart_compatibility` | `sparepartId` | `part_compatibility` | `inventoryItemId` |
| `service_pricelist` | `tokoId` | `service_catalog_item` | `storeId` |
| `service` | `tokoId` | `repair_order` | `storeId` |
| `service` | `hpCatalogId` | `repair_order` | `deviceModelId` |
| `service_item` | `serviceId` | `repair_order_item` | `repairOrderId` |
| `invoice` | `serviceId` | `repair_invoice` | `repairOrderId` |
| `invoice_item` | `invoiceId` | `repair_invoice_item` | `repairInvoiceId` |
| `retail_sale` | `tokoId` | `sales_order` | `storeId` |
| `retail_sale_item` | `saleId` | `sales_order_item` | `salesOrderId` |
| `retail_sale_item` | `sparepartId` | `sales_order_item` | `inventoryItemId` |
| `stock_movement` | `tokoId` | `inventory_movement` | `storeId` |
| `stock_movement` | `sparepartId` | `inventory_movement` | `inventoryItemId` |
| `supplier_debt` | `tokoId` | `supplier_payable` | `storeId` |
| `supplier_debt_payment` | `debtId` | `supplier_payable_payment` | `payableId` |

## Snapshot Fields That Should Stay Stable

These fields are snapshots or business values, not schema-domain names. Keep them unless a separate product migration requires a rename.

- `InventoryItem.defaultPrice`
- `InventoryItem.purchasePrice`
- `InventoryItem.stock`
- `InventoryItem.criticalStock`
- `RepairInvoiceItem.name`
- `RepairInvoiceItem.qty`
- `RepairInvoiceItem.price`
- `SalesOrderItem.unitCostSnapshot`
- `SalesOrderItem.warrantyDaysSnapshot`
- `SalesOrderItem.warrantyUntil`
- `InventoryMovement.stockBefore`
- `InventoryMovement.stockAfter`

## WhatsApp Scope Clarification

WhatsApp appears in this migration only because its settings and identity tables are store-scoped and currently use `Toko` names.

Rename only:

- `TokoWhatsappSetting` -> `StoreWhatsappSetting`
- `TokoWhatsappIdentity` -> `StoreWhatsappIdentity`
- `toko_whatsapp_setting` -> `store_whatsapp_setting`
- `toko_whatsapp_identity` -> `store_whatsapp_identity`
- `tokoId` -> `storeId` on those tables

Do not change:

- WhatsApp connection behavior.
- Inbox behavior.
- Message templates.
- Notification timing.
- `noWa` on repair orders.
- Instance naming unless it must be updated only to compile against renamed variables.

## Related Tables That Keep Their Table Names But Need Column Renames

These are easy to miss because their table names are not being renamed in the first scope.

| Table | Current column | Target column |
|---|---|---|
| `supplier` | `tokoId` | `storeId` |
| `supplier_return` | `tokoId` | `storeId` |
| `supplier_return` | `sparepartId` | `inventoryItemId` |
| `warranty_claim` | `tokoId` | `storeId` |
| `warranty_claim` | `serviceId` | `repairOrderId` |
| `warranty_claim_item` | `sparepartId` | `inventoryItemId` |
| `inventory_audit_session` | `tokoId` | `storeId` |
| `inventory_audit_item` | `sparepartId` | `inventoryItemId` |
| `inventory_audit_item` | `sparepartName` | `inventoryItemName` |
| `activity_log` | `tokoId` | `storeId` |
| `activity_log` | `serviceId` | `repairOrderId` |

## String Fields To Decide, Not Blindly Rename

These values can contain historical data or polymorphic references. Do not mass-rewrite them without a deliberate mapping.

- `InventoryMovement.referenceType`
- `ActivityLog.type`
- `ActivityLog.payload`
- `RepairOrder.includedItems`
- `DeviceModel.metadata`
- `RepairInvoiceItem.referenceId`
- `RepairOrderItem.referenceId`

Recommended first migration:

- Keep `ActivityLog.type` values as historical event names.
- Migrate `InventoryMovement.type` enum values because it is structured ledger data.
- Keep `referenceType` values stable unless code depends on the new names immediately.
- Document any retained old string values in code comments and follow-up cleanup plans.

## Mapping Review Gate

Before implementation starts, confirm:

- Every `@@map` table in `prisma/schema.prisma` is either listed as renamed or listed as unchanged.
- Every FK column containing `toko`, `service`, `sparepart`, `hpCatalog`, `retailSale`, `stockMovement`, or `supplierDebt` is listed.
- Every enum with values containing `sparepart`, `service`, `retail`, `stock`, or `supplier_debt` is listed.
- Every raw SQL table string is covered in `04-impact-checklists.md`.
