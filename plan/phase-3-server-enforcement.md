# Phase 3: Server Enforcement

## Objective

Enforce free-tier and paid-feature restrictions in server actions before changing navigation or visual presentation.

## Free Tier Rules

- Free admins can create or own only one toko.
- Free admins cannot create staff users.
- Free admins cannot create technician users.
- Free admins cannot assign technicians.
- Free users cannot use staff or technician workflow features.
- Free users can manage service records.
- Free users can manage inventory records.
- Free users can use dynamic theme.

## Confirmed Limits

- Free: `maxTokos: 1`, `maxStaff: 0`, `maxTechnicians: 0`.
- Premium: `maxTokos: 3`, `maxStaff: 5`, `maxTechnicians: 5`.
- Enterprise: unlimited toko, staff, and technicians. Treat `null` plan limits as unlimited.

## Implementation Keys

- Do not rely on hidden buttons or hidden links.
- Add feature and limit checks at mutation boundaries.
- Return actionable error strings.
- Keep existing role and toko access checks intact.
- Add checks as close as possible to the existing authorization blocks.
- MVP enforcement is intentionally focused on creation/capability boundaries. Existing staff/technician workflow actions can rely on role plus toko access during development because staff/technician accounts are only created through paid admin-controlled flows.

## Server Actions To Gate

### `actions/toko.ts`

- `createToko`
- `createTokoWithUsers`

Rules:

- Check `maxTokos` before creating a toko.
- `createTokoWithUsers` should reject staff/technician arrays when plan limits are `0`.
- Paid tiers should still enforce configured staff/technician limits.

### `actions/karyawan.ts`

- `createKaryawan`
- potentially `deleteKaryawan` remains allowed if user has admin access and feature access, but deletion can also be allowed to reduce counts.

Rules:

- Require `karyawan.management`.
- Check `maxStaff` or `maxTechnicians` before creation based on requested role.

### `actions/service-mutations.ts`

- `assignTechnician`
- invoice-related mutations if invoice creation/update is exposed through service actions
- possibly technician-only mutations if direct action access can occur.

Rules:

- Require `service.technicianAssignment` for manual assignment.
- Require `service.invoice` for invoice-related mutations. Invoice is premium by default.
- Staff/technician workflow page access is deferred to Phase 4 page gates for MVP.

### `actions/inventory-audit.ts`

- `getInventoryAuditOverview`
- `startInventoryAudit`
- `updateInventoryAuditItem`
- `completeInventoryAudit`
- `cancelInventoryAudit`

Rules:

- Require `inventory.audit`.
- Enterprise only by default.

## Suggested Helper Names

- `assertFeatureAccess(user, feature)`
- `ensureFeatureAccess(user, feature)` returning `ActionResult | null`
- `assertPlanLimit(user, limitKey, currentCount)`

Use returning helpers for server actions to match existing `{ success, error }` style.

## To Do

- [x] Add reusable action-friendly feature check helper.
- [x] Gate toko creation by `maxTokos`.
- [x] Gate onboarding-style toko creation with staff/technician arrays.
- [x] Gate karyawan creation by feature and role-specific limits.
- [x] Gate technician assignment.
- [x] Gate inventory audit read/write actions.
- [x] Add clear upgrade-related error messages.
- [x] Run `bun run lint`.
- [x] Run `bun run build`.

## Verification

- Free admin can still create service records.
- Free admin can still create/update/delete spareparts and service pricelists.
- Free admin cannot create staff or technician.
- Free admin cannot create a second toko.
- Free admin cannot assign a technician.
- Free admin cannot start inventory audit.
