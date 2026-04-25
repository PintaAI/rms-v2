# Phase 1: Feature Registry

## Objective

Create a central feature and plan registry that describes available app features, plan tiers, role access, and numeric limits.

No database changes or UI gates should be introduced in this phase.

## Implementation Keys

- Add `lib/features.ts`.
- Define `FeatureKey`, `FeatureCategory`, `PlanLimitKey`, and `SubscriptionPlan` compatible with the Prisma enum values: `free`, `premium`, `enterprise`.
- Define feature metadata with label, description, category, allowed roles, minimum plan, and configurability.
- Define plan limits separately from features.
- Keep dynamic theme available for all plans including free.
- Treat `admin` as a role with broad access, but still bound by plan features and limits.

## Initial Feature Keys

```ts
type FeatureKey =
  | "dashboard.overview"
  | "toko.manage"
  | "service.management"
  | "inventory.management"
  | "appearance.dynamicTheme"
  | "karyawan.management"
  | "staff.workflow"
  | "technician.workflow"
  | "service.technicianAssignment"
  | "service.invoice"
  | "activityLog.view"
  | "analytics.revenue"
  | "inventory.audit"
```

## Initial Plan Shape

```ts
free: {
  features: [
    "dashboard.overview",
    "toko.manage",
    "service.management",
    "inventory.management",
    "appearance.dynamicTheme",
  ],
  limits: {
    maxTokos: 1,
    maxStaff: 0,
    maxTechnicians: 0,
  },
}
```

Premium should unlock employees, staff/technician workflow, technician assignment, service invoice, activity log, and revenue analytics.

Enterprise should include all premium features plus `inventory.audit` and unlimited limits.

## Confirmed Plan Limits

```ts
free: {
  limits: {
    maxTokos: 1,
    maxStaff: 0,
    maxTechnicians: 0,
  },
}

premium: {
  limits: {
    maxTokos: 3,
    maxStaff: 5,
    maxTechnicians: 5,
  },
}

enterprise: {
  limits: {
    maxTokos: null,
    maxStaff: null,
    maxTechnicians: null,
  },
}
```

Use `null` to represent unlimited limits.

## Helper Functions

- `normalizePlan(plan)` returns `free` for missing or unknown values.
- `isPlanAtLeast(plan, minimumPlan)` checks plan ordering.
- `canUseFeature({ plan, role, feature, disabledFeatures? })` returns boolean.
- `getFeatureLockReason(...)` returns `role_denied`, `plan_required`, `disabled_by_toko`, or `null`.
- `getPlanLimit(plan, limitKey)` returns a number or `null` for unlimited.
- `getConfigurableFeatures(plan)` returns only features allowed by plan and marked configurable.

## To Do

- [x] Create `lib/features.ts`.
- [x] Add feature metadata for all initial feature keys.
- [x] Add plan order: `free < premium < enterprise`.
- [x] Add plan feature lists.
- [x] Add plan limits: free `1/0/0`, premium `3/5/5`, enterprise unlimited.
- [x] Add helper functions for feature checks and limits.
- [x] Add concise inline documentation for feature semantics.
- [x] Run `bun run lint`.

## Verification

- Feature helpers compile without importing server-only modules.
- No route/action behavior changes yet.
- Missing subscription plans resolve to `free`.
