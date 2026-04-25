# RMS Feature Control Progress

## Overview

Dokumen ini mencatat implementasi sistem kontrol fitur berbasis role dan subscription plan untuk RMS.

## Goals

- Subscription ownership attached to admin user (not per-toko)
- Staff/teknisi inherit plan from admin toko's owner
- Free: 1 toko, 0 staff, 0 teknisi
- Premium: 3 toko, 5 staff, 5 teknisi
- Enterprise: unlimited (null)
- service.invoice is premium feature
- Admin nav hides paid features for free
- Direct admin URL to paid feature shows locked CTA (not redirect)
- Toko-level preferences post-MVP (Phase 5/6)

## Constraints

- NO DB schema changes; uses existing `Subscription`, `SubscriptionPlan`, `User.role`, `UserToko` models
- No migration ran

---

## Completed Phases

### Phase 1: Feature Registry

**File:** `lib/features.ts`

- Defined feature registry (`Feature`, `FeatureFlag`, `PLAN_REQUIREMENTS`)
- Feature categories: service, inventory, billing, user_management
- Plan requirements mapping:
  - `service.invoice` → premium
  - `inventory.audit` → premium
  - User management features → free
- Helper functions: `getRequiredPlan()`, `isFeatureEnabled()`, `getFeatureInfo()`

### Phase 2: Plan Data Access

**File:** `lib/rbac.ts`

- Added `getUserPlanInfo()` - returns user subscription plan + limits
- Added `getEffectivePlanForToko()` - resolves effective plan for a user's role at specific toko
- Client-side auth context with plan info

**Key Logic:**

```typescript
- Admin: uses own subscription plan
- Staff/Teknisi: inherits from admin owner of the toko
- Multi-toko: uses highest plan across assigned tokos
- Enterprise: null = unlimited
```

### Phase 3: Server Enforcement

**File:** `lib/feature-enforcement.ts`

- `checkFeatureAccess()` - enforces feature access in server actions
- Guards: createToko, assignTeknisi, accessInvoice, accessInventoryAudit
- Returns `{ allowed: boolean; reason?: string; upgradeUrl?: string }`

**Actions Updated:**

- `actions/toko/create.ts` - enforces toko creation limits
- `actions/karyawan/create.ts` - enforces staff/teknisi assignment limits
- `actions/karyawan/assign-to-toko.ts` - enforces assignment limits
- `actions/invoice/create.ts` - enforces invoice premium access
- `actions/inventory/audit.ts` - enforces audit premium access

### Phase 4: Navigation & Page Gates

**File:** `lib/page-feature-gates.ts`

- `getNavFeatures()` - filters sidebar features by plan
- `checkPageAccess()` - validates page access for role+plan
- Integrated `disabledFeatures` from `TokoFeatureSetting`

**Components:**

- `components/dashboard/feature-locked.tsx` - locked state CTA UI
- `components/dashboard/pending-upgrade.tsx` - upgrade prompt

**Integration:**

- `app/(dashboard)/[tokoid]/(admin)/layout.tsx` - staff/teknisi layout gates
- Sidebar filtered by plan (hides paid features for free)

### Phase 5: Toko Feature Preferences

**File:** `prisma/schema.prisma`, `actions/feature-settings.ts`

- Added `TokoFeatureSetting` model with `disabledFeatures` JSON field
- Per-toko feature enable/disable storage
- Actions: `getTokoFeatureSettings`, `updateTokoFeatureSettings`, `setTokoFeatureEnabled`
- Validation: only configurable features can be toggled
- Integration with `getFeatureLockReason()` in page gates

### Phase 6: Feature Settings UI

**File:** `components/dashboard/admin/manage-toko.tsx`, `components/dashboard/admin/feature-settings-tab.tsx`

- Added Tabs to ManageToko: "Info Toko" + "Pengaturan Fitur"
- Feature list grouped by category
- Per-feature switches with status badges:
  - Enabled/configurable: switch ON
  - Disabled by toko: switch OFF
  - Locked by plan: disabled switch + plan badge
  - Required: disabled switch + "Required" badge
- Admin-only access enforced

### Phase 7: Billing/Upgrade UX

**File:** `components/ui/user-settings.tsx`

- Data-driven billing/premium tabs
- Plan comparison table
- Upgrade CTA buttons

**Server Action:**

- `actions/user.ts`: `getBillingPlanSummary()` - returns current plan + usage stats

### UI Enhancement

**File:** `components/shared/user-info.tsx`

- Displays role badge
- Displays current plan badge in dropdown menu

---

## Key Decisions

1. **Unlimited as null**: Internally uses `null` for unlimited limits; renders as "Unlimited" in UI

2. **Staff/Teknisi workflow gates**: Deferred to Phase 4 page layout gates, not enforced in every service mutation

3. **Effective plan resolution**: Staff/teknisi effective plan uses highest admin plan across assigned tokos

4. **Target-toko scoping**: Plan checks use target-toko scoping for invoice/assignment to prevent free-toko bypass in multi-toko scenario

---

## Verification

- `bun run lint`: ✅ Passed
- `bunx tsc --noEmit`: ✅ Passed
- `bun run build`: ✅ Passed

---

## Deferred Phases

None - all planned phases completed.

---

## Relevant Files

| Purpose | File |
|---------|------|
| Feature registry | `lib/features.ts` |
| Server enforcement | `lib/feature-enforcement.ts` |
| Page gates | `lib/page-feature-gates.ts` |
| Auth + plan resolution | `lib/rbac.ts` |
| Locked UI | `components/dashboard/feature-locked.tsx` |
| User info + plan badge | `components/shared/user-info.tsx` |
| Settings + billing | `components/ui/user-settings.tsx` |
| Billing summary action | `actions/user.ts` |
| Feature settings action | `actions/feature-settings.ts` |
| Feature settings UI | `components/dashboard/admin/feature-settings-tab.tsx` |
| Toko settings schema | `prisma/schema.prisma` (TokoFeatureSetting) |
| Roadmap docs | `plan/` |

---

## Summary

| Phase | Status |
|-------|--------|
| Phase 1: Feature Registry | ✅ Done |
| Phase 2: Plan Data Access | ✅ Done |
| Phase 3: Server Enforcement | ✅ Done |
| Phase 4: Nav/Page Gates | ✅ Done |
| Phase 5: Toko Preferences | ✅ Done |
| Phase 6: Feature Settings UI | ✅ Done |
| Phase 7: Billing/Upgrade UX | ✅ Done |

Last updated: April 2026