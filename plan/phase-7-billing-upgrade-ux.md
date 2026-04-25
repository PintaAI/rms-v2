# Phase 7: Billing And Upgrade UX

## Objective

Replace placeholder billing/premium presentation with real plan information, limits, and upgrade messaging.

This should be implemented as part of the MVP after server enforcement and navigation/page gates, before toko-level feature preferences.

## Current State

`components/ui/user-settings.tsx` has billing and premium sections, but they are mostly static placeholders.

## Implementation Keys

- Show actual plan from auth context or server-loaded user data.
- Show free tier limits clearly.
- Show current usage against limits.
- Show locked feature explanations.
- Show unlimited enterprise limits as `Unlimited`, backed by `null` plan limits internally.
- Keep payment integration as a placeholder until a billing provider is chosen.

## Recommended Plan Display

For free:

- Plan: Free
- Toko: `1 / 1`
- Staff: `0 / 0`
- Technician: `0 / 0`
- Included: service management, inventory management, dynamic theme.
- Locked: karyawan management, staff/technician workflow, technician assignment, audit gudang.

For premium:

- Toko: `current / 3`.
- Staff: `current / 5`.
- Technician: `current / 5`.
- Show unlocked operational workflow features.

For enterprise:

- Show enterprise modules and higher/unlimited limits.

## Files Likely Involved

- `components/ui/user-settings.tsx`
- `components/dashboard/admin/manage-toko.tsx`
- possibly a new shared plan summary component.

## To Do

- [x] Replace hardcoded `Free Plan` with real plan.
- [x] Add plan badge component if needed.
- [x] Add current usage summary for toko/staff/technician counts.
- [x] Add locked feature summary.
- [x] Add upgrade CTA placeholder.
- [x] Keep billing provider integration out of scope for now.
- [x] Run `bun run lint`.
- [x] Run `bun run build`.

## Verification

- Free users see accurate included and locked features.
- Paid users see their actual tier.
- Billing UI does not imply active payment integration if none exists.
