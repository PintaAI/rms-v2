# Supplier Debts Phase 0: Scope And Rules

## Goal

Phase 0 defines the smallest useful version of supplier debt tracking.

The feature should let an admin record money the toko still owes to sparepart suppliers without turning the app into a full accounting system.

User-facing label:

```txt
Hutang Supplier
```

## Product Decision

Supplier debts will be manual in the first version.

This means:

- Restock stays unchanged.
- Admin records supplier debt from a dedicated page.
- Payments to supplier are recorded from the same page.
- No customer invoice behavior is changed.
- No cash/bank ledger is introduced yet.

This keeps the implementation small and avoids risky changes to service, invoice, and inventory workflows.

## Included

- Supplier master data, minimal fields only.
- Supplier debt records.
- Supplier debt payments.
- Automatic debt status from `totalAmount` and `paidAmount`.
- Admin-only page to list, create, edit, and pay supplier debts.
- Basic summary cards: total outstanding, total paid, active debt count.
- Navigation entry under Inventory.

## Not Included

- Automatic debt creation from restock.
- Purchase item details per sparepart.
- Accounting journal.
- Cash/bank module.
- Customer debt improvements.
- Supplier statement export.
- Aging report beyond simple due date display.
- Payment deletion or reversal.
- Staff access, unless explicitly required later.

## Business Rules

### Supplier

Supplier is scoped per toko.

Required field:

- name

Optional fields:

- phone
- address
- note

### Supplier Debt

A supplier debt represents one supplier nota or one manual payable record.

Required fields:

- toko
- supplier
- total amount

Optional fields:

- invoice number
- description
- due date
- initial paid amount

### Status

Status is derived from amounts:

```txt
paidAmount <= 0                  = unpaid
paidAmount > 0 and < totalAmount = partial
paidAmount >= totalAmount        = paid
```

Do not allow negative totals or payments.

Do not allow payment amount that makes `paidAmount` exceed `totalAmount`.

### Delete Rule

For V1, debt can be deleted only when it has no payment history.

This avoids hidden accounting inconsistencies while keeping implementation simple.

## Access

V1 should be admin-only.

Use existing request scope and role checks.

Recommended feature dependency:

```txt
inventory.management
```

Reason: the feature is attached to supplier/sparepart purchasing and will live under Inventory navigation first.

Do not create a new feature gate in V1 unless product wants this controlled independently from inventory.

## Minimal File Touch Strategy

Prefer new files:

- `actions/supplier-debts.ts`
- `app/(dashboard)/[tokoid]/admin/supplier-debts/page.tsx`
- `components/dashboard/supplier-debts/*`

Expected existing files to touch:

- `prisma/schema.prisma`
- `components/dashboard/nav/nav-config.ts`

Optional existing file:

- `actions/index.ts`, only if this repo requires action barrel exports for the new action file.

Avoid touching:

- service invoice code
- restock dialog
- inventory action behavior
- customer payment dialog
- feature registry
