# Feature Control Implementation Plan

## Goal

Build a centralized feature control system for RMS so every module can be evaluated by role and subscription plan first, with toko-level preferences deferred until the core gating flow is stable.

The free tier is defined as single-admin, single-toko usage with service management, inventory management, and dynamic theme enabled. Premium unlocks employees, staff/technician workflows, assignment, service invoices, analytics, and activity log with small-team limits. Enterprise unlocks all premium features plus enterprise-only modules such as inventory audit with unlimited toko, staff, and technician limits.

## Confirmed Product Decisions

- Subscription ownership is attached to the admin user.
- Staff and technician users inherit feature access from the toko owner's/admin's subscription plan.
- Free limits: `maxTokos: 1`, `maxStaff: 0`, `maxTechnicians: 0`.
- Premium limits: `maxTokos: 3`, `maxStaff: 5`, `maxTechnicians: 5`.
- Enterprise limits: unlimited toko, staff, and technicians. Use `null` internally to represent unlimited limits.
- `service.invoice` is a premium feature.
- Free admin navigation should hide paid feature links.
- Admin direct access to a paid feature route should show a locked/upgrade CTA state instead of silently redirecting.
- Toko-level feature preferences are post-MVP and should not block the core subscription gating work.

## Phase Files

- [Phase 1: Feature Registry](./phase-1-feature-registry.md)
- [Phase 2: Plan Data Access](./phase-2-plan-data-access.md)
- [Phase 3: Server Enforcement](./phase-3-server-enforcement.md)
- [Phase 4: Navigation And Page Gates](./phase-4-navigation-page-gates.md)
- [Phase 5: Toko Feature Preferences](./phase-5-toko-feature-preferences.md) (post-MVP)
- [Phase 6: Feature Settings UI](./phase-6-feature-settings-ui.md) (post-MVP)
- [Phase 7: Billing And Upgrade UX](./phase-7-billing-upgrade-ux.md)

## MVP Order

1. Feature registry and plan matrix.
2. Plan data access from the admin user's subscription.
3. Server-side enforcement for features and numeric limits.
4. Navigation and page gates.
5. Billing and upgrade read-only UX.

Toko feature preferences and the feature settings UI are intentionally deferred until after MVP gating is working end-to-end.

## Target Free Tier

- One admin user.
- One toko.
- Service CRUD enabled.
- Inventory CRUD enabled.
- Dynamic theme enabled.
- No staff users.
- No technician users.
- No staff/technician workflow.
- No technician assignment.
- No inventory audit.
- No paid analytics/activity log exposure.

## Implementation Principles

- Plan restrictions must be enforced server-side before UI polish.
- The feature registry is the source of truth.
- Toko feature preferences can only disable plan-allowed features; they cannot unlock paid features. This is post-MVP.
- Admin role means full role permission inside the current plan, not bypassing plan limits.
- Core safety routes and actions must never rely only on hidden navigation.
