# 05 Verification And Rollback

Verification is part of the migration, not an optional follow-up.

## Pre-Migration Verification

Before applying SQL to production:

- Migration has been tested on a database snapshot or disposable database with representative data.
- Row counts have been captured for all affected tables.
- FK constraints and indexes have been captured.
- Enum values have been captured.
- Raw SQL references have been identified.
- App build generated against the target Prisma schema is ready to deploy.
- Backup restore path has been tested or is operationally trusted.
- Maintenance mode process is ready.
- The new app artifact is built and ready before maintenance starts.
- The previous app artifact is available for rollback.

## Post-Migration Database Checks

Run immediately after SQL migration and before reopening traffic.

Row counts should match old counts:

- `store` from `toko`
- `user_store` from `user_toko`
- `device_brand` from `brand`
- `device_model` from `hp_catalog`
- `inventory_item` from `sparepart`
- `inventory_category` from `sparepart_category`
- `part_compatibility` from `sparepart_compatibility`
- `service_catalog_item` from `service_pricelist`
- `repair_order` from `service`
- `repair_order_item` from `service_item`
- `repair_invoice` from `invoice`
- `repair_invoice_item` from `invoice_item`
- `sales_order` from `retail_sale`
- `sales_order_item` from `retail_sale_item`
- `inventory_movement` from `stock_movement`
- `supplier_payable` from `supplier_debt`
- `supplier_payable_payment` from `supplier_debt_payment`

Integrity checks:

- All `repair_order.deviceModelId` values point to `device_model.id`.
- All `repair_order.storeId` values point to `store.id`.
- All `inventory_item.storeId` values point to `store.id`.
- All `inventory_item.categoryId` values are nullable or point to `inventory_category.id`.
- All `part_compatibility.deviceModelId` values point to `device_model.id`.
- All `part_compatibility.inventoryItemId` values point to `inventory_item.id`.
- All `repair_invoice.repairOrderId` values point to `repair_order.id`.
- All `sales_order_item.inventoryItemId` values are nullable or point to `inventory_item.id`.
- All `inventory_movement.inventoryItemId` values point to `inventory_item.id`.
- All supplier payable payments point to supplier payables.
- All user-store assignment rows still point to existing users and stores.
- All permission overrides still point to existing users and stores.
- All WhatsApp settings and identities still point to existing stores.
- All inventory audit rows still point to existing stores and inventory items.

Enum checks:

- No `InventoryItemType` rows use old `sparepart` or `retail_item` values.
- No `InventoryMovementType` rows use old `service_usage`, `service_return`, `service_delete_return`, `retail_sale`, or `retail_void` values.
- `ActivityType` values still match the pre-migration snapshot.

## Application Checks

Run only when verification is approved for the environment.

Suggested commands:

- `bunx prisma validate`
- `bunx prisma generate`
- `bun run seed:small` on a disposable database

Manual smoke checks:

- Login and role redirect.
- Admin dashboard load.
- Staff dashboard load.
- Technician task page load.
- Create repair order.
- Update repair order status.
- Add repair order item from inventory.
- Create or update repair invoice.
- Create inventory item.
- Restock inventory item.
- Complete inventory audit adjustment.
- Create retail sale.
- Void retail sale if feature exists.
- Create supplier payable.
- Add supplier payable payment.
- Open WhatsApp settings.
- Send or preview WhatsApp repair notification if safe.

## Rollback Plan

Preferred rollback:

1. Keep maintenance mode enabled.
2. Restore the pre-migration database backup.
3. Redeploy the previous app version.
4. Run quick smoke checks.
5. Reopen traffic.

Conditional reverse SQL rollback:

- Only use if no writes occurred after migration.
- Only use if the reverse SQL has already been tested.
- Only use for immediate migration failures, not delayed application bugs.

Forward hotfix preference:

- If migration succeeded and users have written data on the new schema, prefer a forward app or SQL hotfix over restoring old schema.
- Restore backup only if data integrity is compromised or the app cannot safely operate.

## Rollback Decision Matrix

| Failure point | Default response |
|---|---|
| Before SQL migration starts | Cancel migration, keep old app. |
| SQL migration fails inside transaction | Let transaction roll back, keep old app. |
| SQL migration partially applies | Keep maintenance mode, restore backup unless tested reverse SQL fits exactly. |
| SQL succeeds but DB validation fails | Keep maintenance mode, restore backup or apply verified forward SQL fix. |
| DB validation passes but app smoke fails | Keep maintenance mode, prefer forward app hotfix. |
| Traffic reopened and new writes exist | Prefer forward hotfix; restore backup only for severe integrity issues. |

## Completion Criteria

The migration is complete only when:

- Database validation passes.
- Prisma client generates cleanly.
- No old Prisma delegates remain in application code.
- Raw SQL references have been updated.
- Smoke checks pass.
- Monitoring shows no new schema-related errors.
- Deferred naming cleanup items are documented as follow-up work.
