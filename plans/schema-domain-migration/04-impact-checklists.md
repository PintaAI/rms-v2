# 04 Impact Checklists

Use these checklists while implementing. They are intentionally grep-driven because TypeScript will not catch raw SQL and persisted string values.

Run these searches from the repository root. Review matches in application code, seed scripts, Prisma schema, migrations, and docs separately; historical docs may intentionally keep old terms.

## Highest-Risk Action Files

- `actions/service-shared.ts`
- `actions/service-mutations.ts`
- `actions/service-queries.ts`
- `actions/service-types.ts`
- `actions/inventory.ts`
- `actions/inventory-audit.ts`
- `actions/retail.ts`
- `actions/device.ts`
- `actions/supplier-debts.ts`
- `actions/supplier-returns.ts`
- `actions/warranty-claims.ts`
- `actions/analytics.ts`
- `actions/overview.ts`
- `actions/global-search.ts`
- `actions/whatsapp.ts`
- `actions/superuser.ts`
- `actions/toko.ts`
- `actions/feature-settings.ts`

## Supporting Backend Files

- `actions/index.ts`
- `lib/prisma.ts`
- `lib/auth/request-scope.ts`
- `lib/auth/request-user.ts`
- `lib/auth-helpers.ts`
- `lib/revalidation.ts`
- `lib/features.ts`
- `lib/permissions.ts`
- `lib/permission-overrides.ts`
- `lib/data/dashboard.ts`
- `lib/data/toko.ts`
- `lib/device-catalog-cache.ts`
- `lib/service-whatsapp-notifications.ts`
- `lib/subscription-billing.ts`
- `lib/whatsapp-identity.ts`
- `proxy.ts`

WhatsApp files are listed only because they reference store-scoped tables and Prisma delegates. The migration should not change WhatsApp connection, inbox, template, or notification behavior.

## Raw SQL Checklist

These must be manually updated because TypeScript will not catch table or column strings.

- `actions/overview.ts` references table `"sparepart"`.
- `actions/inventory-audit.ts` references table `"sparepart"`.
- `actions/analytics.ts` references table `"sparepart"`.

Run this grep before finishing backend work:

```bash
rg '\$queryRaw|\$executeRaw|"sparepart"|"tokoId"|"service"|"retail_sale"|"supplier_debt"|"stock_movement"' actions lib prisma
```

## Delegate Grep Checklist

Run this before claiming backend rename is complete:

```bash
rg 'prisma\.(toko|userToko|tokoFeatureSetting|tokoWhatsappSetting|tokoWhatsappIdentity|tokoUserPermission|brand|hpCatalog|sparepart|sparepartCategory|sparepartCompatibility|service|serviceItem|servicePricelist|invoice|invoiceItem|retailSale|retailSaleItem|stockMovement|supplierDebt|supplierDebtPayment)\b'
```

Expected result after migration: no application code matches, except migration or historical documentation files.

## Field Name Grep Checklist

Run this before claiming the schema and backend rename are complete:

```bash
rg '\b(tokoId|hpCatalogId|sparepartId|serviceId|saleId|debtId|sparepartName)\b' actions app components hooks lib prisma --glob '!prisma/migrations/**'
```

Expected result after migration:

- `tokoid` route param may remain in route files by decision.
- `noWa`, `mobileApiId`, permission keys, feature keys, and historical strings may remain by decision.
- Old FK field names should not remain in active Prisma queries or action types unless explicitly documented.

## Persisted String Checklist

These are not automatically wrong if they keep old values, but each occurrence must be intentional.

```bash
rg "referenceType\s*:\s*['\"]|type:\s*['\"]service_|type:\s*['\"]sparepart_|type:\s*['\"]invoice_|type:\s*['\"]retail_|kind:\s*['\"]sparepart['\"]|kind:\s*['\"]retail_item['\"]"
```

Review fields:

- `InventoryMovement.referenceType`
- `ActivityLog.type`
- `ActivityLog.payload`
- `RepairOrder.includedItems`
- `DeviceModel.metadata`
- `RepairInvoiceItem.referenceId`
- `RepairOrderItem.referenceId`

For every retained old string value, add a short note in the implementation summary explaining why it remains stable.

## UI Impact Map

Repair UI:

- `app/(dashboard)/[tokoid]/service/page.tsx`
- `app/(dashboard)/[tokoid]/service/tasks/page.tsx`
- `components/dashboard/services/manage-service.tsx`
- `components/dashboard/services/services-form.tsx`
- `components/dashboard/services/service-detail-card/service-detail-card.tsx`
- `components/dashboard/services/add-repair-item-form.tsx`
- `components/dashboard/services/service-table/*`
- `components/dashboard/teknisi/*`
- `components/dashboard/staff/staff-overview.tsx`

Inventory UI:

- `app/(dashboard)/[tokoid]/inventory/page.tsx`
- `components/dashboard/inventory/inventory-tabs.tsx`
- `components/dashboard/inventory/inventory-item-form-dialog.tsx`
- `components/dashboard/inventory/retail-item-table.tsx`
- `components/dashboard/inventory/staff-sparepart-table.tsx`
- `components/dashboard/inventory/teknisi-sparepart-table.tsx`
- `components/dashboard/inventory/sparepart-*`
- `components/dashboard/inventory/restock-history/*`
- `components/dashboard/inventory/reports/*`
- `components/dashboard/inventory/audit-gudang/*`

Retail sales UI:

- `app/(dashboard)/[tokoid]/retail/page.tsx`
- `app/(dashboard)/[tokoid]/retail/history/page.tsx`
- `components/dashboard/retail/retail-checkout.tsx`
- `components/dashboard/retail/retail-sales-history.tsx`
- `components/dashboard/retail/retail-sale-detail-drawer.tsx`
- `components/dashboard/retail/retail-receipt.tsx`

Device catalog UI:

- `components/shared/device-input.tsx`
- `components/shared/multi-device-input.tsx`
- `hooks/use-device-search.ts`
- `components/superuser/device-catalog-management.tsx`

Supplier payables UI:

- `app/(dashboard)/[tokoid]/supplier-debts/page.tsx`
- `components/dashboard/supplier-debts/*`

Navigation, settings, onboarding:

- `components/dashboard/nav/nav-config.ts`
- `components/dashboard/layout/global-search.tsx`
- `app/(dashboard)/[tokoid]/layout.tsx`
- `components/dashboard/admin/manage-toko.tsx`
- `components/dashboard/admin/whatsapp-settings-tab.tsx`
- `components/dashboard/admin/feature-settings-tab.tsx`
- `components/shared/onboarding-wizard.tsx`

## Legacy Import Compatibility Checklist

Existing inventory imports are customer-facing behavior and must not regress during the rename.

Files to update or review:

- `components/dashboard/inventory/sparepart-import-dialog.tsx`
- `actions/inventory.ts`
- Any renamed inventory import dialog/action files.

Compatibility requirements:

- `.xlsx` and `.xls` imports continue to work.
- Existing old templates continue to work without changing column names.
- Do not claim `.csv` support unless the file input accepts `.csv` and parser handles CSV content.
- Keep accepting legacy item type values `sparepart` and `retail_item` at the import boundary.
- Convert `sparepart` to `repair_part` before writing `InventoryItem.type`.
- Convert `retail_item` to `retail_product` before writing `InventoryItem.type`.
- Existing item names update the matching store inventory item instead of creating duplicates.

Legacy headers to preserve:

```text
Nama
Name
Nama Sparepart
Sparepart
Harga Jual
Harga
Harga Default
Default Price
defaultPrice
Harga Beli
Purchase Price
purchasePrice
Supplier
Nama Supplier
supplierName
Kategori
Category
categoryName
Stok
Stock
Stok Kritis
Critical Stock
criticalStock
Minimum Stock
minimumStock
Garansi Hari
Garansi
Warranty Days
warrantyDays
Universal
Is Universal
isUniversal
```

Optional new phone headers:

```text
Brand
Merek
Model
Model HP
Nomor Model
Model Number
IMEI
Serial Number
Kondisi
Condition
```

Phone import rules:

- If `Brand`/`Merek` and `Model`/`Model HP` are present, link the item to `InventoryItem.deviceModelId`.
- If the device brand/model does not exist, create or import it using the same authorization policy as current device import.
- If `InventoryUnit` is deferred, ignore or reject IMEI/serial columns with a clear message; do not silently pretend unit tracking exists.
- Missing phone columns must not fail legacy imports.

## Seeds And Generated Files

Seed scripts:

- `prisma/seed.ts`
- `prisma/seed-demo-services.ts`
- `prisma/seed-optimistic-test.ts`
- `prisma/seed-superuser.ts`
- `prisma/backfill-subscriptions.ts`

Generated Prisma files:

- `prisma/generated/prisma/client.ts`
- `prisma/generated/prisma/enums.ts`
- `prisma/generated/prisma/models.ts`
- `prisma/generated/prisma/models/*`
- `prisma/generated/prisma/internal/*`

Do not edit generated files by hand.

## Final Checklist Gate

Before verification, confirm:

- Delegate grep has no unexpected matches.
- Field name grep has no unexpected matches.
- Raw SQL grep has no old physical table or column strings.
- Persisted string grep has been reviewed and documented.
- UI routes still match the decisions in `00-decisions.md`.
- WhatsApp behavior changes are not included in the migration diff.
