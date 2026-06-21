import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  BannerAd,
  BannerAdSize,
  TestIds,
} from 'react-native-google-mobile-ads';
import { spacing } from '../../theme';

/**
 * AdMob banner — gated to non-sensitive screens only.
 * (home, settings, sea — never on write, checkin, or chat)
 *
 * IMPORTANT: Replace TEST_UNIT_ID with your real Ad Unit IDs before production build.
 * Real IDs are obtained from: https://admob.google.com/
 *
 * Android banner ad unit: ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
 * iOS banner ad unit:     ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
 */
const ANDROID_UNIT_ID = __DEV__
  ? TestIds.ADAPTIVE_BANNER          // Test ID — safe for dev/preview builds
  : 'ca-app-pub-REPLACE_ME/REPLACE_ME'; // ← Replace before production

interface KhaaliBannerAdProps {
  style?: object;
}

export function KhaaliBannerAd({ style }: KhaaliBannerAdProps) {
  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={ANDROID_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true, // GDPR-safe default
        }}
        onAdFailedToLoad={(error) => {
          // Silently fail — never crash the app due to an ad load failure
          console.warn('[AdMob] Banner failed to load:', error.message);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: spacing.xs,
    backgroundColor: 'transparent',
  },
});
