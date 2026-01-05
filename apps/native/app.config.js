// Expo config with env-driven "extra" values.
// Use EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in apps/native/.env

export default ({ config }) => ({
  ...config,
  name: "SpecVerse",
  slug: "specverse",
  scheme: "specverse",
  extra: {
    ...config.extra,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
});

