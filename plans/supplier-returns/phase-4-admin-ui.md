# Supplier Returns Phase 4: Admin UI

## Goal

Phase 4 adds operational UI for admin to manage supplier returns from Inventory.

## Navigation

Add an admin inventory navigation entry:

```txt
Retur Supplier
```

Suggested route:

```txt
/:tokoid/admin/inventory/supplier-returns
```

## Page Layout

Use existing dashboard card/table patterns.

Sections:

- summary cards
- filters
- return table
- detail/status dialog

## Summary Cards

Minimal V1:

- pending count
- sent count
- replaced count this month
- supplier refund amount this month

## Filters

- status
- search query
- date range

Search should match:

- return id
- sparepart name
- supplier name
- warranty claim customer/device if available

## Table Columns

- tanggal
- sparepart
- qty
- supplier
- asal klaim
- status
- aksi

## Row Actions

For `pending`:

- Tandai dikirim
- Tandai diganti supplier
- Tandai refund supplier
- Tolak retur

For `sent`:

- Tandai diganti supplier
- Tandai refund supplier
- Tolak retur

For resolved statuses:

- View detail only

## Detail Dialog

Show:

- sparepart
- qty
- supplier
- reason
- note
- warranty claim link/context
- createdBy and createdAt
- sentAt
- resolvedBy and resolvedAt
- refundAmount when refunded

## Warranty Claim UI Link

In service detail claim history, show supplier return status if a supplier return exists for the claim.

V1 can show simple text:

```txt
Retur supplier: pending
```

## Empty State

Use a clear empty state:

```txt
Belum ada retur supplier.
Retur akan muncul saat klaim garansi ganti sparepart dicatat sebagai retur supplier.
```

## Acceptance Criteria

- Admin can see returns created from warranty claims.
- Admin can progress return status.
- Marking replaced increments stock exactly once.
- Marking refunded/rejected does not change stock.
- Resolved returns no longer show mutation actions.
