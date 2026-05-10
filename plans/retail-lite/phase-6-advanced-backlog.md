# Retail Lite Phase 6: Advanced Backlog

## Goal

Phase 6 is not part of the Retail Lite MVP.

It is a future backlog that documents what can be added after the core retail workflow proves useful in real toko operations.

The MVP is complete after Phase 5:

```txt
Phase 0: Feature gate
Phase 1: Inventory item type
Phase 2: Stock movement ledger
Phase 3: Retail checkout
Phase 4: History and receipt
Phase 5: Reports and analytics
```

Phase 6 exists to prevent scope creep during MVP implementation.

## Product Boundary

Retail Lite should remain focused on:

```txt
Toko service can sell spareparts, HP units, and barang retail directly while keeping stock accurate.
```

Phase 6 ideas should only be implemented after there is real usage feedback.

## Advanced Ideas

### Returns And Refunds

Current MVP can support full-sale void if Phase 4 includes it.

Advanced return/refund flow may include:

- Partial item return.
- Refund amount different from original line total.
- Return reason.
- Damaged/unresellable returned item.
- Return without restocking.
- Refund payment method.

Possible future models:

```txt
RetailReturn
RetailReturnItem
```

Do not build this until simple void is not enough.

### Supplier Purchase Order

Current MVP restock is manual.

Advanced purchasing may include:

- Supplier master data.
- Purchase order.
- Purchase order items.
- Receive stock from PO.
- Supplier invoice.
- Payment status to supplier.

Possible future models:

```txt
Supplier
PurchaseOrder
PurchaseOrderItem
```

This can become large quickly, so keep it out of Retail Lite MVP.

### Multi-Price Levels

Some shops may need different prices:

- Retail price.
- Wholesale/reseller price.
- Technician price.
- Promo price.

Possible future model:

```txt
InventoryItemPrice
```

Do not add this until one default selling price is clearly insufficient.

### Customer Profiles

Current retail sale can store optional customer name/phone.

Advanced customer profiles may include:

- Customer history.
- Customer contact detail.
- Retail purchase history.
- Service history linkage.
- Loyalty points.

Possible future model:

```txt
Customer
```

This should be designed carefully because service customers already exist as raw fields on `Service`.

### Tax

Tax support may include:

- Tax rate.
- Tax-inclusive pricing.
- Tax-exclusive pricing.
- Tax invoice fields.
- Tax report.

Do not add tax until there is a specific compliance requirement.

### Loyalty

Loyalty may include:

- Points per transaction.
- Redeem points.
- Member pricing.
- Purchase frequency rewards.

This depends on customer profiles, so it should come after customer model decisions.

### Multi-Gudang

Current inventory is per toko.

Advanced inventory may need:

- Multiple storage locations per toko.
- Transfer stock between locations.
- Central warehouse.
- Inter-toko transfer.

Possible future models:

```txt
Warehouse
StockLocation
StockTransfer
```

This is not needed for most early retail workflows.

### Marketplace Sync

Possible integrations:

- Shopee.
- Tokopedia.
- TikTok Shop.
- Website catalog.

This requires product mapping, external order sync, and stock sync conflict handling. Keep it far outside MVP.

### Structured HP Fields

For V1, HP second/baru is treated as `Barang Retail` with stock usually `1`.

If HP jual-beli becomes important, add optional structured fields later:

- IMEI.
- Condition.
- Storage.
- Color.
- Battery health.
- Completeness.
- Warranty note.

Two possible paths:

1. Add optional metadata fields to inventory item.
2. Create a separate device-unit module later.

Do not build a separate device trading module unless simple `Barang Retail` is no longer enough.

### Cashier Shift Closing

Advanced retail operations may need:

- Open shift.
- Starting cash.
- Cash in/out.
- Expected cash.
- Actual cash.
- Shift close report.

Possible future models:

```txt
CashierShift
CashMovement
```

This is useful only when toko has enough cashier volume.

## When To Promote Backlog Item

Only promote a Phase 6 item into implementation when at least one is true:

- Multiple real users request it.
- Current workflow causes operational pain.
- It unlocks a pricing/package upgrade.
- It is required for legal/compliance reasons.
- It simplifies existing manual work significantly.

Avoid implementing Phase 6 features just because they are common in full POS products.

## Recommended Post-MVP Priority

If the MVP succeeds, likely priority order:

1. Partial returns/refunds.
2. Structured HP metadata.
3. Supplier purchase order.
4. Customer profiles.
5. Cashier shift closing.
6. Multi-price levels.
7. Multi-gudang.
8. Tax.
9. Loyalty.
10. Marketplace sync.

This order can change based on customer feedback.

## Non-Goals

Retail Lite should not become a general ERP by default.

Avoid adding these too early:

- Full accounting.
- Payroll.
- Complex supplier debt.
- Multi-company finance.
- Tax compliance engine.
- Marketplace operations platform.

## Final MVP Definition

The Retail Lite MVP is complete when the app can:

- Register retail as a configurable feature.
- Manage spareparts and barang retail separately.
- Track every stock movement going forward.
- Sell spareparts and barang retail directly.
- Show sale history and receipts.
- Show retail analytics and combined service + retail revenue.

Everything beyond that belongs in this advanced backlog until proven necessary.
