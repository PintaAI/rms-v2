# RMS v2

Repair management system built with Next.js 16, Better Auth, Prisma 7, and Bun.

## Stack

- Next.js 16 App Router with `cacheComponents` enabled
- React 19
- Bun for package management and scripts
- Better Auth for email/password and Google auth
- Prisma 7 with `@prisma/adapter-pg` and generated client output in `prisma/generated/prisma`
- shadcn/ui with the `radix-mira` preset and Remix Icon

## Requirements

- Bun
- PostgreSQL reachable through `DATABASE_URL`

## Environment

Runtime and local workflows read env from `.env` / `dotenv`.

Required:

- `DATABASE_URL`

Used by app features:

- `NEXT_PUBLIC_APP_URL`
- `BETTER_AUTH_URL`
- `DEV_MODE`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `BLOB_READ_WRITE_TOKEN`
- `MOBILEAPI_API_KEY` for optional MobileAPI.dev device search assist

## Install

```bash
bun install
```

`postinstall` already runs `prisma generate`.

## Run

```bash
bun run dev
```

Open `http://localhost:3000`.

## Verification

Run checks in this order:

```bash
bun run lint
bun run build
```

There is no dedicated test or typecheck script; the build is the type-safe verification step.

## Database And Seed Data

Seed commands:

```bash
bun run seed
bun run seed:small
bun run seed:medium
bun run seed:large
bun run seed:reset
```

Notes:

- `seed:reset` runs `bunx prisma db push --force-reset` and then reseeds.
- Seeded credentials are written to `dev-doc/dev-seed-logins.md`.
- Default seeded password is `test1234` unless `SEED_PASSWORD` is set.

## Project Shape

- Main authenticated app routes live under `app/(dashboard)/[tokoid]/(admin|staff|teknisi)`.
- `/dashboard` and `/onboard` are redirect/onboarding entry pages.
- Route protection lives in `proxy.ts`.
- Auth API lives in `app/api/auth/[...all]/route.ts`.
- Server actions live in `actions/`.
- Prisma schema is `prisma/schema.prisma`; Prisma CLI config is `prisma.config.ts`.

## Repo Conventions

- Use `bun`, not npm.
- Import Prisma runtime types from `@/prisma/generated/prisma/client`, not `@prisma/client`.
- Prefer shared auth and role helpers from `lib/auth.ts`, `lib/rbac.ts`, and `lib/redirect-by-role.ts`.
- Use `teknisi` for route segments and `technician` for role values.
- Use `@remixicon/react` for icons; do not introduce `lucide-react`.

## User Manual Content

The user manual is file-backed:

- Markdown files live in `user-manual/`
- Filenames encode order and icon, for example `01-overview[RiBook2Line].md`
- `lib/markdown.ts` parses docs and supports `:::demo ComponentName` blocks
- Demo components are registered from `components/user-manual/demo-components`

## Deployment Note

`vercel.json` uses Bun and runs:

```bash
bun run prisma generate && bun run next build
```
