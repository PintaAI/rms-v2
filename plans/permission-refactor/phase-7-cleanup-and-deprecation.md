# Phase 7: Cleanup And Deprecation

## Goal

Remove old role-first access paths and close the gap between where the permission refactor landed in Phase 5/6 and the intended end state. At the end of this phase, permissions should be the primary authority for every migrated module, feature gates should only gate module availability (plan + toko toggle), role checks should only exist where role identity is truly required (ownership, billing, permission management), and duplicate pages should be deprecated.

## Why This Phase Exists

Phases 1-6 added permission primitives, persistence, shared routes, and permission enforcement across every major module. However the migration was incremental and left several intentional incompatibilities:

- **Hybrid authorization**: many `withScope()` calls still have a `role` config alongside `assertPermission()` — both gates must pass, which means permissions are not yet the sole authority.
- **Feature gate role conflicts**: 5 features have `allowedRoles` arrays narrower than the permission system, silently blocking permission grants.
- **Un-refactored actions**: `global-search.ts`, `overview.ts`, `warranty-claims.ts`, `supplier-returns.ts`, `toko.ts`, `feature-settings.ts`, `inventory-audit.ts`, and `supplier-debts.ts` still rely entirely on role checks without `assertPermission()`.
- **Navigation is still role-route**: admin and teknisi navs point 100% to legacy role routes, not shared routes.
- **Revalidation gaps**: `/${tokoid}/analytics` is not revalidated by any function; `/${tokoid}/karyawan` is only revalidated for the legacy admin path.
- **22 legacy route pages** still active alongside 7 shared route pages, creating duplication.

Phase 7 closes every remaining gap, removes the duplicate code paths, and makes the permission system the sole authority for every operational module.

## Scope

Every file still using role-based authorization where permission-based authorization should now be the authority.

### Files in scope

```
lib/features.ts
lib/revalidation.ts
lib/auth/request-scope.ts
components/dashboard/nav/nav-config.ts
components/dashboard/nav/admin-nav.tsx
components/dashboard/nav/staff-nav.tsx
components/dashboard/nav/teknisi-nav.tsx
components/dashboard/layout/global-search.tsx

actions/global-search.ts
actions/overview.ts
actions/warranty-claims.ts
actions/supplier-returns.ts
actions/supplier-debts.ts
actions/inventory-audit.ts
actions/toko.ts
actions/feature-settings.ts
actions/service-mutations.ts
actions/inventory.ts

app/(dashboard)/[tokoid]/admin/inventory/page.tsx
app/(dashboard)/[tokoid]/admin/service/page.tsx
app/(dashboard)/[tokoid]/admin/retail/page.tsx
app/(dashboard)/[tokoid]/admin/retail/history/page.tsx
app/(dashboard)/[tokoid]/admin/analytics/page.tsx
app/(dashboard)/[tokoid]/admin/karyawan/page.tsx
app/(dashboard)/[tokoid]/staff/inventory/page.tsx
app/(dashboard)/[tokoid]/staff/service/page.tsx
app/(dashboard)/[tokoid]/staff/retail/page.tsx
app/(dashboard)/[tokoid]/staff/retail/history/page.tsx
app/(dashboard)/[tokoid]/teknisi/inventory/page.tsx
app/(dashboard)/[tokoid]/teknisi/task/page.tsx
```

### Files explicitly outside scope

- Superuser/platform actions (`actions/superuser.ts`): keep current role model.
- Affiliate program actions (`actions/affiliate.ts`): keep current role model.
- Billing/subscription actions (`actions/billing.ts`): keep current role model. Ownership-level.
- Device management actions (`actions/device.ts`): keep current role model.
- Admin-only inventory subpages (audit-gudang, reports, restock-history, retail, supplier-returns): keep on legacy admin routes until those submodules are individually permission-gated.
- Supplier debts pages: keep on legacy admin routes.
- Toko settings pages: keep on legacy admin routes.
- Role overview pages (`admin/page.tsx`, `staff/page.tsx`, `teknisi/page.tsx`): keep as role-identity landing pages.
- Layout role redirects (`admin/layout.tsx`, `staff/layout.tsx`, `teknisi/layout.tsx`): keep as-is — they enforce role identity, which the doc explicitly keeps.

## Non-Goals

- Do not create new shared routes for admin-only submodules (audit, reports, supplier management, toko settings).
- Do not remove the `role` concept — it remains as identity and default permission template.
- Do not remove layout role redirects.
- Do not add new permission keys beyond the existing `PERMISSION_REGISTRY`.
- Do not change the permission management UI or model.
- Do not change `proxy.ts` route protection strategy.

---

## Pre-Cleanup Audit (Baseline)

These are the counts that Phase 7 must drive down.

| Metric | Current Count | Target |
|---|---|---|
| Features with `allowedRoles` narrower than all roles | 5 | 0 |
| `withScope()` calls with `role` config but no `assertPermission()` inside | 14 | 0 |
| Direct `assertRole()` calls in actions | 2 | 0 |
| `scope.user.role ===` auth gates in actions | 4 | 0 |
| Un-refactored action files (no `assertPermission()` anywhere) | 7 | 0 |
| Admin nav items pointing to legacy role routes | 14 | ≤8 (admin-only subpages stay) |
| Staff nav items pointing to legacy role routes | 8 | ≤2 (overview stays) |
| Teknisi nav items pointing to legacy role routes | 8 | ≤2 (overview stays) |
| Shared routes not covered by revalidation | 2 | 0 |
| Active legacy route pages with a shared equivalent | 12 | 0 |

---

## Block 1: Feature Gate Role Decoupling

### Current state

`getFeatureLockReason()` in `lib/features.ts:198-215` checks `allowedRoles` on every feature. This is a user-authority check inside what should be a module-availability check. The doc's end state is:

```txt
feature gate = plan + toko toggle
permission = user authority
```

### What to change

Two options, pick one before executing:

**Option A — expand `allowedRoles` to all three roles (safer, minimal change):**

| Feature | Current `allowedRoles` | New `allowedRoles` |
|---|---|---|
| `service.technicianAssignment` | `["admin", "staff"]` | `["admin", "staff", "technician"]` |
| `inventory.staffCreateSparepart` | `["admin", "staff"]` | `["admin", "staff", "technician"]` |
| `retail.sales` | `["admin", "staff"]` | `["admin", "staff", "technician"]` |
| `staff.workflow` | `["admin", "staff"]` | `["admin", "staff", "technician"]` |
| `inventory.audit` | `["admin"]` | `["admin", "staff", "technician"]` |

Risk: zero. The permission system still gates every action individually. A technician must still have `inventory.audit` permission granted explicitly to use it. The feature gate only controls module availability (plan + toko toggle), which is its intended role.

**Option B — remove `allowedRoles` from `getFeatureLockReason()` entirely (cleaner, one-time switch):**

Remove lines 202-204 from `getFeatureLockReason()`:

```ts
// REMOVE:
if (!(feature.allowedRoles as readonly UserRole[]).includes(input.role)) {
  return "role_denied";
}
```

Risk: some pages and layout guards check `access.reason === "role_denied"` to redirect. Those pages would lose their role-guard redirect. Each page that checks `role_denied` must be audited:

```
app/(dashboard)/[tokoid]/admin/analytics/page.tsx:21
app/(dashboard)/[tokoid]/admin/karyawan/page.tsx:24
app/(dashboard)/[tokoid]/admin/inventory/page.tsx:24
app/(dashboard)/[tokoid]/admin/inventory/reports/page.tsx:34
app/(dashboard)/[tokoid]/admin/inventory/supplier-returns/page.tsx:43
app/(dashboard)/[tokoid]/admin/inventory/restock-history/page.tsx:40
app/(dashboard)/[tokoid]/admin/inventory/retail/page.tsx:24
app/(dashboard)/[tokoid]/admin/inventory/audit-gudang/page.tsx:28
app/(dashboard)/[tokoid]/admin/retail/page.tsx:21
app/(dashboard)/[tokoid]/admin/retail/history/page.tsx:39
app/(dashboard)/[tokoid]/admin/supplier-debts/page.tsx:27
app/(dashboard)/[tokoid]/staff/page.tsx:19
app/(dashboard)/[tokoid]/staff/retail/page.tsx:22
app/(dashboard)/[tokoid]/staff/retail/history/page.tsx:40
lib/auth/enforcement.ts:40
components/dashboard/feature-locked.tsx:15,62
```

Recommendation for Phase 7: **Option A** — expand the arrays. Option B is a Phase 7+ cleanup that requires more page-level refactoring and is easier to do after shared routes have fully replaced those legacy pages.

### Exit criteria

- All 13 features in `FEATURE_REGISTRY` have `allowedRoles` that include all three operational roles: `["admin", "staff", "technician"]`.
- `inventory.audit` feature gate no longer blocks staff or technician before the permission check runs.
- No runtime behavior changes: a staff user without `inventory.audit` permission is still blocked by `assertPermission()`, not by the feature gate's removed role check.

---

## Block 2: Backfill Missing `assertPermission()` In Actions

### Current state

14 `withScope()` calls rely entirely on the `role` config in the wrapper for authorization. The handler body has no `assertPermission()` call. These actions would pass if the `role` gate were removed without adding a permission gate.

Additionally, 2 files have direct `assertRole()` calls inline:
- `actions/supplier-debts.ts:88` — `assertRole(scope, ["admin"])`
- `actions/inventory-audit.ts:90` — `if (requireWriteAccess) assertRole(scope, ["admin"])`

### What to change

#### actions/overview.ts

| Line | Current `role` | Add `assertPermission()` |
|---|---|---|
| 259 | `["admin"]` | `assertPermission(scope, "dashboard.view")` |
| 377 | `["admin", "staff"]` | `assertPermission(scope, "dashboard.view")` |

#### actions/warranty-claims.ts

| Line | Current `role` | Add `assertPermission()` |
|---|---|---|
| 58 | `["admin", "staff"]` | `assertPermission(scope, "warranty.create")` |
| 130 | `["admin", "staff"]` | `assertPermission(scope, "warranty.resolve")` |

#### actions/supplier-returns.ts

| Line | Current config | Add `assertPermission()` |
|---|---|---|
| 136 | `role: ["admin"]`, `feature: "inventory.management"` | `assertPermission(scope, "inventory.view")` |
| 282 | `role: ["admin"]`, `feature: "inventory.management"` | `assertPermission(scope, "inventory.create")` |
| 331 | `role: ["admin"]`, `feature: "inventory.management"` | `assertPermission(scope, "inventory.update")` |
| 366 | `role: ["admin"]`, `feature: "inventory.management"` | `assertPermission(scope, "inventory.delete")` |
| 431 | `role: ["admin"]`, `feature: "inventory.management"` | `assertPermission(scope, "inventory.update")` |
| 473 | `role: ["admin"]`, `feature: "inventory.management"` | `assertPermission(scope, "inventory.update")` |

#### actions/supplier-debts.ts

| Line | Current check | Replace with |
|---|---|---|
| 88 | `assertRole(scope, ["admin"])` | `assertPermission(scope, "supplier_debts.view")` |

All other supplier-debts actions (create, update, delete, pay) also need matching `assertPermission()` for their respective keys.

#### actions/inventory-audit.ts

| Line | Current check | Replace with |
|---|---|---|
| 90 | `assertRole(scope, ["admin"])` | `assertPermission(scope, "inventory.audit")` |

#### actions/toko.ts

| Line | Current `role` | Add `assertPermission()` |
|---|---|---|
| 297 | `["admin"]` | `assertPermission(scope, "toko.viewSettings")` |
| 368 | `["admin"]` | `assertPermission(scope, "toko.manageOperational")` |

#### actions/feature-settings.ts

| Line | Current `role` | Add `assertPermission()` |
|---|---|---|
| 129 | `["admin"]` | `assertPermission(scope, "features.view")` |
| 152 | `["admin"]` | `assertPermission(scope, "features.manage")` |

#### actions/service-mutations.ts

| Line | Action | Current `role` | Add `assertPermission()` |
|---|---|---|---|
| 782 | `deleteServiceItem` | `["admin", "staff", "technician"]` | `assertPermission(scope, "service.manageItems")` + `assertPermission(scope, "service.manageInvoice")` |

### Exit criteria

- Every `withScope()` call that targets a toko-scoped module permission has at least one `assertPermission()` inside its handler body.
- Zero `assertRole()` calls remain for toko-scoped module access gates.
- The `role` config on `withScope()` calls may remain temporarily as a secondary gate — it is removed in Block 6.
- No runtime behavior changes: a user who was previously blocked by the role gate but now passes the permission gate is still blocked by the role gate (until Block 6 removes it).

---

## Block 3: Refactor `global-search.ts`

### Current state

`actions/global-search.ts` has zero `assertPermission()` calls. All access decisions are based on `scope.user.role ===` branches and `scope.featureAccess` lookups. The file is ~250 lines with 14 role-based branching points.

### What to change

Replace all role-based gates with permission checks:

```ts
function canSearchServices(scope: RequestScope): boolean {
  return scope.permissionAccess["service.view"]?.allowed === true;
}

function canSearchInventory(scope: RequestScope): boolean {
  return scope.permissionAccess["inventory.view"]?.allowed === true;
}
```

Permission-aware search scope gating:

| Search Scope | Current Gate | New Gate |
|---|---|---|
| Service search | `role === "admin"` → capability, `role === "staff"` → feature, `role === "technician"` → feature | `can(scope, "service.view")` |
| Inventory search (sparepart + retail_item) | `role === "admin"` → true, `role === "staff"` → feature, `role === "technician"` → feature | `can(scope, "inventory.view")` |
| Karyawan search | `role === "admin"` + feature | `can(scope, "karyawan.view")` |
| Jasa search | `role === "admin"` + feature | `can(scope, "inventory.manageServicePricelists")` |

Result URL construction (`resultHref()`): where a shared route exists for a module, use the shared route path instead of a role-segment path:

| Module | Legacy href | Shared href |
|---|---|---|
| Service | `/${tokoid}/${roleSegment}/service` | `/${tokoid}/service` |
| Inventory | `/${tokoid}/${roleSegment}/inventory` | `/${tokoid}/inventory` |
| Retail | `/${tokoid}/${roleSegment}/retail` | `/${tokoid}/retail` |
| Karyawan | `/${tokoid}/${roleSegment}/karyawan` | `/${tokoid}/karyawan` |
| Analytics | `/${tokoid}/${roleSegment}/analytics` | `/${tokoid}/analytics` |

Keep `roleSegment()` for cases where a shared route does not exist (overview pages, admin-only subpages).

### Exit criteria

- `global-search.ts` uses `assertPermission()` or `can()` for every search scope gate.
- No `scope.user.role ===` branch decides search scope visibility.
- Result URLs use shared routes where available.
- Component `global-search.tsx` (client) does not need changes — it receives search results, not scope decisions.

---

## Block 4: Revalidation Gaps

### Current state

| Shared route | Revalidation function | Status |
|---|---|---|
| `/${tokoid}/inventory` | `revalidateInventoryPaths()` | Covered |
| `/${tokoid}/service` | `revalidateServicePaths()` | Covered |
| `/${tokoid}/service/tasks` | `revalidateServicePaths()` | Covered |
| `/${tokoid}/retail` | `revalidateRetailPaths()` | Covered |
| `/${tokoid}/retail/history` | `revalidateRetailPaths()` | Covered |
| `/${tokoid}/analytics` | **NONE** | **GAP** |
| `/${tokoid}/karyawan` | `revalidateKaryawanPaths()` → only `admin/karyawan` | **GAP** |

### What to change

**`lib/revalidation.ts`:**

```ts
export function revalidateAnalyticsPaths(tokoId: string): void {
  revalidatePath(`/${tokoId}/analytics`);
  revalidatePath(`/${tokoId}/admin/analytics`);
  revalidatePath(`/${tokoId}/admin`);
}
```

```ts
export function revalidateKaryawanPaths(tokoId: string): void {
  revalidatePath(`/${tokoId}/karyawan`);
  revalidatePath(`/${tokoId}/admin/karyawan`);
  revalidatePath(`/${tokoId}/admin`);
}
```

**`actions/analytics.ts`:** call `revalidateAnalyticsPaths(tokoId)` after any analytics mutation (if any exist). Analytics actions (`getAdminAnalytics`) are read-only today, so no immediate call site change is needed — the function exists for future mutations.

### Exit criteria

- Every shared route path is revalidated by at least one revalidation function.
- Analytics and karyawan mutations call the corresponding revalidation function after write.
- Legacy admin paths are still revalidated alongside shared paths.

---

## Block 5: Navigation Migration To Shared Routes

### Current state

| Nav builder | Total items | Legacy role routes | Shared routes |
|---|---|---|---|
| `buildAdminNav()` | 14 | 14 | 0 |
| `buildStaffNav()` | 11 | 8 | 3 (analytics, karyawan) |
| `buildTeknisiNav()` | 8 | 8 | 0 |

`buildServiceFilterItems()` at line 52-92 hardcodes `rolePath: "admin" | "staff"` and constructs `/${tokoid}/${rolePath}/service` URLs.

### What to change

#### Step 1: Refactor `buildServiceFilterItems()` to accept a base path

Change the function signature from hardcoded `rolePath` to accepting a `basePath: string`:

```ts
function buildServiceFilterItems(
  tokoid: string,
  basePath: string,  // was rolePath: "admin" | "staff"
  stats: ServiceStats | null | undefined,
): DashboardNavEntry[] {
  return [
    {
      href: `/${tokoid}/${basePath}/service`,
      // ...
    },
    // ... status filter items use the same basePath
  ];
}
```

Callers pass `"admin"`, `"staff"`, or (eventually) the shared route segment. After nav repointing, pass the shared base path.

#### Step 2: Repoint staff nav to shared routes

Repoint every staff nav item that has a working shared route equivalent:

| Current href | Shared href |
|---|---|
| `/${tokoid}/staff/inventory` | `/${tokoid}/inventory` |
| `/${tokoid}/staff/service?...` | `/${tokoid}/service?...` |
| `/${tokoid}/staff/retail` | `/${tokoid}/retail` |
| `/${tokoid}/staff/retail/history` | `/${tokoid}/retail/history` |

Keep `/${tokoid}/staff` as the staff overview landing page.

Analytics and karyawan in staff nav already point to shared routes — no change.

#### Step 3: Repoint teknisi nav to shared routes

| Current href | Shared href |
|---|---|
| `/${tokoid}/teknisi/inventory` | `/${tokoid}/inventory` |
| `/${tokoid}/teknisi/task?...` | `/${tokoid}/service/tasks?...` |

Keep `/${tokoid}/teknisi` as the teknisi overview landing page.

#### Step 4: Repoint admin nav to shared routes

Only repoint items where the shared route behavior is fully equivalent to the admin route:

| Current href | Shared href |
|---|---|
| `/${tokoid}/admin/analytics` | `/${tokoid}/analytics` |
| `/${tokoid}/admin/karyawan` | `/${tokoid}/karyawan` |
| `/${tokoid}/admin/inventory` | `/${tokoid}/inventory` |
| `/${tokoid}/admin/retail` | `/${tokoid}/retail` |
| `/${tokoid}/admin/retail/history` | `/${tokoid}/retail/history` |
| `/${tokoid}/admin/service?...` | `/${tokoid}/service?...` |

Keep admin-only subpages on legacy admin routes:

```
/${tokoid}/admin/inventory/audit-gudang
/${tokoid}/admin/inventory/reports
/${tokoid}/admin/inventory/restock-history
/${tokoid}/admin/inventory/retail
/${tokoid}/admin/inventory/supplier-returns
/${tokoid}/admin/supplier-debts
/${tokoid}/admin/toko
/${tokoid}/admin
```

### Exit criteria

- Admin nav: ≤8 items point to legacy routes (only admin-only subpages and overview).
- Staff nav: ≤2 items point to legacy routes (overview only).
- Teknisi nav: ≤2 items point to legacy routes (overview only).
- All repointed nav items pass the same permission checks on the shared route that their legacy route enforced.
- `buildServiceFilterItems()` accepts a base path parameter instead of hardcoded `rolePath`.

---

## Block 6: Remove Hybrid Role Gates From Mutations

### Current state

Three places have `scope.user.role ===` checks running alongside `assertPermission()`:

**`actions/service-mutations.ts:473`:**
```ts
assertPermission(scope, "service.updateStatus");
if (scope.user.role === "staff") assertFeature(scope, "staff.workflow");
```

**`actions/service-mutations.ts:664`:**
```ts
assertInvoiceMutationPermissions(scope, serviceId);
if (scope.user.role === "staff") assertFeature(scope, "staff.workflow");
```

**`actions/inventory.ts:376-379`:**
```ts
function assertWorkflowForInventory(scope: RequestScope) {
  if (scope.user.role === "staff") assertFeature(scope, "staff.workflow");
  if (scope.user.role === "technician") assertFeature(scope, "technician.workflow");
}
```

### What to change

Feature gates should be checked at the route level, not in every mutation. The `staff.workflow` and `technician.workflow` features are already enforced by the staff and teknisi layouts. For the shared routes, the route-level code can enforce workflow features separately.

**Option A — remove the role-branch entirely (preferred):**

Remove lines 473-474 and 664-665 from `service-mutations.ts`. Remove the `assertWorkflowForInventory()` function from `inventory.ts` and its call sites.

The feature is still enforced by:
- Staff layout (for legacy staff routes)
- Teknisi layout (for legacy teknisi routes)
- Shared route page-level checks (add `assertFeature(scope, "staff.workflow")` / `assertFeature(scope, "technician.workflow")` at the top of `service/page.tsx` and `service/tasks/page.tsx` where needed)

**Option B — split `staff.workflow` into a route feature, not a mutation feature:**

Keep `assertFeature(scope, "staff.workflow")` in a single place — the shared route page — rather than repeating it in every mutation handler.

Recommendation: Option A. Remove from mutations, keep in layouts and add to shared route pages.

### Exit criteria

- Zero `scope.user.role === "staff"` or `scope.user.role === "technician"` checks used as feature-gating branches inside actions.
- `assertWorkflowForInventory()` is removed.
- Staff and technician workflow features are enforced at the route level only.
- `assertPermission()` is the sole user-authority check inside every migrated action handler.

---

## Block 7: Deprecate Legacy Route Pages

### Current state

12 legacy route pages have a fully functional shared route equivalent.

### What to change

Replace each legacy page with a server redirect to the shared route. The redirect preserves query parameters so deep links (e.g., tab selection, status filter) continue working.

```ts
// app/(dashboard)/[tokoid]/admin/inventory/page.tsx
import { redirect } from "next/navigation";

export default function AdminInventoryRedirect({ params }: { params: Promise<{ tokoid: string }> }) {
  // Preserves searchParams automatically via redirect
  redirect(`/${params.tokoid}/inventory`);
}
```

Repeat for each page in the deprecation list.

**Deprecation list:**

| Legacy page file | Redirect to |
|---|---|
| `admin/inventory/page.tsx` | `/${tokoid}/inventory` |
| `admin/service/page.tsx` | `/${tokoid}/service` |
| `admin/retail/page.tsx` | `/${tokoid}/retail` |
| `admin/retail/history/page.tsx` | `/${tokoid}/retail/history` |
| `admin/analytics/page.tsx` | `/${tokoid}/analytics` |
| `admin/karyawan/page.tsx` | `/${tokoid}/karyawan` |
| `staff/inventory/page.tsx` | `/${tokoid}/inventory` |
| `staff/service/page.tsx` | `/${tokoid}/service` |
| `staff/retail/page.tsx` | `/${tokoid}/retail` |
| `staff/retail/history/page.tsx` | `/${tokoid}/retail/history` |
| `teknisi/inventory/page.tsx` | `/${tokoid}/inventory` |
| `teknisi/task/page.tsx` | `/${tokoid}/service/tasks` |

**Do NOT deprecate these — no shared equivalent exists yet:**

```
admin/inventory/audit-gudang/page.tsx
admin/inventory/reports/page.tsx
admin/inventory/restock-history/page.tsx
admin/inventory/retail/page.tsx
admin/inventory/supplier-returns/page.tsx
admin/supplier-debts/page.tsx
admin/toko/page.tsx
admin/page.tsx
staff/page.tsx
teknisi/page.tsx
```

### Exit criteria

- All 12 legacy pages in the deprecation list are replaced with server redirects.
- The `redirect()` call preserves query parameters (Next.js `redirect()` does this by default when no second argument is passed).
- Bookmarked and deep-linked URLs continue working.
- Sidebar and global search links are already pointing to shared routes (from Block 5) so no nav re-pointing is needed at this stage.

---

## Block 8: Remove `role` Config From `withScope()` Calls (Final Cleanup)

### Current state

After Blocks 1-7, every `withScope()` call that has a `role` config also has an `assertPermission()` inside the handler body. The `role` gate is now redundant — it runs before `getRequestScope()` and adds no additional protection that `assertPermission()` doesn't already provide.

### What to change

For every `withScope()` call that now has an `assertPermission()` inside, remove the `role` config:

```ts
// Before:
return withScope(tokoId, { role: ["admin", "staff"] }, async (scope) => {
  assertPermission(scope, "service.create");
  // ...
});

// After:
return withScope(tokoId, {}, async (scope) => {
  assertPermission(scope, "service.create");
  // ...
});
```

This applies to lines: `karyawan.ts:433,445,495`, `service-mutations.ts:130,222,322,394,471,549,592,662,857,899`, `service-queries.ts:44,113,126,144,178,191,220`.

Keep `feature` config on `withScope()` calls where the feature check is a module-availability gate (not a user-authority gate). Example: `{ feature: "technician.workflow" }` on technician-specific queries is a module availability check and should stay.

Also keep `role` config on `withScope()` calls inside non-module-permission actions (billing, affiliate, superuser) — those actions are outside the permission refactor scope.

### Exit criteria

- Zero `withScope()` calls targeting toko-scoped module permissions have a `role` config.
- Feature config may remain where it represents module availability.
- The `checkRole()` function in `wrapper.ts` may remain as dead code or be kept for non-permission-gated actions.

---

## Execution Order

Blocks are ordered by dependency. Do not reorder.

```
Block 1 ──► Block 2 ──► Block 3 ──► Block 4
                                        │
                                        ▼
Block 5 ◄────────────────────────────────
  │
  ▼
Block 6 ──► Block 7 ──► Block 8
```

1. **Block 1**: Feature gate `allowedRoles` expansion — unblocks permission grants.
2. **Block 2**: Backfill `assertPermission()` in actions — closes server-side authority gaps.
3. **Block 3**: Refactor `global-search.ts` — last fully un-refactored action file.
4. **Block 4**: Revalidation gaps — ensures shared routes see fresh data after mutations.
5. **Block 5**: Navigation migration — users navigate to shared routes.
6. **Block 6**: Remove hybrid role gates — makes permissions sole authority.
7. **Block 7**: Deprecate legacy pages — removes duplicate code paths.
8. **Block 8**: Remove redundant `role` config — final cleanup of `withScope()`.

Blocks 1-4 have no cross-dependencies and can run in parallel if needed. Block 5 depends on Block 4 (navigation should not point to routes that aren't revalidated). Block 6 should run after Block 5 so nav points to routes whose permission checks are clean. Blocks 7 and 8 are strictly sequential.

## Risks

- **Block 1 Option B**: removing `allowedRoles` from the feature lock function would break 17 page-level `role_denied` checks. Prefer Option A (expand arrays) for safety.
- **Block 2**: `supplier-returns.ts` and `inventory-audit.ts` have the most call sites and the highest chance of regression. Audit each action's business logic carefully before adding `assertPermission()`.
- **Block 3**: `global-search.ts` URL construction (`resultHref()`) must preserve deep links. Search results must still open the correct detail page. Validate all 5 shared route mappings before shipping.
- **Block 5**: `buildServiceFilterItems()` refactor touches all three nav builders. Verify admin, staff, and teknisi service status filter links still resolve correctly.
- **Block 7**: `redirect()` without a second argument preserves searchParams in Next.js 16. Verify the shared route pages correctly read searchParams before deprecating legacy pages.
- **Block 8**: removing `role` config from `withScope()` is the final irreversible step. Every `assertPermission()` call must be present and correct before this block runs. If a legacy page or action was missed in Block 2, Block 8 would remove its only remaining access gate.

## Exit Criteria

Phase 7 is complete when:

- **Feature gates are only plan + toko availability checks.** Zero `allowedRoles` arrays restrict which role can pass a feature gate. The `role_denied` lock reason should ideally only fire from layout guards, never from permission-gated module features.
- **`assertPermission()` is the sole server-side authority for every toko-scoped module action.** Inventory, service, retail, analytics, karyawan, WhatsApp, supplier debts, supplier returns, warranty claims, overview, global search, feature settings, and toko settings actions all enforce granular permissions.
- **Zero `assertRole()` calls** for toko-scoped module access.
- **Zero `scope.user.role ===`** authorization branches in toko-scoped module actions.
- **Navigation uses shared routes for all migrated modules.** Admin-only subpages stay on legacy routes.
- **Every shared route is revalidated** after relevant mutations.
- **12 legacy page files are replaced** with server redirects to shared routes.
- **New modules use permissions by default.** The `PERMISSION_REGISTRY` is the canonical source of valid access grants.
- **Role checks remain only where role identity is truly required:** layout redirects, ownership controls (billing, toko ownership), permission management, admin-only subpages, superuser platform actions.
