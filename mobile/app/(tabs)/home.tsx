import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { checkinApi } from '../../src/api/client';
import { colors, typography, spacing, radius, shadows } from '../../src/theme';
import { KhaaliBannerAd } from '../../src/components/ads/KhaaliBannerAd';

export default function HomeScreen() {
  const { t } = useTranslation();
  const { state, updateStreak } = useApp();

  const { data, isLoading } = useQuery({
    queryKey: ['checkin-today'],
    queryFn: () => checkinApi.today().then(r => r.data),
    enabled: !!state.token,
  });

  useEffect(() => {
    if (data) {
      updateStreak(data.current_streak, data.longest_streak);
    }
  }, [data]);

  const streak = state.currentStreak;

  return (
    <SafeAreaView style={styles.container}>
      {/* Ambient glow */}
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <View style={styles.inner}>

        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.greeting}>
            {state.localName ? `${state.localName},` : ''}
          </Text>
          <Text style={styles.header}>{t('home_header')}</Text>
          <Text style={styles.sub}>{t('home_sub')}</Text>
        </View>

        {/* Streak banner */}
        <View style={styles.streakCard}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <Text style={styles.streakText}>
            {streak > 0
              ? t('home_streak_day', { count: streak })
              : t('home_streak_zero')}
          </Text>
          {state.longestStreak > 0 && (
            <Text style={styles.streakBest}>Best: {state.longestStreak}</Text>
          )}
        </View>

        {/* Main actions */}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
            onPress={() => router.push('/(tabs)/write')}
            accessibilityLabel={t('home_write_btn')}
          >
            <Text style={styles.primaryBtnText}>{t('home_write_btn')}</Text>
            <Text style={styles.primaryBtnSub}>
              {t('themes_title')}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}
            onPress={() => router.push('/(tabs)/checkin')}
            accessibilityLabel={t('home_checkin_btn')}
          >
            <Text style={styles.secondaryBtnText}>{t('home_checkin_btn')}</Text>
            {isLoading
              ? <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 4 }} />
              : data?.question
                ? <Text style={styles.questionPreview} numberOfLines={2}>
                    "{data.question}"
                  </Text>
                : null
            }
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.seaBtn, pressed && styles.btnPressed]}
            onPress={() => router.push('/(tabs)/sea')}
            accessibilityLabel={t('home_sea_btn')}
          >
            <Text style={styles.seaBtnText}>{t('home_sea_btn')}</Text>
            <Text style={styles.seaBtnSub}>〰〰〰</Text>
          </Pressable>
        </View>

        <KhaaliBannerAd style={{ marginTop: spacing.md }} />

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  glowTop: {
    position: 'absolute', top: -100, right: -50,
    width: 250, height: 250, borderRadius: 125,
    backgroundColor: colors.accent, opacity: 0.04,
  },
  glowBottom: {
    position: 'absolute', bottom: 100, left: -80,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: colors.accent, opacity: 0.03,
  },
  inner: { flex: 1, padding: spacing.lg, justifyContent: 'space-between', paddingVertical: spacing.xl },
  headerSection: { marginBottom: spacing.lg },
  greeting: { color: colors.textMuted, fontSize: typography.sm, marginBottom: spacing.xs },
  header: {
    color: colors.textPrimary,
    fontSize: typography.xl,
    fontWeight: typography.bold,
    lineHeight: 36,
    marginBottom: spacing.xs,
  },
  sub: { color: colors.textSecondary, fontSize: typography.base },
  streakCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  streakEmoji: { fontSize: 20 },
  streakText: { color: colors.textPrimary, fontSize: typography.base, fontWeight: typography.semibold, flex: 1 },
  streakBest: { color: colors.textMuted, fontSize: typography.xs },
  actions: { gap: spacing.md, flex: 1, justifyContent: 'center' },
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.accent,
  },
  secondaryBtn: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  seaBtn: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
  },
  btnPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  primaryBtnText: { color: colors.bg, fontSize: typography.md, fontWeight: typography.bold },
  primaryBtnSub: { color: 'rgba(10,10,15,0.6)', fontSize: typography.sm, marginTop: 4 },
  secondaryBtnText: { color: colors.textPrimary, fontSize: typography.md, fontWeight: typography.semibold },
  questionPreview: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    marginTop: spacing.xs,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  seaBtnText: { color: colors.textSecondary, fontSize: typography.base },
  seaBtnSub: { color: colors.textMuted, fontSize: typography.xs, letterSpacing: 4, marginTop: 4 },
});
