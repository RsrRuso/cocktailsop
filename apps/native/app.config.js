// Expo config with env-driven "extra" values.
// Use EXPO_PUBLIC_* vars in apps/native/.env

export default ({ config }) => ({
  ...config,
  name: "SpecVerse",
  slug: "specverse",
  scheme: "specverse",
  extra: {
    ...config.extra,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    webBaseUrl: process.env.EXPO_PUBLIC_WEB_BASE_URL,
  },
});

