import Constants from 'expo-constants';

type Extra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

function getExtra(): Extra {
  // Expo SDK 51: values are accessible via expoConfig.extra at runtime
  // when provided by app.config.js.
  return (Constants.expoConfig?.extra ?? {}) as Extra;
}

export const env = {
  supabaseUrl: getExtra().supabaseUrl ?? '',
  supabaseAnonKey: getExtra().supabaseAnonKey ?? '',
};

