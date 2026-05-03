# Auth, Feature Gate, and Request Scope Architecture Plan

## Status

Draft implementation blueprint.

This document describes a future-proof refactor for authentication, toko scoping, plan limits, and feature gates. The goal is to make authorization easier to maintain, cheaper at runtime, and safer to evolve when plans, limits, or features change.

## Goals

- Make auth and authorization data flow explicit and centralized.
- Reduce repeated session, toko access, plan, and feature gate checks.
- Make plan and feature changes data-driven from one source of truth.
- Separate read data fetching from mutation actions following Next.js app-router best practices.
- Keep client components simple by giving them a server-computed dashboard scope.
- Make future changes like `free/premium/enterprise` to `basic/pro` require minimal code changes.

## Non-Goals

- This is not a UI redesign.
- This does not change product behavior by itself.
- This does not remove server-side authorization from mutations.
- This does not make client context trusted for security decisions.
- This does not introduce an external permission service.

## Current State

The project currently has these separate concepts:

- `lib/rbac.ts` handles session user loading, toko membership, effective plan resolution, role helpers, and superuser guard.
- `lib/features.ts` holds `FEATURE_REGISTRY`, `PLAN_LIMITS`, plan comparison, and feature gate evaluation.
- `actions/feature-settings.ts` stores per-toko disabled feature settings.
- Dashboard layouts fetch auth user, effective plan, disabled features, feature access map, and stats.
- Child layouts also perform auth and role checks.
- Pages and actions often re-fetch auth or gate state again.
- `AuthProvider` is client-side and still loads auth provider data after mount.
- Feature access is currently exposed via `FeatureAccessProvider`.

Recent optimization already improved performance by:

- Wrapping `getAuthUser()` in `React.cache()`.
- Wrapping `getEffectivePlanForToko()` in `React.cache()`.
- Adding cached disabled feature lookup through `lib/feature-cache.ts`.
- Merging auth provider data into `getAuthProviderData()`.
- Removing one dead direct session check in teknisi task page.
- Removing redundant invoice update re-fetches inside `updateInvoiceIfAllowed()`.

Those changes reduce repeated database hits, but the architecture is still spread across several layers.

## Current Pain Points

### 1. Auth Data Is Recomputed In Many Places

Even with `cache()`, many files still manually ask for the same concepts:

- current user
- toko access
- effective plan
- disabled feature list
- feature access map

This makes code harder to reason about.

### 2. Authorization Is Scattered

Actions commonly perform checks like:

```ts
const user = await getAuthUser();
if (!user) return unauthorized();
if (!canAccessToko(user, tokoId)) return forbidden();
const plan = await getEffectivePlanForToko(user, tokoId);
const disabledFeatures = await getDisabledFeaturesForToko(tokoId);
const featureError = ensureFeatureAccess({ ...user, plan }, "some.feature", disabledFeatures);
if (featureError) return featureError;
```

The same pattern appears repeatedly with slight variations.

### 3. Feature Gates And Global Capabilities Are Mixed

Some capabilities are not really configurable product features. Example:

- dashboard overview
- toko management
- service management

These are role/capability checks, not plan/feature settings. They should not live in the same registry as configurable feature gates.

### 4. Client Auth Provider Still Loads Server Data

`AuthProvider` is useful for client components, but it should not be the main source of dashboard scope. Server layouts already know the authenticated user and current toko.

### 5. Reads And Mutations Are Mixed In Server Actions

Next.js best practice:

- Server Components should fetch internal read data directly.
- Server Actions should be used for mutations.

The current code uses actions for many reads as well. This works, but it increases the chance of repeated auth checks and makes data dependencies less obvious.

## Target Architecture

Introduce a centralized request scope layer.

```txt
Request
  -> proxy.ts
       session cookie routing only

  -> Server Layout / Server Page / Server Action
       getRequestScope(tokoId)
         -> getRequestUser()
         -> assert authenticated
         -> assert toko access
         -> resolve effective plan
         -> load disabled features
         -> compute feature access map

  -> Server Components
       read data directly from lib/data/* using RequestScope

  -> Server Actions
       mutate after assertRole/assertFeature/assertPlanLimit

  -> Client Components
       read dashboard context from DashboardScopeProvider
```

## Core Concepts

### Request User

`RequestUser` is the authenticated identity for the current request.

It answers:

- who is logged in?
- what role do they have?
- what toko IDs are they assigned to?
- what is their default/effective global plan?

Suggested file:

```txt
lib/auth/request-user.ts
```

Suggested API:

```ts
export const getRequestUser = cache(async (): Promise<AuthUser | null> => {
  // session + user toko assignments + base plan
});

export async function requireRequestUser(): Promise<AuthUser> {
  const user = await getRequestUser();
  if (!user) throw new AuthError("unauthorized");
  return user;
}
```

### Request Scope

`RequestScope` is the complete server-side authorization context for a specific toko.

Suggested file:

```txt
lib/auth/request-scope.ts
```

Suggested type:

```ts
export type RequestScope = {
  user: AuthUser;
  tokoId: string;
  plan: SubscriptionPlan;
  disabledFeatures: FeatureKey[];
  featureAccess: FeatureAccessMap;
  capabilities: CapabilityAccessMap;
};
```

Suggested API:

```ts
export const getRequestScope = cache(async (tokoId: string): Promise<RequestScope> => {
  const user = await requireRequestUser();
  assertTokoAccess(user, tokoId);

  const [plan, disabledFeatures] = await Promise.all([
    getEffectivePlanForToko(user, tokoId),
    getCachedDisabledFeatures(tokoId),
  ]);

  return {
    user: { ...user, plan },
    tokoId,
    plan,
    disabledFeatures,
    featureAccess: getFeatureAccessMap({ role: user.role, plan, disabledFeatures }),
    capabilities: getCapabilityAccessMap(user.role),
  };
});
```

### Capability

A capability is a role-based ability that is not controlled by plan or toko feature setting.

Examples:

- `dashboard.overview`
- `toko.manage`
- `service.management`

Suggested registry:

```ts
export type CapabilityKey =
  | "dashboard.overview"
  | "toko.manage"
  | "service.management";

export const CAPABILITY_REGISTRY = {
  "dashboard.overview": {
    label: "Dashboard Overview",
    allowedRoles: ["admin", "staff", "technician"],
  },
  "toko.manage": {
    label: "Manajemen Toko",
    allowedRoles: ["admin"],
  },
  "service.management": {
    label: "Manajemen Service",
    allowedRoles: ["admin", "staff"],
  },
} as const;
```

### Feature Gate

A feature gate is controlled by:

- role
- minimum plan
- per-toko disabled feature setting

Examples:

- `inventory.management`
- `staff.workflow`
- `technician.workflow`
- `analytics.revenue`
- `inventory.audit`

Feature gates remain in `FEATURE_REGISTRY`.

### Plan Registry

Move plan ordering and limits into a single `PLAN_REGISTRY`.

Suggested file:

```txt
lib/plans.ts
```

Suggested type:

```ts
export type SubscriptionPlan = keyof typeof PLAN_REGISTRY;

export const PLAN_REGISTRY = {
  free: {
    label: "Free",
    rank: 0,
    limits: {
      maxTokos: 1,
      maxStaff: 0,
      maxTechnicians: 0,
      maxServicesMonthly: 50,
      maxInvoicesMonthly: 50,
    },
  },
  premium: {
    label: "Premium",
    rank: 1,
    limits: {
      maxTokos: 3,
      maxStaff: 5,
      maxTechnicians: 5,
      maxServicesMonthly: null,
      maxInvoicesMonthly: null,
    },
  },
  enterprise: {
    label: "Enterprise",
    rank: 2,
    limits: {
      maxTokos: null,
      maxStaff: null,
      maxTechnicians: null,
      maxServicesMonthly: null,
      maxInvoicesMonthly: null,
    },
  },
} as const;
```

Helper functions:

```ts
export function normalizePlan(plan: string | null | undefined): SubscriptionPlan;
export function isPlanAtLeast(plan: string | null | undefined, minimumPlan: SubscriptionPlan): boolean;
export function getPlanLimit(plan: string | null | undefined, limitKey: PlanLimitKey): number | null;
export function getPlanOptions(): PlanMetadata[];
```

## Why `PLAN_REGISTRY` Matters

If the business later changes from three plans to two plans, the intended migration path should be mostly data-driven.

Example future plan change:

```txt
free + premium + enterprise
-> basic + pro
```

Code changes should be limited to:

- update `PLAN_REGISTRY`
- update `FEATURE_REGISTRY.minimumPlan` values
- update onboarding recommendation copy/rules if needed
- run a database migration to map old plan strings to new plan strings

The rest should keep working because all checks call helper functions.

## Proposed File Structure

```txt
lib/auth/
  request-user.ts
  request-scope.ts
  authorization.ts

lib/features/
  capabilities.ts
  feature-registry.ts
  feature-access.ts

lib/plans.ts

lib/data/
  dashboard.ts
  services.ts
  inventory.ts
  karyawan.ts
  toko.ts

components/dashboard/layout/
  dashboard-scope-context.tsx

actions/
  service-mutations.ts
  inventory-mutations.ts
  karyawan-mutations.ts
```

This can be migrated gradually. We do not need to rename every file at once.

## Authorization API

Use assert-style helpers internally.

Suggested file:

```txt
lib/auth/authorization.ts
```

Suggested API:

```ts
export class AuthError extends Error {
  code: "unauthorized" | "forbidden" | "feature_locked" | "plan_limit";
}

export function assertTokoAccess(user: AuthUser, tokoId: string): void;

export function assertRole(scope: RequestScope, allowedRoles: UserRole[]): void;

export function assertCapability(scope: RequestScope, capability: CapabilityKey): void;

export function assertFeature(scope: RequestScope, feature: FeatureKey): void;

export function assertPlanLimit(scope: RequestScope, limitKey: PlanLimitKey, currentCount: number, incomingCount?: number): void;
```

Server actions should catch and convert these errors to `ActionResult`.

Example:

```ts
export async function createKaryawan(tokoId: string, input: CreateKaryawanInput): Promise<ActionResult> {
  try {
    const scope = await getRequestScope(tokoId);
    assertFeature(scope, "karyawan.management");
    assertRole(scope, ["admin"]);

    // mutation

    return { success: true };
  } catch (error) {
    return actionError(error);
  }
}
```

## Dashboard Scope Provider

`FeatureAccessProvider` is useful but too narrow. Replace or wrap it with `DashboardScopeProvider`.

Suggested type:

```ts
type DashboardScopeContextValue = {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    plan: SubscriptionPlan;
  };
  tokoId: string;
  tokoList: TokoItem[];
  currentToko: TokoItem | null;
  featureAccess: FeatureAccessMap;
  capabilities: CapabilityAccessMap;
  disabledFeatures: FeatureKey[];
};
```

Suggested usage:

```tsx
const scope = await getRequestScope(tokoid);
const tokoList = await getTokoListForUser(scope.user.id);

return (
  <DashboardScopeProvider value={{ ...scope, tokoList, currentToko }}>
    {children}
  </DashboardScopeProvider>
);
```

Client components use:

```ts
const { user, tokoList, featureAccess, capabilities } = useDashboardScope();
```

This reduces reliance on global `AuthProvider` for dashboard-specific data.

## AuthProvider Future Role

`AuthProvider` should be simplified.

It should handle:

- client session state
- sign out / refetch session
- global user dropdown needs outside dashboard

It should not be the main source for:

- dashboard toko list
- current toko
- dashboard feature access
- effective toko-scoped plan

Those belong to `DashboardScopeProvider`.

## Server Component Reads

Move internal reads from server actions to `lib/data/*`.

Current style:

```ts
const result = await getAdminOverview(tokoid);
```

Target style:

```ts
const scope = await getRequestScope(tokoid);
const overview = await getAdminOverviewData(scope);
```

Suggested data function:

```ts
export async function getAdminOverviewData(scope: RequestScope) {
  assertRole(scope, ["admin"]);
  assertCapability(scope, "dashboard.overview");

  return prisma.service.findMany({
    where: { tokoId: scope.tokoId },
  });
}
```

Benefits:

- reads stay server-only
- no unnecessary Server Action POST overhead
- easier to preload and compose with `Promise.all`
- easier to share cached request scope

## Server Actions For Mutations

Server Actions should remain the boundary for mutations.

Target shape:

```ts
export async function addServiceItem(tokoId: string, input: AddItemInput): Promise<ActionResult> {
  try {
    const scope = await getRequestScope(tokoId);
    assertFeature(scope, input.type === "sparepart" ? "inventory.management" : "service.manualItems");

    // mutate DB
    revalidateServicePaths(scope.tokoId);

    return { success: true };
  } catch (error) {
    return actionError(error);
  }
}
```

## Request Scope Cache Rules

Use `React.cache()` for request-lifetime memoization.

Good candidates:

- `getRequestUser()`
- `getRequestScope(tokoId)`
- `getTokoListForUser(userId)`
- `getCachedDisabledFeatures(tokoId)`

Avoid long-lived caching for auth-critical data unless invalidation is clear.

Do not use `'use cache'` for per-user auth data unless carefully keyed and invalidated. `React.cache()` is safer here because it is per request/render pass.

## Plan And Feature Registry Design

### Plan Registry

All plan data should live in `PLAN_REGISTRY`.

Plan data includes:

- label
- rank/order
- limits
- optional marketing copy
- optional recommended-for copy

### Feature Registry

All gated feature data should live in `FEATURE_REGISTRY`.

Feature data includes:

- label
- description
- category
- allowed roles
- minimum plan
- configurable
- optional preview type
- optional upgrade CTA copy

### Capability Registry

All global non-configurable capabilities should live in `CAPABILITY_REGISTRY`.

Capability data includes:

- label
- description
- allowed roles

## Future Plan Change Scenarios

### Scenario A: Change A Limit

Example: Premium staff limit from 5 to 10.

Expected changed files:

- `lib/plans.ts`

Expected automatic effects:

- plan limit enforcement
- billing summary
- onboarding recommendation
- settings UI labels

### Scenario B: Move Feature To Lower Plan

Example: `inventory.management` from Premium to Free.

Expected changed files:

- `lib/features/feature-registry.ts`

Expected automatic effects:

- page access
- action access
- sidebar locked state
- billing included/locked features
- onboarding recommendation

### Scenario C: Remove Enterprise Plan

Example: `free/premium/enterprise` to `free/pro`.

Expected changed files:

- `lib/plans.ts`
- `lib/features/feature-registry.ts` for any `enterprise` minimum plan
- onboarding recommendation rules/copy
- pricing/billing UI copy
- database migration for subscription records

Expected migration:

```sql
UPDATE subscription
SET plan = 'pro'
WHERE plan IN ('premium', 'enterprise');
```

Exact mapping depends on business decision.

### Scenario D: Rename Plans

Example: `free/premium/enterprise` to `starter/growth/scale`.

Expected changed files:

- `lib/plans.ts`
- `lib/features/feature-registry.ts`
- database migration
- UI copy

Important: keep a temporary legacy mapping if existing data can contain old values.

```ts
const LEGACY_PLAN_MAP = {
  free: "starter",
  premium: "growth",
  enterprise: "scale",
} as const;
```

Remove the mapping after data migration is complete and old values are impossible.

## Migration Plan

### Phase 0: Stabilize Current Optimizations

Status: mostly done.

Tasks:

- Keep `getAuthUser()` cached.
- Keep `getEffectivePlanForToko()` cached.
- Keep cached disabled features wrapper.
- Keep merged auth provider action until dashboard scope replaces it.
- Ensure `bun run lint` and `bun run build` pass.

Acceptance criteria:

- No runtime behavior change.
- Build passes.
- No new auth bypass.

### Phase 1: Introduce Request Scope

Tasks:

- Add `lib/auth/request-user.ts` or evolve `lib/rbac.ts` carefully.
- Add `lib/auth/request-scope.ts`.
- Add `lib/auth/authorization.ts`.
- Add `getRequestScope(tokoId)`.
- Add `assertTokoAccess`, `assertRole`, `assertFeature`, `assertCapability`, `assertPlanLimit`.
- Add `actionError(error)` converter.

Initial compatibility:

- Keep existing functions as wrappers.
- Do not refactor all actions yet.

Acceptance criteria:

- Existing pages still work.
- New `getRequestScope()` is used by at least parent dashboard layout.
- Build passes.

### Phase 2: Split Capability Registry From Feature Registry

Tasks:

- Create `CAPABILITY_REGISTRY`.
- Create `CapabilityKey` and `CapabilityAccessMap`.
- Move non-configurable role-only keys there.
- Keep `FEATURE_REGISTRY` only for plan/toko-configurable gates.
- Update sidebar access map generation to combine capability access + feature access.

Acceptance criteria:

- Feature settings UI shows only true feature gates.
- Sidebar behavior stays unchanged.
- Billing plan feature list does not include global capabilities.

### Phase 3: Introduce Plan Registry

Tasks:

- Create `lib/plans.ts`.
- Move `SubscriptionPlan`, `PLAN_LIMITS`, plan labels, and plan order there.
- Update imports from `lib/features.ts` to `lib/plans.ts`.
- Keep backward-compatible re-exports temporarily if needed.

Acceptance criteria:

- `isPlanAtLeast`, `normalizePlan`, and `getPlanLimit` read from `PLAN_REGISTRY`.
- All plan UI and enforcement use the same source.

### Phase 4: Dashboard Scope Provider

Tasks:

- Add `components/dashboard/layout/dashboard-scope-context.tsx`.
- Parent `[tokoid]/layout.tsx` computes scope once.
- Parent layout also fetches toko list/current toko once.
- Replace `FeatureAccessProvider` with `DashboardScopeProvider`, or make it a wrapper around dashboard scope.
- Migrate client components from `useAuth()` and `useFeatureAccess()` to `useDashboardScope()` where dashboard-scoped data is needed.

Migration candidates:

- `components/dashboard/layout/app-sidebar.tsx`
- `components/dashboard/layout/app-sidebar-header.tsx`
- `components/dashboard/layout/app-sidebar-footer.tsx`
- `components/dashboard/admin/feature-settings-tab.tsx`
- `components/dashboard/admin/whatsapp-settings-tab.tsx`
- `components/dashboard/teknisi/teknisi-overview.tsx`
- `components/dashboard/services/teknisi-task-manager.tsx`

Acceptance criteria:

- Dashboard client components do not depend on `AuthProvider` for toko-scoped data.
- `AuthProvider` remains only for global auth/session concerns.

### Phase 5: Refactor Server Component Reads

Tasks:

- Create `lib/data/dashboard.ts`.
- Create `lib/data/services.ts`.
- Create `lib/data/inventory.ts`.
- Create `lib/data/karyawan.ts`.
- Move read-only server actions into these files.
- Pages call data functions directly with `RequestScope`.

Examples:

- `getAdminOverview` -> `getAdminOverviewData(scope)`
- `getStaffOverview` -> `getStaffOverviewData(scope)`
- service list queries -> `getServiceListData(scope, filters)`
- inventory list queries -> `getInventoryData(scope, filters)`

Acceptance criteria:

- Server Actions are primarily mutations.
- Read functions do not call `getAuthUser()` themselves; they accept `RequestScope`.

### Phase 6: Refactor Mutations To Request Scope

Tasks:

- Update each mutation action to start with `const scope = await getRequestScope(tokoId)`.
- Replace manual auth checks with assert helpers.
- Replace manual feature errors with `assertFeature()`.
- Replace manual limit checks with `assertPlanLimit()`.
- Keep `ActionResult` response shape unchanged.

Mutation groups:

- service mutations
- inventory mutations
- karyawan mutations
- toko mutations
- feature settings mutations
- whatsapp settings mutations

Acceptance criteria:

- No action manually repeats session + toko + plan + disabled feature fetch sequence.
- Error messages remain user-friendly.
- Build passes.

### Phase 7: Simplify AuthProvider

Tasks:

- Remove dashboard-specific fetches from `AuthProvider`.
- Keep `useSession()` and `refetchSession()`.
- Keep global user display data only if needed outside dashboard.
- If `DashboardScopeProvider` covers all dashboard usage, remove `getAuthProviderData()` or restrict it to non-dashboard pages.

Acceptance criteria:

- Dashboard shell does not wait on client-side auth provider fetch.
- No loading flicker caused by toko list loading in client provider.

### Phase 8: Cleanup And Tests

Tasks:

- Delete unused helpers.
- Remove temporary re-exports.
- Remove duplicate role helper functions.
- Add unit tests for plan helpers.
- Add unit tests for feature access evaluation.
- Add unit tests for capability access evaluation.
- Add integration-style tests or scripted checks for common roles/plans.

Acceptance criteria:

- No unused exports.
- No duplicated auth logic.
- Plan and feature behavior covered by tests.

## Suggested Refactor Order By Risk

### Low Risk

- Add new files and wrappers.
- Add plan registry while preserving old exports.
- Add capability registry.
- Add request scope without migrating actions yet.

### Medium Risk

- Migrate layouts to request scope.
- Migrate dashboard client components to dashboard scope.
- Move read actions to data functions.

### High Risk

- Refactor large mutation files like `service-mutations.ts`.
- Remove old APIs.
- Rename plan values in database.

## Security Rules

- Client context is never trusted for mutation authorization.
- Every mutation must call `getRequestScope(tokoId)` or equivalent server-side guard.
- Every toko-scoped read must verify toko access server-side.
- Feature settings can only disable configurable features.
- Plan limits must be checked server-side immediately before writes.
- Superuser routes should stay separate from toko-scoped request scope unless explicitly needed.

## Performance Expectations

After full migration, a dashboard request should ideally do:

- one session lookup
- one user toko assignment lookup
- one effective plan resolution
- one disabled features lookup
- one toko list/current toko lookup
- page-specific data reads

Repeated layout/page/action checks should reuse request-scope cache.

Expected benefits:

- fewer duplicated DB calls
- lower latency on dashboard routes
- less boilerplate in actions
- easier debugging of authorization bugs

## Error Handling Strategy

Use typed errors internally, convert at the boundary.

Suggested internal errors:

```ts
type AuthErrorCode =
  | "unauthorized"
  | "toko_denied"
  | "role_denied"
  | "feature_locked"
  | "plan_required"
  | "disabled_by_toko"
  | "plan_limit";
```

For pages:

- `unauthorized` -> redirect `/auth`
- `toko_denied` -> redirect `/dashboard`
- `role_denied` -> redirect role home or show locked state
- `plan_required` -> show feature preview
- `disabled_by_toko` -> show feature locked

For actions:

- return `{ success: false, error: message }`

## Open Questions

These should be decided before Phase 3 or Phase 4.

1. Should plan definitions remain code-only, or eventually move to database?
2. Should custom enterprise overrides be supported per toko/user?
3. Should plan change history be tracked for audit/billing?
4. Should disabled features be stored as JSON array or normalized table?
5. Should superuser be allowed to impersonate toko scope?
6. Should feature gates have rollout support, e.g. percentage/user allowlist?

## Recommendation

Do the migration in this order:

1. `RequestScope`
2. `CapabilityRegistry`
3. `PlanRegistry`
4. `DashboardScopeProvider`
5. server read data functions
6. mutation refactor
7. AuthProvider simplification
8. cleanup/tests

The most important step is `RequestScope`. Once that exists, every future refactor becomes safer because auth, toko access, plan, and feature state have a single server-side source of truth.

## Success Criteria

The migration is successful when:

- Changing a feature's minimum plan requires editing only the feature registry.
- Changing a plan limit requires editing only the plan registry.
- Dashboard pages do not manually repeat auth/toko/plan/feature loading.
- Server actions use request scope and assert helpers.
- Client dashboard components use dashboard scope instead of scattered auth context calls.
- `AuthProvider` no longer loads dashboard-specific data by default.
- `bun run lint` passes.
- `bun run build` passes.
