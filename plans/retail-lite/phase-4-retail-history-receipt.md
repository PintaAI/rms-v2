# Retail Lite Phase 4: Retail History And Receipt

## Goal

Phase 4 turns the Retail Sales MVP into an operational daily workflow by adding sale history, receipt detail, reprint support, and optional void/cancel handling.

Phase 3 can create paid retail sales. Phase 4 lets staff/admin find those sales again, audit them, and show/print receipt details.

## Product Scope

Included in Phase 4:

- Retail sale history page for admin and staff.
- Retail sale detail page or dialog.
- Receipt layout.
- Reprint receipt support through browser print.
- Filters by date, cashier, payment method, status, and query.
- Sale item detail with price/cost snapshots.
- Optional admin-only void/cancel sale.
- Stock return on void.
- `StockMovement` type `retail_void` when voiding.

Not included in Phase 4:

- Retail analytics dashboards.
- Return/refund partial item flow.
- Exchange flow.
- Tax support.
- Customer profile management.
- Supplier purchase workflow.

## Routes

Add history pages:

```txt
/:tokoid/admin/retail/history
/:tokoid/staff/retail/history
```

Add sale detail routes if using pages:

```txt
/:tokoid/admin/retail/[saleId]
/:tokoid/staff/retail/[saleId]
```

Alternative: use a detail dialog inside history page for V1. This is simpler and avoids more route files.

Recommended V1:

- History page.
- Detail/receipt dialog.
- No dedicated `[saleId]` route yet unless receipt URLs are needed.

## Feature Gates

All Phase 4 retail pages/actions require:

```ts
assertRole(scope, ["admin", "staff"])
assertFeature(scope, "inventory.management")
assertFeature(scope, "retail.sales")
```

Void/cancel should be admin-only for V1:

```ts
assertRole(scope, ["admin"])
```

Reason: voiding returns stock and changes revenue history, so it needs stronger control.

## Navigation

Update Retail nav structure.

Recommended admin nav:

```txt
Retail
- Kasir
- Riwayat Penjualan
```

Recommended staff nav:

```txt
Retail
- Kasir
- Riwayat Penjualan
```

If the existing nav system prefers flat items, use:

```txt
Retail
Riwayat Retail
```

Keep the same disabled/locked behavior from Phase 3.

## Server Actions

Recommended file:

```txt
actions/retail.ts
```

### getRetailSales

Purpose: paginated history list.

Signature:

```ts
export async function getRetailSales(
  tokoId: string,
  filters?: RetailSalesFilters
): Promise<ActionResultWithData<RetailSalesResult>>
```

Filter shape:

```ts
export type RetailSalesFilters = {
  q?: string
  cashierId?: string
  paymentMethod?: "cash" | "transfer" | "qris" | "debit" | "all"
  status?: "paid" | "void" | "all"
  from?: string
  to?: string
  page?: number
  pageSize?: number
}
```

Result shape:

```ts
export type RetailSalesResult = {
  items: RetailSaleHistoryItem[]
  cashiers: Array<{ id: string; name: string }>
  totalItems: number
  totalGross: number
  totalDiscount: number
  totalNet: number
  page: number
  pageSize: number
  totalPages: number
}
```

History item shape:

```ts
export type RetailSaleHistoryItem = {
  id: string
  paidAt: Date
  status: "paid" | "void"
  customerName: string | null
  customerPhone: string | null
  subtotal: number
  discountAmount: number
  grandTotal: number
  paymentMethod: "cash" | "transfer" | "qris" | "debit"
  cashReceived: number | null
  changeAmount: number | null
  cashier: { id: string; name: string }
  itemCount: number
  totalQty: number
}
```

### getRetailSale

Purpose: fetch one sale with receipt-ready details.

Signature:

```ts
export async function getRetailSale(
  saleId: string
): Promise<ActionResultWithData<RetailSaleDetail>>
```

Detail shape:

```ts
export type RetailSaleDetail = RetailSaleHistoryItem & {
  toko: {
    id: string
    name: string
    address: string | null
    phone: string | null
    logoUrl: string | null
    invoiceTerms: string | null
  }
  items: Array<{
    id: string
    sparepartId: string | null
    name: string
    barcode: string | null
    kind: "sparepart" | "retail_item"
    qty: number
    unitPrice: number
    unitCostSnapshot: number | null
    lineTotal: number
  }>
}
```

Access rule:

- Admin/staff can view sale details for their toko.
- Technician cannot view retail sale details.

### voidRetailSale

Purpose: mark sale as void and return stock.

Signature:

```ts
export async function voidRetailSale(
  saleId: string,
  reason?: string
): Promise<ActionResult>
```

Rules:

- Admin only.
- Requires `inventory.management` and `retail.sales`.
- Only `paid` sale can be voided.
- Voiding sets `RetailSale.status = void`.
- Voiding returns stock for each item with a valid `sparepartId`.
- Voiding writes `StockMovement` type `retail_void`.
- Voiding should be all-or-nothing in one transaction.

Recommended future fields if void is included:

```prisma
voidedAt   DateTime?
voidedById String?
voidReason String?
```

If adding these fields, update `RetailSale` model in Phase 4.

Recommended model addition:

```prisma
voidedAt     DateTime?
voidedById   String?
voidReason   String?
voidedBy     User?     @relation("RetailSaleVoidedBy", fields: [voidedById], references: [id])
```

Add matching reverse relation on `User` if needed:

```prisma
voidedRetailSales RetailSale[] @relation("RetailSaleVoidedBy")
```

If this relation adds too much complexity, keep only scalar `voidedById` for V1 and avoid relation.

## Void Transaction Flow

If void is implemented in Phase 4, transaction steps:

1. Load sale with items.
2. Verify sale exists and belongs to toko.
3. Verify status is `paid`.
4. Mark sale as `void`.
5. For each item with `sparepartId`, fetch current stock.
6. Increment stock by item qty.
7. Create `retail_void` stock movement.
8. Store void reason/actor if fields exist.

Movement shape:

```ts
await createStockMovement(tx, {
  tokoId: sale.tokoId,
  sparepartId: item.sparepartId,
  type: "retail_void",
  qtyChange: item.qty,
  stockBefore: current.stock,
  stockAfter: current.stock + item.qty,
  unitCostSnapshot: item.unitCostSnapshot,
  unitPriceSnapshot: item.unitPrice,
  referenceType: "retail_sale",
  referenceId: sale.id,
  note: reason ?? null,
  createdById: scope.user.id,
})
```

## UI Components

Recommended files:

```txt
components/dashboard/retail/retail-sales-history.tsx
components/dashboard/retail/retail-sale-detail-dialog.tsx
components/dashboard/retail/retail-receipt.tsx
components/dashboard/retail/void-retail-sale-dialog.tsx
```

### RetailSalesHistory

Responsibilities:

- Render filters.
- Render paginated sales table/cards.
- Open detail dialog.
- Trigger void dialog for admin.

Table columns:

```txt
Tanggal
Kasir
Customer
Items
Pembayaran
Total
Status
Aksi
```

Filters:

```txt
Search: sale id, customer name, phone, item name
Date range
Cashier
Payment method
Status
```

### RetailSaleDetailDialog

Responsibilities:

- Show sale metadata.
- Show item lines.
- Show payment summary.
- Show receipt preview.
- Print receipt.

### RetailReceipt

Receipt should be simple and print-friendly.

Fields:

```txt
Toko name/logo
Toko address/phone
Sale id
Paid date
Cashier
Customer optional
Items
Subtotal
Discount
Grand total
Payment method
Cash received/change if cash
Terms/footer optional
```

Use browser print for V1:

```ts
window.print()
```

If print styling is needed, use CSS class names and `@media print` in a component stylesheet or global CSS.

### VoidRetailSaleDialog

Admin-only.

Fields:

- Reason textarea.
- Confirmation warning.

Warning copy:

```txt
Void akan membatalkan transaksi ini dan mengembalikan stok barang ke inventory.
```

## Page Structure

Admin history page:

```txt
app/(dashboard)/[tokoid]/admin/retail/history/page.tsx
```

Staff history page:

```txt
app/(dashboard)/[tokoid]/staff/retail/history/page.tsx
```

Server page responsibilities:

- Check `inventory.management` and `retail.sales`.
- Parse search params.
- Fetch initial history data or render client component that fetches.
- Render `RetailSalesHistory`.

Recommended page title:

```txt
Riwayat Retail
```

Recommended description:

```txt
Lihat transaksi retail, detail pembayaran, dan cetak ulang receipt.
```

## Search Strategy

Initial implementation can fetch a filtered page server-side.

Query should support:

- Sale id contains/startsWith.
- Customer name contains.
- Customer phone contains.
- Cashier filter.
- Payment method filter.
- Status filter.
- Date range on `paidAt`.

Searching by item name requires joining/filtering on `RetailSaleItem`:

```ts
items: {
  some: {
    name: { contains: q, mode: "insensitive" }
  }
}
```

## Revalidation

After voiding a sale:

```ts
revalidateInventoryPaths(scope.tokoId)
revalidatePath(`/${scope.tokoId}/admin/retail`)
revalidatePath(`/${scope.tokoId}/staff/retail`)
revalidatePath(`/${scope.tokoId}/admin/retail/history`)
revalidatePath(`/${scope.tokoId}/staff/retail/history`)
```

Viewing history/detail does not require revalidation.

## Activity Log

Optional.

If activity feed should show retail operations, add activity types:

```prisma
retail_sale_created
retail_sale_voided
```

But this requires enum migration and updating activity UI copy.

Recommendation for Phase 4:

- Keep activity log optional.
- Retail history should read from `RetailSale`.
- Stock impact should read from `StockMovement`.

## Acceptance Criteria

Phase 4 is complete when:

- Admin retail history page exists.
- Staff retail history page exists.
- History list shows paid retail sales.
- History supports filters by date, cashier, payment method, status, and search query.
- Sale detail shows all sale items and payment summary.
- Receipt component renders print-friendly sale details.
- Receipt can be reprinted from sale detail.
- If void is included, admin can void paid sale.
- If void is included, staff cannot void sale.
- If void is included, void returns stock and writes `retail_void` movements.
- Voided sales are clearly labeled and excluded from paid totals where appropriate.
- Checkout from Phase 3 still works.

## Manual QA Checklist

### History

- Create several retail sales with different payment methods.
- Open admin history page.
- Verify sales appear in descending paid date order.
- Filter by date range.
- Filter by payment method.
- Search by customer name.
- Search by item name.

### Detail And Receipt

- Open a sale detail.
- Verify item snapshots match sale time.
- Verify subtotal, discount, total, payment method are correct.
- Print/reprint receipt.
- Verify receipt is readable in print preview.

### Staff Access

- Open staff history page.
- Verify staff can view sale details.
- Verify staff cannot void sale if void is implemented.

### Void

- Void a paid sale as admin.
- Verify sale status becomes `void`.
- Verify stock is returned.
- Verify `retail_void` stock movements exist.
- Verify voided sale cannot be voided again.
- Verify voided sale is visually marked in history.

### Regression

- Retail checkout still creates sales.
- Inventory stock remains accurate.
- Service workflow still works.

## Risks

### Risk: Void becomes refund accounting

Mitigation:

- Keep Phase 4 void simple: cancel full sale and return stock.
- Do not implement partial refunds yet.

### Risk: Staff voids valid sales accidentally

Mitigation:

- Admin-only void.
- Require reason/confirmation.

### Risk: Receipt becomes too complex

Mitigation:

- Use simple print-friendly receipt.
- Avoid custom printer integration in V1.

### Risk: History queries get slow

Mitigation:

- Paginate.
- Use indexes on `tokoId`, `paidAt`, `status`, `paymentMethod`, `createdById`.
- Keep item-name search limited with pagination.

## Implementation Order

Recommended sequence:

1. Decide whether void is included in Phase 4 or deferred.
2. If void is included, add void fields to `RetailSale`.
3. Add `getRetailSales` action.
4. Add `getRetailSale` action.
5. Add `voidRetailSale` action if included.
6. Add `RetailReceipt` component.
7. Add `RetailSaleDetailDialog` component.
8. Add `RetailSalesHistory` component.
9. Add admin history page.
10. Add staff history page.
11. Update retail nav to include history.
12. Add revalidation for void.
13. Run manual QA checklist.

## Notes For Phase 5

Phase 5 reports should use:

- `RetailSale` for transaction/revenue totals.
- `RetailSaleItem` for top-selling items and margin.
- `StockMovement` for stock movement analysis.

Voided sales should be excluded from revenue totals but still visible in audit/history.
