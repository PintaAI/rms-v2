<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Commands

- Use `bun` for package management and scripts. Root scripts are `bun run dev`, `bun run build`, `bun run start`, `bun run lint`, and the seed variants in `package.json`.
- There is no dedicated typecheck or test script. The meaningful verification path is `bun run lint` then `bun run build`.
- `postinstall` already runs `prisma generate`; Vercel also forces `bun run prisma generate && bun run next build` in `vercel.json`.

## App Shape

- Single Next 16 app-router app. `next.config.ts` enables `cacheComponents`; `app/experiment/actions.ts` shows the repo already uses `'use cache'`/`cacheLife` patterns.
- Authenticated product routes live under `app/(dashboard)/[tokoid]/(admin|staff|teknisi)`. `/dashboard` and `/onboard` are redirect/landing pages, not the main app shell.
- Route protection lives in `proxy.ts`, not `middleware.ts`.

## Auth And Data

- Uses `better-auth`, not NextAuth. Server config is `lib/auth.ts`, React client is `lib/auth-client.ts`, and the API handler is `app/api/auth/[...all]/route.ts`.
- Roles are `admin`, `staff`, and `technician`; route segments use Indonesian `teknisi`. Reuse `lib/rbac.ts` and `lib/redirect-by-role.ts` instead of re-encoding role/path logic.
- Prisma 7 uses the driver-adapter pattern. Import runtime client types from `@/prisma/generated/prisma/client`; app runtime connects through `lib/prisma.ts` with `PrismaPg`.
- Prisma schema lives at `prisma/schema.prisma`; CLI config is `prisma.config.ts`; generated client output is `prisma/generated/prisma/`.

## Seeds And Env

- `DATABASE_URL` is required for runtime and seeding. Other envs used in code: `NEXT_PUBLIC_APP_URL`, `BETTER_AUTH_URL`, `DEV_MODE`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `BLOB_READ_WRITE_TOKEN`.
- Seed commands are `bun run seed`, `bun run seed:small`, `bun run seed:medium`, `bun run seed:large`, and `bun run seed:reset`.
- `prisma/seed.ts` also writes seeded dev credentials to `dev-doc/dev-seed-logins.md`; default seeded password is `test1234` unless `SEED_PASSWORD` is set.

## Repo Conventions

- Keep server actions in `actions/`. Existing actions commonly call `revalidatePath` directly or via `lib/revalidation.ts` after mutations.
- UI is shadcn with `style: radix-mira`, Tailwind v4, and `@remixicon/react` icons. Follow `components.json`; do not introduce `lucide-react`.
- User manual content is file-backed: `user-manual/*.md` is parsed by `lib/markdown.ts` and exposed by `app/api/user-manual/route.ts`. Filenames encode order and icon like `01-overview[RiBook2Line].md`, and markdown supports `:::demo ComponentName` blocks wired through `components/user-manual/demo-components`.
