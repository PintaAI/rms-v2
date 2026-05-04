# Phase 06: Hardening, Reporting, And Growth Features

## Objective

Improve reliability, observability, fraud resistance, and operational reporting after the MVP affiliate system is working end-to-end.

## Product Outcome

The affiliate program becomes safer to operate at scale. Superusers get better reporting tools, affiliators get clearer performance visibility, and the system is prepared for future billing automation or public promotion campaigns.

## Dependencies

- Phase 01 through Phase 05 completed.
- End-to-end flow works: create affiliator, share referral link, signup, paid-plan activation, commission creation, external portal tracking.

## Scope

This phase is intentionally modular. Each section can be implemented independently based on business priority.

## 1. Click Tracking

### Goal

Track visits to referral links before signup to calculate conversion rate more accurately.

### Proposed Model

```prisma
model AffiliateClick {
  id           String   @id @default(uuid())
  affiliatorId String
  referralCode String
  ipHash       String?
  userAgent    String?
  referrer     String?
  createdAt    DateTime @default(now())

  affiliator Affiliator @relation(fields: [affiliatorId], references: [id])

  @@index([affiliatorId])
  @@index([referralCode])
  @@index([createdAt])
  @@map("affiliate_click")
}
```

### Implementation Options

- Add a route `/r/[code]` that records click then redirects to `/auth?ref=CODE`.
- Or record click directly when `/auth?ref=CODE` loads.

Recommended:

- Use `/r/[code]` for clean public links and reliable tracking.

Example:

```txt
https://rms.app/r/RMS-BUDI-4K8D
```

### Privacy

- Do not store raw IP address.
- Store a hash if deduplication is needed.
- Avoid collecting unnecessary personal data.

## 2. Fraud And Abuse Checks

### Goal

Reduce invalid commissions and self-referrals.

### Checks

- Block self-referral when `Affiliator.userId === referredUser.id`.
- Block referral if affiliator email equals referred user email.
- Flag same phone number if available.
- Flag suspicious repeated signups from same hashed IP.
- Flag multiple free signups with no toko/onboarding completion.
- Add superuser-visible fraud notes.

### Optional Model Fields

Add to `Referral`:

```prisma
riskFlags Json?
riskScore Int @default(0)
```

## 3. CSV Export

### Goal

Let superuser export affiliate/referral/commission data for payout reconciliation.

### Exports

- Affiliator list.
- Commission payout report.
- Referral conversion report.

### Suggested Routes

Use route handlers:

- `app/api/superuser/affiliates/export/route.ts`
- `app/api/superuser/affiliate-commissions/export/route.ts`

Authorization:

- Require session.
- Require `superuser` role.

## 4. Better External Portal Security

### Goal

Replace static token-only access with a more secure flow.

### Options

1. Magic link by email.
2. OTP by WhatsApp.
3. Passwordless portal account only for affiliators.

Recommended next step:

- Magic link by email if reliable email sending exists.
- WhatsApp OTP if RMS already has stable WhatsApp integration available for platform messages.

## 5. RMS-User Affiliate Dashboard

### Goal

Let RMS users who are also affiliators track earnings inside the logged-in RMS app.

### Route Options

- Admin dashboard route: `app/(dashboard)/[tokoid]/admin/affiliate/page.tsx`.
- Global account route: `app/affiliate/me/page.tsx`.

Recommended:

- Use global `app/affiliate/me/page.tsx` because affiliate earnings are platform-level, not toko-specific.

### Access Rule

- User must be logged in.
- User must have `Affiliator.userId === currentUser.id`.

## 6. Recurring Or Upgrade Commissions

### Goal

Support more advanced commission structures.

### Options

- First paid activation only.
- First invoice only.
- Recurring for first 3 months.
- Recurring lifetime while customer remains paid.
- Upgrade bonus from premium to enterprise.

### Data Model Change Needed

For recurring commission, add billing period fields:

```prisma
periodStart DateTime?
periodEnd   DateTime?
source      String?
```

Update uniqueness:

```prisma
@@unique([referralId, plan, periodStart])
```

Do this before generating recurring records.

## 7. Admin Notifications

### Goal

Notify superuser when new commissions are created.

### Options

- Dashboard badge/count.
- Email digest.
- WhatsApp message.
- In-app notification model.

Recommended MVP extension:

- Add pending commission count to `/superuser` overview.

## 8. Affiliator Reports By WhatsApp

### Goal

Send monthly report to affiliators.

### Report Contents

- New signups.
- Paid conversions.
- Pending commission.
- Paid commission.
- Tracking link.

### Delivery

- Manual copy text from superuser dashboard first.
- Automated scheduled messages later.

## 9. Tests And Verification Scripts

### Goal

Make affiliate behavior safer to maintain.

### Suggested Coverage

- Code generation uniqueness.
- Masking helpers.
- Commission amount calculation.
- Self-referral prevention.
- Duplicate commission prevention.
- Status transition rules.

Current repo has no dedicated test script, so options are:

- Add lightweight unit test setup in a future tooling phase.
- Or keep verification as manual checklist plus `bun run lint` and `bun run build`.

## Operational Dashboards

Add superuser stats:

- Top affiliators by signup count.
- Top affiliators by paid conversions.
- Top affiliators by paid commission.
- Conversion rate per affiliator.
- Pending payout amount.
- Commission aging report.

## Implementation Priority Recommendation

Recommended order after MVP:

1. CSV export for payout operations.
2. Click tracking with `/r/[code]` links.
3. Fraud flags.
4. RMS-user affiliate dashboard.
5. Magic link or WhatsApp OTP portal.
6. Recurring/upgrade commissions.
7. Automated WhatsApp reports.

## Verification

Each hardening feature should still pass:

```bash
bun run lint
bun run build
```

Feature-specific manual checks should be added at implementation time.

## Exit Criteria

This phase is complete when the selected hardening/reporting items are implemented and documented. Because this is a growth phase, it should be treated as a backlog of improvements rather than a single mandatory release.
