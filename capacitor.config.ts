/**
 * Lumen · Socialite — KenNick Technologies LLC
 * Capacitor config (no @capacitor/cli import — keeps Next build clean)
 */
const config = {
  appId: "com.lumensocialite.app",
  appName: "LUMR",
  webDir: "public",
  server: {
    url: "https://lumen-socialite.vercel.app",
    cleartext: false,
  },
  ios: {
    contentInset: "automatic",
    preferredContentMode: "mobile",
  },
  android: {
    allowMixedContent: false,
  },
};
export default config;