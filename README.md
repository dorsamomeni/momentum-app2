# Momentum

Momentum is an Expo React Native app for powerlifting coaches and athletes. Coaches can manage clients, create training blocks/templates, send programs, and review progress. Athletes can receive programming, log training, and track max lifts.

This version is the TypeScript/Supabase rebuild intended for shipping.

## Stack

- Expo SDK 52
- React Native 0.76
- TypeScript
- Supabase Auth and Postgres
- Supabase migrations in `supabase/migrations`

## Quick Start

1. Install dependencies:

```sh
npm install
```

2. Create `.env` from `.env.example`:

```sh
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-public-publishable-key
```

3. Create/link a Supabase project and apply migrations:

```sh
npx supabase link --project-ref your-project-ref
npx supabase db push
```

4. Start the app:

```sh
npm start
```

For desktop/web:

```sh
npm run web
```

The desktop build renders a dedicated coach workspace rather than stretching the mobile UI.

## Project Shape

```text
assets/                 Static app assets
components/             Reusable UI components
contexts/               React context providers
docs/                   Product and shipping notes
navigation/             Stack/tab navigation
pages/                  App screens
src/auth/               Auth flows
src/compat/             Supabase-backed Firebase compatibility layer
src/config/             Supabase client/config
src/services/           Program and coach services
src/types/              Shared app/database types
supabase/               Local Supabase config and migrations
```

## Migration Notes

The legacy app used Firebase/Firestore directly from screens. To move fast, this rebuild keeps those screens working through a Supabase-backed compatibility layer in `src/compat`. New code should use typed Supabase services directly rather than adding more compatibility usage.

The first database migration uses a generic `documents` table so existing program, week, day, exercise, template, analytics, and user records can move without a long relational rewrite. The next backend milestone is replacing hot paths with relational tables and stricter relationship-aware RLS.

## Supabase Setup

Follow [docs/SUPABASE_SETUP.md](./docs/SUPABASE_SETUP.md) to create the hosted project, add `.env`, and push the included migrations.

## Validation

```sh
npm run typecheck
npx expo config --type public
```
