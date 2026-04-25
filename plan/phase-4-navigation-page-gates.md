# Phase 4: Navigation And Page Gates

## Objective

Reflect feature access in navigation and page-level access after server actions are already protected.

## Implementation Keys

- Navigation should use the central feature registry instead of hardcoded plan checks.
- Page gates should protect direct URL entry.
- Prefer locked/upgrade states for admin-facing paid features where useful.
- Hide role-incompatible routes entirely.
- Hide paid nav links for free admins.
- If an admin opens a paid feature URL directly, render a locked/upgrade CTA state instead of silently redirecting.
- Do not remove server action enforcement from Phase 3.

## Free Admin Navigation

Visible:

- Admin Overview
- Toko
- Service
- Inventory

Hidden from nav:

- Karyawan
- Inventory > Audit Gudang

## Routes To Gate

- `app/(dashboard)/[tokoid]/admin/karyawan/page.tsx` requires `karyawan.management`.
- `app/(dashboard)/[tokoid]/admin/inventory/audit-gudang/page.tsx` requires `inventory.audit`.
- `app/(dashboard)/[tokoid]/staff/page.tsx` requires `staff.workflow`.
- `app/(dashboard)/[tokoid]/staff/service/page.tsx` requires `staff.workflow` and `service.management`.
- `app/(dashboard)/[tokoid]/staff/inventory/page.tsx` requires `staff.workflow` and `inventory.management`.
- `app/(dashboard)/[tokoid]/teknisi/page.tsx` requires `technician.workflow`.
- `app/(dashboard)/[tokoid]/teknisi/task/page.tsx` requires `technician.workflow`.
- `app/(dashboard)/[tokoid]/teknisi/inventory/page.tsx` requires `technician.workflow` and `inventory.management`.

## Components To Update

- `components/dashboard/nav/admin-nav.tsx`
- `components/dashboard/nav/staff-nav.tsx`
- `components/dashboard/nav/teknisi-nav.tsx`
- `components/dashboard/layout/app-sidebar.tsx`

## Locked State Component

Consider adding a reusable component:

- `components/dashboard/feature-locked.tsx`

It should display:

- Feature label.
- Required plan.
- Reason the feature is unavailable.
- Upgrade CTA placeholder.

Use this locked state for admin-facing paid pages reached by direct URL access. Role-incompatible staff/technician routes can still redirect or deny access instead of showing an upsell state.

## To Do

- [x] Pass current plan/feature access into dashboard sidebar.
- [x] Filter admin nav by feature access.
- [x] Gate `admin/karyawan` page.
- [x] Gate `admin/inventory/audit-gudang` page.
- [x] Gate staff pages.
- [x] Gate technician pages.
- [x] Add reusable locked-feature UI if direct route access should show upgrade messaging.
- [x] Run `bun run lint`.
- [x] Run `bun run build`.

## Verification

- Free admin sidebar only shows free-allowed modules.
- Direct URL to paid feature does not render operational UI.
- Premium/enterprise users see their plan-allowed modules.
- Existing role redirects still work.
