# Finance Insights Phase 4: UX Copy And Backlog

## Goal

Phase 4 polishes finance wording and records follow-up ideas that should not block V1.

## UX Copy Rules

Use simple owner-facing terms:

- `Uang Masuk`
- `Belum Tertagih`
- `Sisa Hutang`
- `Cash Bersih`
- `Bayar Hutang Supplier`
- `Refund Supplier`

Avoid accounting-heavy terms in V1:

- `liabilitas`
- `accrual`
- `COGS`
- `neraca`
- `jurnal`

## Helper Text

Clarify that `Cash Bersih` is a practical cash signal, not net profit.

Suggested description:

```txt
Uang masuk + refund supplier - pembayaran hutang supplier. Belum termasuk biaya operasional lain.
```

## User Manual

After implementation, update the user manual if a finance or dashboard manual page exists.

If not, add a short section to the closest dashboard manual page explaining:

- where to find finance summary.
- what `Cash Bersih` means.
- where to manage supplier debts and supplier returns.

## Backlog

Future ideas:

- Dedicated `Keuangan` menu if finance grows beyond analytics.
- Analytics finance tab with historical trend filters.
- Supplier debt aging report.
- Supplier statement export.
- Full profit estimate with sparepart costs and retail item costs.
- Operating expense tracking.
- Cash/bank ledger.
- Payment method cashflow breakdown.
- Due-date reminders for supplier debt.
- Supplier return refund offset against supplier debt.
- Export finance report to PDF/Excel.

## Acceptance Criteria

- Labels are understandable for non-accounting users.
- Existing pages remain focused on their operational jobs.
- Backlog items are documented but not implemented in V1.
