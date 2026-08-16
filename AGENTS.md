# Yemanuel Store — OpenCode Instructions

## Project

Yemanuel Store is a Ghanaian e-commerce website and integrated store management application.

The application contains:

- Customer storefront
- Store management system

## Before Making Changes

1. Inspect the existing repository.
2. Read `PROJECT_SPEC.md`.
3. Read `docs/ARCHITECTURE.md` when it exists.
4. Understand existing implementation before modifying files.
5. Do not replace working functionality unnecessarily.

## Technology

Use the existing project stack:

- Next.js
- React
- TypeScript
- App Router
- Tailwind CSS
- Supabase/PostgreSQL

Do not add a dependency unless it is genuinely required.

## Code Quality

- Use TypeScript.
- Avoid `any` unless there is a documented reason.
- Prefer reusable components.
- Keep business logic separate from UI where practical.
- Use clear naming.
- Handle loading, empty, success and error states.
- Validate user input.
- Never hard-code secrets.
- Never expose server credentials to browser code.

## Database

- Database changes must use migrations.
- Do not manually alter production database structure without a migration.
- Use appropriate foreign keys and constraints.
- Add indexes where justified.
- Preserve data integrity.

## Supabase

- Create clients only through `src/lib/supabase/client.ts` (browser) and `src/lib/supabase/server.ts` (server). Do not call `createBrowserClient` / `createServerClient` directly in pages or components.
- Read Supabase environment variables only through `src/lib/supabase/env.ts`.
- Browser code may use only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only. Never import it into client components or expose it in API responses.
- Session refresh runs in `src/proxy.ts` (Next.js proxy convention). Route guards belong there or in server-side checks, never in the UI alone.

## Authentication and Authorization

Management routes must be protected.

Do not assume that hiding a navigation item provides security.

Authorization must be enforced server-side.

## UI

Customer-facing pages should be modern, responsive and easy to use.

Management pages should use a compact ERP-style layout with:

- Compact typography
- Dense but readable tables
- Consistent forms
- Clear navigation
- Minimal unnecessary whitespace

Do not introduce oversized UI elements without a specific design reason.

## Ghana

Use Ghanaian context where applicable:

- GHS / GH₵
- Ghana phone formats
- Ghana regions and cities
- Local payment methods

## Git Safety

Do not:

- Delete unrelated files
- Rewrite project history
- Force push
- Remove working functionality without instruction

Before major changes, inspect `git status`.

## Verification

After meaningful implementation:

1. Run lint.
2. Run the production build.
3. Fix errors before declaring the work complete.

## Working Style

Prefer complete, coherent file changes rather than scattered temporary edits.

Keep changes focused on the requested feature.

When requirements are ambiguous, inspect the repository and existing architecture before making assumptions.
