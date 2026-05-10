# Retail Lite Phase 3: Retail Sales MVP

## Goal

Phase 3 adds direct retail selling without creating fake service orders.

Retail sales should use the existing inventory item source:

```ts
Sparepart.kind = "sparepart" | "retail_item"
```

Both item kinds can be sold through retail:

- `sparepart`: repair part that can also be sold directly.
- `retail_item`: Barang Retail such as HP second, HP baru, charger, kabel, casing, and other sellable goods.

Retail sales must decrement stock and write `StockMovement` entries from Phase 2.

## Product Scope

Included in Phase 3:

- Add retail sale data model.
- Add retail checkout server actions.
- Add admin and staff retail checkout pages.
- Add cart UI.
- Search/scan inventory items.
- Validate stock.
- Support discount.
- Support payment method.
- Support cash received and kembalian.
- Decrement stock on successful sale.
- Write `StockMovement` type `retail_sale`.
- Add basic sale success/detail state after checkout.

Not included in Phase 3:

- Retail sale history page.
- Receipt/reprint page.
- Void/cancel sale.
- Retail reports.
- Returns/refunds.
- Structured HP fields such as IMEI/condition.
- Supplier purchasing.

Phase 3 should produce a usable cashier checkout, but not the full operational back office yet.

## Feature Gates

Retail checkout must require both:

```ts
inventory.management
retail.sales
```

Reason:

- `inventory.management` controls inventory access.
- `retail.sales` controls direct selling.

Server actions must enforce:

```ts
assertRole(scope, ["admin", "staff"])
assertFeature(scope, "inventory.management")
assertFeature(scope, "retail.sales")
```

Technician should not access retail checkout in V1.

## Routes

Add checkout pages:

```txt
/:tokoid/admin/retail
/:tokoid/staff/retail
```

These are checkout/cashier pages, not inventory management pages.

Existing inventory management remains:

```txt
/:tokoid/admin/inventory
/:tokoid/admin/inventory/retail
```

## Navigation

Primary file:

```txt
components/dashboard/nav/nav-config.ts
```

Add Retail nav entry for admin and staff.

Admin suggested placement:

```txt
Admin Overview
Analytics
Toko
Service
Retail
Karyawan
Inventory
```

Staff suggested placement:

```txt
Staff Overview
Service
Retail
Inventory
```

Nav behavior:

- Hide if `retail.sales` is disabled by toko.
- Show locked if plan does not allow `retail.sales`.
- Lock if inventory is not available.

Suggested logic:

```ts
const inventoryEnabled = featureAccess["inventory.management"] ?? false;
const retailEnabled = featureAccess["retail.sales"] ?? false;
const retailDisabledByToko = disabledFeatures.includes("retail.sales");

if (!retailDisabledByToko) {
  entries.push({
    type: "item",
    href: `/${tokoid}/admin/retail`,
    icon: "store",
    label: "Retail",
    isLocked: !inventoryEnabled || !retailEnabled,
  });
}
```

## Data Model Changes

Primary file:

```txt
prisma/schema.prisma
```

### Enums

Add:

```prisma
enum RetailSaleStatus {
  paid
  void
}

enum RetailPaymentMethod {
  cash
  transfer
  qris
  debit
}
```

Phase 3 only creates `paid` sales. `void` is added now for Phase 4.

### RetailSale Model

Add:

```prisma
model RetailSale {
  id             String              @id @default(uuid())
  tokoId         String
  createdById    String
  customerName   String?
  customerPhone  String?
  subtotal       Int
  discountAmount Int                 @default(0)
  grandTotal     Int
  paymentMethod  RetailPaymentMethod
  cashReceived   Int?
  changeAmount   Int?
  status         RetailSaleStatus    @default(paid)
  paidAt         DateTime            @default(now())
  createdAt      DateTime            @default(now())
  updatedAt      DateTime            @updatedAt

  toko      Toko             @relation(fields: [tokoId], references: [id], onDelete: Cascade)
  createdBy User             @relation(fields: [createdById], references: [id])
  items     RetailSaleItem[]

  @@index([tokoId])
  @@index([createdById])
  @@index([status])
  @@index([paymentMethod])
  @@index([paidAt])
  @@index([tokoId, paidAt])
  @@map("retail_sale")
}
```

### RetailSaleItem Model

Add:

```prisma
model RetailSaleItem {
  id               String   @id @default(uuid())
  saleId           String
  sparepartId      String?
  name             String
  barcode          String?
  kind             InventoryItemKind
  qty              Int
  unitPrice        Int
  unitCostSnapshot Int?
  lineTotal        Int
  createdAt        DateTime @default(now())

  sale      RetailSale @relation(fields: [saleId], references: [id], onDelete: Cascade)
  sparepart Sparepart? @relation(fields: [sparepartId], references: [id], onDelete: SetNull)

  @@index([saleId])
  @@index([sparepartId])
  @@index([kind])
  @@map("retail_sale_item")
}
```

### Reverse Relations

Add:

```prisma
model Toko {
  retailSales RetailSale[]
}

model User {
  retailSales RetailSale[]
}

model Sparepart {
  retailSaleItems RetailSaleItem[]
}
```

## Why Separate From Invoice

Do not reuse `Service`, `Invoice`, or `InvoiceItem` for direct retail sale.

Reasons:

- Service invoice represents a repair job.
- Retail sale can happen without a device/customer/service status.
- Retail sale lifecycle is different from repair lifecycle.
- Reports need to distinguish service revenue from retail revenue.

Retail sales should have their own model and later their own receipt/history.

## Server Actions

Recommended file:

```txt
actions/retail.ts
```

Export it from:

```txt
actions/index.ts
```

### Types

Suggested public types:

```ts
export type RetailCheckoutItem = {
  id: string
  barcode: string
  name: string
  kind: "sparepart" | "retail_item"
  defaultPrice: number
  purchasePrice: number | null
  stock: number
  categoryName: string | null
}

export type RetailSaleResult = {
  id: string
  grandTotal: number
  paidAt: Date
}
```

### getRetailCheckoutItems

Purpose: load/search inventory items for the cart.

Signature:

```ts
export async function getRetailCheckoutItems(
  tokoId: string,
  query?: string
): Promise<ActionResultWithData<RetailCheckoutItem[]>>
```

Rules:

- Requires admin/staff.
- Requires `inventory.management` and `retail.sales`.
- Returns both `sparepart` and `retail_item`.
- Only returns items with `stock > 0` by default.
- Search by barcode, name, category.
- Limit results, for example `take: 50`.

Recommended select:

```ts
select: {
  id: true,
  barcode: true,
  name: true,
  kind: true,
  defaultPrice: true,
  purchasePrice: true,
  stock: true,
  category: { select: { name: true } },
}
```

### createRetailSale

Purpose: checkout cart and persist sale.

Signature:

```ts
export async function createRetailSale(
  input: CreateRetailSaleInput
): Promise<ActionResultWithData<RetailSaleResult>>
```

Input shape:

```ts
const createRetailSaleSchema = z.object({
  tokoId: z.string().min(1),
  customerName: z.string().trim().optional().nullable(),
  customerPhone: z.string().trim().optional().nullable(),
  items: z.array(z.object({
    sparepartId: z.string().min(1),
    qty: z.number().int().min(1),
  })).min(1),
  discountAmount: z.number().int().min(0).optional(),
  paymentMethod: z.enum(["cash", "transfer", "qris", "debit"]),
  cashReceived: z.number().int().min(0).optional().nullable(),
})
```

Validation rules:

- Cart must contain at least one item.
- Each item must belong to the same toko.
- Qty must be available in stock.
- Discount cannot exceed subtotal.
- If payment method is `cash`, `cashReceived` must be at least `grandTotal`.
- If payment method is not `cash`, `cashReceived` should be null or ignored.

Calculated fields:

```ts
subtotal = sum(item.defaultPrice * qty)
discountAmount = min(input.discountAmount ?? 0, subtotal)
grandTotal = subtotal - discountAmount
changeAmount = paymentMethod === "cash" ? cashReceived - grandTotal : null
```

## Transaction Flow

`createRetailSale` must use one transaction.

Recommended transaction steps:

1. Load all requested inventory items by ids and `tokoId`.
2. Validate all ids exist.
3. Validate stock for every item.
4. Compute subtotal/discount/grand total.
5. Create `RetailSale`.
6. Create `RetailSaleItem` rows with snapshots.
7. Decrement each item stock.
8. Create `StockMovement` rows type `retail_sale`.
9. Return sale id and totals.

Important: group duplicate cart lines by `sparepartId` before validation.

### Stock Update Pattern

Use guarded stock updates:

```ts
const updated = await tx.sparepart.updateMany({
  where: {
    id: item.id,
    tokoId: scope.tokoId,
    stock: { gte: qty },
  },
  data: {
    stock: { decrement: qty },
  },
})

if (updated.count !== 1) {
  throw new Error(`Stok ${item.name} tidak cukup`)
}
```

Then create stock movement:

```ts
await createStockMovement(tx, {
  tokoId: scope.tokoId,
  sparepartId: item.id,
  type: "retail_sale",
  qtyChange: -qty,
  stockBefore: item.stock,
  stockAfter: item.stock - qty,
  unitCostSnapshot: item.purchasePrice,
  unitPriceSnapshot: item.defaultPrice,
  referenceType: "retail_sale",
  referenceId: sale.id,
  createdById: scope.user.id,
})
```

If concurrency creates stale `item.stock` after loading, the guarded update prevents overselling. If stronger stockBefore accuracy is required later, fetch item with row locking or use serializable transaction. For MVP, guarded update is acceptable.

## UI Components

Recommended files:

```txt
components/dashboard/retail/retail-checkout.tsx
components/dashboard/retail/retail-cart.tsx
components/dashboard/retail/retail-item-picker.tsx
components/dashboard/retail/retail-payment-panel.tsx
```

Keep UI components separate from inventory management components.

### RetailCheckout

Main client component for checkout.

Responsibilities:

- Load searchable inventory items.
- Maintain cart state.
- Add item by click or barcode/search.
- Adjust qty.
- Compute subtotal.
- Handle discount.
- Handle payment method.
- Handle cash received/kembalian.
- Submit to `createRetailSale`.
- Show success state.

### RetailItemPicker

Responsibilities:

- Search input.
- Barcode-friendly input.
- List available items.
- Show stock and price.
- Show item kind badge.
- Add to cart.

Item card/table should show:

```txt
Name
Barcode
Kind badge
Stock
Price
```

### RetailCart

Responsibilities:

- List selected cart lines.
- Qty stepper.
- Remove item.
- Prevent qty above available stock.
- Show line total.

### RetailPaymentPanel

Responsibilities:

- Payment method.
- Discount.
- Cash received.
- Kembalian.
- Checkout button.

This can reuse patterns from existing service `PaymentDialog`, but should be its own retail component.

## Page Structure

Admin page:

```txt
app/(dashboard)/[tokoid]/admin/retail/page.tsx
```

Staff page:

```txt
app/(dashboard)/[tokoid]/staff/retail/page.tsx
```

Server page responsibilities:

- Resolve `tokoid`.
- Check `inventory.management` and `retail.sales`.
- Handle role/disabled/plan lock behavior.
- Render `RetailCheckout`.

Suggested page title:

```txt
Retail
```

Suggested description:

```txt
Jual sparepart dan barang retail langsung dari inventory toko.
```

## Feature Preview Behavior

For plan-required retail access, use `FeaturePreview` for `retail.sales`.

For toko-disabled retail access, redirect to role overview:

```txt
/:tokoid/admin
/:tokoid/staff
```

For role denied, redirect to `/dashboard`.

## Revalidation

After successful sale:

```ts
revalidateInventoryPaths(scope.tokoId)
revalidatePath(`/${scope.tokoId}/admin/retail`)
revalidatePath(`/${scope.tokoId}/staff/retail`)
```

If sale detail/history is not added yet, no history revalidation is needed.

## Activity Log

Optional in Phase 3, but recommended.

Add activity enum if desired:

```prisma
retail_sale_created
```

However, changing `ActivityType` enum adds migration overhead. If avoiding extra enum changes, rely on `StockMovement` for Phase 3 and add retail activity logs later.

Recommendation:

- Do not add new `ActivityType` in Phase 3 unless the activity feed must show retail sales immediately.
- Use `RetailSale` and `StockMovement` as the source for retail history later.

## Acceptance Criteria

Phase 3 is complete when:

- `RetailSaleStatus` and `RetailPaymentMethod` enums exist.
- `RetailSale` and `RetailSaleItem` models exist.
- Admin retail checkout page exists.
- Staff retail checkout page exists.
- Admin/staff nav includes Retail when not disabled by toko.
- Retail pages enforce both `inventory.management` and `retail.sales`.
- Checkout can search and add both `sparepart` and `retail_item`.
- Checkout validates stock.
- Checkout supports discount.
- Checkout supports cash, transfer, QRIS, debit.
- Cash checkout calculates change.
- Successful checkout creates `RetailSale` and `RetailSaleItem` rows.
- Successful checkout decrements stock.
- Successful checkout writes `retail_sale` stock movements.
- Checkout prevents overselling.
- Service workflow remains unaffected.

## Manual QA Checklist

### Feature Gate

- Disable `retail.sales` for a toko.
- Verify Retail nav disappears or page redirects.
- Enable `retail.sales`.
- Verify admin/staff can open Retail page.
- Verify technician cannot access Retail page.

### Checkout Items

- Create one `sparepart` with stock.
- Create one `retail_item` with stock.
- Verify both appear in retail checkout search.
- Verify out-of-stock items do not appear or cannot be added.

### Cart

- Add item to cart.
- Increase qty.
- Try increasing above stock and verify it is blocked.
- Remove item.
- Verify totals update.

### Payment

- Checkout with cash.
- Verify cash received must be enough.
- Verify kembalian is correct.
- Checkout with QRIS/transfer/debit.
- Verify cash received is not required.

### Persistence

- Verify `RetailSale` row is created.
- Verify `RetailSaleItem` rows are created with name, barcode, kind, price, cost snapshots.
- Verify stock decreases.
- Verify `StockMovement` row exists with `type = retail_sale`.

### Regression

- Add sparepart to service still works.
- Restock still works.
- Inventory audit still works.
- Inventory pages still load.

## Risks

### Risk: Overselling under concurrency

Mitigation:

- Use guarded `updateMany` with `stock: { gte: qty }`.
- Fail transaction if any item update count is not `1`.

### Risk: Retail UI accidentally mutates service invoice flow

Mitigation:

- Keep retail models/actions/components separate from service invoice models/actions/components.

### Risk: Payment method is not persisted

Mitigation:

- Persist `paymentMethod` directly on `RetailSale`.

### Risk: Old price changes affect historical sales

Mitigation:

- Snapshot item name, barcode, kind, unit price, and unit cost in `RetailSaleItem`.

### Risk: Retail becomes too broad too early

Mitigation:

- Keep Phase 3 checkout-only.
- Defer history, receipt, void, returns, and reports to later phases.

## Implementation Order

Recommended sequence:

1. Add Prisma enums and retail sale models.
2. Create migration.
3. Regenerate Prisma client through normal project workflow if needed.
4. Add `actions/retail.ts`.
5. Add `getRetailCheckoutItems`.
6. Add `createRetailSale` transaction.
7. Export retail actions from `actions/index.ts`.
8. Add `components/dashboard/retail/*` checkout components.
9. Add admin retail page.
10. Add staff retail page.
11. Add Retail nav entries for admin and staff.
12. Add revalidation after checkout.
13. Run manual QA checklist.

## Notes For Phase 4

Phase 4 should add:

- Retail sale history.
- Receipt detail.
- Reprint receipt.
- Filter by date, cashier, payment method, item.
- Optional void/cancel.

Phase 4 should use the `RetailSale` rows created in Phase 3 and `RetailSaleStatus.void` if void is implemented.
