import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lumen.socialite',
  appName: 'Lumen Socialite',
  webDir: 'public',
  server: {
    url: 'https://lumen-socialite.vercel.app',
    cleartext: false,
  },
};

export default config;