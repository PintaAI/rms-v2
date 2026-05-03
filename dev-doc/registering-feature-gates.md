# Registering Feature Gates

A guide for adding plan-gated, role-gated, and per-toko configurable features.

## Current Architecture

Feature gates are evaluated from one registry and then exposed through request scope.

```txt
lib/features.ts
  FeatureKey + FEATURE_REGISTRY + getFeatureLockReason()

lib/auth/request-scope.ts
  getRequestScope(tokoId)
    -> user, effective plan, disabledFeatures, featureAccess, capabilities
  assertFeature(scope, key)
  getPageFeatureCheck(scope, key)

actions/feature-settings.ts
  reads/writes TokoFeatureSetting.disabledFeatures
  powers Pengaturan Fitur UI
```

Feature gates combine three independent checks:

| Check | Source | Lock reason |
|---|---|---|
| Role access | `FEATURE_REGISTRY[key].allowedRoles` | `role_denied` |
| Plan access | `FEATURE_REGISTRY[key].minimumPlan` | `plan_required` |
| Per-toko admin toggle | `TokoFeatureSetting.disabledFeatures` | `disabled_by_toko` |

Capabilities are separate from features. Use `assertCapability()` and `scope.capabilities` for core role permissions such as `dashboard.overview`, `toko.manage`, and `service.management`. Use feature gates only for plan/configurable product features.

## Step 1: Register The Feature

All registry work is in `lib/features.ts`.

### 1a. Add The Key

Append the new key to `FeatureKey`:

```ts
export type FeatureKey =
  | "service.manualItems"
  | "inventory.management"
  | "karyawan.management"
  | "staff.workflow"
  | "technician.workflow"
  | "activityLog.view"
  | "analytics.revenue"
  | "inventory.audit"
  | "whatsapp.integration";
```

### 1b. Add Metadata

Add a matching entry to `FEATURE_REGISTRY`:

```ts
"whatsapp.integration": {
  key: "whatsapp.integration",
  label: "WhatsApp Integration",
  description: "Kirim notifikasi dan invoice via WhatsApp.",
  category: "service",
  allowedRoles: ["admin", "staff"],
  minimumPlan: "enterprise",
  configurable: true,
},
```

Field reference:

| Field | Purpose |
|---|---|
| `key` | Must match a `FeatureKey` union member |
| `label` | User-facing name in settings, locked states, and previews |
| `description` | User-facing explanation in settings and locked UI |
| `category` | Groups rows in Pengaturan Fitur: `dashboard`, `toko`, `service`, `inventory`, `team`, `analytics` |
| `allowedRoles` | Roles allowed to use the feature, independent of plan |
| `minimumPlan` | Minimum plan required: `free`, `premium`, or `enterprise` |
| `configurable` | Whether admin can disable it per toko |

After registration, these update automatically:

- `FEATURE_KEYS`
- `getFeatureLockReason()`
- `getRequestScope(tokoId).featureAccess`
- `getRequestScope(tokoId).disabledFeatures`
- Pengaturan Fitur rows from `getTokoFeatureSettingsWithStatus()`
- Billing/onboarding code that reads `FEATURE_REGISTRY`

## Step 2: Enforce On The Server

Server enforcement is mandatory. UI hiding is not a security boundary.

### Preferred Pattern: RequestScope

Use this for new server actions and server data functions when the `tokoId` is known at the start of the function.

```ts
import { actionError } from "@/lib/auth/authorization";
import { assertFeature, getRequestScope } from "@/lib/auth/request-scope";

export async function updateWhatsappSetting(tokoId: string, input: Input) {
  try {
    const scope = await getRequestScope(tokoId);
    assertFeature(scope, "whatsapp.integration");

    // mutate toko-scoped data

    return { success: true };
  } catch (error) {
    return actionError(error);
  }
}
```

Use `assertRole()` or `assertCapability()` alongside `assertFeature()` when the action also needs role/capability enforcement.

```ts
const scope = await getRequestScope(tokoId);
assertRole(scope, ["admin"]);
assertFeature(scope, "karyawan.management");
```

For read-only server data that receives an existing scope:

```ts
import type { RequestScope } from "@/lib/auth/request-scope";
import { assertFeature } from "@/lib/auth/request-scope";

export async function getRevenueData(scope: RequestScope) {
  assertFeature(scope, "analytics.revenue");
  return prisma.service.findMany({ where: { tokoId: scope.tokoId } });
}
```

### Existing Legacy Pattern

Some older actions first load a record, discover `tokoId`, and then use `ensureFeatureAccess()` with `getDisabledFeaturesForToko()`.

```ts
import { getDisabledFeaturesForToko } from "@/actions/feature-settings";
import { ensureFeatureAccess } from "@/lib/auth/enforcement";

const disabledFeatures = await getDisabledFeaturesForToko(service.tokoId);
const featureError = ensureFeatureAccess(scopedUser, "inventory.management", disabledFeatures);
if (featureError) return featureError;
```

This is still valid in existing code, but prefer `getRequestScope()` for new code once the `tokoId` is available. `assertFeature()` gives consistent `AuthError` handling through `actionError()`.

## Step 3: Enforce In The UI

UI behavior depends on the desired locked-state experience.

### Dashboard Scope In Client Components

The root dashboard layout calls `getRequestScope(tokoid)` and provides `featureAccess`, `capabilities`, and `disabledFeatures` through `DashboardScopeProvider`.

Use `useDashboardScope()` in client components:

```tsx
"use client";

import { useDashboardScope } from "@/components/dashboard/layout/dashboard-scope-context";

export function SomeClientComponent() {
  const { featureAccess, disabledFeatures } = useDashboardScope();
  const enabled = featureAccess["inventory.management"] ?? false;
  const disabledByToko = disabledFeatures.includes("inventory.management");

  if (disabledByToko) return null;

  return <button disabled={!enabled}>Inventory action</button>;
}
```

### Navigation Items

Current nav generally hides features disabled by toko, but keeps plan-locked features visible with a lock badge.

```tsx
const isFeatureDisabled = (feature: FeatureKey) => disabledFeatures.includes(feature);
const inventoryEnabled = featureAccess["inventory.management"] ?? false;

{!isFeatureDisabled("inventory.management") && (
  <NavItem
    href={`/${tokoid}/admin/inventory`}
    icon={<RiToolsLine />}
    label="Sparepart & Jasa"
    isLocked={!inventoryEnabled}
  />
)}
```

Use this behavior when a lower plan should see an upgrade path. If the feature should be completely invisible whenever inaccessible, check only `featureAccess[key]`.

### Whole Pages

For full-page features, use `getPageFeatureCheck(scope, key)` in the page and handle each lock reason explicitly.

```tsx
import { FeaturePreview } from "@/components/dashboard/feature-preview";
import { getPageFeatureCheck, getRequestScope } from "@/lib/auth/request-scope";
import { redirect } from "next/navigation";

export default async function AdminInventoryPage({ params }: Props) {
  const { tokoid } = await params;
  const scope = await getRequestScope(tokoid);
  const access = getPageFeatureCheck(scope, "inventory.management");

  if (access.reason === "role_denied") redirect("/dashboard");
  if (access.reason === "disabled_by_toko") redirect(`/${tokoid}/admin`);

  if (access.reason === "plan_required") {
    return (
      <FeaturePreview
        featureKey="inventory.management"
        requiredPlan={access.metadata.minimumPlan}
        tokoId={tokoid}
      />
    );
  }

  return <InventoryTabs tokoId={tokoid} readOnly={false} />;
}
```

Use `FeatureLocked` when the desired behavior is an explanatory locked page instead of a preview or redirect.

```tsx
import { FeatureLocked } from "@/components/dashboard/feature-locked";
import { FEATURE_REGISTRY, getFeatureLockReason } from "@/lib/features";

const reason = getFeatureLockReason({
  plan: scope.plan,
  role: scope.user.role,
  feature: "staff.workflow",
  disabledFeatures: scope.disabledFeatures,
});

if (reason) {
  const feature = FEATURE_REGISTRY["staff.workflow"];
  return (
    <FeatureLocked
      featureLabel={feature.label}
      featureDescription={feature.description}
      requiredPlan={feature.minimumPlan}
      reason={reason}
      tokoId={tokoid}
    />
  );
}
```

### Tabs Or Partial UI

For tabs and partial UI, pass or read `featureAccess` from dashboard scope. Hide disabled-by-toko controls when needed, and show a locked/disabled control only if an upgrade path is useful.

```tsx
const { featureAccess, disabledFeatures } = useDashboardScope();
const hiddenByToko = disabledFeatures.includes("analytics.revenue");
const enabled = featureAccess["analytics.revenue"] ?? false;

{!hiddenByToko && (
  <TabsTrigger value="revenue" disabled={!enabled}>
    Revenue
  </TabsTrigger>
)}

{enabled && (
  <TabsContent value="revenue">
    <RevenueAnalytics />
  </TabsContent>
)}
```

## Step 4: Admin Feature Settings

Per-toko toggles are stored in `TokoFeatureSetting.disabledFeatures` and managed by `actions/feature-settings.ts`.

`getTokoFeatureSettingsWithStatus(tokoId)` returns every registered feature with:

| Status | Meaning |
|---|---|
| `enabled` | Plan allows it and toko has not disabled it |
| `disabled_by_toko` | Admin disabled it for this toko |
| `plan_required` | Current toko plan is below `minimumPlan` |
| `required` | Feature is not configurable and must stay enabled when plan allows it |

`FeatureSettingsTab` displays these rows under Pengaturan Fitur. It disables switches for `plan_required`, shows required features as always-on, and calls `setTokoFeatureEnabled()` for configurable features.

When a feature is disabled by toko:

- `scope.disabledFeatures` includes the key.
- `scope.featureAccess[key]` becomes `false`.
- `assertFeature()` throws `AuthError("feature_locked", "Fitur ini dinonaktifkan untuk toko ini")`.
- `getPageFeatureCheck()` returns `reason: "disabled_by_toko"`.

## Plan Levels

Plan comparison lives in `lib/plans.ts` and is re-exported from `lib/features.ts` for feature-related code.

```txt
free rank 0
premium rank 1
enterprise rank 2
```

`isPlanAtLeast(plan, minimumPlan)` compares these ranks. A `premium` toko passes `minimumPlan: "free"` and `minimumPlan: "premium"`, but fails `minimumPlan: "enterprise"`.

Effective plan is resolved per request scope through `getEffectivePlanForToko(user, tokoId)`, so staff and technicians inherit the appropriate toko/admin plan instead of relying only on their own user record.

## Example: Automation Feature

Registry:

```ts
"whatsapp.integration": {
  key: "whatsapp.integration",
  label: "WhatsApp Integration",
  description: "Kirim notifikasi dan invoice via WhatsApp.",
  category: "service",
  allowedRoles: ["admin", "staff"],
  minimumPlan: "enterprise",
  configurable: true,
},
```

Mutation enforcement:

```ts
export async function sendWhatsappInvoice(tokoId: string, serviceId: string) {
  try {
    const scope = await getRequestScope(tokoId);
    assertFeature(scope, "whatsapp.integration");

    await sendInvoiceNotification({ tokoId, serviceId });

    return { success: true };
  } catch (error) {
    return actionError(error);
  }
}
```

UI is optional for automation-only features. If there is no UI, Step 1 and server enforcement are enough.

## Checklist

```txt
[ ] Add key to FeatureKey in lib/features.ts
[ ] Add metadata to FEATURE_REGISTRY
[ ] Add assertFeature() in every new server action/data function controlled by the feature
[ ] For legacy actions, pass disabledFeatures into ensureFeatureAccess() if not using RequestScope
[ ] For full pages, use getPageFeatureCheck() and choose preview, locked page, or redirect behavior
[ ] For nav/partial UI, gate with featureAccess and disabledFeatures from dashboard scope
[ ] Confirm Pengaturan Fitur shows the expected status and toggle behavior
```
