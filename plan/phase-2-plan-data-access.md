# Phase 2: Plan Data Access

## Objective

Make subscription plan data consistently available in server and client code, using the admin user's subscription as the source of truth.

## Implementation Keys

- The schema already has `Subscription` and `SubscriptionPlan`.
- `lib/auth.ts` already creates a `free` subscription on email signup and attaches subscription to returned auth data.
- `components/auth/auth-provider.tsx` currently drops `subscription` from the client context.
- Server actions need a reliable way to resolve the authenticated user's plan.
- Missing subscription rows should behave as `free`.
- Subscription ownership is attached to the admin user.
- Staff and technician users should resolve their effective plan from the toko owner's/admin's subscription.

## Server Helper Options

Preferred minimal approach:

- Extend `getAuthUser()` in `lib/rbac.ts` to include `plan`.
- Query `Subscription` with the user/toko access lookup and resolve the toko owner's/admin's subscription when the current user is staff or technician.
- Return `plan: "free"` when no subscription row exists.

Alternative:

- Add `getCurrentPlan()` or `getAuthUserWithPlan()` in `lib/features.ts` or `lib/auth-helpers.ts`.

Preferred choice: extend `getAuthUser()` because most server actions already call it directly or indirectly.

## Client Context Update

Update auth context user shape to include:

```ts
subscription?: {
  id: string
  plan: string
} | null
plan: "free" | "premium" | "enterprise"
```

Keep `plan` normalized so UI code does not repeatedly handle missing values.

## To Do

- [x] Update `AuthUser` in `lib/rbac.ts` with `plan`.
- [x] Load subscription plan in `getAuthUser()`.
- [x] Resolve staff/technician effective plan from the toko owner's/admin's subscription.
- [x] Normalize missing subscription to `free`.
- [x] Update `components/auth/auth-provider.tsx` user type to include subscription/plan.
- [x] Pass subscription/plan through the context value.
- [x] Check any TypeScript fallout from the user type change.
- [x] Run `bun run lint`.
- [x] Run `bun run build` if lint passes.

## Verification

- Server actions can read `user.plan`.
- Client components can read `useAuth().user?.plan`.
- Existing auth/session behavior remains unchanged for login and signup.
