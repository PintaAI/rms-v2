# Phase 3: Route Foundation And Inventory Migration

## Goal

Introduce the first shared, module-oriented route that is not owned by a role segment, and migrate inventory enough that the shared route can use permission-based UI and server-action enforcement safely.

At the end of this phase, the app should prove that a route like:

```txt
/{tokoid}/inventory
```

can be reached and used by any toko member whose effective permissions and feature availability allow it.

## Why This Phase Needs A Separate Plan

The current app shell is shared at:

```txt
app/(dashboard)/[tokoid]/layout.tsx
```

but module pages live under role layouts:

```txt
app/(dashboard)/[tokoid]/admin/*
app/(dashboard)/[tokoid]/staff/*
app/(dashboard)/[tokoid]/teknisi/*
```

Those role layouts redirect users whose role does not match the segment. Because of that, a permission-granted staff user cannot access an admin module route, and an admin cannot access staff/technician module routes. Phase 3 should create a sibling shared module route under `[tokoid]`, not try to make the existing role segments permission-based yet.

## Recommended First Route

Use inventory for the first shared route:

```txt
app/(dashboard)/[tokoid]/inventory/page.tsx
```

Reasons:

- Inventory is already the recommended first migration module.
- All three operational roles currently have some inventory access.
- It has a clear view permission: `inventory.view`.
- It is the first module where route access, UI action visibility, server-action authorization, and revalidation need to align around the permission registry.

## Scope

Add route foundation and permission-aligned inventory access:

- Add a shared module route for inventory.
- Add route-level permission gating with `getRequestScope()` and `assertPermission()` or page lock handling.
- Remove the legacy read-only split for shared inventory; the shared page should expose inventory capabilities according to effective permissions.
- Add or reuse inventory UI only after mutation actions are protected by matching permission checks.
- Keep existing role-specific inventory routes intact.
- Optionally redirect legacy inventory routes to the shared route only when doing so does not remove existing functionality.
- Update the inventory server actions needed by the shared page so exposed UI actions cannot bypass permission configuration.

## Non-Goals

- Do not remove role-specific routes yet.
- Do not rewrite the sidebar around permissions yet.
- Do not repoint global search or sidebar links to the shared route yet unless behavior is fully equivalent.
- Do not make admin-only inventory subpages permission-based yet, such as audit, supplier debts, reports, or restock history.
- Do not expose a mutation UI from the shared route unless the matching server action is protected by a permission check in the same implementation slice.
- Do not migrate admin-only inventory subpages into the shared route in this phase.

## Current Code Map And Constraints

The current inventory surface is spread across routes, UI components, server actions, navigation, global search, and cache revalidation. Phase 3 should account for these existing boundaries before making route changes.

### Existing Inventory Routes

Current role-owned inventory routes are:

```txt
app/(dashboard)/[tokoid]/admin/inventory/page.tsx
app/(dashboard)/[tokoid]/admin/inventory/audit-gudang/page.tsx
app/(dashboard)/[tokoid]/admin/inventory/reports/page.tsx
app/(dashboard)/[tokoid]/admin/inventory/restock-history/page.tsx
app/(dashboard)/[tokoid]/admin/inventory/retail/page.tsx
app/(dashboard)/[tokoid]/staff/inventory/page.tsx
app/(dashboard)/[tokoid]/teknisi/inventory/page.tsx
```

There is currently no shared route at:

```txt
app/(dashboard)/[tokoid]/inventory/page.tsx
```

### Existing Layout Authorization

The shared dashboard shell is already at:

```txt
app/(dashboard)/[tokoid]/layout.tsx
```

It calls `getRequestScope(tokoid)`, so a shared module route under `[tokoid]` inherits session, toko membership, plan, feature, permission-map, and subscription context from the shared shell.

The role layouts still enforce hard role ownership:

```txt
app/(dashboard)/[tokoid]/admin/layout.tsx
app/(dashboard)/[tokoid]/staff/layout.tsx
app/(dashboard)/[tokoid]/teknisi/layout.tsx
```

Because of that, Phase 3 should not try to make existing role segments permission-based. It should add the sibling shared module route first.

### Existing Inventory UI Differences

Admin inventory currently renders `InventoryTabs` from:

```txt
components/dashboard/inventory/inventory-tabs.tsx
```

When `readOnly={false}`, this component exposes mutation-oriented UI:

```txt
create sparepart
edit sparepart
delete sparepart
restock
import Excel
create/update/delete/import service pricelists
admin restock-history link
```

Staff inventory currently renders `StaffSparepartTable`, which also exposes write-oriented controls such as add, edit, and delete.

Technician inventory currently renders `TeknisiSparepartTable`, which is read-only and is the safer baseline for the first shared route, although it may need UX adjustments if reused for all roles.

The shared inventory route should not keep a legacy role-based read-only split. Instead, the shared UI should show or hide capabilities based on effective permission access. Any visible mutation affordance must be backed by a matching server-action permission check.

### Existing Inventory Server Actions

Inventory server actions live in:

```txt
actions/inventory.ts
actions/inventory-audit.ts
```

`actions/inventory.ts` still uses feature and role checks through helpers such as `getInventoryUser()`, `getCreateSparepartUser()`, `assertFeature()`, and `assertRole()`. It does not yet consistently enforce granular permission keys like `inventory.create`, `inventory.update`, or `inventory.restock`.

Current inventory actions include:

```txt
getSparepartCategories
getSpareparts
getCompatibleSpareparts
createSparepart
updateSparepart
importSpareparts
restockSparepart
restockSparepartsWithDebt
searchSpareparts
getStockInHistory
getRestockHistory
getInventoryReport
deleteSparepart
getServicePricelists
importServicePricelists
createServicePricelist
updateServicePricelist
deleteServicePricelist
```

Current inventory audit actions include:

```txt
getInventoryAuditOverview
startInventoryAudit
updateInventoryAuditItem
completeInventoryAudit
cancelInventoryAudit
```

Because the shared page should not rely on a read-only mode, Phase 3 must include permission enforcement for the inventory actions exposed by the shared page. Any action not migrated to a permission check must not be exposed by shared-route UI yet.

Minimum permission mapping for shared inventory V1:

```txt
getSpareparts -> inventory.view
getServicePricelists -> inventory.view
createSparepart -> inventory.create
updateSparepart -> inventory.update
deleteSparepart -> inventory.delete
restockSparepart -> inventory.restock
restockSparepartsWithDebt -> inventory.restock
importSpareparts -> inventory.import
createServicePricelist -> inventory.manageServicePricelists
updateServicePricelist -> inventory.manageServicePricelists
deleteServicePricelist -> inventory.manageServicePricelists
importServicePricelists -> inventory.manageServicePricelists
getRestockHistory -> inventory.viewHistory
getInventoryReport -> inventory.report
```

Retail item access should continue to require the retail feature where applicable.

### Existing Navigation And Search Links

Sidebar inventory links are currently role-specific in:

```txt
components/dashboard/nav/nav-config.ts
```

Global search also builds inventory links from the current role segment in:

```txt
components/dashboard/layout/global-search.tsx
```

Phase 3 should leave these links pointing at existing working pages. Direct access to `/{tokoid}/inventory` should work first; sidebar and global search migration can happen after behavior is verified.

### Existing Revalidation Constraint

Inventory revalidation is centralized in:

```txt
lib/revalidation.ts
```

Current `revalidateInventoryPaths(tokoId)` revalidates role routes such as:

```txt
/{tokoId}/admin/inventory
/{tokoId}/admin/inventory/audit-gudang
/{tokoId}/staff/inventory
/{tokoId}/teknisi/inventory
```

When the shared route is added, `revalidateInventoryPaths(tokoId)` should also revalidate:

```txt
/{tokoId}/inventory
```

However, several existing inventory mutations call `revalidateInventoryPaths()` without a `tokoId`, which currently revalidates older non-toko-scoped paths. Phase 3 should fix known inventory mutation calls where the `tokoId` is already known or can be read safely, so `/{tokoid}/inventory` is reliably revalidated after shared-page mutations.

## Route Strategy

Add shared routes as siblings of the role segments:

```txt
app/(dashboard)/[tokoid]/inventory/page.tsx
```

Avoid adding them under:

```txt
app/(dashboard)/[tokoid]/admin/inventory
app/(dashboard)/[tokoid]/staff/inventory
app/(dashboard)/[tokoid]/teknisi/inventory
```

because those paths are still protected by role-specific layouts.

## Proxy Strategy

`proxy.ts` currently protects:

```txt
/dashboard
/onboard
/superuser
/{tokoid}/admin
/{tokoid}/staff
/{tokoid}/teknisi
/{tokoid}
```

Before adding `/{tokoid}/inventory`, update the protected-route detection so shared module routes under a toko are also authenticated.

Suggested direction:

```txt
/{tokoid}/inventory
/{tokoid}/service
/{tokoid}/retail
```

should be protected by session in proxy, then authorized server-side by request scope and permission checks.

Do not put fine-grained permission logic in `proxy.ts`. It only has cookie/session-level context.

Recommended V1 proxy rule:

- Continue protecting existing role segments.
- Continue protecting `/{tokoid}` root routes.
- Protect generic toko child routes like `/{tokoid}/{segment}` by default.
- Avoid treating public routes, auth routes, scanner routes, user manual routes, Next internals, and static assets as shared toko modules.
- Keep fine-grained module permission checks out of proxy.

## Page Authorization

The shared inventory page should:

1. Load `getRequestScope(tokoid)`.
2. Require `inventory.view` using permission access.
3. Render a controlled lock state when `inventory.view` is unavailable.
4. Use permission access only for route/page authorization in this phase.

Important behavior:

- Toko membership is still established by `getRequestScope()`.
- Plan and disabled-feature availability still flow through `permissionAccess`.
- Existing role routes remain active while the shared route is introduced.

Recommended V1 rendering behavior:

- Show spareparts and service pricelists.
- Remove the shared-route dependency on legacy `readOnly` mode.
- Render action controls based on effective permission access.
- Do not render admin-only links such as audit, supplier debts, or admin-only reports unless those pages are also migrated and permission-gated.
- If reusing `InventoryTabs`, replace `readOnly` with permission-aware action visibility.
- If an action is not yet migrated to a permission-checked server action, hide that action in the shared route.

## Compatibility Links

Do not immediately repoint all navigation unless the shared page covers the same behavior as each legacy page.

Recommended V1 compatibility:

- Admin nav may continue to point to `/{tokoid}/admin/inventory` until the shared inventory route fully represents admin behavior.
- Staff nav may continue to point to `/{tokoid}/staff/inventory` until the shared page can safely express staff behavior.
- Technician nav may continue to point to `/{tokoid}/teknisi/inventory` until the shared page can safely express technician behavior.
- Add direct/shared route support first, then migrate nav item-by-item.

If a legacy route is redirected, use a simple server redirect to `/{tokoid}/inventory` and only do it for routes whose behavior is already fully represented by the shared page.

## First Implementation Slice

Keep the first slice intentionally small:

- Protect generic toko child paths in `proxy.ts` while preserving public/system exclusions.
- Add `app/(dashboard)/[tokoid]/inventory/page.tsx`.
- Gate it with `inventory.view`.
- Render a lock state when `inventory.view` is unavailable.
- Show spareparts and service pricelists.
- Remove the shared-route read-only split and drive visible actions from permissions.
- Migrate the inventory server actions exposed by the shared page to matching permission checks.
- Add `/{tokoid}/inventory` to inventory revalidation and fix known no-arg inventory revalidation calls where `tokoId` is available.
- Do not change existing role-specific inventory pages or nav yet.

This proves the routing and authorization model without forcing the full inventory migration prematurely.

Suggested implementation order:

1. Update `proxy.ts` to protect `/{tokoid}/inventory` as a shared toko module path.
2. Update `lib/revalidation.ts` so `revalidateInventoryPaths(tokoId)` includes `/${tokoId}/inventory`.
3. Fix known inventory mutation calls to pass `tokoId` to `revalidateInventoryPaths(tokoId)` when available.
4. Update inventory actions exposed on the shared page to enforce granular permissions.
5. Add the shared inventory page with `getRequestScope(tokoid)` and a controlled lock state for missing `inventory.view`.
6. Render spareparts and service pricelists with permission-aware action visibility.
7. Leave existing admin/staff/teknisi inventory pages, sidebar links, and global search links unchanged.

## Exit Criteria

Phase 3 is complete when:

- A shared inventory route exists outside role segments.
- The shared route is authenticated by proxy.
- The shared route checks `inventory.view` server-side.
- Users without `inventory.view` are blocked server-side.
- Permission denial cannot bypass toko membership, plan availability, or disabled toko features.
- Existing role-specific routes still work.
- Existing navigation still points to working pages during transition.
- The shared route exposes inventory actions only when the user has the matching effective permission.
- Every action exposed from the shared route is protected server-side by the matching permission.
- `revalidateInventoryPaths(tokoId)` includes the shared inventory route.
- Known inventory mutation calls pass `tokoId` into revalidation when available.

## Risks

- Redirecting legacy routes too early can remove role-specific behavior.
- Reusing admin inventory UI directly can expose write actions unless action visibility and server actions are permission-aligned first.
- Leaving shared module paths out of `proxy.ts` can produce inconsistent unauthenticated access behavior.
- Using permission checks in pages before action checks creates UI/server mismatch; because read-only mode is not desired, Phase 3 must avoid this mismatch for exposed actions.
- Existing mutation actions that call `revalidateInventoryPaths()` without `tokoId` will not reliably revalidate the new shared route until those calls are fixed.
- Repointing sidebar or global search too early can send users to a less capable shared page and remove role-specific behavior they currently depend on.
