# Registering Feature Gates

A guide for developers to add new plan-gated features to the system.

## The 3-Layer System

Every feature gate has three layers:

```
Registry  →  Server enforcement  →  UI enforcement
(lib/features.ts)   (assertFeature)     (featureAccess[key])
```

You must always do Layer 1 + 2. Layer 3 is optional (skip if the feature has no UI).

---

## Step 1: Registry

Both changes in `lib/features.ts`.

### 1a. Add to the type union

Find `FeatureKey` and append your key:

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
  | "whatsapp.integration";     // <-- add
```

### 1b. Add to `FEATURE_REGISTRY`

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

**Field reference:**

| Field | Purpose |
|---|---|
| `key` | Must match the `FeatureKey` union member |
| `label` | User-facing name shown in Feature Settings, billing, locked state |
| `description` | Shown in Feature Settings toggle tooltip |
| `category` | Groups features in settings UI (`dashboard`, `toko`, `service`, `inventory`, `team`, `analytics`) |
| `allowedRoles` | Which roles can use this feature (independent of plan) |
| `minimumPlan` | Minimum plan required (`"free"`, `"premium"`, `"enterprise"`) |
| `configurable` | If `true`, admin can disable it per-toko in Feature Settings |

That's all the registry work. The rest flows automatically:
- `getRequestScope()` includes the key in `featureAccess`
- `getFeatureLockReason()` computes the right lock reason
- Admin Feature Settings page shows the toggle
- Billing summary shows it as locked/included

---

## Step 2: Server Enforcement

Every server action that the feature controls must have an `assertFeature()` call.

### Pattern

```ts
import { getRequestScope, assertFeature } from "@/lib/auth/request-scope";
import { actionError } from "@/lib/auth/authorization";

export async function someMutation(tokoId: string, ...args) {
  try {
    const scope = await getRequestScope(tokoId);
    assertFeature(scope, "your.feature.key");

    // ... mutation logic ...

    return { success: true };
  } catch (error) {
    return actionError(error);
  }
}
```

**Rules:**
- Always gate the action even if the UI is hidden — this is the security boundary
- Use `actionError()` to convert `AuthError` to a user-friendly `ActionResult`
- The `assertFeature` check combines: role, plan level, and per-toko disabled setting

For read-only data fetching that should be limited, use the `RequestScope` directly:

```ts
import type { RequestScope } from "@/lib/auth/request-scope";

export async function getSomeData(scope: RequestScope) {
  assertFeature(scope, "your.feature.key");
  return prisma.someModel.findMany({ where: { tokoId: scope.tokoId } });
}
```

---

## Step 3: UI Enforcement

Choose the pattern that matches the feature type.

### Pattern A — Navigation item (sidebar)

In the role-specific nav component (`components/dashboard/nav/admin-nav.tsx`, `staff-nav.tsx`, etc.):

```tsx
{featureAccess["your.feature.key"] && (
  <NavItem
    href={`/${tokoid}/admin/some-page`}
    icon={RiSomeIcon}
    label="Feature Name"
  />
)}
```

### Pattern B — Tab in an existing page

In the page or tab container:

```tsx
// app/(dashboard)/[tokoid]/admin/toko/page.tsx (server component)
const scope = await getRequestScope(tokoid);

// Pass to client component:
return <ManageToko currentTokoId={tokoid} featureAccess={scope.featureAccess} />;

// Inside the client component, gate the tab:
const { featureAccess } = useDashboardScope();  // or from props
{featureAccess["your.feature.key"] && (
  <TabsTrigger value="settings-tab">Feature Label</TabsTrigger>
)}
{featureAccess["your.feature.key"] && (
  <TabsContent value="settings-tab">
    <FeatureSettingsTab tokoId={tokoid} />
  </TabsContent>
)}
```

### Pattern C — Route-level gate (whole page)

In the layout file:

```tsx
import { getRequestScope, assertFeature } from "@/lib/auth/request-scope";

export default async function SomePageLayout({ children, params }) {
  const { tokoid } = await params;
  const scope = await getRequestScope(tokoid);
  assertFeature(scope, "your.feature.key");   // throws, shows error
  return <>{children}</>;
}
```

### Pattern D — Automation only (no UI)

Skip this step entirely. Only Step 1 + 2 are needed.

**What happens when the plan is too low?**
- The server action returns `{ success: false, error: "..." }`
- No UI to hide because there is none
- The automation simply doesn't fire for users on lower plans

---

## Example A: Full Feature (Analytics Revenue)

Registry:
```ts
"analytics.revenue": {
  key: "analytics.revenue",
  label: "Revenue Analytics",
  description: "Pantau performa pendapatan dan metrik service.",
  category: "analytics",
  allowedRoles: ["admin"],
  minimumPlan: "premium",
  configurable: true,
},
```

Server enforcement — already handled by `getRequestScope()` generating `featureAccess`. The data function checks:

```ts
export async function getRevenueData(scope: RequestScope) {
  assertRole(scope, ["admin"]);
  assertCapability(scope, "dashboard.overview");
  // If the caller also wants to check the feature:
  assertFeature(scope, "analytics.revenue");
  return prisma.service.findMany({ where: { tokoId: scope.tokoId } });
}
```

UI — sidebar nav already checks `featureAccess["analytics.revenue"]`.

---

## Example B: Automation Only (WhatsApp)

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

Server enforcement — in the notification trigger action:
```ts
export async function updateServiceStatus(tokoId: string, serviceId: string, status: string) {
  try {
    const scope = await getRequestScope(tokoId);
    // ... update status ...
    assertFeature(scope, "whatsapp.integration");
    await sendServiceStatusWhatsappNotification({ serviceId, status });
    return { success: true };
  } catch (error) {
    return actionError(error);
  }
}
```

Also gate the settings mutation:
```ts
export async function updateTokoWhatsappSetting(tokoId: string, input: ...) {
  try {
    const scope = await getRequestScope(tokoId);
    assertFeature(scope, "whatsapp.integration");
    // ... save setting ...
  } catch (error) {
    return actionError(error);
  }
}
```

UI — none needed (automation feature).

---

## How Plan Levels Work

```
free (rank 0)  →  basic features only
premium (rank 1)  →  mid-tier features
enterprise (rank 2)  →  all features
```

`isPlanAtLeast(plan, minimumPlan)` compares ranks. A `premium` user passes a `minimumPlan: "free"` check but fails `minimumPlan: "enterprise"`.

If a feature's `minimumPlan` is changed (e.g. from `"premium"` to `"free"`), all gates update automatically — no code changes needed outside the registry.

---

## Feature Settings Admin Toggle

When `configurable: true`, the admin can disable the feature per-toko from **Pengaturan Toko → Fitur** (Feature Settings tab). The toggle:
- Is visible only if the plan meets the `minimumPlan`
- Is disabled (greyed out) with `plan_required` status if plan is too low
- Is switchable if plan is sufficient

When a feature is disabled by the admin:
- The feature's `featureAccess` value becomes `false`
- `assertFeature()` throws with code `"feature_locked"` and message `"Fitur ini dinonaktifkan untuk toko ini"`
- The toggle in Feature Settings shows it as disabled

---

## Summary Checklist

```
[ ] Add key to FeatureKey type
[ ] Add entry to FEATURE_REGISTRY
[ ] Add assertFeature() in every relevant server action
[ ] (if has UI) Gate nav item / tab / page with featureAccess[key]
[ ] (if has UI) Gate route layout with assertFeature() for full-page features
```
