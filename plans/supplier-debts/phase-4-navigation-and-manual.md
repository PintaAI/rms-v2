# Supplier Debts Phase 4: Navigation And Manual

## Goal

Phase 4 exposes the feature in admin navigation and documents the workflow for users.

## Navigation

Primary file:

```txt
components/dashboard/nav/nav-config.ts
```

Recommended placement: Inventory group.

Add an item after `Riwayat Restock` or before `Laporan Inventory`:

```txt
Hutang Supplier
```

Suggested route:

```txt
/:tokoid/admin/supplier-debts
```

Behavior:

- hidden if `inventory.management` is disabled by toko
- locked if `inventory.management` is unavailable by plan
- admin only

Since the feature is admin-only in V1, do not add staff or teknisi navigation.

## Feature Gate Decision

Do not add a new feature key in V1.

Use:

```txt
inventory.management
```

Reason:

- fewer touched files
- feature is tied to supplier and restock operations
- avoids adding feature settings copy before product validates the workflow

If product later wants independent control, add a new feature gate:

```txt
inventory.supplierDebts
```

That should be a later phase, not part of the simple MVP.

## User Manual

Optional but recommended once UI is implemented.

Add a new manual page:

```txt
user-manual/10-hutang-supplier[RiBillLine].md
```

If the icon does not exist in `@remixicon/react`, choose an existing finance-related Remix icon used elsewhere.

Manual sections:

- apa itu Hutang Supplier
- cara tambah supplier
- cara tambah hutang
- cara catat pembayaran
- arti status
- batasan versi awal

Keep manual aligned with actual shipped UI.

## Activity Log

Do not add new `ActivityType` in V1 unless required.

Reason:

- adding enum values touches schema and potentially generated types
- the debt and payment tables are already the audit source for this feature

If activity log is desired later, add:

```txt
supplier_debt_created
supplier_debt_paid
supplier_debt_updated
```

This should be a later enhancement.

## Acceptance Criteria

- Admin can access the page from navigation.
- Non-admin users do not see the menu.
- Locked state follows `inventory.management` availability.
- Manual page, if added, matches the final UI behavior.
