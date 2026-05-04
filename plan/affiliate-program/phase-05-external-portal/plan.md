# Phase 05: External Affiliate Tracking Portal

## Objective

Create a read-only tracking portal for external affiliators and RMS-user affiliators to view their referral performance and earnings using a private tracking link.

## Product Outcome

An affiliator can open a private link like:

```txt
/affiliate/portal/RMS-BUDI-4K8D?token=secret-token
```

and see their referral link, signup count, paid conversions, commission totals, and commission history without needing an RMS account.

## Dependencies

- Phase 01 completed.
- Phase 02 completed so affiliators have `code` and `portalToken`.
- Phase 03 completed for referrals.
- Phase 04 completed for commissions.

## Scope

Included:

- Public route for affiliate portal.
- Token validation.
- Read-only dashboard.
- Masked referred customer information.
- Inactive affiliator handling.
- Copy referral link.

Not included:

- Affiliate login.
- Magic link authentication.
- Editing payout info.
- Download/export.
- Click tracking.

## Route Design

Recommended route:

```txt
app/affiliate/portal/[code]/page.tsx
```

URL shape:

```txt
/affiliate/portal/RMS-BUDI-4K8D?token=secret-token
```

Reason:

- `code` is readable and support-friendly.
- `token` remains the secret.
- Superuser can regenerate token without changing public referral code.

## Proxy Consideration

Current `proxy.ts` protects dashboard-like routes and public routes are limited. Verify `/affiliate/portal/...` is not accidentally treated as protected by the `isTokoRootRoute` regex.

Because `/affiliate/portal/...` has multiple path segments and is not in protected prefixes, it should be public. Still verify manually.

## Data Fetching

Create server-side query action/helper:

```ts
export async function getAffiliatePortalData(input: {
  code: string;
  token: string;
}): Promise<ActionResultWithData<AffiliatePortalData>>;
```

This can live in `actions/affiliate.ts` or a dedicated server-only helper. Since the page is public and server-rendered, prefer direct server helper if no client mutation is needed.

Validation:

- Find affiliator by `code` and `portalToken`.
- If not found, show invalid/private link screen.
- If inactive, show disabled state or limited read-only historical view.
- Do not expose raw portal token in data returned to client except if needed for copy current URL. Prefer not returning it.

## Portal Data Shape

```ts
interface AffiliatePortalData {
  affiliator: {
    name: string;
    code: string;
    status: "active" | "inactive";
  };
  links: {
    referralLink: string;
  };
  stats: {
    totalReferrals: number;
    paidConversions: number;
    conversionRate: number;
    pendingAmount: number;
    approvedAmount: number;
    paidAmount: number;
    rejectedAmount: number;
  };
  referrals: Array<{
    id: string;
    customer: string;
    joinedAt: Date;
    convertedAt: Date | null;
  }>;
  commissions: Array<{
    id: string;
    customer: string;
    plan: "premium" | "enterprise";
    amount: number;
    status: "pending" | "approved" | "paid" | "rejected";
    createdAt: Date;
    approvedAt: Date | null;
    paidAt: Date | null;
  }>;
}
```

## Privacy Rules

External portal must not show full customer identity.

Masking:

- `budi@example.com` -> `bu***@example.com`.
- `andi@gmail.com` -> `an***@gmail.com`.
- Phone `081234567890` -> `0812****7890`.

Recommended customer display priority:

1. Masked email if available.
2. Masked phone if email unavailable.
3. `Customer #xxxx` fallback.

Use helpers from `lib/affiliate.ts`.

## UI Structure

Page sections:

- Header: Affiliate Portal, affiliator name, status badge.
- Referral link card with copy button.
- Stats cards: referrals, paid conversions, conversion rate.
- Earnings cards: pending, approved, paid.
- Commission history table.
- Referral history table.
- Privacy notice.

Recommended copy:

```txt
Bagikan referral link untuk mengajak pengguna baru. Tracking link ini bersifat pribadi dan hanya untuk melihat performa serta komisi Anda.
```

## Components

Suggested files:

- `app/affiliate/portal/[code]/page.tsx`
- `components/affiliate/affiliate-portal.tsx`
- `components/affiliate/affiliate-copy-link-button.tsx`

Keep most data fetching in the server page. Use small client component only for copy-to-clipboard.

## Invalid Link UX

If code/token invalid:

- Show a neutral error page.
- Do not reveal whether the code exists or token is wrong.

Copy:

```txt
Link tracking tidak valid atau sudah diperbarui. Hubungi tim RMS untuk mendapatkan link terbaru.
```

If inactive:

- Show dashboard with an inactive notice, or block access.
- Recommended MVP: allow historical read-only access but show that new referrals are disabled.

## Implementation Steps

1. Add portal data query/helper.
2. Create public route `app/affiliate/portal/[code]/page.tsx`.
3. Create portal UI component.
4. Add copy referral link button.
5. Add invalid/private link state.
6. Verify inactive affiliator behavior.
7. Run lint/build.

## Manual Verification

- Open valid tracking link and see stats.
- Open link with wrong token and see invalid link state.
- Open link with wrong code and see invalid link state.
- Confirm customer info is masked.
- Confirm portal does not require login.
- Confirm portal cannot mutate payout or commission status.
- Confirm referral link copy works.
- Confirm inactive affiliator displays expected warning.

## Commands

```bash
bun run lint
bun run build
```

## Exit Criteria

- Affiliators can independently track earnings through private link.
- Portal is read-only and token-protected.
- Customer details are masked.
- Superuser remains the only role that manages payouts.

## Risks And Follow-Ups

- URL token can leak through screenshots or forwarding. Superuser token regeneration mitigates this.
- No login means anyone with tracking link can view affiliate data.
- Magic link login can be added later for stronger security.
