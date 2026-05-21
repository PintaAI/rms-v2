# 02 No-Data-Loss Migration Strategy

This migration is primarily a structural rename. The safest approach is to preserve objects using SQL rename operations instead of recreating tables.

## Best Strategy

Use a controlled maintenance-window migration with explicit SQL and immediate app deployment.

Why this strategy:

- Physical table and column renames are not backward compatible with the current Prisma client.
- A dual-read/dual-write compatibility release would add substantial temporary code and still be risky for Prisma relation names.
- `ALTER TABLE ... RENAME` preserves rows, indexes, constraints, sequences, defaults, and most dependent objects with minimal data movement.
- A short maintenance window is simpler and safer than running old and new app versions against different physical schemas.

This is a breaking schema migration. The old application and new application cannot both write safely during the physical rename.

## Non-Destructive Rules

- Do not drop renamed tables.
- Do not create replacement tables and copy rows unless a rename is impossible.
- Do not use Prisma's generated destructive migration output without manual review.
- Do not combine unrelated product behavior changes with the schema rename.
- Do not rewrite historical JSON or audit strings unless they are required for runtime behavior.
- Do not run production migration without a database backup and a tested restore path.

## Migration Shape

The migration should be one manually authored SQL migration, tested against a production-like snapshot.

Preferred operation types:

- `ALTER TABLE old_name RENAME TO new_name;`
- `ALTER TABLE table_name RENAME COLUMN old_name TO new_name;`
- `ALTER TYPE old_enum RENAME TO new_enum;`
- `ALTER TYPE enum_name RENAME VALUE 'old_value' TO 'new_value';`
- `ALTER INDEX old_index RENAME TO new_index;` where names matter for clarity.
- `ALTER TABLE ... RENAME CONSTRAINT ...` where names matter for clarity.
- `ALTER TABLE ... ADD COLUMN ... NULL;` for new optional columns like `deviceModelId`.
- `CREATE INDEX CONCURRENTLY ...` only outside a transaction if needed for large tables.

## Recommended Production Rollout

1. Build and prepare the new app version, but do not route traffic to it yet.
2. Freeze writes by enabling maintenance mode or stopping app workers.
3. Confirm no background jobs, cron tasks, queues, or seed scripts are writing to the database.
4. Take a verified database backup.
5. Record preflight counts and schema metadata.
6. Apply the manual SQL migration.
7. Run post-migration SQL validation.
8. Deploy or switch traffic to the app version compiled against the new Prisma schema.
9. Run smoke checks for login, dashboard load, repair order, inventory, retail, supplier payable, and WhatsApp settings.
10. Re-enable traffic.
11. Monitor errors and key metrics.

Do not deploy the new app before the SQL migration is applied. Do not reopen the old app after the SQL migration is applied.

## Preflight Snapshot

Capture this before migration and save it with deployment artifacts.

- Row counts for every renamed table.
- Row counts for related unchanged tables with renamed FK columns.
- Distinct enum values in affected enum columns.
- FK constraints for affected tables.
- Index definitions for affected tables.
- Trigger definitions if any exist.
- Current `InventoryMovement.referenceType` values.
- Current `ActivityLog.type` values.
- Count of rows with nullable FK columns before migration.

Minimum row count SQL checklist:

```sql
SELECT 'toko' AS table_name, COUNT(*) FROM "toko"
UNION ALL SELECT 'user_toko', COUNT(*) FROM "user_toko"
UNION ALL SELECT 'brand', COUNT(*) FROM "brand"
UNION ALL SELECT 'hp_catalog', COUNT(*) FROM "hp_catalog"
UNION ALL SELECT 'sparepart', COUNT(*) FROM "sparepart"
UNION ALL SELECT 'sparepart_category', COUNT(*) FROM "sparepart_category"
UNION ALL SELECT 'sparepart_compatibility', COUNT(*) FROM "sparepart_compatibility"
UNION ALL SELECT 'service_pricelist', COUNT(*) FROM "service_pricelist"
UNION ALL SELECT 'service', COUNT(*) FROM "service"
UNION ALL SELECT 'service_item', COUNT(*) FROM "service_item"
UNION ALL SELECT 'invoice', COUNT(*) FROM "invoice"
UNION ALL SELECT 'invoice_item', COUNT(*) FROM "invoice_item"
UNION ALL SELECT 'retail_sale', COUNT(*) FROM "retail_sale"
UNION ALL SELECT 'retail_sale_item', COUNT(*) FROM "retail_sale_item"
UNION ALL SELECT 'stock_movement', COUNT(*) FROM "stock_movement"
UNION ALL SELECT 'supplier_debt', COUNT(*) FROM "supplier_debt"
UNION ALL SELECT 'supplier_debt_payment', COUNT(*) FROM "supplier_debt_payment";
```

## SQL Ordering

Use this order to reduce FK confusion.

1. Rename enum types whose values do not change.
2. Add new enum values where needed.
3. Rename enum values where supported by PostgreSQL.
4. Rename root/global tables: `brand`, `hp_catalog`.
5. Rename store tables: `toko`, `user_toko`, settings, permissions, WhatsApp tables.
6. Rename inventory tables: `sparepart`, `sparepart_category`, `sparepart_compatibility`.
7. Add nullable `inventory_item.deviceModelId` and FK/index.
8. Rename repair tables: `service_pricelist`, `service`, `service_item`, `invoice`, `invoice_item`.
9. Rename sales tables: `retail_sale`, `retail_sale_item`.
10. Rename inventory movement table and columns.
11. Rename supplier payable tables and columns.
12. Rename FK columns on unchanged related tables.
13. Rename indexes and constraints for clarity.
14. Run integrity checks.

## Enum Safety Notes

PostgreSQL enum changes can be more fragile than table renames.

- Prefer `ALTER TYPE ... RENAME VALUE` when available.
- If a value rename is not supported by the database version, create a new enum type, alter the column using a `USING` expression, then drop the old enum type only after validation.
- Update defaults in the same migration as enum value changes.
- Verify no old enum labels remain before reopening traffic.
- Keep `ActivityType` unchanged in the first migration to reduce risk.

## Transaction Strategy

Use a single transaction for metadata-only renames if the migration completes quickly on a production-like dataset.

Do not put `CREATE INDEX CONCURRENTLY` inside that transaction. If a concurrent index is needed, run it as a separate step after table/column renames.

If the migration has long-running enum rewrites or index operations, split into:

- Step A: maintenance mode, transactional renames, deploy app.
- Step B: post-deploy non-blocking index renames/creations where safe.

## Prisma Migration Strategy

Recommended workflow:

1. Edit `prisma/schema.prisma` to the target schema.
2. Create a manual migration SQL file instead of accepting destructive generated SQL.
3. Run Prisma validate/generate only after the schema and SQL agree.
4. Regenerate Prisma client; do not edit generated files by hand.
5. Update code to use new delegates and types.

Avoid this workflow:

- Renaming models in Prisma and letting Prisma infer drop/create operations.
- Applying an auto-generated migration that drops old tables and creates new tables.

## Failure Handling During Rollout

If SQL migration fails before completion:

- Keep maintenance mode enabled.
- If the transaction rolled back cleanly, leave the old app version in place.
- If partial changes were applied, restore from backup unless the tested reverse migration exactly matches the partial state.

If SQL migration succeeds but smoke checks fail before traffic is reopened:

- Keep maintenance mode enabled.
- Prefer a forward app hotfix if the database validation passed.
- Restore backup and previous app only if the issue cannot be fixed quickly or database validation failed.

If users have written data after reopening traffic:

- Do not use reverse renames as the default rollback.
- Prefer forward fixes.
- Restore backup only for severe data integrity issues.

## Data Preservation Validation

After migration, verify:

- Row counts match for every renamed table.
- Required FK columns still have no orphaned references.
- Compound keys still have the same row count and uniqueness.
- All repair orders still link to device models.
- All repair invoices still link to repair orders and invoice items.
- All inventory movements still link to inventory items and stores.
- Supplier payables still link to suppliers and payments.
- User-store assignments still link users and stores.
- Permission override rows still exist and point to the same users/stores.
- WhatsApp settings and identities still point to the same stores.

WhatsApp validation is limited to data continuity for store-scoped settings and identities. Do not treat this migration as a WhatsApp feature or behavior change.

## Rollback Strategy

The safest rollback is restoring the database backup and redeploying the previous app version together.

Use reverse SQL renames only if:

- The app has not accepted writes after the migration.
- The failure is identified immediately.
- The reverse migration has already been tested.

Once new writes are accepted on the renamed schema, rollback by reverse rename becomes risky. Prefer forward hotfixes unless data corruption is suspected.
