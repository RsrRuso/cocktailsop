// Expo config with env-driven "extra" values.
// Use EXPO_PUBLIC_* vars in apps/native/.env

export default ({ config }) => ({
  ...config,
  // NOTE: Use a unique slug so Expo Go doesn't reuse a cached bundle
  // from another "specverse" project on the device.
  name: "SpecVerse Native",
  slug: "specverse-native",
  scheme: "specverse",
  // Ensures Expo Updates runtime matches SDK (SDK 54)
  runtimeVersion: { policy: "sdkVersion" },
  extra: {
    ...config.extra,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    webBaseUrl: process.env.EXPO_PUBLIC_WEB_BASE_URL,
  },
});

