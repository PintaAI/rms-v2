# Retail Lite Phase 5: Retail Reports And Analytics

## Goal

Phase 5 adds owner-facing insight for retail performance and combines retail revenue with the existing service analytics picture.

By this phase, the app should already have:

- `sparepart | retail_item` inventory kind from Phase 1.
- `StockMovement` from Phase 2.
- `RetailSale` and `RetailSaleItem` from Phase 3.
- Retail history/receipt and optional void from Phase 4.

Phase 5 should answer:

```txt
How much money did the toko make from retail?
Which items sell the most?
What is the estimated gross margin?
How does retail revenue compare with service revenue?
```

## Product Scope

Included in Phase 5:

- Retail revenue summary.
- Retail transaction count.
- Average retail transaction value.
- Top-selling retail items.
- Top revenue items.
- Gross margin estimate using cost snapshots.
- Combined service + retail revenue overview.
- Retail trend chart by day/month.
- Basic filters by date range.

Not included in Phase 5:

- Full accounting profit/loss.
- Tax reports.
- Supplier payable reports.
- Cash drawer close/open shift.
- Per-shift cashier settlement.
- Partial refund reporting.
- Marketplace/channel analytics.

## Feature Gate

Use the existing analytics gate:

```ts
analytics.revenue
```

Do not add `retail.reports` yet.

Reason:

- Current app already gates revenue analytics under `analytics.revenue`.
- Retail analytics is an extension of revenue analytics.
- Separate retail reporting gate can be added later only if pricing needs it.

Retail reports should also require access to retail/inventory data:

```ts
assertRole(scope, ["admin"])
assertFeature(scope, "analytics.revenue")
```

Optional stricter enforcement:

```ts
assertFeature(scope, "retail.sales")
```

Recommendation:

- For retail-specific analytics pages, require `retail.sales` too.
- For combined analytics cards in the existing analytics dashboard, show retail sections only if `retail.sales` is enabled.

## Routes

There are two possible UI approaches.

### Recommended V1: Extend Existing Analytics

Use the existing admin analytics route:

```txt
/:tokoid/admin/analytics
```

Add retail sections/cards to the current analytics dashboard.

This keeps owner analytics centralized.

### Optional Later: Dedicated Retail Reports

Add later only if analytics grows too large:

```txt
/:tokoid/admin/retail/reports
```

For Phase 5, prefer extending existing analytics.

## Data Sources

### RetailSale

Use for transaction-level metrics:

- Revenue.
- Transaction count.
- Payment method breakdown.
- Paid date trends.
- Cashier-level summary.

Only count sales with:

```ts
status = "paid"
```

Exclude:

```ts
status = "void"
```

from revenue totals.

### RetailSaleItem

Use for item-level metrics:

- Top-selling items by qty.
- Top revenue items.
- Gross margin estimate.
- Kind breakdown: sparepart vs retail_item.

Important snapshots:

```ts
unitPrice
unitCostSnapshot
lineTotal
qty
kind
```

Gross margin formula:

```ts
grossMargin = sum(lineTotal - (unitCostSnapshot ?? 0) * qty)
```

If cost snapshot is null, treat cost as 0 for calculation but expose a warning/label later if needed.

### Invoice / InvoiceItem

Use existing service invoice data for service revenue.

Current service revenue source:

```ts
Invoice.paymentStatus = paid
Invoice.grandTotal
Invoice.paidAt
```

Combined revenue:

```ts
combinedRevenue = paidServiceRevenue + paidRetailRevenue
```

## Server Action Design

Primary file options:

```txt
actions/analytics.ts
```

or a new file:

```txt
actions/retail-analytics.ts
```

Recommended pragmatic approach:

- If extending the existing analytics page, add retail fields to `actions/analytics.ts`.
- If the file becomes too large, extract helpers into `actions/retail-analytics.ts` and import them.

## Data Types

Extend existing `AdminAnalyticsData` or add a nested retail field.

Recommended shape:

```ts
export interface AdminAnalyticsRetailSummary {
  revenue: number
  transactions: number
  averageTransaction: number
  grossMargin: number
  itemsSold: number
  sparepartRevenue: number
  retailItemRevenue: number
}
```

Top item:

```ts
export interface AdminAnalyticsRetailTopItem {
  key: string
  name: string
  kind: "sparepart" | "retail_item"
  qty: number
  revenue: number
  grossMargin: number
}
```

Payment method point:

```ts
export interface AdminAnalyticsRetailPaymentPoint {
  method: "cash" | "transfer" | "qris" | "debit"
  transactions: number
  revenue: number
}
```

Trend point can extend the existing trend shape:

```ts
export interface AdminAnalyticsTrendPoint {
  key: string
  label: string
  revenue: number
  pending: number
  services: number
  completed: number
  retailRevenue?: number
  retailTransactions?: number
}
```

Recommended nested addition:

```ts
retail: {
  enabled: boolean
  summary: AdminAnalyticsRetailSummary
  topItems: AdminAnalyticsRetailTopItem[]
  paymentMethods: AdminAnalyticsRetailPaymentPoint[]
}
```

## Query Strategy

Retail sales query filter:

```ts
where: {
  tokoId,
  status: "paid",
  paidAt: { gte: periodStart, lt: periodEnd },
}
```

Include items:

```ts
items: {
  select: {
    sparepartId: true,
    name: true,
    kind: true,
    qty: true,
    unitPrice: true,
    unitCostSnapshot: true,
    lineTotal: true,
  }
}
```

Compute in TypeScript for V1 because data volume is likely moderate. If retail volume grows, optimize with SQL aggregations later.

## Metrics

### Retail Revenue

```ts
retailRevenue = sum(sale.grandTotal)
```

### Transactions

```ts
transactions = sales.length
```

### Average Transaction

```ts
averageTransaction = transactions > 0
  ? Math.round(retailRevenue / transactions)
  : 0
```

### Items Sold

```ts
itemsSold = sum(item.qty)
```

### Gross Margin

```ts
grossMargin = sum(item.lineTotal - (item.unitCostSnapshot ?? 0) * item.qty)
```

### Kind Revenue

```ts
sparepartRevenue = sum(lineTotal where kind = sparepart)
retailItemRevenue = sum(lineTotal where kind = retail_item)
```

### Top Selling Items

Group by:

```ts
sparepartId ?? name
```

Keep item name snapshot for historical accuracy.

Sort options:

- Top by quantity sold.
- Top by revenue.

Recommended V1: show top by revenue, with qty included.

## Combined Service + Retail Revenue

Existing analytics already computes service invoice revenue.

Add:

```ts
combinedPaidRevenue = paidServiceRevenue + retailRevenue
```

UI can show:

```txt
Total Revenue
- Service Revenue
- Retail Revenue
```

This avoids hiding the distinction between repair income and product sales.

## UI Changes

Primary file:

```txt
components/dashboard/admin/analytics-dashboard.tsx
```

Recommended new sections:

### Revenue Split Cards

Cards:

```txt
Total Revenue
Service Revenue
Retail Revenue
Retail Margin
```

### Retail Summary Cards

Cards:

```txt
Retail Transactions
Average Retail Sale
Items Sold
Gross Margin
```

### Trend Chart

Extend existing revenue trend chart to show retail revenue as separate series if the chart supports multiple series.

If multi-series chart is too much for V1, add a small retail trend table/list.

### Top Retail Items

Table:

```txt
Item
Jenis
Qty
Revenue
Margin
```

### Payment Method Breakdown

Simple list/cards:

```txt
Cash
QRIS
Transfer
Debit
```

Each shows transaction count and revenue.

## Empty And Disabled States

If `retail.sales` is disabled:

```txt
Retail analytics is hidden.
```

If `retail.sales` is enabled but no sales exist:

```txt
Belum ada transaksi retail pada periode ini.
```

If `analytics.revenue` is unavailable by plan, existing analytics lock behavior applies.

## Voided Sales

If Phase 4 implemented void:

- Exclude `void` from revenue, transaction count, margin, and top item metrics.
- Optionally show separate audit count:

```txt
Voided Transactions: N
```

Do not subtract voided sale as negative revenue in V1. Simpler and clearer:

```txt
paid = counted
void = excluded
```

## Revalidation

Retail checkout should revalidate analytics if analytics page uses cached data:

```ts
revalidatePath(`/${tokoId}/admin/analytics`)
```

Retail void should also revalidate:

```ts
revalidatePath(`/${tokoId}/admin/analytics`)
```

Consider adding this in the retail action revalidation helpers from Phase 3/4.

## Acceptance Criteria

Phase 5 is complete when:

- Analytics page includes retail metrics for toko with `retail.sales` enabled.
- Retail metrics require `analytics.revenue`.
- Retail revenue excludes voided sales.
- Retail revenue uses `RetailSale.grandTotal`.
- Top items use `RetailSaleItem` snapshots.
- Gross margin uses `unitCostSnapshot`.
- Combined revenue shows service and retail separately.
- Date filters apply to retail metrics.
- Existing service analytics still works.
- Empty retail state is clear.

## Manual QA Checklist

### Data Setup

- Create retail sales with different items and payment methods.
- Create at least one service invoice paid in the same period.
- If void exists, void one retail sale.

### Summary

- Verify retail revenue equals sum of paid retail sale `grandTotal`.
- Verify voided sale is excluded.
- Verify transaction count is correct.
- Verify average transaction is correct.
- Verify items sold is correct.

### Margin

- Create item with purchase price and sell it.
- Verify gross margin = selling total - cost total.
- Create item without purchase price and verify calculation does not crash.

### Top Items

- Sell the same item multiple times.
- Verify top item grouping and qty.
- Verify revenue uses snapshot line totals.

### Combined Revenue

- Verify service revenue is unchanged from before.
- Verify total revenue = service revenue + retail revenue.

### Filters

- Change date range.
- Verify retail metrics update with the period.

## Risks

### Risk: Margin is treated as accounting profit

Mitigation:

- Label it as gross margin estimate.
- Do not include operational costs, discounts beyond sale-level discount allocation, tax, or supplier payments.

### Risk: Discount allocation affects item margin

Current `RetailSaleItem.lineTotal` likely stores pre-sale-discount line total. If sale-level discount is not allocated per item, item-level margin may be overstated.

Mitigation for V1:

- Retail total margin can subtract discount at sale level.
- Item-level margin can be labeled before sale-level discount or adjusted later.

Recommended V1 formula for total retail gross margin:

```ts
sum(item.lineTotal - cost) - sum(sale.discountAmount)
```

Recommended V1 formula for top item margin:

```ts
sum(item.lineTotal - cost)
```

Add a note if necessary:

```txt
Margin item belum membagi diskon transaksi per item.
```

### Risk: Analytics query gets heavy

Mitigation:

- Use date range filters.
- Paginate only history, not analytics.
- Move large aggregations to SQL later if needed.

## Implementation Order

Recommended sequence:

1. Decide whether to extend `actions/analytics.ts` directly or extract retail analytics helper.
2. Extend analytics data types with `retail` nested data.
3. Query paid retail sales for the selected period.
4. Compute retail summary metrics.
5. Compute top retail items.
6. Compute payment method breakdown.
7. Add retail revenue to trend buckets.
8. Add combined service + retail revenue totals.
9. Update analytics dashboard UI.
10. Add empty/disabled states.
11. Ensure retail checkout/void revalidates analytics path.
12. Run manual QA checklist.

## Notes For Later

Future enhancements can add:

- Dedicated retail reports route.
- Cashier performance.
- Daily closing/shift report.
- Return/refund analytics.
- Purchase/supplier reports.
- Inventory turnover.
- Sales velocity low-stock forecasting.
