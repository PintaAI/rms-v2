<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Package Management

Use `bun` for all package management tasks (install, add, remove, etc.). Do not use npm.

## Prisma

- Prisma 7 with driver adapter pattern. Import client from `@/prisma/generated/prisma/client`, not `@prisma/client`.
- Adapter setup in `lib/prisma.ts` uses `PrismaPg` from `@prisma/adapter-pg`.
- Schema at `prisma/schema.prisma`; client generated to `prisma/generated/prisma/`.

## Authentication

- Uses better-auth (not NextAuth). Config in `lib/auth.ts`, client in `lib/auth-client.ts`.
- Roles: `admin`, `staff`, `technician`. RBAC helpers in `lib/rbac.ts`.
- Required env: `DATABASE_URL`. Optional: `GOOGLE_CLIENT_ID/SECRET`, `NEXT_PUBLIC_APP_URL`.

## Server Actions

All server actions in `actions/` directory. Use RBAC helpers (`requireAuth`, `requireRole`, etc.) for authorization.

## UI Components

- shadcn/ui with `radix-mira` style, `remixicon` icons (not lucide-react).
- Config in `components.json`.

## Verification

- `bun run lint` — ESLint only. No typecheck script; TypeScript checked during build.
- No test framework configured.