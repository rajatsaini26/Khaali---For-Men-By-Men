import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Dimensions, Animated,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing, radius } from '../../src/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

const { height } = Dimensions.get('window');

export default function FounderLetter() {
  const { t } = useTranslation();
  const [canProceed, setCanProceed] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // FR-1.4: No skip option for the first 5 seconds
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setCanProceed(true);
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 800, useNativeDriver: true,
      }).start();
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Ambient top glow */}
        <View style={styles.glowTop} />

        <View style={styles.letterCard}>
          <View style={styles.waxSeal}>
            <Text style={styles.waxText}>K</Text>
          </View>

          <Text style={styles.letterText}>{t('founder_letter')}</Text>
        </View>

        <Animated.View style={[styles.ctaContainer, { opacity: fadeAnim }]}>
          <Pressable
            style={({ pressed }) => [styles.ctaBtn, pressed && styles.ctaBtnPressed]}
            onPress={() => router.push('/onboarding/anonymous-setup')}
            disabled={!canProceed}
            accessibilityLabel={t('founder_letter_cta')}
          >
            <Text style={styles.ctaBtnText}>{t('founder_letter_cta')}</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  glowTop: {
    position: 'absolute',
    top: -80,
    left: '20%',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.accent,
    opacity: 0.04,
  },
  letterCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
    maxWidth: 420,
    marginTop: spacing.lg,
  },
  waxSeal: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  waxText: {
    color: colors.bg,
    fontSize: typography.lg,
    fontWeight: typography.bold,
  },
  letterText: {
    color: colors.textPrimary,
    fontSize: typography.base,
    lineHeight: 28,
    fontFamily: typography.serif,
    textAlign: 'left',
  },
  ctaContainer: {
    marginTop: spacing.xl,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  ctaBtn: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.full,
    alignItems: 'center',
    minWidth: 200,
  },
  ctaBtnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  ctaBtnText: {
    color: colors.bg,
    fontSize: typography.base,
    fontWeight: typography.semibold,
    letterSpacing: 0.5,
  },
});
