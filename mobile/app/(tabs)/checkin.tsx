import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { checkinApi } from '../../src/api/client';
import { useApp } from '../../src/context/AppContext';
import { colors, typography, spacing, radius } from '../../src/theme';

export default function CheckInScreen() {
  const { t } = useTranslation();
  const { updateStreak } = useApp();
  const queryClient = useQueryClient();

  const [response, setResponse] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['checkin-today'],
    queryFn: () => checkinApi.today().then(r => r.data),
  });

  const submitMutation = useMutation({
    mutationFn: () => checkinApi.submit(response),
    onSuccess: (res) => {
      const d = res.data;
      updateStreak(d.current_streak, d.longest_streak);
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ['checkin-today'] });
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (data?.already_answered || submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centeredInner}>
          <Text style={styles.doneEmoji}>◉</Text>
          <Text style={styles.doneTitle}>{t('checkin_saved')}</Text>
          <Text style={styles.streakLabel}>
            {t('checkin_streak', { count: data?.current_streak ?? 0 })}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.glowTop} />

          <Text style={styles.screenTitle}>{t('checkin_title')}</Text>

          <View style={styles.questionCard}>
            <Text style={styles.questionMark}>"</Text>
            <Text style={styles.question}>{data?.question}</Text>
          </View>

          <TextInput
            style={styles.input}
            multiline
            value={response}
            onChangeText={setResponse}
            placeholder={t('checkin_placeholder')}
            placeholderTextColor={colors.textMuted}
            textAlignVertical="top"
            autoFocus
            accessibilityLabel="Check-in response"
          />

          <View style={styles.streakRow}>
            <Text style={styles.streakInfo}>
              🔥 {t('home_streak_day', { count: data?.current_streak ?? 0 })}
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              pressed && { opacity: 0.8 },
              (!response.trim() || submitMutation.isPending) && styles.btnDisabled,
            ]}
            onPress={() => submitMutation.mutate()}
            disabled={!response.trim() || submitMutation.isPending}
            accessibilityLabel={t('checkin_submit_btn')}
          >
            {submitMutation.isPending
              ? <ActivityIndicator color={colors.bg} />
              : <Text style={styles.submitBtnText}>{t('checkin_submit_btn')}</Text>
            }
          </Pressable>

          <Text style={styles.privacyNote}>{t('checkin_saved')}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centeredInner: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.lg, padding: spacing.xl },
  doneEmoji: { fontSize: 48, color: colors.accent },
  doneTitle: { color: colors.textPrimary, fontSize: typography.md, textAlign: 'center', fontWeight: typography.semibold },
  streakLabel: { color: colors.accent, fontSize: typography.lg, fontWeight: typography.bold },
  scroll: { flexGrow: 1, padding: spacing.lg, paddingTop: spacing.xl },
  glowTop: {
    position: 'absolute', top: -60, right: -40,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: colors.accent, opacity: 0.04,
  },
  screenTitle: {
    color: colors.textMuted, fontSize: typography.sm,
    letterSpacing: 1.5, textTransform: 'uppercase',
    marginBottom: spacing.xl,
  },
  questionCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    padding: spacing.xl, marginBottom: spacing.xl,
    borderWidth: 1, borderColor: colors.border,
    borderLeftWidth: 3, borderLeftColor: colors.accent,
  },
  questionMark: {
    color: colors.accent, fontSize: 40, lineHeight: 36,
    fontWeight: typography.bold, marginBottom: spacing.xs,
  },
  question: {
    color: colors.textPrimary, fontSize: typography.md,
    lineHeight: 30, fontWeight: typography.medium,
  },
  input: {
    backgroundColor: colors.bgInput, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, color: colors.textPrimary,
    fontSize: typography.base, minHeight: 140,
    marginBottom: spacing.md,
  },
  streakRow: { marginBottom: spacing.md },
  streakInfo: { color: colors.textSecondary, fontSize: typography.sm },
  submitBtn: {
    backgroundColor: colors.accent, borderRadius: radius.full,
    paddingVertical: spacing.md, alignItems: 'center',
    marginBottom: spacing.md,
  },
  btnDisabled: { opacity: 0.4 },
  submitBtnText: { color: colors.bg, fontSize: typography.base, fontWeight: typography.bold },
  privacyNote: { color: colors.textMuted, fontSize: typography.xs, textAlign: 'center' },
});
