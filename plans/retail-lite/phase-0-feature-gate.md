# Retail Lite Phase 0: Feature Gate

## Goal

Phase 0 registers Retail Lite as a configurable toko feature before any retail checkout UI or sale model is built.

The new feature gate is:

```ts
retail.sales
```

This gate controls direct retail sales only. It does not control the inventory foundation itself.

## Product Decision

Retail Lite should be configurable independently from inventory.

Current inventory is already used by service workflows, so disabling retail should not disable sparepart management.

Feature responsibility:

```txt
inventory.management = manage spareparts, barang retail, stock, jasa, restock, inventory base
retail.sales         = direct retail checkout/sales workflow
analytics.revenue    = owner reports including retail analytics later
```

## Registry Changes

Primary file:

```txt
lib/features.ts
```

### Add Retail Category

Update `FeatureCategory`:

```ts
export type FeatureCategory =
  | "dashboard"
  | "toko"
  | "service"
  | "inventory"
  | "retail"
  | "team"
  | "analytics"
  | "realtime";
```

### Add Feature Key

Add to `FeatureKey`:

```ts
| "retail.sales"
```

### Add Registry Entry

Add to `FEATURE_REGISTRY`:

```ts
"retail.sales": {
  key: "retail.sales",
  label: "Retail Sales",
  description: "Jual sparepart dan barang retail langsung dari inventory toko.",
  category: "retail",
  allowedRoles: ["admin", "staff"],
  minimumPlan: "premium",
  configurable: true,
},
```

Recommended placement: after `inventory.management` or after inventory features. Either is acceptable because settings UI groups by category.

## Feature Settings UI

Primary file:

```txt
components/dashboard/admin/feature-settings-tab.tsx
```

Add category label:

```ts
retail: "Retail",
```

After this, `retail.sales` should automatically appear in Pengaturan Fitur because `getTokoFeatureSettingsWithStatus()` maps over `FEATURE_KEYS`.

## Revalidation

Primary file:

```txt
actions/feature-settings.ts
```

Current feature toggle revalidation already includes:

```ts
revalidatePath(`/${tokoId}/admin`)
revalidatePath(`/${tokoId}/admin/toko`)
revalidatePath(`/${tokoId}/staff`)
revalidatePath(`/${tokoId}/teknisi`)
```

For Phase 0 this is enough because no retail routes exist yet.

When retail routes are added in Phase 3, extend revalidation with:

```ts
revalidatePath(`/${tokoId}/admin/retail`)
revalidatePath(`/${tokoId}/staff/retail`)
```

If history pages exist later:

```ts
revalidatePath(`/${tokoId}/admin/retail/history`)
revalidatePath(`/${tokoId}/staff/retail/history`)
```

## Page Enforcement Pattern

Retail pages do not exist in Phase 0, but this is the required pattern for later phases.

Retail pages should require both:

```ts
inventory.management
retail.sales
```

Example server page pattern:

```tsx
const scope = await getRequestScope(tokoid);
const inventoryAccess = getPageFeatureCheck(scope, "inventory.management");
const retailAccess = getPageFeatureCheck(scope, "retail.sales");

if (inventoryAccess.reason === "role_denied" || retailAccess.reason === "role_denied") {
  redirect("/dashboard");
}

if (inventoryAccess.reason === "disabled_by_toko" || retailAccess.reason === "disabled_by_toko") {
  redirect(`/${tokoid}/admin`);
}

if (inventoryAccess.reason === "plan_required") {
  return <FeaturePreview featureKey="inventory.management" requiredPlan={inventoryAccess.metadata.minimumPlan} />;
}

if (retailAccess.reason === "plan_required") {
  return <FeaturePreview featureKey="retail.sales" requiredPlan={retailAccess.metadata.minimumPlan} />;
}
```

Use the same logic for staff routes, with staff redirect target adjusted if needed.

## Server Action Enforcement Pattern

Retail server actions do not exist in Phase 0, but all later retail mutations must enforce both inventory and retail gates.

Example:

```ts
const scope = await getRequestScope(tokoId);

assertRole(scope, ["admin", "staff"]);
assertFeature(scope, "inventory.management");
assertFeature(scope, "retail.sales");
```

Actions that should use this later:

- `createRetailSale`
- `getRetailSales`
- `getRetailSale`
- `voidRetailSale`
- `getRetailCheckoutItems`

## Navigation Pattern

Retail nav should not be added in Phase 0 unless a placeholder page exists.

When added in Phase 3, use this behavior:

- Hide if `retail.sales` is disabled by toko.
- Show locked if plan does not allow `retail.sales`.
- Also consider `inventory.management` because retail depends on inventory.

Expected logic:

```ts
const inventoryEnabled = featureAccess["inventory.management"] ?? false;
const retailEnabled = featureAccess["retail.sales"] ?? false;
const retailDisabledByToko = disabledFeatures.includes("retail.sales");

if (!retailDisabledByToko) {
  entries.push({
    type: "item",
    href: `/${tokoid}/admin/retail`,
    icon: "store",
    label: "Retail",
    isLocked: !inventoryEnabled || !retailEnabled,
  });
}
```

Admin and staff should get retail nav later. Technician should not get retail nav in V1.

## Relationship With Phase 1

Phase 1 adds inventory item kind:

```ts
sparepart | retail_item
```

That work should remain under:

```ts
inventory.management
```

Do not require `retail.sales` to create or manage `retail_item` items.

Reason: a toko may prepare barang retail inventory before enabling direct checkout. Also, item type is inventory foundation, not checkout permission.

## Acceptance Criteria

Phase 0 is complete when:

- `retail.sales` exists in `FeatureKey`.
- `retail.sales` has a `FEATURE_REGISTRY` entry.
- `retail` exists as a `FeatureCategory`.
- Feature settings UI knows the `Retail` category label.
- `retail.sales` appears in Pengaturan Fitur for eligible plans.
- Admin can toggle `retail.sales` per toko.
- Disabled state is stored in `TokoFeatureSetting.disabledFeatures`.
- `getRequestScope(tokoId).featureAccess["retail.sales"]` reflects role, plan, and toko-disabled state.
- No retail nav/page is required yet.

## Manual QA Checklist

### Admin Settings

- Open toko settings feature tab.
- Verify `Retail` category appears.
- Verify `Retail Sales` row appears.
- Toggle it off.
- Refresh and verify it remains off.
- Toggle it on.
- Refresh and verify it remains on.

### Plan Gate

- On a plan below `premium`, verify `Retail Sales` is locked as plan-required.
- On `premium` or higher, verify admin can toggle it.

### Role Gate

- Admin can toggle the feature.
- Staff cannot access feature settings.
- Later retail actions should allow admin/staff, not technician.

## Implementation Order

Recommended sequence:

1. Update `FeatureCategory` in `lib/features.ts`.
2. Add `"retail.sales"` to `FeatureKey`.
3. Add `"retail.sales"` metadata to `FEATURE_REGISTRY`.
4. Add `retail: "Retail"` to feature settings category labels.
5. Manually verify feature settings UI behavior.

## Notes For Later Phases

Phase 3 will add retail routes and server actions. At that point, every direct sale action must require both:

```ts
assertFeature(scope, "inventory.management")
assertFeature(scope, "retail.sales")
```

Phase 5 retail analytics should use existing:

```ts
analytics.revenue
```

Do not add `retail.reports` unless pricing needs a separate retail-reporting tier later.
