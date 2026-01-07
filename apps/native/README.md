
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

The core social surfaces (Home feed, Explore, Messages, Profiles) use Supabase-backed queries via React Query. Some finance/reporting screens still intentionally mirror the web app’s mock data until those pipelines are connected.
