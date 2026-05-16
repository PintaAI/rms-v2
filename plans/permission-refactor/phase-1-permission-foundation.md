# Phase 1: Permission Foundation

## Goal

Add the permission primitives to the codebase without changing runtime behavior.

At the end of this phase, the app should have a permission registry and pure helper functions, but no production route, page, action, or navigation path should depend on the new system yet.

## Why This Phase Exists

This phase creates the permission language the rest of the refactor will use. It should be safe to merge because it does not change existing access checks.

The main purpose is to make permission behavior explicit and reviewable before database persistence and request-scope integration are introduced.

## Scope

Add a new permission module, likely:

```txt
lib/permissions.ts
```

This module should define:

- `PermissionKey`
- `PermissionCategory`
- `PermissionEffect`
- `PERMISSION_REGISTRY`
- `ROLE_DEFAULT_PERMISSIONS`
- Pure helpers for permission computation
- Pure helpers for permission metadata lookup
- Optional constants for non-grantable permissions

## Non-Goals

- Do not add Prisma models yet.
- Do not read permissions from the database yet.
- Do not modify `getRequestScope()` yet.
- Do not replace existing role checks yet.
- Do not replace existing feature checks yet.
- Do not add permission management UI yet.
- Do not migrate routes yet.

## Suggested File Shape

Start with one file unless it becomes too large.

Recommended initial file:

```txt
lib/permissions.ts
```

Possible future split, only if needed:

```txt
lib/permissions/registry.ts
lib/permissions/defaults.ts
lib/permissions/effective.ts
lib/permissions/types.ts
```

Prefer the single-file version in Phase 1 to keep the change easy to review.

## Core Types

Define permission keys from the registry rather than maintaining a separate string union manually.

Example direction:

```ts
import type { FeatureKey } from "@/lib/features";

export type PermissionCategory =
  | "inventory"
  | "service"
  | "retail"
  | "karyawan"
  | "analytics"
  | "whatsapp"
  | "toko"
  | "features";

export type PermissionSensitivity =
  | "operational"
  | "sensitive"
  | "ownership";

export type PermissionMetadata = {
  label: string;
  description: string;
  category: PermissionCategory;
  requiredFeature: FeatureKey | null;
  grantableInV1: boolean;
  sensitivity: PermissionSensitivity;
};

export type PermissionEffect = "allow" | "deny";
```

Then derive:

```ts
export type PermissionKey = keyof typeof PERMISSION_REGISTRY;
```

## Permission Registry

The registry should be the canonical source of valid permissions.

Example shape:

```ts
export const PERMISSION_REGISTRY = {
  "inventory.view": {
    label: "View inventory",
    description: "Can view inventory items and stock levels.",
    category: "inventory",
    requiredFeature: "inventory.management",
    grantableInV1: true,
    sensitivity: "operational",
  },
  "inventory.create": {
    label: "Create inventory items",
    description: "Can create new inventory items.",
    category: "inventory",
    requiredFeature: "inventory.management",
    grantableInV1: true,
    sensitivity: "operational",
  },
  "karyawan.managePermissions": {
    label: "Manage employee permissions",
    description: "Can grant or revoke permissions for toko users.",
    category: "karyawan",
    requiredFeature: null,
    grantableInV1: false,
    sensitivity: "ownership",
  },
} as const satisfies Record<string, PermissionMetadata>;
```

Important rules:

- Every key must be unique.
- Every permission must have a category.
- Every permission must decide `requiredFeature` explicitly.
- Every permission must decide `grantableInV1` explicitly.
- Every permission must decide `sensitivity` explicitly.
- The registry should not contain role-specific permission names.

## Role Defaults

Role defaults should preserve current behavior as closely as possible.

Example shape:

```ts
export const ROLE_DEFAULT_PERMISSIONS = {
  admin: [
    "inventory.view",
    "inventory.create",
    "inventory.update",
    "inventory.delete",
    "karyawan.managePermissions",
  ],
  staff: [
    "inventory.view",
    "retail.sell",
  ],
  technician: [
    "service.view",
    "service.updateStatus",
  ],
} as const satisfies Record<UserRole, readonly PermissionKey[]>;
```

Rules:

- Defaults should not decide feature availability.
- Defaults should only describe authority normally granted by role.
- Admin can include ownership-level permissions by default.
- Staff and technicians should not include ownership-level permissions by default.
- If current behavior is unclear, prefer preserving existing access over changing it in Phase 1.

## Effective Permission Computation

The V1 rule is:

```txt
effective permissions = role defaults + explicit allows - explicit denies
```

Define an override input shape that can later map cleanly to Prisma rows:

```ts
export type PermissionOverrideInput = {
  permissionKey: PermissionKey;
  effect: PermissionEffect;
};
```

Suggested helper:

```ts
export function getEffectivePermissionKeys(
  role: UserRole,
  overrides: readonly PermissionOverrideInput[],
): Set<PermissionKey> {
  const permissions = new Set<PermissionKey>(ROLE_DEFAULT_PERMISSIONS[role]);

  for (const override of overrides) {
    if (override.effect === "allow") {
      permissions.add(override.permissionKey);
    } else {
      permissions.delete(override.permissionKey);
    }
  }

  return permissions;
}
```

Important behavior:

- Explicit allow adds a permission even if the role default does not include it.
- Explicit deny removes a permission even if the role default includes it.
- Unknown permission keys should not be representable in TypeScript.
- Runtime validation for database values can be added in Phase 2.

## Permission Access Shape

Phase 1 can define the target access result type without using it in production.

Example:

```ts
export type PermissionLockReason =
  | "missing_permission"
  | "feature_unavailable"
  | "unknown_permission";

export type PermissionAccess = {
  allowed: boolean;
  permissionKey: PermissionKey;
  requiredFeature: FeatureKey | null;
  lockReason: PermissionLockReason | null;
};

export type PermissionAccessMap = Record<PermissionKey, PermissionAccess>;
```

In Phase 1, this can remain unused or be generated by pure helpers that accept feature availability as input.

## Feature Mapping Behavior

Permissions should not replace feature gates. They should sit above them.

Expected decision order later:

```txt
1. user belongs to toko
2. required feature is available for toko
3. user has effective permission
```

In Phase 1, helper functions can prepare for this by accepting a feature lookup callback or a simple map.

Example:

```ts
type FeatureAvailabilityLookup = (featureKey: FeatureKey) => boolean;
```

Do not import request-scope logic into `lib/permissions.ts`. Keep this file pure.

## Helper Functions

Recommended helpers:

```ts
export function isPermissionKey(value: string): value is PermissionKey;

export function getPermissionMetadata(
  permissionKey: PermissionKey,
): PermissionMetadata;

export function getPermissionsByCategory(
  category: PermissionCategory,
): PermissionKey[];

export function getGrantablePermissionsInV1(): PermissionKey[];

export function getRoleDefaultPermissions(
  role: UserRole,
): readonly PermissionKey[];

export function getEffectivePermissionKeys(
  role: UserRole,
  overrides: readonly PermissionOverrideInput[],
): Set<PermissionKey>;
```

Optional helper if useful:

```ts
export function hasEffectivePermission(
  role: UserRole,
  overrides: readonly PermissionOverrideInput[],
  permissionKey: PermissionKey,
): boolean;
```

## Validation Rules

Phase 1 should make invalid states difficult:

- Role defaults must only contain keys from `PERMISSION_REGISTRY`.
- Permission categories should be finite and typed.
- Required features must be valid `FeatureKey` values or `null`.
- V1 grantability must be explicit.
- Ownership-level permissions should generally have `grantableInV1: false` unless there is a deliberate product decision.

## Suggested Initial Permission Set

Use the Phase 0 audit result as the source of truth. If implementation must start before the full audit is complete, start with inventory only:

```txt
inventory.view
inventory.create
inventory.update
inventory.delete
inventory.restock
inventory.audit
```

Then add only the admin-only guardrail permissions needed to express non-grantable behavior:

```txt
karyawan.managePermissions
features.manage
billing.manage
toko.manageOwnership
```

Avoid adding a large speculative registry before auditing the modules.

## Manual Verification

No verification command is required unless explicitly requested.

Review manually that:

- The registry compiles conceptually against known `FeatureKey` names.
- The role default matrix matches Phase 0 audit decisions.
- All permission keys use the naming rules.
- All permissions have explicit `requiredFeature` values.
- All ownership-level permissions are not grantable in V1.
- No existing route, page, action, or nav path imports the new permission helpers yet.

## Behavior Examples

Example 1: staff default plus allow.

```txt
role default: inventory.view
override allow: inventory.create
effective: inventory.view, inventory.create
```

Example 2: admin default plus deny.

```txt
role default: inventory.view, inventory.create, inventory.delete
override deny: inventory.delete
effective: inventory.view, inventory.create
```

Example 3: permission exists but feature is unavailable.

```txt
effective permission: analytics.view
required feature: analytics.revenue
toko plan: free
result later: denied because feature is unavailable
```

Phase 1 only defines the primitives for these examples. Phase 2 wires them into request scope.

## Risks

- A registry that is too broad can encode wrong assumptions before the audit is complete.
- Role defaults that do not match current behavior can create regressions once Phase 2 and later phases start using them.
- Mixing feature availability into effective permission computation can make the model harder to reason about.
- Adding route/action imports too early can accidentally change behavior.

## Exit Criteria

Phase 1 is complete when:

- `PermissionKey` is defined from a registry.
- `PERMISSION_REGISTRY` exists with metadata for each V1 permission.
- `ROLE_DEFAULT_PERMISSIONS` exists and reflects the Phase 0 audit.
- Pure helpers can compute effective permissions from role defaults and overrides.
- V1 non-grantable permissions are marked explicitly.
- Current app behavior remains unchanged.
- No production path depends on the new permission system yet.
