# Phase 03: Referral Capture During Signup

## Objective

Capture affiliate referral codes from signup links and create referral records when new users register successfully. This phase connects the public referral link to the customer account, but still does not create commissions.

## Product Outcome

An affiliator can share:

```txt
/auth?ref=RMS-BUDI-4K8D
```

When a new customer registers through that link, the app records that the user was referred by the matching active affiliator.

## Dependencies

- Phase 01 completed.
- Phase 02 preferably completed so affiliators can be created by superuser.
- Existing register UI in `components/auth/auth-card.tsx`.
- Existing signup logic through Better Auth `signUp.email`.

## Scope

Included:

- Read `ref` from `/auth` query string.
- Preserve referral code during register tab usage.
- Optionally show referral attribution in the register form.
- Create referral after successful signup.
- Validate active affiliator.
- Prevent self-referral for linked RMS-user affiliators.
- Avoid duplicate referral records.

Not included:

- Commission creation.
- Click tracking.
- External portal.
- Discount/coupon behavior.

## Important Flow Decision

Better Auth handles account creation through `signUp.email` in the client. A fragile implementation would attach the referral only once after `signUp.email` succeeds. That can lose attribution if the browser redirects early, the network fails after signup, the session cookie is not immediately readable, or the user closes the tab.

Recommended MVP path:

1. Client reads `ref` from URL.
2. Client validates/previews the code for display.
3. Server stores the normalized referral code in a short-lived, signed, HTTP-only cookie before signup.
4. Client performs normal `signUp.email`.
5. After signup success, client calls a server action to attach the pending referral to the current user before redirect.
6. As a recovery path, the dashboard/onboard landing flow also attempts to attach the pending cookie once for authenticated users.
7. After a successful attach, or after determining no valid attach is possible, clear the pending referral cookie.

This keeps Better Auth changes minimal while making attribution resilient to redirect/reload timing issues.

## Proposed Action

Add to `actions/affiliate.ts`:

```ts
export async function getReferralCodePreview(code: string): Promise<ActionResultWithData<ReferralCodePreview>>;
export async function storePendingReferralCode(code: string): Promise<ActionResultWithData<ReferralCodePreview | null>>;
export async function attachPendingReferralToCurrentUser(): Promise<ActionResultWithData<{ referralId: string } | null>>;
export async function attachReferralToCurrentUser(code: string): Promise<ActionResultWithData<{ referralId: string } | null>>;
```

Preview shape:

```ts
interface ReferralCodePreview {
  code: string;
  affiliatorName: string;
}
```

Preview rules:

- Only return data for active affiliators.
- Return display-safe fields only.
- Do not return portal token, payout data, or internal notes.

Attach rules:

- Require authenticated current user with `getRequestUser()` or session.
- For `attachPendingReferralToCurrentUser`, read the signed pending referral cookie.
- For `attachReferralToCurrentUser`, accept an explicit normalized code as an immediate fallback after email signup.
- Find active affiliator by `code`.
- If not found, return success with `null` or user-friendly error depending on UI choice.
- If `affiliator.userId === currentUser.id`, reject self-referral.
- If current user already has a `Referral`, do nothing and return existing or `null`.
- Create `Referral` with `referredUserId`, `affiliatorId`, and `referralCode`.
- Clear the pending referral cookie after successful attach or after the current user already has a referral.

Pending cookie rules:

- Cookie name can be `rms_pending_referral`.
- Cookie should be HTTP-only, secure in production, `sameSite: "lax"`, and short-lived, for example 24 hours.
- Store a signed value or signed JSON payload, not a trustable raw code.
- The cookie is only an attribution hint. The attach action must still re-validate that the affiliator exists and is active.
- If the cookie is expired, invalid, or tampered with, ignore it and clear it.

## Auth UI Changes

Likely file:

- `components/auth/auth-card.tsx`

Needed changes:

- Use `useSearchParams` to read `ref`.
- Because `useSearchParams` can trigger CSR bailout in Next, ensure the route/component setup has an appropriate Suspense boundary if needed.
- Store normalized referral code in local state.
- When a valid `ref` is present or manually entered, call `storePendingReferralCode(referralCode)` so attribution can survive reloads and redirect timing.
- On register success, call `attachPendingReferralToCurrentUser()` before redirect.
- If the pending-cookie attach returns no referral and a local referral code is still available, call `attachReferralToCurrentUser(referralCode)` as a best-effort immediate fallback.
- Show a small note on register tab if code is valid.

Example UI text:

```txt
Referral aktif: Budi Partner
```

If invalid:

```txt
Kode referral tidak valid atau sudah tidak aktif.
```

Do not block registration if referral code is invalid. Recommended behavior is to let signup continue without referral.

## Optional Manual Code Input

Recommended MVP:

- Automatically capture `?ref=`.
- Also add optional input field on register form: `Kode referral`.

Reason:

- Users may receive a code by WhatsApp and visit the site manually.
- This improves attribution without adding much complexity.

Validation:

- Trim and uppercase code.
- Do not show hard error for invalid code unless the user typed it manually and expects feedback.

## Persistence Across Tab Switches

If user lands on `/auth?ref=CODE` but switches login/register tabs, keep the code in component state.

Recommended:

- Store the authoritative pending code in a short-lived HTTP-only cookie via `storePendingReferralCode`.
- Component state can still hold the display value and preview state.
- Optional `sessionStorage` can be used only as a UI convenience, not as the source of truth for payout attribution.

## Google Sign-In Caveat

Current UI supports Google sign-in. Referral capture for Google is harder because the user leaves and returns through OAuth.

MVP options:

- Email signup only supports referral attribution.
- Or store referral code in a short-lived cookie/sessionStorage before Google sign-in and attach after callback when user reaches dashboard/onboard.

Recommended for this phase:

- The pending referral cookie should be set before Google sign-in starts.
- After OAuth returns and the user reaches `/dashboard` or `/onboard`, call `attachPendingReferralToCurrentUser()` once from a server-side landing helper or an authenticated client effect.
- If this is too much for MVP, explicitly label Google attribution as unsupported instead of silently dropping referral codes.

## Implementation Steps

1. Add referral preview, pending-cookie, and attach actions to `actions/affiliate.ts`.
2. Update `components/auth/auth-card.tsx` to read and store `ref`.
3. Add optional referral code field to register form.
4. Add valid referral preview text.
5. Store valid referral codes in the pending referral cookie before signup.
6. Call `attachPendingReferralToCurrentUser` after successful `signUp.email` and before redirect.
7. Add one authenticated recovery attach on `/dashboard` or `/onboard` when the pending cookie exists.
8. Keep redirect behavior unchanged after attach attempt completes.
9. Run verification.

## Manual Verification

- Create an active external affiliator from superuser.
- Open `/auth?ref=CODE` in logged-out browser.
- Register a new admin user.
- Confirm a `Referral` row is created for the new user.
- Register with invalid code and confirm signup still works without referral.
- Register without code and confirm no referral is created.
- Try using a code owned by the same linked user and confirm self-referral is rejected or ignored.
- Try attaching twice and confirm no duplicate referral is created.
- Simulate reload/redirect after signup while pending cookie exists and confirm recovery attach creates the referral.
- Confirm pending referral cookie is cleared after successful attach.
- Confirm tampered or expired pending referral cookie is ignored and cleared.

## Commands

```bash
bun run lint
bun run build
```

## Exit Criteria

- New email signups can be attributed to active affiliators.
- Invalid/inactive codes do not break signup.
- Self-referral is blocked.
- Duplicate attribution is prevented.
- Referral records are ready for commission generation in Phase 04.

## Risks And Follow-Ups

- If both immediate attach and recovery attach fail after signup, the user may be created without referral. Log attach failures with user id and attempted code for manual recovery.
- OAuth referral attribution requires additional persistence/callback handling.
- Public referral preview must not reveal sensitive affiliator information.
