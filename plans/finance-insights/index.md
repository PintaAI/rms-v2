# Finance Insights Progress Index

Last updated: 2026-05-14

## Current Status

Finance Insights is planned as an owner-facing improvement for Admin Overview only.

The goal is to let admins quickly understand the most important toko financial signals from the first dashboard screen without replacing the existing detailed operational pages for service, retail, supplier debts, and supplier returns.

| Phase | Plan | Status | Progress |
| --- | --- | --- | --- |
| 0 | [Scope And Rules](./phase-0-scope-and-rules.md) | Planned | Defines the overview-only financial signals and what is intentionally excluded. |
| 1 | [Overview Data Model](./phase-1-overview-data-model.md) | Planned | Extends `getAdminOverview()` with compact finance summary data. |
| 2 | [Overview UI](./phase-2-overview-ui.md) | Planned | Expands the existing Admin Overview revenue section into `Ringkasan Keuangan`. |
| 3 | [Admin Overview Snapshot](./phase-3-admin-overview-snapshot.md) | Planned | Tracks refinements for the compact financial snapshot on the admin landing dashboard. |
| 4 | [UX Copy And Backlog](./phase-4-ux-copy-and-backlog.md) | Backlog | Refines labels, empty states, docs, and future accounting/reporting ideas. |

## Product Decision

Financial information should be visible in one primary place for V1:

- Admin Overview shows a small actionable snapshot for daily monitoring.
- Analytics is intentionally left unchanged in V1.

Detailed operations stay on existing pages:

- `/:tokoid/admin/supplier-debts`
- `/:tokoid/admin/inventory/supplier-returns`

Analytics can be revisited later if the owner needs historical finance trends.

## Next Phase

Start with [Phase 0: Scope And Rules](./phase-0-scope-and-rules.md), then implement the overview data shape in Phase 1.
