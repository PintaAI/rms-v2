# Phase 5: Service And Retail Shared Route Migration

Phase 5 migrates service and retail from role-first operational access to permission-based access, and introduces shared permission-gated routes for those modules.

Unlike Phase 3 inventory, service has multiple operational modes: admin/staff full-service management, technician task work, invoice/payment actions, assignment/takeover behavior, and retail checkout/history. Because of that, Phase 5 must migrate server authorization first, then expose shared routes whose UI only shows actions that are already protected server-side.

## Goal

- Make service and retail actions permission-enforced server-side.
- Add shared module routes outside role segments.
- Preserve existing admin/staff/teknisi routes during migration.
- Keep technicians task-scoped unless a later permission explicitly grants broader service visibility.
- Make UI action visibility match server-side permission checks.

## Route Strategy

Phase 5 will create shared routes in this phase.

Target shared routes:

```txt
/{tokoid}/service
/{tokoid}/service/tasks
/{tokoid}/retail
/{tokoid}/retail/history
```

Legacy routes must continue working:

```txt
/{tokoid}/admin/service
/{tokoid}/staff/service
/{tokoid}/teknisi/task
/{tokoid}/admin/retail
/{tokoid}/staff/retail
/{tokoid}/admin/retail/history
/{tokoid}/staff/retail/history
```

Navigation migration can happen after shared route behavior is verified. Do not remove or redirect legacy routes in the first implementation slice.

## Route Semantics

### `/{tokoid}/service`

Shared service list/detail/create/update route for users who can access full service management.

Expected users:

- Admin with `service.view`.
- Staff with `service.view`.
- Any future non-admin role explicitly granted full service permissions, subject to route and component support.

Technicians should not automatically receive full list access through this route just because they have `service.view`. Technician service work remains task-scoped unless an explicit later design adds broader technician visibility.

### `/{tokoid}/service/tasks`

Shared technician task route for task-scoped service work.

Expected users:

- Technicians with `service.view` and task workflow availability.
- Admins if current admin task-management behavior needs to remain supported.
- Staff only if there is a deliberate product decision to let staff use the task queue.

This route must show assigned and available tasks, not the full service list.

### `/{tokoid}/retail`

Shared retail checkout route.

Expected access:

- `retail.view` allows opening the checkout surface and reading sellable inventory data.
- `retail.sell` allows creating a sale.
- If a user has `retail.view` but not `retail.sell`, the page may render read-only checkout/catalog state, but sale submission must be unavailable and server-blocked.

### `/{tokoid}/retail/history`

Shared retail history/detail/receipt route.

Expected access:

- `retail.viewHistory` controls list, detail drawer, and receipt lookup/reprint.
- `retail.view` does not imply history access.
- `retail.sell` does not imply history access.

## Permission Mapping

### Service

| Workflow | Permission |
| --- | --- |
| View service list/stats on full management surface | `service.view` |
| View service detail | `service.view` plus task-scope rules for technicians |
| Create service | `service.create` |
| Update service details | `service.update` |
| Delete service | `service.delete` |
| Update service status | `service.updateStatus` |
| Mark service picked up | `service.pickup` |
| Assign/remove technician | `service.assignTechnician` |
| Technician take over available task | `service.takeOverTask` |
| Create invoice from service workflow | `service.createInvoice` |
| Add/remove sparepart or jasa items on service invoice | `service.manageItems` |
| Change invoice total/payment/DP state | `service.manageInvoice` |

### Retail

| Workflow | Permission |
| --- | --- |
| Open retail checkout/read sellable items | `retail.view` |
| Create retail sale | `retail.sell` |
| View retail history list | `retail.viewHistory` |
| View retail sale detail | `retail.viewHistory` |
| Reprint/show receipt | `retail.viewHistory` |

## Feature Gates Still Apply

Permissions must not bypass product/module availability.

Existing feature gates remain underneath permissions:

| Feature | Still Required For |
| --- | --- |
| `staff.workflow` | Staff service route/workflow availability where currently required. |
| `technician.workflow` | Technician task workflow and task route availability. |
| `service.technicianAssignment` | Assign/remove technician workflows. |
| `service.manualItems` | Manual service item creation. |
| `inventory.management` | Sparepart usage, retail checkout inventory reads, stock decrement/return flows. |
| `retail.sales` | Retail checkout, sales, history module availability. |

Permission checks should use `assertPermission(scope, key)`. Feature checks should use `assertFeature(scope, key)` when product/module availability is still required.

## Files In Scope

### Actions

```txt
actions/service-queries.ts
actions/service-mutations.ts
actions/retail.ts
actions/service-shared.ts
actions/index.ts
```

### Existing Pages

```txt
app/(dashboard)/[tokoid]/admin/service/page.tsx
app/(dashboard)/[tokoid]/staff/service/page.tsx
app/(dashboard)/[tokoid]/teknisi/task/page.tsx
app/(dashboard)/[tokoid]/admin/retail/page.tsx
app/(dashboard)/[tokoid]/staff/retail/page.tsx
app/(dashboard)/[tokoid]/admin/retail/history/page.tsx
app/(dashboard)/[tokoid]/staff/retail/history/page.tsx
```

### New Shared Pages

```txt
app/(dashboard)/[tokoid]/service/page.tsx
app/(dashboard)/[tokoid]/service/tasks/page.tsx
app/(dashboard)/[tokoid]/retail/page.tsx
app/(dashboard)/[tokoid]/retail/history/page.tsx
```

Add loading files only if the shared route needs route-level loading parity with legacy routes.

### Components

```txt
components/dashboard/services/manage-service.tsx
components/dashboard/services/staff-manage-service.tsx
components/dashboard/services/teknisi-task-manager.tsx
components/dashboard/services/service-table/service-table.tsx
components/dashboard/services/service-table/technician-dropdown.tsx
components/dashboard/services/services-form.tsx
components/dashboard/services/add-repair-item-form.tsx
components/dashboard/services/service-detail-card/service-detail-card.tsx
components/dashboard/services/service-overview-stats.tsx
components/dashboard/retail/retail-checkout.tsx
components/dashboard/retail/retail-sales-history.tsx
components/dashboard/retail/retail-sale-detail-drawer.tsx
components/dashboard/retail/retail-receipt.tsx
```

### Infrastructure

```txt
proxy.ts
lib/revalidation.ts
lib/auth/request-scope.ts
lib/permissions.ts
components/dashboard/layout/dashboard-scope-context.tsx
```

`proxy.ts` should already support shared toko child routes after Phase 3. Phase 5 should verify that `/{tokoid}/service`, `/{tokoid}/service/tasks`, `/{tokoid}/retail`, and `/{tokoid}/retail/history` are protected consistently with `/{tokoid}/inventory`.

## Action Migration Details

### Service Queries

#### `getServiceList(tokoId, ...)`

Current behavior: role-limited to admin/staff.

Phase 5 behavior:

- Require `service.view`.
- Keep this as the full service-management list.
- Do not use it for technician task route unless task-scoped filtering is added explicitly.

#### `getServiceStats(tokoId)`

Current behavior: role-limited to admin/staff.

Phase 5 behavior:

- Require `service.view`.
- Used by full service route surfaces.

#### `getService(serviceId)`

Current behavior: allows toko members; technicians are limited to assigned/available tasks.

Phase 5 behavior:

- Require `service.view`.
- Preserve technician task-scope rule:

```txt
Technician can read detail only if:
- assigned to that technician, or
- service status is available for takeover.
```

- Full service route users with `service.view` can read details subject to route/page access.

#### `getAvailableTasks(tokoId, limit)`

Current behavior: admin/technician plus `technician.workflow`.

Phase 5 behavior:

- Require `service.view`.
- Require `service.takeOverTask` if the result is used to show takeable tasks.
- Keep `technician.workflow` for technician route availability.

#### `getMyTasks(tokoId, statuses, limit)`

Current behavior: admin/technician plus `technician.workflow`.

Phase 5 behavior:

- Require `service.view`.
- Keep task scope to current user.
- Keep `technician.workflow` for technician route availability.

#### `getTechnicianDashboard(tokoId)`

Phase 5 behavior:

- Require `service.view`.
- Keep `technician.workflow`.
- If showing available tasks includes takeover affordance, pair UI affordance with `service.takeOverTask`.

#### `getTechniciansByToko(tokoId)`

Current behavior: admin/staff plus `service.technicianAssignment`.

Phase 5 behavior:

- Require `service.assignTechnician`.
- Keep `service.technicianAssignment` feature gate.

### Service Mutations

#### `createService(data, tokoId)`

Require:

```txt
service.create
```

Keep monthly plan limit enforcement.

#### `updateService(serviceId, data)`

Require:

```txt
service.update
```

Keep existing business rules:

- Cannot update picked-up service.
- Device must exist.

#### `deleteService(serviceId)`

Require:

```txt
service.delete
```

Keep existing business rules:

- Cannot delete picked-up service.
- Cannot delete service with paid or DP invoice.
- Return sparepart stock.
- Preserve deleted service activity logs.

#### `takeService(serviceId)`

Require:

```txt
service.takeOverTask
```

Keep `technician.workflow` unless admin task-taking remains intentionally supported without technician workflow.

Keep existing business rules:

- Service status must be takeable.
- Cannot take service already assigned to current user.
- Race-safe update must remain.

#### `updateStatus(serviceId, status, ...)`

Require:

```txt
service.updateStatus
```

Keep role/task nuance:

- Staff still requires `staff.workflow` while legacy staff route exists.
- Technician still requires `technician.workflow`.
- Technician can only update own assigned service.
- Admin takeover confirmation behavior remains.

#### `pickupService(serviceId)`

Require:

```txt
service.pickup
```

Keep existing business rules:

- Only done/failed service can be picked up.
- Already picked-up service cannot be picked again.

#### `assignTechnician(serviceId, technicianId)`

Require:

```txt
service.assignTechnician
```

Keep feature gate:

```txt
service.technicianAssignment
```

Keep existing validation:

- Technician must exist.
- Technician must belong to toko.
- Picked-up service cannot be reassigned.

#### `addItem(data)`

Require:

```txt
service.manageItems
```

Also require:

```txt
service.createInvoice
```

Reason: adding an item can create or recalculate invoice totals via `updateInvoiceIfAllowed()`.

Keep feature gates:

- `inventory.management` for sparepart items.
- `service.manualItems` for manual service items.

Keep technician scope:

- If technician role, only assigned service can be mutated.
- If current implementation does not enforce this before add, Phase 5 should add it.

#### `removeItem(itemId)`

Require:

```txt
service.manageItems
service.manageInvoice
```

Reason: removing an item mutates invoice totals and may return sparepart stock.

Keep technician scope:

- Technician can only remove items from assigned service.

#### `payInvoice(invoiceId, data)`

Require:

```txt
service.manageInvoice
```

Keep business rules:

- Invoice cannot already be paid.
- Service must be done or failed.
- Service cannot already be picked up.
- Discount cannot exceed remaining total.

#### `markDpInvoice(invoiceId, dpAmount)`

Require:

```txt
service.manageInvoice
```

Keep business rules:

- Invoice cannot already be paid or DP.
- DP must be greater than zero.

### Retail Actions

#### Replace `assertRetailCheckoutAccess()`

Current helper combines role, inventory feature, and retail feature.

Phase 5 should replace it with smaller helpers:

```txt
assertRetailViewAccess(tokoId)
assertRetailSellAccess(tokoId)
assertRetailHistoryAccess(tokoId)
```

Suggested behavior:

```txt
assertRetailViewAccess:
- getRequestScope(tokoId)
- assertPermission(scope, "retail.view")
- assertFeature(scope, "inventory.management") if checkout inventory reads are needed

assertRetailSellAccess:
- getRequestScope(tokoId)
- assertPermission(scope, "retail.sell")
- assertFeature(scope, "inventory.management")

assertRetailHistoryAccess:
- getRequestScope(tokoId)
- assertPermission(scope, "retail.viewHistory")
```

`retail.sales` remains enforced through permission required-feature mapping, but explicit `assertFeature(scope, "retail.sales")` can remain if the code needs clearer module-level failure messages.

#### `getRetailCheckoutItems(tokoId, query)`

Require:

```txt
retail.view
inventory.management
```

#### `createRetailSale(input)`

Require:

```txt
retail.sell
inventory.management
```

Keep existing transaction safety:

- Validate all items belong to toko.
- Validate stock.
- Validate price.
- Decrement stock atomically.
- Create stock movements.

#### `getRetailSales(tokoId, filters)`

Require:

```txt
retail.viewHistory
```

Do not require `retail.sell`.

#### `getRetailSale(saleId)`

Require:

```txt
retail.viewHistory
```

Use sale toko to resolve scope.

## UI Capability Props

### Service

Introduce a shared capability type near service components or action types:

```ts
export type ServiceActionPermissions = {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canUpdateStatus: boolean;
  canPickup: boolean;
  canAssignTechnician: boolean;
  canTakeOverTask: boolean;
  canCreateInvoice: boolean;
  canManageItems: boolean;
  canManageInvoice: boolean;
};
```

Build it from request scope:

```ts
const actionPermissions = {
  canView: can(scope, "service.view"),
  canCreate: can(scope, "service.create"),
  canUpdate: can(scope, "service.update"),
  canDelete: can(scope, "service.delete"),
  canUpdateStatus: can(scope, "service.updateStatus"),
  canPickup: can(scope, "service.pickup"),
  canAssignTechnician: can(scope, "service.assignTechnician"),
  canTakeOverTask: can(scope, "service.takeOverTask"),
  canCreateInvoice: can(scope, "service.createInvoice"),
  canManageItems: can(scope, "service.manageItems"),
  canManageInvoice: can(scope, "service.manageInvoice"),
};
```

Use it to control:

| Component | Permission Effects |
| --- | --- |
| `ManageService` | Add button, edit dialog, delete action, technician assignment column/actions. |
| `StaffManageService` | Same as `ManageService`; candidate for consolidation after permissions are stable. |
| `ServicesForm` | Create vs update submit availability. |
| `ServiceDetailCard` | Status buttons, pickup button, payment controls, remove item controls. |
| `AddRepairItemForm` | Add item availability. |
| `TechnicianTaskManager` | Take task and status controls. |
| `TechnicianDropdown` | Assign/remove technician. |

### Retail

Introduce:

```ts
export type RetailActionPermissions = {
  canView: boolean;
  canSell: boolean;
  canViewHistory: boolean;
};
```

Use it to control:

| Component | Permission Effects |
| --- | --- |
| `RetailCheckout` | Sale submission disabled/hidden when `canSell` is false. |
| `RetailSalesHistory` | Page only renders when `canViewHistory` is true. |
| `RetailSaleDetailDrawer` | Detail fetch/view only available with `canViewHistory`. |
| `RetailReceipt` | Receipt display/reprint only available with `canViewHistory`. |

## Shared Page Behavior

### Service Page: `/{tokoid}/service`

Page flow:

1. Resolve `params` asynchronously.
2. Call `getRequestScope(tokoid)`.
3. Check `service.view` using `can(scope, "service.view")` or `assertPermission` with controlled lock state.
4. Reject technician full-list access unless a later decision allows it.
5. Load toko, service list, stats in parallel after access is known.
6. Render a permission-aware service management component.

Lock behavior:

- Missing `service.view`: controlled permission lock state.
- Feature unavailable through permission required feature: use existing feature lock/preview where appropriate.
- Technician without full-list support: redirect to `/{tokoid}/service/tasks` if task access exists, otherwise controlled lock.

### Service Tasks Page: `/{tokoid}/service/tasks`

Page flow:

1. Resolve scope.
2. Require `service.view`.
3. Require `technician.workflow` for technician users.
4. Load task stats, my tasks, and available tasks.
5. Render `TeknisiTaskManager` with permission-aware action props.

Takeover UI:

- Show take task only if `service.takeOverTask` is allowed.
- Existing task detail/status controls follow `service.updateStatus` and `service.manageItems`.

### Retail Page: `/{tokoid}/retail`

Page flow:

1. Resolve scope.
2. Require `retail.view`.
3. Load toko and checkout items.
4. Render `RetailCheckout` with `canSell` derived from `retail.sell`.

Read-only behavior:

- If `retail.view` allowed and `retail.sell` denied, user can view items but cannot submit sale.
- If `retail.view` denied, do not load checkout items.

### Retail History Page: `/{tokoid}/retail/history`

Page flow:

1. Resolve scope.
2. Require `retail.viewHistory`.
3. Load toko and retail sales.
4. Render `RetailSalesHistory`.

No dependency on `retail.sell`.

## Revalidation

Update revalidation helpers after shared routes are added.

### `revalidateServicePaths(tokoId, includeTeknisi)`

Add:

```txt
/{tokoId}/service
/{tokoId}/service/tasks
```

Keep existing:

```txt
/{tokoId}/admin/service
/{tokoId}/admin
/{tokoId}/teknisi/task when includeTeknisi is true
```

If staff route currently relies on service revalidation, ensure `/{tokoId}/staff/service` is included or add it during Phase 5.

### `revalidateRetailPaths(tokoId)`

Add:

```txt
/{tokoId}/retail
/{tokoId}/retail/history
```

Keep existing:

```txt
/{tokoId}/admin/retail
/{tokoId}/staff/retail
/{tokoId}/admin/inventory/retail
```

Also ensure retail sale mutations revalidate inventory shared route indirectly through `revalidateInventoryPaths(tokoId)`.

## Navigation Migration

Do not repoint all navigation immediately in the first slice.

Recommended navigation migration order:

1. Add shared routes and verify direct access.
2. Repoint admin service nav to `/{tokoid}/service` only after admin parity is verified.
3. Repoint staff service nav to `/{tokoid}/service` only after staff parity is verified.
4. Repoint technician task nav to `/{tokoid}/service/tasks` only after task parity is verified.
5. Repoint admin/staff retail nav to `/{tokoid}/retail` and history links to `/{tokoid}/retail/history` after checkout/history parity is verified.
6. Keep legacy routes available until Phase 7 cleanup.

Global search links should stay legacy until the shared service detail behavior is verified. If shared detail opens through query params, add shared links later in a small follow-up.

## Implementation Order

### Slice 1: Server Authorization Foundation

- Add service permission assertions in `actions/service-mutations.ts`.
- Add service permission assertions in `actions/service-queries.ts`.
- Split retail access helpers in `actions/retail.ts`.
- Confirm no mutation remains protected only by role when a matching permission exists.

Completion criteria:

- Denying each permission blocks the matching server action.
- Existing default admin/staff/technician flows still work with role defaults.

### Slice 2: Shared Route Protection

- Add `/{tokoid}/service` page.
- Add `/{tokoid}/service/tasks` page.
- Add `/{tokoid}/retail` page.
- Add `/{tokoid}/retail/history` page.
- Verify proxy protects all shared route paths.

Completion criteria:

- Direct shared route access requires toko membership and relevant permissions.
- Missing permission shows controlled lock/redirect behavior.
- Legacy routes remain unchanged.

### Slice 3: Service UI Permission Props

- Add service action permission prop type.
- Pass service permissions from page/server component into client components.
- Hide/disable create, update, delete, assign, status, pickup, item, and invoice controls based on permissions.
- Ensure disabled UI has matching server-side assertion.

Completion criteria:

- UI and server behavior align for each service permission.
- No visible action fails only because of missing permission unless intentionally disabled late by business rule.

### Slice 4: Retail UI Permission Props

- Add retail action permission prop type.
- Pass retail permissions into checkout and history components.
- Make checkout read-only when `retail.view` is allowed but `retail.sell` is denied.
- Ensure history/detail/receipt require `retail.viewHistory`.

Completion criteria:

- `retail.sell` controls sale creation independently from checkout visibility.
- `retail.viewHistory` controls history independently from checkout and sell permissions.

### Slice 5: Revalidation And Link Parity

- Update `lib/revalidation.ts` for shared service/retail paths.
- Ensure service and retail mutations revalidate shared routes.
- Add shared route links only where parity is verified.

Completion criteria:

- Mutations update shared and legacy pages reliably.

### Slice 6: Navigation Migration

- Repoint sidebar/global links incrementally after direct access verification.
- Keep old role routes available.
- Avoid redirects until Phase 7 unless a route is fully represented and tested.

Completion criteria:

- Users land on shared routes where intended.
- Legacy links still work if bookmarked.

## Exit Criteria

- `/{tokoid}/service` exists and is permission-gated.
- `/{tokoid}/service/tasks` exists and is permission-gated.
- `/{tokoid}/retail` exists and is permission-gated.
- `/{tokoid}/retail/history` exists and is permission-gated.
- Existing role-specific routes still work.
- Service mutations are protected by matching permissions server-side.
- Service query actions are protected by matching permissions server-side.
- Technician service access remains task-scoped.
- Retail checkout item lookup requires `retail.view`.
- Retail sale creation requires `retail.sell`.
- Retail history/detail/receipt lookup requires `retail.viewHistory`.
- UI action visibility matches permission access for migrated service and retail actions.
- Revalidation covers shared and legacy service/retail paths.
- Denying a permission in the Phase 4 permission editor changes both UI affordance and server action result.
- Granting a permission enables expected behavior when required features are available.

## Manual Verification Matrix

Use at least one admin, one staff, and one technician in a toko with required features enabled.

### Service Full Management

| Permission Override | Expected Result |
| --- | --- |
| Deny `service.view` for staff | Staff cannot open shared service list and service list query is blocked. |
| Deny `service.create` for staff | Create button hidden/disabled and `createService` blocked. |
| Deny `service.update` for staff | Edit action hidden/disabled and `updateService` blocked. |
| Deny `service.delete` for staff | Delete action hidden/disabled and `deleteService` blocked. |
| Deny `service.assignTechnician` for staff | Assignment UI hidden/disabled and `assignTechnician` blocked. |
| Deny `service.updateStatus` for staff | Status controls hidden/disabled and `updateStatus` blocked. |
| Deny `service.pickup` for staff | Pickup action hidden/disabled and `pickupService` blocked. |
| Deny `service.manageItems` for staff | Add/remove item UI hidden/disabled and actions blocked. |
| Deny `service.manageInvoice` for staff | Payment/DP controls hidden/disabled and actions blocked. |

### Technician Tasks

| Permission Override | Expected Result |
| --- | --- |
| Deny `service.view` for technician | Technician task data is blocked. |
| Deny `service.takeOverTask` for technician | Available tasks may be hidden or take button disabled; `takeService` blocked. |
| Deny `service.updateStatus` for technician | Status controls hidden/disabled; `updateStatus` blocked. |
| Deny `service.manageItems` for technician | Add/remove repair item controls hidden/disabled; item actions blocked. |
| Technician opens unassigned non-available service detail | Detail access denied. |
| Technician opens assigned service detail | Detail access allowed if `service.view` is allowed. |

### Retail

| Permission Override | Expected Result |
| --- | --- |
| Deny `retail.view` | Retail checkout route and item lookup are blocked. |
| Deny `retail.sell` but allow `retail.view` | Checkout page can show items, but submit sale is unavailable and `createRetailSale` blocked. |
| Deny `retail.viewHistory` | History route/detail/receipt lookup blocked. |
| Allow `retail.viewHistory` but deny `retail.sell` | User can view history but cannot create sale. |

## Risks

- Service item mutation implicitly creates or recalculates invoices; permission boundaries must be explicit.
- Technician `service.view` can accidentally become full-list access if shared route logic is too generic.
- Existing admin/staff service components are similar but not identical; premature consolidation can introduce behavior regressions.
- Retail history currently uses the checkout access helper; splitting access can expose hidden assumptions.
- Navigation migration before shared route parity can strand users on less capable pages.
- Revalidation gaps can make shared routes appear stale even when legacy routes update.

## Open Decisions

These decisions should be answered before or during implementation if they affect code shape.

1. Should staff ever access `/{tokoid}/service/tasks`, or is that route technician/admin only?
2. Should admins be allowed to use `/{tokoid}/service/tasks` for task takeover/testing, or should admin task behavior remain on full service detail only?
3. If `service.manageItems` is allowed but `service.createInvoice` is denied, should adding items be blocked entirely, or should item changes be allowed without invoice creation? Recommended answer: block item mutation unless both are allowed because current implementation updates invoice totals.
4. Should `retail.view` without `retail.sell` be a real read-only checkout/catalog page, or should the route show a lock state saying selling permission is required? Recommended answer: real read-only page because it makes `retail.view` meaningful.
5. Should legacy role routes become server redirects to shared routes at the end of Phase 5, or wait until Phase 7 cleanup? Recommended answer: wait until Phase 7 unless shared parity is manually verified across seeded roles.
