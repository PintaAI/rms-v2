<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Commands

- Use `bun` for everything. `bun run dev`, `bun run start`, `bun run seed`, etc.
- `postinstall` runs `prisma generate` automatically.
- No test or typecheck script exists.
- Do not run lint, build, test, typecheck, or other verification commands unless the user explicitly asks.

## App Shape

- Single Next 16 app-router app with `cacheComponents` enabled in `next.config.ts`.
- Authenticated routes under `app/(dashboard)/[tokoid]/(admin|staff|teknisi)`. `/dashboard` and `/onboard` are landing/redirect pages, not the app shell.
- Route protection is in `proxy.ts`, not `middleware.ts`.

## Auth & Data

- **better-auth**, not NextAuth. Server config at `lib/auth.ts`, client at `lib/auth-client.ts`, handler at `app/api/auth/[...all]/route.ts`.
- Roles: `admin`, `staff`, `technician` (Indonesian `teknisi` in route segments). Reuse `lib/rbac.ts` and `lib/redirect-by-role.ts`.
- Prisma 7 with driver-adapter pattern. Import runtime types from `@/prisma/generated/prisma/client`. Runtime connection via `lib/prisma.ts` with `PrismaPg`. Schema at `prisma/schema.prisma`, CLI config at `prisma.config.ts`, generated output at `prisma/generated/prisma/`.

## Feature Gates

Registered in `lib/features.ts` — add a key to `FeatureKey` union + entry in `FEATURE_REGISTRY`. Enforcement via `assertFeature()` from `lib/auth/request-scope.ts`. Server-side enforcement mandatory. See `dev-doc/registering-feature-gates.md` for the full pattern.

## Seeds & Env

- `DATABASE_URL` is required. Other envs: `NEXT_PUBLIC_APP_URL`, `BETTER_AUTH_URL`, `DEV_MODE`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BLOB_READ_WRITE_TOKEN`.
- Seed commands: `bun run seed`, `seed:small`, `seed:medium`, `seed:large`, `seed:reset` (force-reset + reseed).
- Seeded credentials written to `dev-doc/dev-seed-logins.md`. Default password `test1234` unless `SEED_PASSWORD` is set.

## Repo Conventions

- Server actions in `actions/` (auto-exported via `actions/index.ts`). Call `revalidatePath` directly or via `lib/revalidation.ts` after mutations.
- UI: shadcn `radix-mira` preset, Tailwind v4, `@remixicon/react` icons. Follow `components.json`. Never introduce `lucide-react`.
- User manual: `user-manual/*.md` parsed by `lib/markdown.ts`, exposed by `app/api/user-manual/route.ts`. Filenames encode order + icon (e.g. `01-overview[RiBook2Line].md`). Markdown `:::demo ComponentName` blocks wired through `components/user-manual/demo-components`.
- Dev docs live in `dev-doc/` — read relevant ones before touching auth, feature gates, or WhatsApp.
