import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.privatepay.app',
  appName: 'PrivatePay',
  // Point to your live Vercel deployment — /mobile route
  server: {
    url: 'https://privatepay.site/mobile',
    cleartext: true,
  },
  plugins: {
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#0d0b18',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0d0b18',
      showSpinner: true,
      spinnerColor: '#8b5cf6',
    },
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'PrivatePay',
  },
  android: {
    backgroundColor: '#0d0b18',
    allowMixedContent: true,
  },
};

export default config;
