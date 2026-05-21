# Schema Domain Migration Plan

This is the index for the schema/domain rename migration. The original single-file plan has been split into smaller documents so each part can be reviewed and implemented independently.

## Goal

Replace misleading database and code domain names with explicit business concepts while preserving all existing data.

Core direction:

- `Toko` -> `Store`
- `Brand` -> `DeviceBrand`
- `HpCatalog` -> `DeviceModel`
- `Sparepart` -> `InventoryItem`
- `SparepartCategory` -> `InventoryCategory`
- `SparepartCompatibility` -> `PartCompatibility`
- `Service` -> `RepairOrder`
- `ServiceItem` -> `RepairOrderItem`
- `ServicePricelist` -> `ServiceCatalogItem`
- `Invoice` -> `RepairInvoice`
- `InvoiceItem` -> `RepairInvoiceItem`
- `RetailSale` -> `SalesOrder`
- `RetailSaleItem` -> `SalesOrderItem`
- `StockMovement` -> `InventoryMovement`
- `SupplierDebt` -> `SupplierPayable`
- `SupplierDebtPayment` -> `SupplierPayablePayment`

## Documents

Read in this order:

1. `plans/schema-domain-migration/00-decisions.md`
2. `plans/schema-domain-migration/01-schema-mapping.md`
3. `plans/schema-domain-migration/02-no-data-loss-strategy.md`
4. `plans/schema-domain-migration/03-implementation-slices.md`
5. `plans/schema-domain-migration/04-impact-checklists.md`
6. `plans/schema-domain-migration/05-verification-and-rollback.md`

## How To Use This Plan

Treat each document as a gate. Do not move to implementation until the previous gate has explicit answers or completed artifacts.

Required artifacts before code changes:

- A final decision record from `00-decisions.md`.
- A reviewed schema mapping from `01-schema-mapping.md`.
- A production rollout choice from `02-no-data-loss-strategy.md`.
- A slice owner and implementation order from `03-implementation-slices.md`.
- A completed grep checklist from `04-impact-checklists.md`.
- A tested validation and rollback checklist from `05-verification-and-rollback.md`.

Definition of done:

- Production data is preserved.
- The application uses the new Prisma model and field names.
- Stable routes, permission keys, feature keys, `noWa`, `mobileApiId`, and historical activity values remain unchanged.
- Raw SQL uses the new physical table and column names.
- Verification passes on a disposable or staging database before production.

## Recommended First Scope

The first implementation should fix the schema and Prisma/code domain names without changing user-facing routes or product behavior.

Do first:

- Rename Prisma models, delegates, relation fields, and runtime types.
- Physically rename tables and direct FK columns using SQL `ALTER ... RENAME` operations.
- Add `InventoryItem.deviceModelId`.
- Add `InventoryItemType.phone_unit` but do not auto-convert existing rows to it.
- Keep route URLs stable, including `[tokoid]`, `/service`, and `/supplier-debts`.
- Keep permission keys and feature keys stable.
- Keep `noWa`, `mobileApiId`, and historical `ActivityType` values stable.
- Keep WhatsApp product behavior stable; only rename store-scoped WhatsApp schema/code references that depend on `Toko`.
- Update backend, UI, seed scripts, and docs only as needed to match the renamed Prisma schema.

Defer:

- Route renames such as `/service` -> `/repair-orders`.
- Permission key renames.
- Feature key renames.
- Audit log event value cleanup.
- `InventoryUnit` serialized/IMEI stock tracking unless product requirements are explicit.
- `mobileApiId` -> `externalId` unless there is a second device data provider.

## Non-Negotiables

- Preserve all data.
- Use explicit SQL renames, not drop/create migrations.
- Do not rely on Prisma-generated destructive migrations for this rename.
- Take a database backup before production migration.
- Validate row counts, FK integrity, enum values, and critical app flows before considering the migration complete.
- Keep old and new app versions from writing to the database at the same time during the rename.
