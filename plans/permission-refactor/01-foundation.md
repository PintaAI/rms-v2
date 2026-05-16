# Foundation

## Problem

The current system mixes product availability and role authority in feature gates.

Current behavior is broadly:

```txt
role allowed + plan allowed + toko feature enabled = access
```

This makes it hard to give one staff or technician more responsibility without changing their role or duplicating admin-only UI. It also encourages separate admin/staff/technician pages even when the underlying workflow is the same.

## Target Model

Move toward permission-based access control where roles provide defaults, but individual users can be customized.

Target behavior:

```txt
toko membership + module availability + effective permission = access
```

Where module availability means:

```txt
plan allows feature + toko has not disabled feature
```

## Responsibilities

| Layer | Responsibility |
|---|---|
| Role | Starting permission template and user workflow identity. |
| Feature gate | Product/module availability by plan and toko toggle. |
| Permission | Specific user authority to view, create, update, delete, manage, or configure. |
| Route | Entry point to a module, guarded by permission instead of role where possible. |
| Component | Renders available actions based on permission access. |
| Server action | Enforces the permission required for the mutation or read. |

## V1 Permission Model

Use role defaults plus per-user overrides.

```txt
effective permissions = role defaults + explicit allows - explicit denies
```

This supports both use cases:

- Make a staff or technician more powerful than the default role.
- Restrict a staff or technician below the default role.

This is less disruptive than a pure allow-list because existing behavior can be preserved during migration.

## Admin-Only Guardrail

Permission management stays admin-only in V1.

Staff and technicians may become powerful inside operational modules, but they should not be able to grant or revoke permissions for other users in the first version.

Recommended V1 admin-only areas:

- Permission management.
- Feature settings management.
- Billing/subscription management.
- Ownership-level toko controls.

## Feature Gates After Refactor

Feature gates should remain, but they should stop being the primary source of user authority.

Before:

```txt
feature gate = role + plan + toko toggle
```

After:

```txt
feature gate = plan + toko toggle
permission = user authority
```

Example:

```txt
inventory.management
- Checks whether inventory is available for this toko.
- Does not decide whether this user can create, update, or delete inventory items.
```

Permissions decide the actions:

```txt
inventory.view
inventory.create
inventory.update
inventory.delete
inventory.restock
inventory.audit
```

## Permission Registry

Create a `PERMISSION_REGISTRY` that defines each permission's metadata and required feature.

Example shape:

```ts
const PERMISSION_REGISTRY = {
  "inventory.view": {
    label: "View inventory",
    category: "inventory",
    requiredFeature: "inventory.management",
  },
  "retail.sell": {
    label: "Sell retail items",
    category: "retail",
    requiredFeature: "retail.sales",
  },
  "analytics.view": {
    label: "View analytics",
    category: "analytics",
    requiredFeature: "analytics.revenue",
  },
} as const;
```

Some permissions may not require a paid feature, but every permission should still require toko membership.

## Request Scope

`getRequestScope(tokoId)` should become the single source for effective access.

Target scope additions:

```ts
type RequestScope = {
  user: AuthUser;
  tokoId: string;
  plan: SubscriptionPlan;
  disabledFeatures: FeatureKey[];
  featureAccess: FeatureAccessMap;
  permissionAccess: PermissionAccessMap;
  permissionOverrides: UserPermissionOverride[];
};
```

New helpers:

```ts
can(scope, "inventory.update")
assertPermission(scope, "inventory.update")
getPermissionLockReason(scope, "inventory.update")
```

`assertPermission()` should check both module availability and user authority.

## Data Model Direction

Store per-toko, per-user permission overrides.

```prisma
model TokoUserPermission {
  id            String           @id @default(cuid())
  tokoId        String
  userId        String
  permissionKey String
  effect        PermissionEffect
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt

  toko Toko @relation(fields: [tokoId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([tokoId, userId, permissionKey])
  @@index([tokoId, userId])
}

enum PermissionEffect {
  allow
  deny
}
```

## Route Direction

The target route model should be module-oriented rather than role-oriented.

Current style:

```txt
/{tokoid}/admin/inventory
/{tokoid}/staff/inventory
/{tokoid}/teknisi/inventory
```

Target style:

```txt
/{tokoid}/inventory
/{tokoid}/service
/{tokoid}/retail
/{tokoid}/karyawan
/{tokoid}/analytics
```

Because the user prefers route migration early, phases should include route strategy near the start. The rollout still needs compatibility checkpoints so the app does not break during migration.

## Component Direction

Shared module components should render actions by permission.

Example:

```tsx
<InventoryPage />
```

Inside the page/component:

```tsx
const canCreate = can("inventory.create");
const canDelete = can("inventory.delete");
```

Server actions remain the enforcement boundary:

```ts
assertPermission(scope, "inventory.create");
```

## Non-Negotiables

- Permissions must not bypass subscription plan limits.
- Permissions must not bypass toko membership.
- Permissions must not bypass toko-disabled modules.
- UI permission checks are not security boundaries.
- Every server action and server data loader must enforce the permission it needs.
- Migration must be module-by-module, not a single all-at-once rewrite.

## Early Risk Areas

- Existing `proxy.ts` route protection may block non-admin users from new shared routes or legacy admin routes.
- Existing actions often check role directly with `withScope(..., { role })` or `assertRole()`.
- Navigation currently depends on role-specific builders.
- Feature gates currently include `allowedRoles`, which will need careful migration.
- Admin-like access for staff/technicians must not accidentally include billing, ownership, or permission management.
