# Supabase Setup

This project is ready for Supabase, but you still need to create the hosted project and add local environment values.

## 1. Create The Supabase Project

1. Go to https://supabase.com/dashboard.
2. Create a new project named `momentum`.
3. Choose the closest region to your first market.
4. Save the database password somewhere secure.
5. Wait until the project finishes provisioning.

## 2. Get The App Keys

In the Supabase project dashboard:

1. Open the project.
2. Open the Connect/API keys area.
3. Copy the Project URL.
4. Copy the publishable key. Supabase now recommends publishable keys for client apps; legacy anon keys still work but should not be the default choice for a new app.

## 3. Create `.env`

Create `/Users/dorsamomeni/Documents/New project/momentum-app/.env`:

```sh
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
```

Restart Expo after changing `.env`.

## 4. Apply The Database Migration

From the project folder:

```sh
cd "/Users/dorsamomeni/Documents/New project/momentum-app"
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase db push
```

The project ref is the short id in your Supabase dashboard URL:

```text
https://supabase.com/dashboard/project/your-project-ref
```

## 5. Enable Auth

For the MVP:

1. Open Authentication in Supabase.
2. Enable email/password signups.
3. Add your local URLs to allowed redirect URLs:

```text
http://localhost:8081
http://localhost:19006
exp://127.0.0.1:8081
```

For production, add your deployed web URL and app scheme before release.

## 6. Run The App

Mobile:

```sh
npx expo start --clear
```

Desktop browser:

```sh
npm run web
```

## 7. Production Notes

- Do not put service role or secret keys in `.env` for the Expo app.
- The publishable key is safe in the client when Row Level Security is enabled.
- The current MVP migration uses a generic `documents` table for speed. Before paid users, tighten RLS around coach-athlete relationships and move high-value data into relational tables.
