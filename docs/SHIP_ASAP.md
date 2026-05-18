# Momentum Ship Plan

## Product

Momentum is a mobile app for powerlifting coaches and athletes. The first monetizable release should sell coach workflow: client roster, program delivery, workout logging, progress analytics, and paid coach seats.

## Current Scope

- Expo React Native app converted to TypeScript.
- Firebase dependencies removed from the new version.
- Supabase Auth configured with Expo-compatible session persistence.
- Supabase Postgres migration added for app documents and subscription records.
- Legacy Firestore-style calls are routed through a Supabase compatibility layer so existing screens can keep working while the codebase is cleaned screen by screen.

## Revenue Path

1. Free athlete accounts.
2. Coach subscription with a free tier capped by active clients.
3. Paid tiers by active athlete count.
4. Later: Stripe Customer Portal, program template marketplace, coach analytics exports.

## Before App Store

1. Create a Supabase project and run the migration.
2. Add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
3. Decide whether email confirmation is required for launch.
4. Add Stripe checkout and webhook-backed subscription updates.
5. Tighten RLS from MVP-wide authenticated document access to relationship-aware policies.
