# Retail Lite Phase 1: Inventory Item Type

## Goal

Phase 1 upgrades the existing inventory so it can represent both repair spareparts and retail goods without refactoring the whole app.

The app should keep using the existing `Sparepart` model for now, but add an item kind:

```ts
sparepart | retail_item
```

User-facing labels:

```txt
sparepart = Sparepart
retail_item = Barang Retail
```

This keeps the implementation small while allowing the shop to sell any non-service retail goods: HP second, HP baru, chargers, cables, cases, and other goods later in the Retail Lite checkout flow.

## Product Scope

Included in Phase 1:

- Add inventory item kind to existing sparepart records.
- Default existing records to `sparepart`.
- Add separate inventory submenu/page for `Barang Retail` management.
- Refactor or clone the existing sparepart form into a reusable inventory item form with mode support.
- Allow create/edit forms to operate in `sparepart` mode or `retail_item` mode depending on where they are used.
- Show item kind in admin inventory views.
- Add filtering/search support by kind in inventory UI.
- Keep compatibility behavior only relevant to `sparepart`.
- Keep current service workflow stable.

Not included in Phase 1:

- Retail checkout.
- Retail sale models.
- Stock movement ledger.
- Receipt/history.
- Reports.
- Complex HP trading fields like IMEI, condition, status, trade-in flow.
- Consumable/internal usage tracking.

## Business Rules

### Sparepart

`sparepart` means a repair part.

Behavior:

- Can be used in service items.
- Can have device compatibility.
- Can be universal.
- Can be sold through retail later.
- Appears in service add-item sparepart picker.

Examples:

- LCD iPhone 11.
- Baterai Samsung A52.
- IC charger.
- Kamera belakang.
- Speaker.

### Retail Item / Barang Retail

`retail_item` means any non-service retail good.

Behavior:

- Sold through retail later.
- Should not appear in service compatible sparepart picker by default.
- Does not need HP compatibility.
- Still has stock, barcode, purchase price, selling price, category, and supplier/source.

Examples:

- Charger.
- Kabel.
- Casing.
- Tempered glass.
- Headset.
- HP second.
- HP baru.

For simple HP jual-beli in V1, create it as `Barang Retail`, usually with stock `1`.

Example names:

```txt
iPhone 11 128GB Black Second - IMEI 12345
Samsung A52 8/128 Bekas Fullset
Redmi Note 12 Baru Garansi Toko
```

## Data Model Changes

### Prisma Enum

Add an enum to `prisma/schema.prisma`:

```prisma
enum InventoryItemKind {
  sparepart
  retail_item
}
```

### Sparepart Model

Add `kind` to `Sparepart`:

```prisma
model Sparepart {
  id            String            @id @default(uuid())
  barcode       String
  name          String
  defaultPrice  Int
  purchasePrice Int?
  supplierName  String?
  categoryId    String?
  stock         Int               @default(0)
  criticalStock Int               @default(5)
  isUniversal   Boolean           @default(false)
  kind          InventoryItemKind @default(sparepart)
  tokoId        String

  // existing relations unchanged
}
```

### Migration

Create a migration that:

- Creates the enum.
- Adds `kind` to `sparepart`.
- Defaults all existing records to `sparepart`.
- Keeps the column non-null.

Expected SQL shape:

```sql
CREATE TYPE "InventoryItemKind" AS ENUM ('sparepart', 'retail_item');

ALTER TABLE "sparepart"
ADD COLUMN "kind" "InventoryItemKind" NOT NULL DEFAULT 'sparepart';
```

No backfill script is needed beyond the default because existing rows should remain spareparts.

## Server Action Changes

Primary file:

```txt
actions/inventory.ts
```

### Types

Update exported types:

```ts
export type InventoryItemKind = "sparepart" | "retail_item"
```

Update `Sparepart`:

```ts
export type Sparepart = {
  id: string
  barcode: string
  name: string
  defaultPrice: number
  purchasePrice: number | null
  supplierName: string | null
  categoryId: string | null
  stock: number
  criticalStock: number
  isUniversal: boolean
  kind: InventoryItemKind
  tokoId: string
}
```

Update list item types if needed:

```ts
export type SparepartListItem = {
  id: string
  name: string
  barcode: string
  defaultPrice: number
  stock: number
  kind: InventoryItemKind
}
```

### Create Schema

Update `createSparepartSchema`:

```ts
kind: z.enum(["sparepart", "retail_item"]).optional()
```

Default behavior:

```ts
kind: validated.kind ?? "sparepart"
```

### Update Schema

Update `updateSparepartSchema`:

```ts
kind: z.enum(["sparepart", "retail_item"]).optional()
```

### Import Schema

Update import row shape to optionally include kind:

```ts
kind?: "sparepart" | "retail_item"
```

If omitted, default to `sparepart`.

CSV import can support Indonesian labels in the parser/UI layer later, but the action should prefer normalized enum values.

### Query Behavior

`getSpareparts()` should return `kind` automatically once Prisma type includes it.

`searchSpareparts()` should return `kind`.

`getInventoryReport()` should include kind in report items if UI needs filtering/reporting by kind.

### Compatible Spareparts

`getCompatibleSpareparts()` should only return real spareparts:

```ts
whereClause.kind = "sparepart"
```

Reason: `Barang Retail` should not appear in service add-item compatible sparepart picker.

### Validation Rules

For `kind = retail_item`:

- `isUniversal` should effectively be true or ignored.
- `hpCatalogIds` should be ignored or treated as empty.
- Compatibility records should not be created.

Recommended minimal implementation:

```ts
const isRetailItem = validated.kind === "retail_item"

data: {
  kind: validated.kind ?? "sparepart",
  isUniversal: isRetailItem ? true : validated.isUniversal ?? false,
  compatibilities: !isRetailItem && validated.hpCatalogIds
    ? { create: validated.hpCatalogIds.map((id) => ({ hpCatalogId: id })) }
    : undefined,
}
```

For updates, if an item changes from `sparepart` to `retail_item`, clear compatibility records.

Recommended behavior:

- If `kind` becomes `retail_item`, delete all compatibilities and set `isUniversal` true.
- If `kind` becomes `sparepart`, allow normal compatibility settings.

## UI Changes

Primary files:

```txt
components/dashboard/inventory/sparepart-form-dialog.tsx
components/dashboard/inventory/inventory-item-form-dialog.tsx
components/dashboard/inventory/inventory-tabs.tsx
components/dashboard/inventory/retail-item-table.tsx
components/dashboard/inventory/staff-sparepart-table.tsx
components/dashboard/inventory/teknisi-sparepart-table.tsx
components/dashboard/services/add-repair-item-form.tsx
components/dashboard/nav/nav-config.ts
app/(dashboard)/[tokoid]/admin/inventory/retail/page.tsx
```

### Navigation And Routes

Inventory should have a separate submenu for retail inventory management instead of mixing everything into one sparepart table.

Recommended admin inventory submenu:

```txt
Inventory
- Sparepart & Jasa
- Barang Retail
- Riwayat Restock
- Laporan Inventory
- Audit Gudang
```

Recommended route:

```txt
/:tokoid/admin/inventory/retail
```

This route is still an inventory-management page, not the retail checkout page. It is for managing sellable retail items.

Do not use `retail.sales` for this page in Phase 1. The page should require:

```ts
inventory.management
```

Reason: `Barang Retail` is inventory setup. Direct selling is controlled later by `retail.sales`.

Staff route can be added later if needed. For Phase 1, admin-only retail item management is enough unless there is a concrete need for staff to create retail items.

### Form Dialog

Create a reusable form component based on the existing sparepart form:

```txt
InventoryItemFormDialog
```

It can be implemented either by:

- Refactoring `SparepartFormDialog` into a more generic form.
- Cloning `SparepartFormDialog` first, then simplifying/renaming later.

Recommended pragmatic approach:

- Clone the existing form to `InventoryItemFormDialog`.
- Add a required `mode` prop.
- Keep `SparepartFormDialog` as a thin wrapper if that avoids touching too many call sites.

Suggested props:

```ts
type InventoryItemFormMode = "sparepart" | "retail_item"

type InventoryItemFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  tokoId: string
  item?: SparepartWithCompatibilities | null
  mode: InventoryItemFormMode
  onSuccess?: (item?: SparepartWithCompatibilities) => void
}
```

Behavior by mode:

```txt
mode = sparepart
- Creates/updates kind = sparepart
- Shows compatibility fields
- Shows universal toggle
- Used by existing Sparepart & Jasa page and service add-item flow

mode = retail_item
- Creates/updates kind = retail_item
- Hides compatibility fields
- Hides universal toggle
- Uses label Barang Retail
- Used by /admin/inventory/retail
```

If a single form is used in a mixed page later, it may expose a type select:

```txt
Jenis Barang
- Sparepart
- Barang Retail
```

But for Phase 1, separate pages should pass fixed mode instead of asking the user every time.

Fixed-mode behavior:

- Default to `Sparepart` for new items.
- Existing items show their saved kind.
- If `Barang Retail` is selected, hide or disable compatibility fields.
- If `Barang Retail` is selected, hide `universal` compatibility behavior from the user.

Suggested UI copy:

```txt
Sparepart: Bisa dipakai di service dan punya kompatibilitas HP.
Barang Retail: Dijual langsung, tidak perlu kompatibilitas HP.
```

### Admin Inventory Tabs

Current tab labels are `Sparepart` and `Jasa`.

Keep the existing `Sparepart` and `Jasa` tabs for the current admin inventory page.

Do not add `Barang Retail` as a third tab inside `InventoryTabs` for Phase 1. Use a separate page/submenu instead:

```txt
/:tokoid/admin/inventory        = Sparepart & Jasa
/:tokoid/admin/inventory/retail = Barang Retail
```

Reason: this keeps separation of concern clear. Spareparts are tied to service compatibility and service item usage; retail items are managed as sellable goods for later checkout.

The existing inventory page can still show a small badge if helpful, but it should primarily show `kind = sparepart` records.

The new retail item page should show only:

```txt
kind = retail_item
```

Recommended page title:

```txt
Barang Retail
```

Recommended description:

```txt
Kelola barang yang dijual langsung seperti charger, kabel, casing, HP second, dan produk retail lain.
```

Recommended create button:

```txt
Tambah Barang Retail
```

### Staff Inventory

Staff should be able to see kind badges and filter/search item type.

Creation permission remains controlled by existing server feature gate:

```ts
inventory.staffCreateSparepart
```

Potential naming issue: the button currently says `Tambah Sparepart`. It should become:

```txt
Tambah Barang
```

If staff retail item management is added later, prefer a separate staff route mirroring admin:

```txt
/:tokoid/staff/inventory/retail
```

For Phase 1, keep staff changes minimal unless staff creation of retail items is required.

### Technician Inventory

Technician inventory should probably show only spareparts in Phase 1.

Recommended query/filter behavior:

- If using shared `getSpareparts()`, filter client-side or add a dedicated query for technician visible inventory.
- Technician does not need to see `Barang Retail` unless there is a concrete reason.

Minimal safe behavior:

- Keep showing all inventory if changing this is too broad.
- Prefer showing only `kind = sparepart` to preserve technician workflow focus.

### Service Add Item Form

The service add-item flow should only list `kind = sparepart` in the sparepart picker.

This should mostly be enforced server-side in `getCompatibleSpareparts()` and `addItem()`.

Client UI should not need major changes if the query already excludes retail items.

## Service Mutation Guard

Primary file:

```txt
actions/service-mutations.ts
```

When adding a sparepart item to service, verify selected inventory item is actually `sparepart`:

```ts
select: {
  kind: true,
  stock: true,
  name: true,
  defaultPrice: true,
  tokoId: true,
  isUniversal: true,
  compatibilities: ...
}
```

Then reject retail items:

```ts
if (sparepart.kind !== "sparepart") {
  throw new Error("Barang retail tidak bisa dipakai sebagai sparepart service")
}
```

This is important because UI filtering is not a security or data-integrity boundary.

## Labels And Naming

Keep internal names stable:

- Keep model: `Sparepart`.
- Keep action file: `actions/inventory.ts`.
- Keep existing route: `/inventory`.

Improve UI labels gradually:

- Page title can remain `Inventory`.
- Existing admin inventory section can remain `Sparepart & Jasa`.
- New retail inventory section should be `Barang Retail`.
- Button can become `Tambah Barang`.
- Existing `Sparepart & Jasa` nav can become `Inventory Barang & Jasa` or stay unchanged for Phase 1.

Recommended minimal UI labels for Phase 1:

```txt
Inventory
Sparepart & Jasa
Barang Retail
Tambah Barang
Tambah Barang Retail
Jenis Barang
Barang Retail
```

## Import/Export Considerations

If import UI is updated in Phase 1, add an optional `Jenis` column.

Accepted values:

```txt
sparepart
retail_item
Sparepart
Barang Retail
retail
barang retail
```

Normalize them to:

```ts
sparepart | retail_item
```

If omitted, default to `sparepart` to avoid breaking existing templates.

If import UI is not updated in Phase 1, server action should still safely default missing kind to `sparepart`.

## Feature Gates

Phase 1 does not require `retail.sales` yet unless the UI exposes retail pages.

Feature gate behavior:

- Inventory item type remains under `inventory.management`.
- `retail.sales` will be used in later phases for direct sales pages/actions.
- Barang Retail items can exist even if `retail.sales` is disabled, because a toko may prepare inventory before enabling retail checkout.

Server actions touched in Phase 1 should continue enforcing current inventory gates:

```ts
assertFeature(scope, "inventory.management")
```

Do not gate `kind = retail_item` behind `retail.sales` in Phase 1.

## Acceptance Criteria

Phase 1 is complete when:

- Database has `InventoryItemKind` enum.
- `Sparepart.kind` exists and defaults to `sparepart`.
- Existing records continue working as spareparts.
- Admin can create and edit spareparts from the existing inventory page.
- Admin can create and edit retail items from a separate `Barang Retail` inventory page.
- The reusable inventory item form supports both `sparepart` and `retail_item` modes.
- Barang Retail does not require compatibility.
- Barang Retail does not appear in compatible sparepart selection for service.
- Service add-item backend rejects `retail_item` items.
- Sparepart inventory page does not mix retail items into service-focused workflows.
- Retail inventory page lists only retail items.
- Restock still works for both kinds.
- Inventory report does not break.
- Staff/technician workflows do not regress.

## Manual QA Checklist

Use existing seeded toko data if available.

### Migration/Data

- Existing spareparts have `kind = sparepart`.
- New sparepart defaults to `sparepart` if kind is omitted.
- New barang retail saves as `retail_item`.

### Admin Inventory

- Create sparepart with compatibility.
- Create sparepart universal.
- Open `Barang Retail` submenu/page.
- Create barang retail with no compatibility.
- Edit barang retail and verify compatibility controls stay hidden.
- Verify sparepart page does not show retail items in service-focused lists.
- Verify retail page shows only barang retail.
- Restock both item kinds.

### Service Flow

- Open service add-item form.
- Verify sparepart list does not show barang retail.
- Add a sparepart to service successfully.
- Try to submit a retail item id manually or through stale UI and verify backend rejects it.

### Staff Flow

- Staff can view item kind.
- Staff create behavior still follows existing `inventory.staffCreateSparepart` gate.

### Technician Flow

- Technician task/service flow still works.
- Technician inventory remains understandable and does not encourage retail usage.

## Risks

### Risk: Retail item appears in service flow

Mitigation:

- Filter `getCompatibleSpareparts()` by `kind = sparepart`.
- Add backend guard in `addItem()`.

### Risk: Existing imports break

Mitigation:

- Make `kind` optional in import schema.
- Default to `sparepart`.

### Risk: Compatibility data remains on retail item records

Mitigation:

- On create retail item, do not create compatibilities.
- On update to retail item, delete compatibilities.

### Risk: Naming confusion because model is still Sparepart

Mitigation:

- Keep internal naming for stability.
- Use UI labels `Barang Retail` for users.
- Consider model rename only after Retail Lite proves central.

## Implementation Order

Recommended sequence:

1. Add Prisma enum and `Sparepart.kind` field.
2. Create migration with default `sparepart`.
3. Regenerate Prisma client through normal project install/generate workflow if needed.
4. Update inventory action types and schemas.
5. Update `createSparepart`, `updateSparepart`, and import behavior.
6. Update `getCompatibleSpareparts()` to return only spareparts.
7. Add service mutation guard against retail item usage.
8. Create reusable `InventoryItemFormDialog` from the existing sparepart form.
9. Add fixed `mode = "sparepart" | "retail_item"` support.
10. Hide compatibility controls for `mode = "retail_item"`.
11. Keep existing sparepart page using `mode = "sparepart"`.
12. Add admin `Barang Retail` inventory route using `mode = "retail_item"`.
13. Add `Barang Retail` submenu under Inventory nav.
14. Update staff/admin labels from `Tambah Sparepart` to `Tambah Barang` where appropriate.
15. Do manual QA checklist.

## Notes For Later Phases

Phase 2 will add `StockMovement`. When implementing Phase 2, use `Sparepart.kind` only as item metadata. Stock movement should not care whether the item is sparepart or retail item except for reporting filters.

Phase 3 will add `retail.sales` enforcement to direct retail checkout. Retail checkout should sell both `sparepart` and `retail_item`, because some shops sell spareparts directly too.
