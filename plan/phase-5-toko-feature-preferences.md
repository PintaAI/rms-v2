# Post-MVP: Toko Feature Preferences

This phase is deferred until after the MVP subscription gating flow is stable. Do not implement it before the feature registry, plan data access, server enforcement, navigation/page gates, and billing/upgrade read-only UX are complete.

## Objective

Add toko-level feature preferences so admins can disable optional plan-allowed features for their toko.

Preferences must never unlock paid features.

## Prisma Model

Add to `prisma/schema.prisma`:

```prisma
model TokoFeatureSetting {
  tokoId           String   @id
  disabledFeatures Json     @default("[]")
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  toko Toko @relation(fields: [tokoId], references: [id], onDelete: Cascade)

  @@map("toko_feature_setting")
}
```

Add relation to `Toko`:

```prisma
featureSetting TokoFeatureSetting?
```

## Behavior Rules

- Only admins can update toko feature preferences.
- User must have access to the toko.
- Only configurable features can be disabled.
- Locked-by-plan features cannot be toggled on.
- Core features cannot be disabled.
- If no settings row exists, treat `disabledFeatures` as empty.

## Access Formula

```ts
enabled = allowedByRole && allowedByPlan && !disabledByToko
```

## Actions To Add

Create `actions/feature-settings.ts`:

- `getTokoFeatureSettings(tokoId)`
- `updateTokoFeatureSettings(tokoId, disabledFeatures)`
- `setTokoFeatureEnabled(tokoId, feature, enabled)` if useful for switch UI

## To Do

- [ ] Update Prisma schema with `TokoFeatureSetting`.
- [ ] Generate/apply database migration using the repo's Prisma workflow.
- [ ] Add generated Prisma client if needed through `bun run prisma generate` or postinstall flow.
- [ ] Add `actions/feature-settings.ts`.
- [ ] Validate requested feature keys against the registry.
- [ ] Reject attempts to disable non-configurable features.
- [ ] Reject attempts to enable paid features through preferences.
- [ ] Update feature access helpers to accept toko disabled features.
- [ ] Run `bun run lint`.
- [ ] Run `bun run build`.

## Verification

- Missing preference row behaves as all features enabled subject to plan.
- Admin can disable a configurable feature that their plan allows.
- Admin cannot enable `inventory.audit` on free or premium if enterprise-only.
- Admin cannot disable required core features.
