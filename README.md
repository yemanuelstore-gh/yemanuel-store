# Yemanuel Store

Modern Ghanaian e-commerce website and integrated store management application.

One application operates the complete retail business:

- **Customer storefront** — public shopping experience
- **Customer accounts** — order history, tracking and addresses
- **Store management** — a compact ERP-style admin application

## Stack

- Next.js 16 (App Router)
- React 19
- TypeScript (strict)
- Tailwind CSS v4
- Supabase / PostgreSQL
- Supabase Authentication (Phase 2)
- Deployed on Vercel

Primary currency: Ghanaian Cedi (GHS / GH₵).

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase setup

1. Create a Supabase project (or use an existing one) at
   [supabase.com](https://supabase.com).
2. Copy the project URL and the anon key from **Project Settings → API** into
   `.env.local`:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
   ```

3. The service role key is optional for now — it is used for privileged
   server-side operations in later phases:

   ```bash
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # server only
   ```

Rules:

- `NEXT_PUBLIC_*` variables are inlined at build time. Restart `npm run dev`
  (or rebuild) after changing them.
- The anon key is safe in browser code; it is not a secret.
- `SUPABASE_SERVICE_ROLE_KEY` must never be used in browser code or exposed
  through the API.
- The app works without Supabase variables: the session-refresh proxy simply
  passes requests through, and pages that do not use Supabase are unaffected.
- A developer-facing status page is available at `/dev/supabase` (masked
  values only, no secrets rendered).

## Scripts

| Command              | Purpose                                   |
| -------------------- | ----------------------------------------- |
| `npm run dev`        | Start the development server              |
| `npm run build`      | Production build                          |
| `npm run start`      | Serve the production build                |
| `npm run lint`       | Run ESLint                                |
| `npm run typecheck`  | Type-check the project (`tsc --noEmit`)   |

## Structure

```
src/app/(storefront)/   Public storefront (home, shop)
src/app/(auth)/         Sign in / create account
src/app/account/        Customer account
src/app/admin/          Store management application
src/app/dev/            Developer-facing utilities (Supabase setup check)
src/components/ui/      Reusable UI primitives (Button, Input, Badge, Card)
src/components/admin/   Admin application shell
src/lib/                Shared utilities (formatting, currency, phones)
src/lib/supabase/       Supabase clients (browser, server, env validation)
src/proxy.ts            Session-refresh proxy (Next.js proxy convention)
supabase/migrations/    Versioned database migrations (Phase 2)
```

## Status

Phase 1A: application foundation, route structure, admin shell and shared
utilities. Phase 1B: Supabase infrastructure (browser/server clients,
session-refresh proxy, env validation). Storefront modules, customer
accounts, authentication and the management modules (products, inventory,
orders, sales, payments, suppliers, purchases, expenses, reports, staff,
settings) arrive in later phases.

See `PROJECT_SPEC.md` and `docs/ARCHITECTURE.md` for the full specification.