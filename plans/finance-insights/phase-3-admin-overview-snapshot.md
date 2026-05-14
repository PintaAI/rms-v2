# Finance Insights Phase 3: Admin Overview Snapshot

## Goal

Phase 3 adds a compact financial snapshot to the admin landing dashboard so admins see key money signals immediately after opening the app.

Primary files:

```txt
components/dashboard/admin/admin-overview.tsx
```

## Product Rule

Admin Overview should answer:

```txt
Apa yang perlu saya perhatikan sekarang?
```

It should not become a full finance dashboard.

## Data Shape

Extend `AdminOverviewData.stats` with a compact finance object:

```ts
finance: {
  monthlyIncome: number
  monthlyPendingRevenue: number
  supplierDebtRemaining: number
  supplierReturnPendingCount: number
  cashBersihMonth: number
}
```

If this duplicates existing revenue stats, keep the existing revenue fields and only add missing supplier/cash fields.

## Data Sources

Use current month only:

- service paid revenue from paid invoices.
- retail revenue from paid retail sales when `retail.sales` is enabled.
- supplier debt payments from current month when `inventory.management` is enabled.
- supplier return refunds from current month when `inventory.management` is enabled.
- supplier debt remaining as current snapshot.
- supplier return pending/sent count as current snapshot.

## UI Placement

Add a section after existing `Pendapatan` or merge into that section if it stays concise.

Recommended section title:

```txt
Ringkasan Keuangan
```

Cards:

- `Uang Masuk Bulan Ini`
- `Pending Bulan Ini`
- `Sisa Hutang Supplier`
- `Cash Bersih Bulan Ini`

For mobile, use `OverviewMobileGroupCard` like the existing sections.

## Navigation

Do not add an Analytics CTA in V1 because finance details are not being integrated into Analytics.

If a CTA is needed later, prefer linking to existing operational pages:

- `/:tokoid/admin/supplier-debts`
- `/:tokoid/admin/inventory/supplier-returns`

## Feature Gate

Render this section when `featureAccess.revenueAnalytics` is true.

Supplier-specific cards should degrade gracefully if inventory management is not enabled.

## Acceptance Criteria

- Overview remains scannable and does not become chart-heavy.
- Mobile overview still groups finance cards cleanly.
- Existing service, revenue, inventory, service table, and activity log sections keep working.
- No detailed supplier debt or supplier return table is added to overview.
