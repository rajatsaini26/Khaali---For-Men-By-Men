import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bottleApi } from '../../src/api/client';
import { colors, typography, spacing, radius } from '../../src/theme';

type BottleState = 'list' | 'reading' | 'kept' | 'released';

interface Bottle {
  bottleId: string;
  theme: string | null;
  content: string;
  thrownAt: string;
}

export default function SeaScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Bottle | null>(null);
  const [bottleState, setBottleState] = useState<BottleState>('list');
  const [chatId, setChatId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['sea-bottles'],
    queryFn: () => bottleApi.sea().then(r => r.data),
  });

  const keepMutation = useMutation({
    mutationFn: (id: string) => bottleApi.keep(id),
    onSuccess: (res) => {
      setChatId(res.data.chat_id);
      setBottleState('kept');
    },
  });

  const releaseMutation = useMutation({
    mutationFn: (id: string) => bottleApi.release(id),
    onSuccess: () => {
      setBottleState('released');
      setTimeout(() => { setSelected(null); setBottleState('list'); refetch(); }, 1500);
    },
  });

  if (bottleState === 'kept' && chatId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centeredInner}>
          <Text style={styles.keptEmoji}>〰</Text>
          <Text style={styles.keptTitle}>{t('chat_rules_days')}</Text>
          <Text style={styles.keptBody}>{t('chat_rules_body')}</Text>
          <Text style={styles.chatIdNote}>Chat ID: {chatId.slice(0, 8)}...</Text>
          <Pressable style={styles.homeBtn} onPress={() => setBottleState('list')}>
            <Text style={styles.homeBtnText}>Back to The Sea</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (selected && bottleState === 'reading') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {selected.theme && (
            <View style={styles.themeBadge}>
              <Text style={styles.themeBadgeText}>{selected.theme}</Text>
            </View>
          )}
          <View style={styles.letterCard}>
            <Text style={styles.letterContent}>{selected.content}</Text>
          </View>

          <Text style={styles.keepSub}>{t('sea_keep_sub')}</Text>

          <View style={styles.actions}>
            <Pressable
              style={[styles.keepBtn, keepMutation.isPending && styles.disabled]}
              onPress={() => keepMutation.mutate(selected.bottleId)}
              disabled={keepMutation.isPending || releaseMutation.isPending}
              accessibilityLabel={t('sea_keep_btn')}
            >
              {keepMutation.isPending
                ? <ActivityIndicator color={colors.bg} />
                : <Text style={styles.keepBtnText}>{t('sea_keep_btn')}</Text>
              }
            </Pressable>
            <Pressable
              style={[styles.releaseBtn, releaseMutation.isPending && styles.disabled]}
              onPress={() => releaseMutation.mutate(selected.bottleId)}
              disabled={keepMutation.isPending || releaseMutation.isPending}
              accessibilityLabel={t('sea_release_btn')}
            >
              {releaseMutation.isPending
                ? <ActivityIndicator color={colors.textSecondary} />
                : <Text style={styles.releaseBtnText}>{t('sea_release_btn')}</Text>
              }
            </Pressable>
          </View>

          {bottleState === 'released' && (
            <Text style={styles.releasedNote}>{t('sea_release_confirm')}</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Bottle list
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('sea_title')}</Text>
        <Text style={styles.waveDeco}>〰〰〰〰〰〰〰</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : !data?.bottles?.length ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyWave}>〰〰〰</Text>
          <Text style={styles.emptyText}>{t('sea_empty')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {data.bottles.map((bottle: Bottle, i: number) => (
            <Pressable
              key={bottle.bottleId}
              style={({ pressed }) => [styles.bottleCard, pressed && styles.cardPressed, { marginTop: i * 6 }]}
              onPress={() => { setSelected(bottle); setBottleState('reading'); }}
              accessibilityLabel={t('sea_open_bottle')}
            >
              <View style={styles.bottleInner}>
                <Text style={styles.bottleIcon}>🫙</Text>
                <View style={styles.bottleInfo}>
                  {bottle.theme && <Text style={styles.bottleTheme}>{bottle.theme}</Text>}
                  <Text style={styles.bottlePreview} numberOfLines={2}>{bottle.content}</Text>
                </View>
              </View>
            </Pressable>
          ))}
          <Pressable style={styles.refreshBtn} onPress={() => refetch()}>
            <Text style={styles.refreshBtnText}>↻ Refresh</Text>
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { padding: spacing.lg, paddingBottom: spacing.md },
  title: { color: colors.textPrimary, fontSize: typography.xl, fontWeight: typography.bold },
  waveDeco: { color: colors.textMuted, fontSize: typography.sm, letterSpacing: 2, marginTop: spacing.xs },
  scroll: { flexGrow: 1, padding: spacing.lg, gap: spacing.md },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  emptyWave: { color: colors.textMuted, fontSize: typography.lg, letterSpacing: 4 },
  emptyText: { color: colors.textMuted, fontSize: typography.base, textAlign: 'center' },
  bottleCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  bottleInner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  bottleIcon: { fontSize: 28 },
  bottleInfo: { flex: 1 },
  bottleTheme: { color: colors.accent, fontSize: typography.xs, marginBottom: spacing.xs, fontWeight: typography.medium },
  bottlePreview: { color: colors.textSecondary, fontSize: typography.sm, lineHeight: 20 },
  cardPressed: { opacity: 0.75 },
  refreshBtn: { alignItems: 'center', padding: spacing.md },
  refreshBtnText: { color: colors.textMuted, fontSize: typography.sm },
  themeBadge: {
    backgroundColor: colors.accentSoft, paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radius.full, alignSelf: 'flex-start', margin: spacing.lg,
  },
  themeBadgeText: { color: colors.accent, fontSize: typography.sm },
  letterCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    padding: spacing.xl, marginHorizontal: spacing.lg, marginBottom: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  letterContent: { color: colors.textPrimary, fontSize: typography.base, lineHeight: 26 },
  keepSub: { color: colors.textSecondary, fontSize: typography.sm, textAlign: 'center', paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  actions: { paddingHorizontal: spacing.lg, gap: spacing.md },
  keepBtn: { backgroundColor: colors.accent, borderRadius: radius.full, paddingVertical: spacing.md, alignItems: 'center' },
  keepBtnText: { color: colors.bg, fontWeight: typography.bold, fontSize: typography.base },
  releaseBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.full, paddingVertical: spacing.md, alignItems: 'center' },
  releaseBtnText: { color: colors.textSecondary, fontSize: typography.base },
  disabled: { opacity: 0.5 },
  releasedNote: { color: colors.textMuted, fontSize: typography.sm, textAlign: 'center', marginTop: spacing.md },
  centeredInner: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, gap: spacing.lg },
  keptEmoji: { fontSize: 48, letterSpacing: 8, color: colors.accent },
  keptTitle: { color: colors.textPrimary, fontSize: typography.xl, fontWeight: typography.bold, textAlign: 'center' },
  keptBody: { color: colors.textSecondary, fontSize: typography.base, textAlign: 'center', lineHeight: 26 },
  chatIdNote: { color: colors.textMuted, fontSize: typography.xs },
  homeBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.full, paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
  homeBtnText: { color: colors.textSecondary, fontSize: typography.base },
});
