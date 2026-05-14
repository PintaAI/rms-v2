# Finance Insights Phase 1: Overview Data Model

## Goal

Phase 1 extends the existing admin overview server action so the dashboard can show compact financial signals.

Primary file:

```txt
actions/overview.ts
```

## Data Shape

Extend `AdminOverviewStats.revenue` with overview-only fields:

```ts
revenue: {
  monthlyPaid: number
  monthlyPending: number
  dailyRevenue: number
  monthlyIncome: number
  supplierDebtRemaining: number
  supplierDebtPaymentsThisMonth: number
  supplierReturnRefundedThisMonth: number
  supplierReturnPendingCount: number
  supplierReturnPendingValue: number
  cashBersihMonth: number
  supplierSignalsEnabled: boolean
}
```

## Data Sources

Use existing overview data where possible:

- service paid revenue from paid invoices.
- service pending revenue from unpaid/DP invoices.
- daily service revenue from paid invoices today.

Add compact finance queries:

- retail paid revenue this month when `retail.sales` is enabled.
- active supplier debt remaining when `inventory.management` is enabled.
- supplier debt payments this month when `inventory.management` is enabled.
- supplier return refunds this month when `inventory.management` is enabled.
- pending/sent supplier return count and estimated purchase value when `inventory.management` is enabled.

## Cash Signal

Use a simple owner-facing calculation:

```txt
cashBersihMonth = monthlyIncome + supplierReturnRefundedThisMonth - supplierDebtPaymentsThisMonth
```

This is not net profit because it does not include operational expenses or full accounting cost rules.

## Acceptance Criteria

- `getAdminOverview()` returns the new fields when `analytics.revenue` is enabled.
- Supplier signals are zeroed and marked disabled when `inventory.management` is unavailable.
- Retail revenue contributes only when `retail.sales` is enabled.
- No analytics action is changed.
