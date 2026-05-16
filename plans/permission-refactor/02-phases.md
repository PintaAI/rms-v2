# Phases

This refactor should be delivered in small, reversible phases. Each phase should leave the app in a working state.

## Phase 0: Audit And Permission Taxonomy

Goal: understand current role checks and define the first permission registry.

Detailed plan: [Phase 0: Audit And Permission Taxonomy](./phase-0-audit-and-taxonomy.md).

Tasks:

- Inventory all `assertRole()`, `withScope(... role ...)`, `assertFeature()`, and `featureAccess[...]` usage.
- Group current access by module: service, inventory, retail, karyawan, analytics, WhatsApp, toko settings, feature settings.
- Draft `PermissionKey` names.
- Map each permission to a required feature, if any.
- Identify admin-only permissions that are not grantable in V1.

Exit criteria:

- Permission taxonomy reviewed.
- First migration module selected.
- Admin-only guardrails documented.

## Phase 1: Permission Foundation

Goal: add permission primitives without changing behavior.

Detailed plan: [Phase 1: Permission Foundation](./phase-1-permission-foundation.md).

Tasks:

- Add `lib/permissions.ts`.
- Add `PermissionKey`, `PERMISSION_REGISTRY`, role defaults, and required-feature mapping.
- Add pure helpers to compute effective permissions from role defaults and overrides.
- Add tests or manual verification notes for the computation rules when verification is available.

Exit criteria:

- Permission registry exists.
- Current app behavior remains unchanged.
- No production path depends on the new permission system yet.

## Phase 2: Persistence And Request Scope

Goal: persist per-user overrides and expose effective permissions in request scope.

Detailed plan: [Phase 2: Persistence And Request Scope](./phase-2-persistence-and-request-scope.md).

Tasks:

- Add `TokoUserPermission` model and migration.
- Add permission override read helpers.
- Extend `getRequestScope(tokoId)` with permission access.
- Add `can()`, `assertPermission()`, and lock-reason helpers.
- Keep existing feature and role checks active while permission access is introduced.

Exit criteria:

- Request scope exposes effective permissions.
- Permissions still cannot bypass plan, toko membership, or toko-disabled features.
- Existing pages/actions still behave as before.

## Phase 3: Route Foundation And Inventory Migration

Goal: introduce module-oriented route strategy early and migrate inventory as the first permission-based shared module.

Tasks:

- Add shared inventory route at `/{tokoid}/inventory`.
- Update `proxy.ts` strategy for permission-gated toko child routes.
- Add route-level `inventory.view` checks using `getRequestScope()` and permission lock handling.
- Replace inventory role checks used by the shared surface with permission checks.
- Keep feature gate checks for `inventory.management` underneath permissions.
- Update inventory UI action visibility from role/read-only checks to permission access.
- Ensure all inventory mutations exposed by the shared route enforce server permissions.
- Show spareparts and service pricelists from the shared route.
- Add `/{tokoid}/inventory` to inventory revalidation and fix known mutation calls that can pass `tokoId`.
- Keep legacy role routes and navigation working during transition.

Exit criteria:

- `/{tokoid}/inventory` can be reached by any role with the right effective permission.
- Users without `inventory.view` see a controlled lock state and are blocked server-side.
- Admin, staff, and technician can use the same inventory surface with different action permissions.
- Denying a permission blocks both UI action and server mutation.
- Granting a permission enables the expected action when module availability allows it.
- Legacy navigation can still point to working pages during transition.

## Phase 4: Permission Management UI

Goal: let admins customize staff and technician permissions.

Tasks:

- Add permission editor under Karyawan.
- Show role defaults, explicit allows, and explicit denies.
- Group permissions by module.
- Disable unavailable permissions when plan or toko feature blocks them.
- Add reset-to-default action.
- Keep permission management admin-only.

Exit criteria:

- Admin can grant and deny permissions for staff/technicians.
- Staff/technicians cannot manage permissions.
- UI clearly distinguishes default permissions from custom overrides.

## Phase 5: Service And Retail Migration

Goal: migrate high-traffic operational workflows.

Detailed plan: [Phase 5: Service And Retail Shared Route Migration](./phase-5-service-and-retail-migration.md).

Tasks:

- Migrate service list/detail/create/update/status/invoice permissions.
- Migrate technician assignment and task takeover permissions.
- Migrate retail sell and retail history permissions.
- Consolidate components where role-specific versions are only permission differences.

Exit criteria:

- Service and retail actions are permission-gated server-side.
- Shared components support different access levels cleanly.
- Legacy role assumptions are removed from migrated actions.

## Phase 6: Admin Modules Migration

Goal: migrate sensitive admin modules carefully.

Tasks:

- Migrate analytics to `analytics.view`.
- Migrate WhatsApp to `whatsapp.manage`.
- Migrate karyawan read/manage to `karyawan.view` and `karyawan.manage`.
- Keep permission management, feature settings, billing, and ownership controls admin-only unless explicitly redesigned.

Exit criteria:

- Operational admin-like access can be granted without granting ownership-level controls.
- Sensitive controls remain protected.

## Phase 7: Cleanup And Deprecation

Goal: remove old role-first access paths after migration is stable.

Detailed plan: [Phase 7: Cleanup And Deprecation](./phase-7-cleanup-and-deprecation.md).

Tasks:

- Expand `allowedRoles` on 5 conflicting features so feature gates no longer override permission grants.
- Backfill `assertPermission()` into 14 `withScope()` calls that currently rely only on role config.
- Refactor `global-search.ts` (the last fully un-refactored action) to use permission checks.
- Close revalidation gaps for shared analytics and karyawan routes.
- Migrate admin/staff/teknisi navigation to shared routes.
- Remove hybrid role-gating branches from service-mutations and inventory actions.
- Replace 12 legacy route pages with server redirects to shared routes.
- Remove redundant `role` config from `withScope()` calls that now have `assertPermission()`.

Exit criteria:

- New modules use permissions by default.
- Feature gates are only module availability checks.
- Role checks remain only where role identity is truly required.
- Zero `assertRole()` calls in toko-scoped module actions.
- Zero `scope.user.role ===` authorization branches in toko-scoped module actions.
- All shared routes are revalidated after mutations.
- Legacy pages with a shared equivalent are replaced by redirects.

## Suggested First Permission Slice

Start with a small set for inventory:

```txt
inventory.view
inventory.create
inventory.update
inventory.delete
inventory.restock
inventory.audit
```

Required features:

```txt
inventory.view -> inventory.management
inventory.create -> inventory.management
inventory.update -> inventory.management
inventory.delete -> inventory.management
inventory.restock -> inventory.management
inventory.audit -> inventory.audit
```

This slice is large enough to prove the architecture but small enough to review carefully.
