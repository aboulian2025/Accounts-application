import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.accountsapplication.app',
  appName: 'Accounts application',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '439049145507-okf43gq4vpkpsaqk2lcq7ac6liaab4b4.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
