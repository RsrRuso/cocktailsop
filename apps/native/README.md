
# SpecVerse — Native App (Expo, React Native)

Run:
```bash
npm install
npx expo start
```

Tabs: Home, Explore, Create (spec composer), Reels (video), Messages, Profile.
This app is wired for Supabase auth. Configure env in `apps/native/.env`:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Note: the current UI still uses some seeded local demo data in `src/state.tsx`; the next migration step is to replace that with Supabase-backed queries to match the existing web app.
