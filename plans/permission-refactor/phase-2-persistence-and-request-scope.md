# Phase 2: Persistence And Request Scope

## Goal

Persist per-user permission overrides and expose effective permission access through request scope, while keeping existing app behavior unchanged.

At the end of this phase, the app should be able to answer this question for the current user and toko:

```txt
Can this user perform this permission-backed action in this toko?
```

However, existing pages and actions should still use the current role and feature checks until later migration phases intentionally switch them over.

## Why This Phase Exists

Phase 1 defines permission primitives in memory. Phase 2 connects those primitives to real toko users by adding persistence and request-scope access.

This phase is the bridge between planning and real migration. It should make permission data available everywhere server code already gets request context, without yet replacing existing behavior.

## Scope

Add persistence for permission overrides:

```txt
TokoUserPermission
PermissionEffect
```

Extend request scope with permission access:

```txt
permissionOverrides
permissionAccess
```

Add server-side helpers:

```txt
can()
assertPermission()
getPermissionLockReason()
```

Phase 2 persistence is only for toko-scoped module permissions. It must not try to model every server action in the app.

Explicitly outside this permission system:

- Superuser/platform actions.
- Affiliate program actions.
- Account/profile self-service actions.
- Billing/subscription actions.
- Shared device catalog read access.

Those areas keep their current access model unless a separate product decision redesigns them later.

## Non-Goals

- Do not migrate module pages yet.
- Do not migrate routes yet.
- Do not replace existing action checks yet.
- Do not add full permission management UI yet.
- Do not remove `allowedRoles` from feature gates yet.
- Do not remove existing role checks yet.

## Data Model

Add a table for per-toko, per-user overrides.

Recommended Prisma model:

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
  @@index([userId])
}

enum PermissionEffect {
  allow
  deny
}
```

Important decisions:

- `permissionKey` should be stored as `String`, because Prisma cannot directly reference a TypeScript union.
- Runtime code must validate that stored keys still exist in `PERMISSION_REGISTRY`.
- The unique index ensures one override per user, toko, and permission.
- `onDelete: Cascade` keeps overrides from outliving the toko or user.

## Data Ownership Rules

Each override belongs to:

```txt
toko + user + permissionKey
```

Rules:

- Overrides are toko-scoped.
- A permission granted in one toko does not apply to another toko.
- Overrides are user-specific.
- Overrides do not change the user's role.
- Overrides do not change the toko plan.
- Overrides do not enable disabled toko features.
- Overrides should only be written for permissions in the toko/module permission registry.
- Overrides should not be written for global, platform, account/profile, affiliate, billing, or shared catalog behavior.

## Runtime Validation

Database rows can contain strings that TypeScript cannot guarantee at runtime. Add a validation step when reading overrides.

Recommended behavior:

- Ignore unknown permission keys when computing access.
- Optionally log unknown keys during development.
- Do not crash user requests because of one stale permission key.
- Do not allow writing unknown permission keys.

Example helper from Phase 1:

```ts
isPermissionKey(value: string): value is PermissionKey
```

Read helpers should use it before returning overrides to the rest of the app.

## Read Helpers

Add a server-side helper that loads overrides for a user in a toko.

Possible location:

```txt
lib/auth/request-scope.ts
```

or, if it grows:

```txt
lib/permissions/db.ts
```

Recommended return shape:

```ts
type UserPermissionOverride = {
  permissionKey: PermissionKey;
  effect: PermissionEffect;
};
```

Suggested helper:

```ts
async function getUserPermissionOverrides(
  tokoId: string,
  userId: string,
): Promise<UserPermissionOverride[]>;
```

Rules:

- Filter by both `tokoId` and `userId`.
- Validate permission keys with `isPermissionKey()`.
- Return only valid permission overrides.
- Do not include permission rows for users outside the toko.

Membership should already be established by request scope before permission access is trusted.

## Request Scope Additions

Extend the request scope with permission access.

Target shape:

```ts
type RequestScope = {
  user: AuthUser;
  tokoId: string;
  plan: SubscriptionPlan;
  disabledFeatures: FeatureKey[];
  featureAccess: FeatureAccessMap;
  permissionOverrides: UserPermissionOverride[];
  permissionAccess: PermissionAccessMap;
};
```

The scope should represent access for the current user in the current toko only.

## Permission Access Computation

`permissionAccess` should combine:

- Role defaults from Phase 1.
- Valid per-user overrides from the database.
- Required feature mapping from `PERMISSION_REGISTRY`.
- Current toko feature availability from existing `featureAccess`.

Expected rule:

```txt
permission allowed = user has effective permission + required feature is available
```

If the permission has `requiredFeature: null`, then only user authority is needed after toko membership is confirmed.

Important distinction:

```txt
effective permission = user authority only
permission access = user authority + feature availability
```

This distinction matters because the UI may need to explain why a permission is locked.

## Lock Reasons

Expose a lock reason so UI and debugging can explain why access is denied.

Suggested reasons:

```ts
type PermissionLockReason =
  | "missing_permission"
  | "feature_unavailable";
```

If useful, split feature reasons later:

```ts
type PermissionLockReason =
  | "missing_permission"
  | "plan_unavailable"
  | "toko_feature_disabled";
```

Prefer starting with the simpler reason if existing `featureAccess` does not already expose more detailed reasons.

## Helper Semantics

Add helpers that work with request scope.

Recommended helpers:

```ts
function can(
  scope: RequestScope,
  permissionKey: PermissionKey,
): boolean;

function getPermissionLockReason(
  scope: RequestScope,
  permissionKey: PermissionKey,
): PermissionLockReason | null;

function assertPermission(
  scope: RequestScope,
  permissionKey: PermissionKey,
): void;
```

Expected behavior:

- `can()` returns `true` only when permission access is allowed.
- `getPermissionLockReason()` returns `null` when allowed.
- `assertPermission()` throws or calls the existing access-denied pattern when not allowed.
- `assertPermission()` must not replace membership validation. It assumes scope creation already validated membership.

## Error Behavior

Use the existing project pattern for access denial.

Before implementing, inspect current behavior in:

```txt
lib/auth/request-scope.ts
actions/*
app/(dashboard)/[tokoid]/*
```

The permission assertion should feel consistent with existing `assertFeature()` and role errors.

Recommended semantics:

- Missing permission returns the same class of authorization error as role denial.
- Feature unavailable returns the same class of error as `assertFeature()` denial.
- Server actions should receive predictable errors once they migrate later.

## Write Helpers For Future UI

Phase 2 may add low-level write helpers, but no full UI.

Possible helpers:

```ts
async function setUserPermissionOverride(input: {
  tokoId: string;
  targetUserId: string;
  permissionKey: PermissionKey;
  effect: PermissionEffect;
}): Promise<void>;

async function clearUserPermissionOverride(input: {
  tokoId: string;
  targetUserId: string;
  permissionKey: PermissionKey;
}): Promise<void>;
```

If added in Phase 2, these helpers must not be exposed to staff or technicians.

Rules for write helpers:

- Validate `permissionKey`.
- Reject permissions with `grantableInV1: false` unless the operation is internal seed/admin setup.
- Require caller to be admin or use an admin-only action wrapper.
- Ensure target user belongs to the same toko.
- Revalidate affected pages only when UI exists later.
- Do not add write helpers for superuser, affiliate, account/profile, billing, or shared device catalog access.

It is acceptable to defer write helpers to Phase 4 if Phase 2 only needs read access.

## Admin Safety Rules

Phase 2 introduces data that can make users more powerful later, so write paths must be conservative.

V1 safety rules:

- Staff cannot grant permissions.
- Technicians cannot grant permissions.
- Admins cannot grant non-grantable V1 permissions through normal UI/actions.
- Permissions cannot grant billing ownership unless explicitly redesigned.
- Permissions cannot grant feature-settings management unless explicitly redesigned.
- Permissions cannot grant permission-management itself in V1.
- Permissions cannot grant superuser, affiliate management, billing, account/profile, or shared device catalog access.

## Backward Compatibility

Existing pages and actions should still behave as before.

This means:

- Existing role checks remain active.
- Existing feature checks remain active.
- Existing route protection remains active.
- Existing navigation remains role/feature-based.
- Permission access may be computed but should not yet decide access for migrated modules until Phase 3 or later.

The only visible behavior change should be none.

## Example Access Computation

Example 1: staff gets inventory create permission.

```txt
role: staff
role default: inventory.view
override: allow inventory.create
required feature: inventory.management
feature available: yes
result:
  inventory.view allowed
  inventory.create allowed
```

Example 2: staff gets analytics permission but plan does not allow analytics.

```txt
role: staff
override: allow analytics.view
required feature: analytics.revenue
feature available: no
result:
  analytics.view denied
  lock reason: feature_unavailable
```

Example 3: admin has delete denied.

```txt
role: admin
role default: inventory.delete
override: deny inventory.delete
required feature: inventory.management
feature available: yes
result:
  inventory.delete denied
  lock reason: missing_permission
```

Whether admins can be restricted by denies is still listed as an open decision in the main plan. If undecided during implementation, ask before applying admin denies in production logic.

## Open Decision: Admin Denies

There is one important product decision before depending on permission access:

```txt
Can an admin user be restricted by explicit deny overrides?
```

Options:

- Admin denies apply like any other role.
- Admin denies are ignored for ownership-level permissions.
- Admin denies are not supported in V1.

Recommended for V1 safety:

```txt
Allow admin denies for operational permissions, but do not allow admins to remove their own ownership-level safety permissions until ownership rules are designed.
```

This does not need to block Phase 2 if no production path depends on admin denies yet.

## Manual Verification

No verification command is required unless explicitly requested.

Review manually that:

- The Prisma model matches the intended unique constraints.
- Permission overrides are always toko-scoped.
- Unknown permission keys are filtered or rejected.
- Request scope still validates toko membership before permission access is trusted.
- `permissionAccess` denies when required features are unavailable.
- Existing behavior is unchanged because no production checks have been replaced yet.
- No permission write helper can grant non-grantable V1 permissions.
- No persistence or request-scope code treats global, platform, personal account, billing, affiliate, or shared device catalog behavior as toko permissions.

## Migration Notes

When adding the Prisma model:

- Use the repository's Prisma 7 structure.
- Keep generated client conventions intact.
- Do not assume Prisma enums are the same as TypeScript unions.
- Remember this repo uses Bun commands.
- Do not run migration/build/typecheck commands unless explicitly requested.

## Risks

- Storing permission keys as strings means stale keys can exist after renames.
- Request scope can become heavier if it loads too much data per request.
- Permission access can be misread as replacing feature access too early.
- Write helpers can create privilege escalation if they are not admin-only.
- Admin deny behavior can create lockout scenarios if ownership controls are not protected.

## Exit Criteria

Phase 2 is complete when:

- `TokoUserPermission` and `PermissionEffect` are modeled.
- Permission overrides can be loaded for a user and toko.
- Invalid or stale permission keys are handled safely.
- `getRequestScope(tokoId)` exposes effective permission access.
- `can()`, `assertPermission()`, and lock-reason helpers exist.
- Permissions cannot bypass plan availability, toko-disabled features, or toko membership.
- Existing pages/actions still behave as before.
