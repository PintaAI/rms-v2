# Retail Lite Progress Index

Last updated: 2026-05-11

## Current Status

Retail Lite planning is split into MVP phases. Implementation currently covers the feature gate, inventory item-type foundation, stock movement ledger, and Retail Sales MVP checkout flow. Retail history, receipt, void, and analytics are still pending.

| Phase | Plan | Status | Progress |
| --- | --- | --- | --- |
| 0 | [Feature Gate](./phase-0-feature-gate.md) | Done | `retail.sales` is registered and shown under the Retail feature category. |
| 1 | [Inventory Item Type](./phase-1-inventory-item-type.md) | Done | Inventory supports `sparepart` and `retail_item`, with admin Barang Retail management. |
| 2 | [Stock Movement Ledger](./phase-2-stock-movement-ledger.md) | Done | `StockMovement` model and stock-change ledger writes are implemented for existing stock-changing flows. |
| 3 | [Retail Sales MVP](./phase-3-retail-sales-mvp.md) | Done | Retail sale models, checkout actions, admin/staff cashier routes, polished cart drawer UI, stock decrement, and `retail_sale` stock movements are implemented. Production build passes. |
| 4 | [Retail History And Receipt](./phase-4-retail-history-receipt.md) | Not started | Sale history, receipt/reprint, and void flow are not implemented yet. |
| 5 | [Retail Reports And Analytics](./phase-5-retail-reports-analytics.md) | Not started | Retail analytics and combined service + retail revenue reporting are not implemented yet. |
| 6 | [Advanced Backlog](./phase-6-advanced-backlog.md) | Backlog | Future ideas only; intentionally outside the MVP. |

## Completed So Far

Phase 0: Feature Gate

- Added `retail` to `FeatureCategory`.
- Added `retail.sales` to `FeatureKey` and `FEATURE_REGISTRY`.
- Configured `retail.sales` for admin/staff, premium plan, and toko-level configurability.
- Added the Retail category label in the feature settings UI.

Phase 1: Inventory Item Type

- Added Prisma enum `InventoryItemKind` with `sparepart` and `retail_item`.
- Added `Sparepart.kind` with default `sparepart`.
- Added migration `20260510010000_add_inventory_item_kind`.
- Updated inventory server action types and validation to accept item kind.
- Added retail item behavior in create, edit, import, restock, and list flows.
- Added protection so `retail_item` cannot be used as a service sparepart.
- Added admin inventory navigation entry for `Barang Retail`.
- Added admin page `/:tokoid/admin/inventory/retail`.
- Added `RetailItemTable` and reused inventory dialogs in retail-item mode.

Phase 2: Stock Movement Ledger

- Added Prisma enum `StockMovementType` with service, restock, retail, and audit movement types.
- Added `StockMovement` model with stock before/after, quantity delta, price/cost snapshots, reference fields, and actor tracking.
- Added migration `20260510020000_add_stock_movement_ledger`.
- Added ledger writes for manual restock.
- Added ledger writes for service sparepart usage.
- Added ledger writes for service item removal stock return.
- Added ledger writes for service deletion stock return.
- Added ledger writes for inventory audit adjustments.

## Next Phase

Continue [Phase 4: Retail History And Receipt](./phase-4-retail-history-receipt.md) with retail sale history, receipt/reprint, and void flow.

Phase 3 is complete. The next Retail Lite gap is operational back-office visibility for completed retail sales.

## Phase 3 Progress

- Added `RetailSaleStatus` and `RetailPaymentMethod` enums.
- Added `RetailSale` and `RetailSaleItem` models plus migration `20260511010000_add_retail_sales`.
- Added `actions/retail.ts` with `getRetailCheckoutItems` and `createRetailSale`.
- `createRetailSale` groups duplicate cart lines, validates stock and price, computes discount/payment/change, creates sale snapshots, decrements stock with guarded updates, and writes `StockMovement` rows with type `retail_sale`.
- Added admin route `/:tokoid/admin/retail` and staff route `/:tokoid/staff/retail`.
- Added Retail nav entries for admin and staff with inventory + retail feature lock behavior.
- Added `RetailCheckout` UI with search, cart quantity controls, optional customer fields, flat/percent discount, payment method, cash received, kembalian, and success state.
- Polished `RetailCheckout` drawer UX: cart button moved into the sellable-items card header, adding items no longer auto-opens the cart, selected items use a horizontally scrollable table, payment methods use icon badges, and mobile drawer sizing/scroll behavior was tightened.
- Verified production build with `bun run build` on 2026-05-11.
- Completed Phase 3 closeout: retail checkout revalidates retail inventory paths, staff disabled-feature behavior redirects to the staff overview, and production build passes after closeout changes.

Phase 3 acceptance covered:

- Retail sale schema, checkout actions, admin/staff pages, and nav entries are implemented.
- Checkout enforces `inventory.management` and `retail.sales`; staff page also follows `staff.workflow`.
- Checkout supports `sparepart` and `retail_item`, stock validation, zero-price blocking, flat/percent discount, cash/transfer/QRIS/debit, cash change calculation, stock decrement, and `retail_sale` stock movements.
- Service workflow remains separate from retail sale models/actions.
