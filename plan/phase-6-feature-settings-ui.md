# Post-MVP: Feature Settings UI

This phase is deferred together with toko-level feature preferences. Do not implement this UI until the underlying preference model and actions are intentionally brought back into scope.

## Objective

Add an admin-facing UI for viewing plan-allowed, locked, and configurable toko features.

## Recommended Location

Add the feature settings under the existing toko management page:

- `app/(dashboard)/[tokoid]/admin/toko/page.tsx`
- `components/dashboard/admin/manage-toko.tsx`

Do not put toko-wide feature controls in personal user settings.

## UI Requirements

Feature list should group by category:

- Service
- Inventory
- Team
- Analytics
- Appearance

Each feature row should show:

- Label.
- Short description.
- Current availability.
- Required plan badge when locked.
- Switch when configurable and allowed.
- Disabled switch or badge when required/core.

## States

### Enabled And Configurable

- Switch is on.
- Admin can turn it off.

### Disabled By Toko

- Switch is off.
- Admin can turn it back on if plan allows.

### Locked By Plan

- Switch disabled.
- Badge says `Premium` or `Enterprise`.
- Optional upgrade CTA placeholder.

### Required Core Feature

- Switch disabled or hidden.
- Badge says `Required`.

## To Do

- [ ] Add feature settings panel component.
- [ ] Load feature settings from server action.
- [ ] Render features grouped by category.
- [ ] Add switches for configurable allowed features.
- [ ] Show locked state for paid features.
- [ ] Show required state for core features.
- [ ] Save updates optimistically or with loading state.
- [ ] Revalidate affected dashboard paths after settings changes.
- [ ] Run `bun run lint`.
- [ ] Run `bun run build`.

## Verification

- Free admin can see locked paid features but cannot toggle them on.
- Free admin can keep dynamic theme enabled.
- Premium/enterprise admin can disable optional modules.
- Disabled modules disappear from nav or show locked/disabled states according to Phase 4 behavior.
