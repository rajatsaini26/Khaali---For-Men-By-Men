import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { letterApi, bottleApi } from '../../src/api/client';
import { colors, typography, spacing, radius } from '../../src/theme';

type WriteStep = 'theme' | 'write' | 'reflection' | 'seal' | 'thrown' | 'crisis';

const THEMES_EN = [
  { key: 'hurt', label: 'A person who hurt me' },
  { key: 'loss', label: 'Something I lost' },
  { key: 'self', label: 'A version of myself I mourn' },
  { key: 'parent', label: 'My father / My mother' },
  { key: 'love', label: 'A love that broke me' },
  { key: 'failure', label: 'My own failure' },
  { key: 'everything', label: 'Just... everything' },
];

const THEMES_HI = [
  { key: 'hurt', label: 'किसी ने दर्द दिया' },
  { key: 'loss', label: 'जो खो गया' },
  { key: 'self', label: 'वो मैं जो मैं बनना चाहता था' },
  { key: 'parent', label: 'मेरे पिता / मेरी माँ' },
  { key: 'love', label: 'एक प्यार जिसने तोड़ा' },
  { key: 'failure', label: 'मेरी खुद की नाकामी' },
  { key: 'everything', label: 'बस... सब कुछ' },
];

const HELPLINES = [
  { name: 'iCall', number: '9152987821' },
  { name: 'Vandrevala Foundation', number: '1860-2662-345' },
];

export default function WriteScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'hi';
  const themes = lang === 'hi' ? THEMES_HI : THEMES_EN;

  const [step, setStep] = useState<WriteStep>('theme');
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [letterId, setLetterId] = useState<string | null>(null);
  const [reflection, setReflection] = useState('');
  const [crisisData, setCrisisData] = useState<any>(null);

  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mutations
  const createLetter = useMutation({ mutationFn: () => letterApi.create(selectedTheme ?? undefined, content) });
  const reflectMutation = useMutation({ mutationFn: (id: string) => letterApi.reflect(id) });
  const sealMutation = useMutation({ mutationFn: ({ id, dest }: { id: string; dest: 'private' | 'pool' }) => letterApi.seal(id, dest) });
  const throwMutation = useMutation({ mutationFn: (id: string) => bottleApi.throw(id) });

  // Auto-save content locally every 10s (FR-2.2)
  const handleContentChange = (text: string) => {
    setContent(text);
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      // Local autosave indicator — real persistence would use AsyncStorage
    }, 10000);
  };

  const handleThemeSelect = (themeKey: string | null) => {
    setSelectedTheme(themeKey);
    setStep('write');
  };

  const handleDoneWriting = async () => {
    if (!content.trim()) return;
    try {
      // Create the letter on server
      const { data } = await createLetter.mutateAsync();
      const id = data.letter_id;
      setLetterId(id);

      // Get AI reflection
      setStep('reflection');
      const reflectRes = await reflectMutation.mutateAsync(id);
      setReflection(reflectRes.data.reflection ?? '');
    } catch {
      setStep('reflection');
      setReflection('');
    }
  };

  const handleSeal = async (dest: 'private' | 'pool') => {
    if (!letterId) return;
    await sealMutation.mutateAsync({ id: letterId, dest });
    if (dest === 'private') {
      Alert.alert('', t('checkin_saved'), [{ text: 'OK', onPress: () => router.replace('/(tabs)/home') }]);
    } else {
      setStep('thrown');
      handleThrow();
    }
  };

  const handleThrow = async () => {
    if (!letterId) return;
    try {
      const { data } = await throwMutation.mutateAsync(letterId);
      if (data.blocked) {
        setCrisisData(data);
        setStep('crisis');
      } else {
        setStep('thrown');
      }
    } catch {
      setStep('thrown');
    }
  };

  // ─── Render by step ──────────────────────────────────────────────────────────
  if (step === 'theme') return <ThemeStep themes={themes} onSelect={handleThemeSelect} t={t} />;
  if (step === 'write') return (
    <WriteStep
      theme={selectedTheme}
      content={content}
      onChange={handleContentChange}
      onDone={handleDoneWriting}
      loading={createLetter.isPending}
      t={t}
    />
  );
  if (step === 'reflection') return (
    <ReflectionStep
      reflection={reflection}
      loading={reflectMutation.isPending}
      onSeal={() => setStep('seal')}
      onKeepWriting={() => setStep('write')}
      t={t}
    />
  );
  if (step === 'seal') return (
    <SealStep
      onPrivate={() => handleSeal('private')}
      onThrow={() => handleSeal('pool')}
      loading={sealMutation.isPending || throwMutation.isPending}
      t={t}
    />
  );
  if (step === 'crisis') return <CrisisStep data={crisisData} t={t} />;
  if (step === 'thrown') return <ThrownStep t={t} />;
  return null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ThemeStep({ themes, onSelect, t }: any) {
  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.stepTitle}>{t('themes_title')}</Text>
        {themes.map((th: any) => (
          <Pressable key={th.key} style={({ pressed }) => [s.themeCard, pressed && s.cardPressed]}
            onPress={() => onSelect(th.key)}>
            <Text style={s.themeLabel}>{th.label}</Text>
          </Pressable>
        ))}
        <Pressable style={[s.themeCard, s.themeSkip]} onPress={() => onSelect(null)}>
          <Text style={[s.themeLabel, { color: colors.textMuted }]}>{t('theme_skip')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function WriteStep({ theme, content, onChange, onDone, loading, t }: any) {
  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {theme && <View style={s.themeBadge}><Text style={s.themeBadgeText}>{theme}</Text></View>}
        <TextInput
          style={s.writeInput}
          multiline
          value={content}
          onChangeText={onChange}
          placeholder={t('write_placeholder')}
          placeholderTextColor={colors.textMuted}
          autoFocus
          textAlignVertical="top"
          accessibilityLabel="Letter content"
        />
        <View style={s.writeFooter}>
          <Pressable
            style={({ pressed }) => [s.doneBtn, pressed && { opacity: 0.8 }, (!content.trim() || loading) && s.btnDisabled]}
            onPress={onDone}
            disabled={!content.trim() || loading}
            accessibilityLabel={t('write_done_btn')}
          >
            {loading ? <ActivityIndicator color={colors.bg} /> : <Text style={s.doneBtnText}>{t('write_done_btn')}</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ReflectionStep({ reflection, loading, onSeal, onKeepWriting, t }: any) {
  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.reflectionHeader}>{t('reflection_header')}</Text>
        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={s.loadingText}>{t('reflection_loading')}</Text>
          </View>
        ) : (
          <View style={s.reflectionCard}>
            <Text style={s.reflectionLabel}>{t('reflection_subheader')}</Text>
            <Text style={s.reflectionText}>{reflection || t('reflection_error')}</Text>
          </View>
        )}
        {!loading && (
          <View style={s.reflectionActions}>
            <Pressable style={({ pressed }) => [s.sealBtn, pressed && { opacity: 0.8 }]} onPress={onSeal}>
              <Text style={s.sealBtnText}>{t('reflection_seal_btn')}</Text>
            </Pressable>
            <Pressable style={s.keepWritingBtn} onPress={onKeepWriting}>
              <Text style={s.keepWritingBtnText}>{t('reflection_keep_writing_btn')}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SealStep({ onPrivate, onThrow, loading, t }: any) {
  return (
    <SafeAreaView style={s.container}>
      <View style={s.centeredInner}>
        <Text style={s.sealTitle}>{t('seal_title')}</Text>
        <Text style={s.sealQuestion}>{t('seal_question')}</Text>
        <View style={s.sealActions}>
          <Pressable style={[s.sealChoiceBtn, s.sealChoiceThrow]} onPress={onThrow} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.bg} /> : <Text style={s.sealChoiceThrowText}>{t('seal_throw_btn')}</Text>}
          </Pressable>
          <Pressable style={s.sealChoiceBtn} onPress={onPrivate} disabled={loading}>
            <Text style={s.sealChoicePrivateText}>{t('seal_keep_btn')}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function ThrownStep({ t }: any) {
  return (
    <SafeAreaView style={s.container}>
      <View style={s.centeredInner}>
        <Text style={s.thrownEmoji}>〰</Text>
        <Text style={s.thrownTitle}>{t('throw_success')}</Text>
        <Text style={s.thrownSub}>{t('throw_sub')}</Text>
        <Pressable style={s.doneBtn} onPress={() => router.replace('/(tabs)/home')}>
          <Text style={s.doneBtnText}>Home</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function CrisisStep({ data, t }: any) {
  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.crisisBg }]}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={[s.sealTitle, { color: colors.textPrimary, marginBottom: spacing.md }]}>
          {data?.helplines?.message_en ?? t('crisis_title')}
        </Text>
        <Text style={[s.sealQuestion, { marginBottom: spacing.xl }]}>
          {data?.helplines?.message_hi ?? t('crisis_sub')}
        </Text>
        {HELPLINES.map(h => (
          <View key={h.name} style={s.helplineCard}>
            <Text style={s.helplineName}>{h.name}</Text>
            <Text style={s.helplineNumber}>{h.number}</Text>
          </View>
        ))}
        <Text style={[s.sealQuestion, { marginTop: spacing.xl, color: colors.textMuted }]}>
          {t('crisis_letter_note')}
        </Text>
        <Pressable style={[s.doneBtn, { marginTop: spacing.xl }]} onPress={() => router.replace('/(tabs)/home')}>
          <Text style={s.doneBtnText}>{t('crisis_continue')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, padding: spacing.lg, paddingTop: spacing.xl },
  stepTitle: { color: colors.textPrimary, fontSize: typography.xl, fontWeight: typography.bold, marginBottom: spacing.xl },
  themeCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  themeSkip: { borderColor: colors.borderLight, backgroundColor: 'transparent' },
  themeLabel: { color: colors.textPrimary, fontSize: typography.base },
  cardPressed: { opacity: 0.75 },
  themeBadge: {
    backgroundColor: colors.accentSoft, paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    margin: spacing.md, borderRadius: radius.full, alignSelf: 'flex-start',
  },
  themeBadgeText: { color: colors.accent, fontSize: typography.sm },
  writeInput: {
    flex: 1, color: colors.textPrimary, fontSize: typography.base, lineHeight: 26,
    padding: spacing.lg, fontFamily: 'System',
  },
  writeFooter: { padding: spacing.lg },
  doneBtn: {
    backgroundColor: colors.accent, borderRadius: radius.full,
    paddingVertical: spacing.md, alignItems: 'center',
  },
  doneBtnText: { color: colors.bg, fontSize: typography.base, fontWeight: typography.bold },
  btnDisabled: { opacity: 0.4 },
  reflectionHeader: { color: colors.textSecondary, fontSize: typography.sm, marginBottom: spacing.lg },
  loadingBox: { alignItems: 'center', padding: spacing.xxl, gap: spacing.md },
  loadingText: { color: colors.textMuted, fontSize: typography.sm },
  reflectionCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    padding: spacing.xl, borderWidth: 1, borderColor: colors.border,
    borderLeftWidth: 3, borderLeftColor: colors.accent,
  },
  reflectionLabel: { color: colors.accent, fontSize: typography.xs, fontWeight: typography.semibold, marginBottom: spacing.sm, letterSpacing: 1 },
  reflectionText: { color: colors.textPrimary, fontSize: typography.base, lineHeight: 26 },
  reflectionActions: { gap: spacing.md, marginTop: spacing.xl },
  sealBtn: { backgroundColor: colors.accent, borderRadius: radius.full, paddingVertical: spacing.md, alignItems: 'center' },
  sealBtnText: { color: colors.bg, fontWeight: typography.bold, fontSize: typography.base },
  keepWritingBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.full, paddingVertical: spacing.md, alignItems: 'center' },
  keepWritingBtnText: { color: colors.textSecondary, fontSize: typography.base },
  centeredInner: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  sealTitle: { color: colors.textPrimary, fontSize: typography.xl, fontWeight: typography.bold, textAlign: 'center' },
  sealQuestion: { color: colors.textSecondary, fontSize: typography.base, textAlign: 'center' },
  sealActions: { gap: spacing.md, marginTop: spacing.lg },
  sealChoiceBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.full, paddingVertical: spacing.md, alignItems: 'center' },
  sealChoiceThrow: { backgroundColor: colors.accent, borderColor: colors.accent },
  sealChoiceThrowText: { color: colors.bg, fontWeight: typography.bold, fontSize: typography.base },
  sealChoicePrivateText: { color: colors.textSecondary, fontSize: typography.base },
  thrownEmoji: { fontSize: 48, textAlign: 'center', letterSpacing: 8 },
  thrownTitle: { color: colors.textPrimary, fontSize: typography.xl, fontWeight: typography.bold, textAlign: 'center' },
  thrownSub: { color: colors.textSecondary, fontSize: typography.base, textAlign: 'center', lineHeight: 26 },
  helplineCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  helplineName: { color: colors.textSecondary, fontSize: typography.sm },
  helplineNumber: { color: colors.textPrimary, fontSize: typography.lg, fontWeight: typography.bold },
});
