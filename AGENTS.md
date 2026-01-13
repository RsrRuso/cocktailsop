# AGENTS.md

Guidance for AI coding agents working in this repository.

## Repo overview

- **Web app**: Vite + React + TypeScript + Tailwind + shadcn/ui.
  - Source lives in `src/`.
  - UI primitives live in `src/components/ui/` (shadcn-style components).
  - Feature/components live in `src/components/**` and `src/pages/**`.
- **Native rewrite**: Expo/React Native app lives in `apps/native/` (separate install + scripts).
- **Backend/DB**: Supabase project lives in `supabase/` (SQL migrations, edge functions, etc.).

## Getting started (web)

```bash
npm install
npm run dev
```

Useful scripts (see `package.json`):

```bash
npm run lint
npm run build
npm run preview
```

## Getting started (native / Expo)

```bash
npm run native:install
npm run native:start
```

Platform helpers:

```bash
npm run native:android
npm run native:ios
```

## Code conventions

- **TypeScript-first**: keep types explicit at boundaries (API calls, context values, hooks).
- **Prefer composition**: add small components/hooks under `src/components/**` and `src/hooks/**`.
- **UI consistency**: prefer existing shadcn/ui components in `src/components/ui/` over inventing new patterns.
- **Avoid app-wide churn**: keep diffs scoped; don’t reformat unrelated files.

## Supabase changes (important)

- Treat `supabase/` as **production-critical**.
- Don’t edit existing migration files unless you’re intentionally rewriting history; prefer **new** migrations.
- If you add/modify SQL, keep it idempotent where possible and include comments for intent.

## Secrets & safety

- **Never commit** `.env` or any credentials/keys.
- If you need new env vars, document them in `README.md` (or a dedicated env example file if present) and keep runtime secrets out of git.

## What to run before shipping

- For code changes: `npm run lint` and any relevant manual smoke checks.
- For doc-only changes: no build required, but keep instructions accurate and repo-specific.

