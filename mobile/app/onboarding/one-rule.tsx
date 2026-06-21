import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius } from '../../src/theme';

export default function OneRule() {
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Decorative line */}
          <View style={styles.decorLine} />

          <Text style={styles.title}>{t('rule_title')}</Text>
          <Text style={styles.body}>{t('rule_body')}</Text>

          <View style={styles.decorLine} />
        </Animated.View>

        <Pressable
          style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.8 }]}
          onPress={() => router.replace('/(tabs)/home')}
          accessibilityLabel={t('rule_cta')}
        >
          <Text style={styles.ctaBtnText}>{t('rule_cta')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.xxl,
  },
  decorLine: {
    width: 40,
    height: 1,
    backgroundColor: colors.accent,
    opacity: 0.5,
    alignSelf: 'center',
    marginVertical: spacing.lg,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.xl,
    fontWeight: typography.bold,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  body: {
    color: colors.textSecondary,
    fontSize: typography.md,
    textAlign: 'center',
    lineHeight: 30,
  },
  ctaBtn: {
    borderWidth: 1,
    borderColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.full,
  },
  ctaBtnText: {
    color: colors.accent,
    fontSize: typography.base,
    fontWeight: typography.semibold,
    letterSpacing: 0.5,
  },
});
