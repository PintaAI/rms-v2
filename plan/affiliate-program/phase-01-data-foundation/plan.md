# Phase 01: Affiliate Data Foundation

## Objective

Create the database and domain foundation for a hybrid affiliate program where an affiliator can be either an external promoter or an existing RMS user. This phase does not add customer-facing UI. It creates the stable data model, generated Prisma client, and core server helpers needed by later phases.

## Product Outcome

After this phase, the app can represent:

- External affiliators with no RMS login account.
- Existing RMS users who are also affiliators.
- Public referral codes.
- Private portal tokens for earnings tracking.
- Referral records that link new users to affiliators.
- Commission records that can later be generated from paid-plan activation.

## Scope

Included:

- Add Prisma enums and models.
- Add relations to `User`.
- Generate Prisma client.
- Add server-side constants and utility helpers for codes, tokens, amount rules, and masking.
- Add minimal domain types used by later actions/components.

Not included:

- Superuser UI.
- Signup referral capture.
- Commission generation automation.
- External portal pages.
- Click tracking.
- Affiliate login/magic link.

## Current Repo Context

- Prisma schema: `prisma/schema.prisma`.
- Generated client output: `prisma/generated/prisma/`.
- Runtime Prisma import pattern: `lib/prisma.ts` with generated types from `@/prisma/generated/prisma/client` and enums from `@/prisma/generated/prisma/enums`.
- Subscription updates currently happen in `actions/superuser.ts` via `updateUserSubscription`.
- Better Auth creates free subscriptions in `lib/auth.ts` after email signup.
- Existing meaningful verification commands are `bun run lint` and `bun run build`.

## Proposed Prisma Enums

Add near existing enums:

```prisma
enum AffiliatorStatus {
  active
  inactive
}

enum AffiliateCommissionType {
  fixed
  percentage
}

enum AffiliateCommissionStatus {
  pending
  approved
  paid
  rejected
}
```

## Proposed Prisma Models

Add models after `Subscription` or before logging models:

```prisma
model Affiliator {
  id     String  @id @default(uuid())
  userId String? @unique

  name  String
  email String?
  phone String?

  code        String            @unique
  portalToken String            @unique
  status      AffiliatorStatus  @default(active)

  commissionType              AffiliateCommissionType @default(fixed)
  premiumCommissionValue      Int                     @default(100000)
  enterpriseCommissionValue   Int                     @default(200000)

  payoutInfo Json?
  notes      String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user        User?                 @relation(fields: [userId], references: [id], onDelete: SetNull)
  referrals   Referral[]
  commissions AffiliateCommission[]

  @@index([status])
  @@index([email])
  @@map("affiliator")
}

model Referral {
  id             String   @id @default(uuid())
  affiliatorId   String
  referredUserId String   @unique
  referralCode   String
  convertedAt    DateTime?
  createdAt      DateTime @default(now())

  affiliator   Affiliator @relation(fields: [affiliatorId], references: [id])
  referredUser User       @relation(fields: [referredUserId], references: [id])

  commissions AffiliateCommission[]

  @@index([affiliatorId])
  @@index([referralCode])
  @@index([createdAt])
  @@map("referral")
}

model AffiliateCommission {
  id            String                    @id @default(uuid())
  affiliatorId  String
  referralId    String
  userId        String
  plan          SubscriptionPlan
  amount        Int
  status        AffiliateCommissionStatus @default(pending)
  createdAt     DateTime                  @default(now())
  approvedAt    DateTime?
  paidAt        DateTime?
  rejectedAt    DateTime?
  notes         String?

  affiliator Affiliator @relation(fields: [affiliatorId], references: [id])
  referral   Referral   @relation(fields: [referralId], references: [id])
  user       User       @relation(fields: [userId], references: [id])

  @@unique([referralId, plan])
  @@index([affiliatorId])
  @@index([userId])
  @@index([status])
  @@index([createdAt])
  @@map("affiliate_commission")
}
```

Add relations to `User`:

```prisma
affiliatorProfile Affiliator?
referredByReferral Referral?
affiliateCommissions AffiliateCommission[]
```

## Domain Rules

- `Affiliator.userId` is optional.
- `Affiliator.userId` is unique so one RMS user can have at most one affiliator profile.
- `Affiliator.code` is public and used in referral links.
- `Affiliator.portalToken` is private and used to access the external tracking portal.
- `Referral.referredUserId` is unique so each user can only be attributed to one affiliator.
- `AffiliateCommission` has `@@unique([referralId, plan])` to prevent duplicate commission for the same referral and plan.
- Commission is only for paid plans. `free` should never create a commission.

## Helper Files To Add

Recommended new file: `lib/affiliate.ts`.

Suggested exports:

```ts
export const DEFAULT_PREMIUM_COMMISSION = 100_000;
export const DEFAULT_ENTERPRISE_COMMISSION = 200_000;

export function generateAffiliatorCode(name: string): string;
export function generatePortalToken(): string;
export function getCommissionAmount(input: {
  plan: "premium" | "enterprise";
  commissionType: "fixed" | "percentage";
  premiumCommissionValue: number;
  enterpriseCommissionValue: number;
  subscriptionPrice?: number;
}): number;
export function maskEmail(email: string): string;
export function maskPhone(phone: string): string;
```

Implementation notes:

- Use `nanoid` because it already exists in `package.json`.
- Code format can be `RMS-${SLUG}-${SUFFIX}`.
- Keep codes uppercase and URL-safe.
- Portal token should be long and unguessable, for example `nanoid(48)`.
- `maskEmail` and `maskPhone` are required later for external portal privacy.

## Implementation Steps

1. Update `prisma/schema.prisma` with enums, models, and `User` relations.
2. For the current non-production MVP phase, sync the dev database with `bunx prisma db push`.
3. Run `bunx prisma generate`.
4. Add `lib/affiliate.ts` with helper constants and pure functions.
5. If generated enum imports are needed, use `@/prisma/generated/prisma/enums`.
6. Confirm the app compiles after schema generation.

Production note:

- `db push` is acceptable while this feature is still local/dev MVP and the database is disposable or easy to reset.
- Before production, replace the `db push` flow with a Prisma migration, for example `bunx prisma migrate dev --name add-affiliate-program`, and deploy it with `bunx prisma migrate deploy`.
- Do not rely on `bunx prisma generate` alone because it only updates the generated client and does not create database tables.

## Verification

Run:

```bash
bunx prisma db push
bunx prisma generate
bun run lint
bun run build
```

Expected result:

- Prisma client generation succeeds.
- Dev database contains the new affiliate tables/enums.
- Lint succeeds.
- Build succeeds.

## Exit Criteria

- Database schema supports hybrid affiliators.
- Prisma generated client includes new models/enums.
- Helper functions are available for later phases.
- No UI or flow behavior is changed yet.

## Risks And Follow-Ups

- Current plan uses `db push` for non-production MVP speed. If existing production data exists, use Prisma migrations instead of `db push`.
- If `portalToken` is exposed accidentally in UI, external earnings data can leak.
- If commission uniqueness is too strict for future recurring commissions, later phases may add billing-period fields.
