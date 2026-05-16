# Permission Refactor Plan

This folder tracks the planned refactor from role-first feature gates to permission-based access control.

The goal is to make permissions explicit, composable, and safe enough for staff and technicians to receive admin-like operational access when an admin grants it.

## Documents

- [Summary](./00-summary.md): simple explanation of the goal, changes, and refactor boundaries.
- [Foundation](./01-foundation.md): product model, access rules, guardrails, and architecture direction.
- [Phases](./02-phases.md): manageable rollout phases and migration checkpoints.
- [Phase 0: Audit And Permission Taxonomy](./phase-0-audit-and-taxonomy.md): detailed audit checklist and first permission taxonomy process.
- [Phase 1: Permission Foundation](./phase-1-permission-foundation.md): detailed plan for registry, role defaults, and pure helpers.
- [Phase 2: Persistence And Request Scope](./phase-2-persistence-and-request-scope.md): detailed plan for persisted overrides and request-scope permission access.
- [Phase 3: Route Foundation And Inventory Migration](./phase-3-route-foundation.md): detailed plan for the first shared route and inventory permission migration slice.
- [Phase 5: Service And Retail Shared Route Migration](./phase-5-service-and-retail-migration.md): detailed plan for permission-gated service/retail actions and shared routes.
- [Phase 7: Cleanup And Deprecation](./phase-7-cleanup-and-deprecation.md): detailed plan for removing legacy role-first paths, closing gaps, and making permissions the sole authority.

## Current Direction

- V1 permission model: role defaults plus per-user overrides.
- Permission management: admin-only in V1.
- Routes: migrate toward shared permission-based routes early, starting with inventory as the first end-to-end module slice.
- Feature gates remain, but their job narrows to product/module availability.

## Core Principle

```txt
Role = default permission template
Feature = toko/plan module availability
Permission = specific user authority
```

Effective access should be:

```txt
toko membership
+ plan allows module
+ toko feature/module enabled
+ user has permission
= access granted
```

## Open Decisions

- Exact permission key taxonomy.
- Exact timing for migrating sidebar/global search from legacy role routes to shared module routes.
- Whether admin users can ever be restricted by permissions.
- Whether permissions should support reusable presets after V1.
- How much route compatibility to keep during migration.
