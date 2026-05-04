# Phase 04: Commission Lifecycle

## Objective

Generate affiliate commissions when a referred customer activates a paid subscription plan, and allow superusers to manage commission payout statuses.

## Product Outcome

When a referred user moves from `free` to `premium` or `enterprise`, the system creates a pending commission for the affiliator. Superuser can approve, reject, and mark commissions as paid.

## Dependencies

- Phase 01 completed.
- Phase 02 completed for superuser affiliate management.
- Phase 03 completed so referrals are created.
- Existing subscription update action: `actions/superuser.ts` `updateUserSubscription`.

## Scope

Included:

- Commission creation on paid-plan activation.
- Idempotency so duplicate commissions are not created.
- `convertedAt` update on `Referral`.
- Superuser commission table/actions.
- Commission status transitions.

Not included:

- Payment gateway integration.
- Recurring commission.
- Invoice/payment proof upload.
- Automatic bank/e-wallet payout.

## Commission Trigger

MVP trigger:

```txt
free -> premium
free -> enterprise
```

Also acceptable:

```txt
inactive/no subscription -> premium
inactive/no subscription -> enterprise
```

Do not create commission for:

- `premium -> enterprise` unless product explicitly wants upgrade commission.
- `enterprise -> premium`.
- `premium -> free`.
- `enterprise -> free`.
- Any update to `free`.

## Commission Amount Rule

Use affiliator-specific fixed values from `Affiliator`:

- `premiumCommissionValue`, default `100000`.
- `enterpriseCommissionValue`, default `200000`.

For MVP, keep `commissionType = fixed` even if the schema supports `percentage` for future use.

## Proposed Helper Function

Add to `actions/affiliate.ts` or `lib/affiliate-commission.ts`:

```ts
export async function createCommissionForPaidPlanActivation(input: {
  userId: string;
  previousPlan: SubscriptionPlan | null;
  nextPlan: SubscriptionPlan;
}): Promise<void>;
```

Rules:

- Return early if `nextPlan === "free"`.
- Return early if previous plan was already paid.
- Find referral by `referredUserId`.
- Include affiliator.
- Return early if no referral.
- Return early if affiliator is inactive, unless business wants old valid referrals to still count. Recommended MVP: inactive affiliators do not earn new commissions.
- Create commission in transaction.
- Use unique constraint to avoid duplicates.
- Set `Referral.convertedAt` if not already set.

## Update `updateUserSubscription`

Current file:

- `actions/superuser.ts`

Change flow:

1. Load existing subscription plan before update.
2. Upsert subscription to requested plan.
3. If plan activation qualifies, create commission.
4. Revalidate `/superuser`.

Important:

- Avoid creating commission before subscription update succeeds.
- Ideally perform subscription update and commission creation in a transaction.
- If using separate helper with Prisma transaction, keep code simple and safe.

## Commission Status Actions

Add actions:

```ts
export async function updateAffiliateCommissionStatus(input: {
  commissionId: string;
  status: "pending" | "approved" | "paid" | "rejected";
  notes?: string;
}): Promise<ActionResultWithData<CommissionRow>>;
```

Allowed transitions:

- `pending -> approved`
- `pending -> rejected`
- `approved -> paid`
- `approved -> rejected`
- `rejected -> pending` only if superuser intentionally reopens it. Optional for MVP.

Timestamp rules:

- Set `approvedAt` when status becomes `approved`.
- Set `paidAt` when status becomes `paid`.
- Set `rejectedAt` when status becomes `rejected`.
- Do not clear timestamps unless reopening is implemented.

## UI Changes

Extend affiliate management UI from Phase 02.

Add commission table with columns:

- Affiliator.
- Referred customer masked or full for superuser.
- Plan.
- Amount.
- Status.
- Created date.
- Approved date.
- Paid date.
- Notes.
- Actions.

Superuser can see full customer info because they are platform admin. External portal in Phase 05 must mask it.

Action buttons:

- Approve.
- Reject.
- Mark paid.
- Edit notes.

## Reporting Stats

Add stats:

- Pending commissions count.
- Pending commissions amount.
- Approved commissions amount.
- Paid commissions amount.
- Rejected commissions amount.
- Conversion count.

## Manual Verification

1. Create active affiliator.
2. Register a new user with referral code.
3. In superuser dashboard, change referred user from `free` to `premium`.
4. Confirm one pending commission is created.
5. Change the same user to `premium` again and confirm no duplicate commission.
6. Change another referred user to `enterprise` and confirm enterprise amount.
7. Approve commission and confirm `approvedAt` is set.
8. Mark paid and confirm `paidAt` is set.
9. Reject commission and confirm `rejectedAt` is set.
10. Confirm non-superuser cannot update commission status.

## Commands

```bash
bun run lint
bun run build
```

## Exit Criteria

- Paid-plan activation creates pending commission exactly once.
- Superuser can manage commission status.
- Commission stats appear in superuser affiliate management.
- Referral conversion timestamp is set.

## Risks And Follow-Ups

- If future billing is automated, commission trigger should move from manual superuser action to paid invoice/webhook confirmation.
- If recurring commission is needed, add billing period fields before generating recurring records.
- If upgrade commission is desired later, revisit uniqueness and amount rules.
