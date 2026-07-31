import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aicoach.app',
  appName: 'Athyx Connect',
  webDir: 'dist',
  server: {
    cleartext: true,
    allowNavigation: ['*.convex.cloud'],
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#0a0a0f",
    },
  },
};

export default config;
