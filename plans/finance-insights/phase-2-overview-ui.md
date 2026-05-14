# Finance Insights Phase 2: Overview UI

## Goal

Phase 2 expands the existing Admin Overview revenue section into a concise financial snapshot.

Primary file:

```txt
components/dashboard/admin/admin-overview.tsx
```

## UI Placement

Use the existing revenue section and rename it to:

```txt
Ringkasan Keuangan
```

Do not add a new analytics tab in V1.

## Cards

Show the most important values:

- `Uang Masuk Bulan Ini`
- `Pending Tagihan`
- `Sisa Hutang Supplier`
- `Cash Bersih Bulan Ini`
- `Pendapatan Hari Ini`
- `Retur Supplier Pending`
- `Low Stock Items`

Supplier cards should only appear when supplier signals are enabled.

## Mobile

Use the existing `OverviewMobileGroupCard` pattern.

Keep labels short because mobile values are displayed in a dense grouped card.

## Acceptance Criteria

- Existing `Pendapatan Bulan Ini` and `Pending Bulan Ini` are preserved as finance equivalents.
- Supplier debt and supplier return signals are visible without opening separate pages.
- Overview stays card-based and does not include charts or tables.
- Analytics remains unchanged.
