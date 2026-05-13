# Supplier Returns Phase 0: Scope And Rules

## Goal

Phase 0 defines the smallest useful version of returning damaged spareparts to suppliers.

User-facing label:

```txt
Retur Supplier
```

## Product Decision

Supplier returns are separate from customer warranty claims, but can be created from a warranty claim when the claim resolution is `Ganti sparepart`.

The old/damaged part should not be returned to sellable stock automatically.

## Included In V1

- Create supplier return from a warranty claim replacement flow.
- List supplier returns under Inventory navigation.
- Track return status.
- Mark return as sent to supplier.
- Mark return as replaced by supplier and increment stock.
- Mark return as refunded by supplier without stock change.
- Mark return as rejected by supplier without stock change.
- Basic activity log and stock movement ledger integration.

## Not Included In V1

- Automatic supplier return creation without staff/admin confirmation.
- Accounting journal or cash/bank ledger.
- Supplier performance dashboard.
- Photo/proof upload for damaged parts.
- Multi-item supplier return batch.
- Return shipping costs.
- Automatic supplier debt offset.

## Business Rules

### Customer Claim Side

- Customer claim with `Ganti sparepart` decrements the replacement sparepart stock.
- Supplier return records the old/damaged part separately.
- Supplier return does not change stock until supplier outcome is known.

### Supplier Return Side

- Supplier return belongs to one toko.
- Supplier return can optionally link to one warranty claim.
- Supplier return references one sparepart and quantity.
- Quantity must be greater than zero.
- `supplierName` can be copied from `Sparepart.supplierName` but must be editable.

### Status Lifecycle

```txt
pending -> sent -> replaced
pending -> sent -> refunded
pending -> sent -> rejected
pending -> replaced
pending -> refunded
pending -> rejected
```

Use direct `pending -> resolved` transitions because some shops may resolve returns without explicitly marking shipment.

## Access

V1 should be admin-only.

Recommended feature dependency:

```txt
inventory.management
```

Reason: supplier returns change or explain inventory stock only.

## File Touch Strategy

Prefer new files:

- `actions/supplier-returns.ts`
- `app/(dashboard)/[tokoid]/admin/inventory/supplier-returns/page.tsx`
- `components/dashboard/inventory/supplier-returns/*`

Expected existing files to touch:

- `prisma/schema.prisma`
- `actions/index.ts`
- `components/dashboard/nav/nav-config.ts`
- warranty claim resolve dialog in `components/dashboard/services/service-detail-card/service-detail-card.tsx`

Avoid touching:

- customer invoice mutation logic
- payment dialogs
- retail sales
- supplier debts, unless a later phase explicitly integrates them
