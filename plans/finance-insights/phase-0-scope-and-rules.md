# Finance Insights Phase 0: Scope And Rules

## Goal

Phase 0 defines the smallest useful financial visibility improvement for admins.

User-facing labels:

```txt
Keuangan
Ringkasan Keuangan
```

## Product Decision

Use an overview-only UX for V1:

- `Admin Overview` should show only the most important current financial signals.
- `Analytics` should stay unchanged until finance trend analysis is explicitly needed.

This keeps the dashboard useful at a glance without adding another analytics surface.

## Included In V1

- Add a compact `Ringkasan Keuangan` section in admin overview.
- Combine service paid revenue and retail paid revenue as money-in signals.
- Show service pending revenue as money not yet collected.
- Show supplier debt remaining as outstanding payable.
- Show supplier debt payments in the current overview period.
- Show supplier return refund amount in the current overview period.
- Show pending supplier return count when inventory management is enabled.
- Respect existing feature gates.

## Not Included In V1

- Full accounting profit/loss.
- Cash/bank ledger.
- Analytics finance tab.
- Finance trend charts.
- Analytics period filters for finance.
- Tax reporting.
- Supplier debt aging buckets beyond simple outstanding/overdue signals.
- Automatic supplier debt creation from restock.
- Automatic supplier debt offset from supplier return refund.
- Editable finance settings or custom account categories.
- Export to PDF/Excel.

## Business Rules

### Revenue

- Service revenue counts only paid invoices.
- Retail revenue counts only paid retail sales.
- Pending service invoice amount is not money-in.
- Do not automatically subtract supplier returns from revenue.

### Supplier Debt

- Supplier debt remaining is a current snapshot.
- Supplier debt payments are period-based using `SupplierDebtPayment.paymentDate`.
- Supplier debts are still managed from the existing supplier debt page.

### Supplier Return

- Refunded supplier returns are period-based using `SupplierReturn.resolvedAt`.
- Pending/sent supplier return count is a current operational signal.
- Supplier return replacement affects inventory, not finance cash flow.

### Cash Flow Signal

Use a simple owner-friendly signal:

```txt
cashBersih = servicePaidRevenue + retailRevenue + supplierReturnRefunded - supplierDebtPayments
```

This is a cash movement summary, not accounting net profit.

## Access

Finance insights should require:

```txt
analytics.revenue
```

Supplier debt and supplier return parts should only be included when the toko has:

```txt
inventory.management
```

If inventory access is unavailable, show service/retail signals and omit supplier-related signals.

## File Touch Strategy

Expected existing files to touch:

- `actions/overview.ts`
- `components/dashboard/admin/admin-overview.tsx`

Avoid touching:

- supplier debt mutation behavior
- supplier return mutation behavior
- service invoice payment behavior
- retail sale payment behavior
- Prisma schema, unless a later phase discovers missing fields
