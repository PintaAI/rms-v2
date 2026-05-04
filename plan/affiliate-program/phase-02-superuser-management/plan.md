# Phase 02: Superuser Affiliate Management

## Objective

Add superuser-only management for affiliators. Superusers should be able to create external affiliators, link existing RMS users as affiliators, edit affiliator details, activate or deactivate them, copy referral/tracking links, and regenerate private portal tokens.

## Product Outcome

After this phase, platform admins can manage the affiliate roster from `/superuser`. No signup attribution or commission automation is required yet, but all affiliator records can be prepared for use.

## Dependencies

- Phase 01 completed.
- Prisma client generated with `Affiliator`, `Referral`, and `AffiliateCommission` models.
- `lib/affiliate.ts` helper functions available.

## Scope

Included:

- Server actions for affiliator CRUD-like operations.
- Superuser dashboard data expanded with affiliate stats.
- Superuser UI section/table for affiliate management.
- Ability to create an external affiliator.
- Ability to link an existing user as an affiliator.
- Ability to update contact, payout, commission values, notes, and status.
- Ability to regenerate private portal token.
- Copyable referral and tracking links.

Not included:

- Capturing `?ref=` during signup.
- Creating referral records automatically.
- Creating commissions automatically.
- Public affiliate tracking portal.

## Proposed Actions

Create `actions/affiliate.ts`.

Suggested action list:

```ts
export async function getSuperuserAffiliateDashboard(): Promise<ActionResultWithData<AffiliateDashboardData>>;
export async function createExternalAffiliator(input: CreateExternalAffiliatorInput): Promise<ActionResultWithData<AffiliatorRow>>;
export async function createUserAffiliator(input: CreateUserAffiliatorInput): Promise<ActionResultWithData<AffiliatorRow>>;
export async function updateAffiliator(input: UpdateAffiliatorInput): Promise<ActionResultWithData<AffiliatorRow>>;
export async function updateAffiliatorStatus(id: string, status: AffiliatorStatus): Promise<ActionResultWithData<AffiliatorRow>>;
export async function regenerateAffiliatorPortalToken(id: string): Promise<ActionResultWithData<{ id: string; portalToken: string }>>;
```

Authorization rules:

- Use `requireRequestUser()`.
- Return error unless `user.role === "superuser"`.
- Revalidate `/superuser` or a future `/superuser/affiliates` route after mutations.

## Inputs

External affiliator input:

```ts
interface CreateExternalAffiliatorInput {
  name: string;
  email?: string;
  phone?: string;
  premiumCommissionValue?: number;
  enterpriseCommissionValue?: number;
  payoutInfo?: string;
  notes?: string;
}
```

Existing-user affiliator input:

```ts
interface CreateUserAffiliatorInput {
  userId: string;
  premiumCommissionValue?: number;
  enterpriseCommissionValue?: number;
  payoutInfo?: string;
  notes?: string;
}
```

Implementation detail:

- For linked users, default name/email from `User`.
- Prevent creating an affiliator if the user already has one.
- Prevent linking staff/technician unless the product intentionally allows it. Recommended MVP: allow only `admin` users because they are actual customers.

## Data Returned To UI

Suggested row shape:

```ts
interface AffiliatorRow {
  id: string;
  userId: string | null;
  type: "external" | "user";
  name: string;
  email: string | null;
  phone: string | null;
  code: string;
  portalToken: string;
  status: "active" | "inactive";
  premiumCommissionValue: number;
  enterpriseCommissionValue: number;
  referralCount: number;
  paidConversionCount: number;
  pendingCommissionAmount: number;
  approvedCommissionAmount: number;
  paidCommissionAmount: number;
  createdAt: Date;
}
```

## UI Placement

MVP option:

- Add a new section to `app/superuser/page.tsx` below existing revenue/user sections.
- Add component `components/superuser/affiliate-management.tsx`.

More scalable option:

- Create `/superuser/affiliates` route.
- Keep `/superuser` overview smaller.

Recommended MVP:

- Use a component section on `/superuser` first to avoid route/sidebar work.
- Split to route later if it grows.

## UI Features

Affiliate overview cards:

- Total affiliators.
- Active affiliators.
- Total referrals.
- Paid conversions.
- Pending commission.
- Paid commission.

Affiliate table columns:

- Name.
- Type: external or RMS user.
- Contact.
- Status.
- Referral count.
- Paid conversions.
- Pending commission.
- Paid commission.
- Referral link copy button.
- Tracking link copy button.
- Actions menu.

Dialogs:

- Create external affiliator.
- Link existing RMS user.
- Edit affiliator.
- Regenerate portal token confirmation.

## Link Generation

Use configured public app URL where available:

```ts
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const referralLink = `${appUrl}/auth?ref=${code}`;
const trackingLink = `${appUrl}/affiliate/portal/${code}?token=${portalToken}`;
```

Do not store full links in the database. Store only `code` and `portalToken`.

## Validation Rules

- Name is required and at least 2 characters.
- Email is optional but must be valid if provided.
- Phone is optional.
- Commission values must be non-negative integers.
- Portal token regeneration should invalidate the old tracking link immediately.
- Inactive affiliators remain visible but should not receive new referrals in Phase 03.

## Implementation Steps

1. Add `actions/affiliate.ts` with superuser-only actions.
2. Add types for dashboard stats and rows.
3. Add affiliate data to `getSuperuserDashboard` or call `getSuperuserAffiliateDashboard` separately in `app/superuser/page.tsx`.
4. Add `components/superuser/affiliate-management.tsx`.
5. Add create/edit/link dialogs using existing shadcn UI components.
6. Add copy-link buttons using browser clipboard in client component.
7. Add token regeneration action and UI confirmation.
8. Run verification commands.

## Verification

Manual checks:

- Superuser can create external affiliator.
- Superuser can link an existing admin user.
- Duplicate user link is rejected.
- Referral link copies correctly.
- Tracking link copies correctly.
- Regenerating token changes tracking link.
- Inactive status can be set.
- Non-superuser cannot call actions successfully.

Commands:

```bash
bun run lint
bun run build
```

## Exit Criteria

- Affiliator roster can be managed by superuser.
- Both external and RMS-user affiliators are supported.
- Referral and tracking links are visible/copyable.
- No public portal or signup flow is required yet.

## Risks And Follow-Ups

- Showing `portalToken` in superuser UI is acceptable, but only superuser should see it.
- Clipboard copy must never expose tracking link to referred customers.
- If `/superuser` becomes too large, split affiliate management into `/superuser/affiliates`.
