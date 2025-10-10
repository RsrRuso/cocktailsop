import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.f6820a3952e742afbcec46bcaaa4573d',
  appName: 'spec-verse-reborn',
  webDir: 'dist',
  server: {
    url: 'https://f6820a39-52e7-42af-bcec-46bcaaa4573d.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#000000',
      showSpinner: false,
    },
  },
};

export default config;
