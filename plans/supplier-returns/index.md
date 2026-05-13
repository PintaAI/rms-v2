# Supplier Returns Progress Index

Last updated: 2026-05-13

## Current Status

Supplier Returns is planned as a follow-up feature for warranty claims that use `Ganti sparepart`.

The first implementation should keep customer warranty claims, replacement sparepart stock movement, and supplier return handling separate but linked.

| Phase | Plan | Status | Progress |
| --- | --- | --- | --- |
| 0 | [Scope And Rules](./phase-0-scope-and-rules.md) | Planned | Defines the return-to-supplier workflow and what is intentionally excluded from V1. |
| 1 | [Data Model](./phase-1-data-model.md) | Planned | Adds supplier return status, supplier return records, and relations to warranty claims/spareparts. |
| 2 | [Warranty Claim Integration](./phase-2-warranty-claim-integration.md) | Planned | Adds optional supplier-return capture when resolving warranty claims with `Ganti sparepart`. |
| 3 | [Server Actions](./phase-3-server-actions.md) | Planned | Adds create/list/status transition actions with inventory-safe stock movement when supplier replaces goods. |
| 4 | [Admin UI](./phase-4-admin-ui.md) | Planned | Adds inventory navigation, supplier return list, status actions, and claim-linked return details. |
| 5 | [Reports And Backlog](./phase-5-reports-and-backlog.md) | Backlog | Adds summaries, supplier performance signals, and future accounting/reporting ideas. |

## Product Decision

V1 should support supplier returns for damaged/old parts from warranty claims, but should not automatically put damaged parts back into sellable inventory.

Inventory rule:

- Replacement part used for customer claim decrements stock immediately.
- Old/damaged part is recorded as supplier return only.
- Stock increases only if supplier sends a replacement and the return is marked `replaced`.
- Supplier cash refund records money received from supplier but does not change stock.

## Next Phase

Start with [Phase 0: Scope And Rules](./phase-0-scope-and-rules.md), then implement the data model in Phase 1.
