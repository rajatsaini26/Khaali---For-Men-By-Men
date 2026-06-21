import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Khaali — For Men, By Men',
  slug: 'khaali',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'dark',
  scheme: 'khaali',
  icon: './assets/icon.png',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0A0A0F',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.goalfinstech.khaali',
    infoPlist: {
      NSMicrophoneUsageDescription:
        'Khaali uses your microphone for voice check-ins. Recordings stay on your device only.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundColor: '#0A0A0F',
    },
    package: 'com.goalfinstech.khaali',
    permissions: ['RECORD_AUDIO'],
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-secure-store',
    [
      'react-native-google-mobile-ads',
      {
        // ⚠️ Replace these test App IDs with your real AdMob App IDs before production build.
        // Get them from: https://admob.google.com/ → Apps → App settings
        // Without real IDs, ads won't serve in production builds.
        androidAppId: 'ca-app-pub-3940256099942544~3347511713', // TEST — replace for production
        iosAppId: 'ca-app-pub-3940256099942544~1458002511',     // TEST — replace for production
      },
    ],
  ],
  experiments: { typedRoutes: true },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3000',
    eas: {
      projectId: '0a24376a-0752-493b-8c69-0758f54054e3',
    },
  },
  owner: 'rajattak27',
});
