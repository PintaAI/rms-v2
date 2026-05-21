# 03 Implementation Slices

Do not implement this migration as one unstructured rename pass. Use slices and keep each slice reviewable.

Each slice should leave the repository in an understandable state. Some intermediate slices may not compile until the Prisma client and backend rename are both complete; note that explicitly in the implementation PR.

## Slice 0: Prepare And Freeze Decisions

- Confirm decisions in `00-decisions.md`.
- Confirm target mappings in `01-schema-mapping.md`.
- Confirm production rollout strategy in `02-no-data-loss-strategy.md`.
- Confirm no route, permission key, or feature key rename is included.

Exit criteria:

- No open naming questions block schema edits.
- Migration owner agrees on backup and maintenance-window process.

## Slice 1: Prisma Schema Draft

- Rename Prisma models.
- Rename relation fields.
- Rename enum types and values.
- Split or rename `ItemType` explicitly for repair order items and repair invoice items.
- Add `InventoryItem.deviceModelId` as nullable.
- Add `InventoryItemType.phone_unit`.
- Keep `noWa`, `mobileApiId`, routes, permission keys, feature keys, and activity event values stable.

Exit criteria:

- `prisma/schema.prisma` describes the target schema without old delegate names.
- All required column mappings are represented with target field names.
- `@@map` and `@map` usage is intentional. Do not hide old physical names behind maps unless the first migration explicitly chooses a temporary compatibility phase.
- Generated files are not edited manually.

## Slice 2: Manual SQL Migration

- Write manual SQL using rename operations.
- Include table renames, column renames, enum renames, value renames, index renames, and constraint renames.
- Add `deviceModelId` as nullable on `inventory_item`.
- Add FK and index for `deviceModelId`.
- Include comments mapping old names to new names.
- Include reverse-migration notes for emergency use, even if backup restore is the preferred rollback.

Exit criteria:

- No `DROP TABLE` for renamed domain tables.
- No create/copy/drop replacement pattern for renamed domain tables.
- SQL can be run on a disposable DB snapshot.
- SQL does not include destructive operations on renamed domain tables.
- SQL updates enum defaults and values consistently.

## Slice 3: Generated Prisma Client

- Run Prisma generate only after schema and migration are consistent.
- Update imports from generated Prisma enums/types.
- Do not edit files under `prisma/generated/prisma/` manually.

Exit criteria:

- Generated client exposes target delegates such as `prisma.store`, `prisma.inventoryItem`, and `prisma.repairOrder`.

## Slice 4: Backend Rename

Recommended order:

1. `actions/device.ts`
2. `actions/inventory.ts`
3. `actions/retail.ts`
4. `actions/service-types.ts`
5. `actions/service-shared.ts`
6. `actions/service-queries.ts`
7. `actions/service-mutations.ts`
8. `actions/warranty-claims.ts`
9. `actions/supplier-returns.ts`
10. `actions/supplier-debts.ts`
11. `actions/analytics.ts`
12. `actions/overview.ts`
13. `actions/global-search.ts`
14. `actions/whatsapp.ts`
15. `actions/superuser.ts`
16. `actions/toko.ts`
17. `actions/feature-settings.ts`
18. Supporting `lib/**` files.
19. Seeds under `prisma/*.ts`.

Exit criteria:

- No old Prisma delegates remain in application code.
- Raw SQL references use new physical table and column names.
- Type names exported from actions match the new domain or are intentionally kept as UI labels.
- Permission and feature key strings remain unchanged unless explicitly deferred into a separate migration.

## Slice 5: UI Rename

Recommended order:

1. Shared device input types.
2. Inventory forms and tables.
3. Retail checkout/history/receipt.
4. Repair order forms/detail/table/task views.
5. Supplier payable pages/components.
6. Navigation and global search.
7. Admin settings/onboarding.

Exit criteria:

- UI compiles against renamed action types.
- User-facing Indonesian labels remain stable unless deliberately changed.
- Routes remain stable.
- Search params such as `serviceId` remain stable unless they are internal-only and updated consistently.

## Slice 6: Seeds And Docs

- Update seed scripts.
- Update seed login docs only after reseeding.
- Update dev docs after behavior and naming are stable.
- Update user manual last.

Exit criteria:

- Seeds use new delegates and enum values.
- Docs do not describe old internal names unless historical context is needed.

## Slice 7: Verification

Run verification only when approved.

Suggested checks:

- `bunx prisma validate`
- `bunx prisma generate`
- `bun run seed:small` on a disposable database
- Manual smoke test for repair order create/update.
- Manual smoke test for inventory item create/restock.
- Manual smoke test for retail sale checkout.
- Manual smoke test for supplier payable create/payment.
- Manual smoke test for WhatsApp service notification templates.

Exit criteria:

- All approved automated checks pass.
- Manual smoke test results are recorded.
- Any skipped checks have an explicit reason.
