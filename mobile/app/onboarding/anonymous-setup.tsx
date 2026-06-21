import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing, radius } from '../../src/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';

export default function AnonymousSetup() {
  const { t } = useTranslation();
  const { initSession } = useApp();

  const [localName, setLocalName] = useState('');
  const [email, setEmail] = useState('');
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleBegin = async () => {
    if (!localName.trim()) {
      setError('Give yourself any name — only you will see it.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await initSession(localName.trim(), language, email.trim() || undefined);
      router.replace('/onboarding/one-rule');
    } catch (e) {
      setError('Could not connect. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          <View style={styles.header}>
            <Text style={styles.title}>{t('setup_title')}</Text>
            <Text style={styles.subtitle}>{t('setup_subtitle')}</Text>
          </View>

          {/* Language toggle */}
          <View style={styles.langRow}>
            {(['en', 'hi'] as const).map((lang) => (
              <Pressable
                key={lang}
                style={[styles.langBtn, language === lang && styles.langBtnActive]}
                onPress={() => setLanguage(lang)}
                accessibilityLabel={lang === 'en' ? 'English' : 'हिंदी'}
              >
                <Text style={[styles.langBtnText, language === lang && styles.langBtnTextActive]}>
                  {lang === 'en' ? 'English' : 'हिंदी'}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Name field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              {t('setup_name_label')}{' '}
              <Text style={styles.hint}>{t('setup_name_hint')}</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={localName}
              onChangeText={setLocalName}
              placeholder={t('setup_name_placeholder')}
              placeholderTextColor={colors.textMuted}
              maxLength={32}
              autoFocus
              returnKeyType="next"
              accessibilityLabel="Name field"
            />
          </View>

          {/* Email field (optional) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              {t('setup_email_label')}{' '}
              <Text style={styles.hint}>{t('setup_email_hint')}</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="email@example.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="done"
              accessibilityLabel="Recovery email field"
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.8 }, loading && { opacity: 0.6 }]}
            onPress={handleBegin}
            disabled={loading}
            accessibilityLabel={t('setup_cta')}
          >
            {loading
              ? <ActivityIndicator color={colors.bg} />
              : <Text style={styles.ctaBtnText}>{t('setup_cta')}</Text>
            }
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, padding: spacing.lg, paddingTop: spacing.xxl },
  header: { marginBottom: spacing.xl },
  title: {
    color: colors.textPrimary,
    fontSize: typography.xl,
    fontWeight: typography.bold,
    marginBottom: spacing.sm,
    lineHeight: 34,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.md,
  },
  langRow: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: radius.full,
    padding: 4,
    marginBottom: spacing.xl,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
  },
  langBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
  },
  langBtnActive: { backgroundColor: colors.accent },
  langBtnText: { color: colors.textSecondary, fontSize: typography.sm, fontWeight: typography.medium },
  langBtnTextActive: { color: colors.bg, fontWeight: typography.bold },
  fieldGroup: { marginBottom: spacing.lg },
  label: { color: colors.textSecondary, fontSize: typography.sm, marginBottom: spacing.sm },
  hint: { color: colors.textMuted, fontSize: typography.xs },
  input: {
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontSize: typography.base,
  },
  errorText: { color: colors.danger, fontSize: typography.sm, marginBottom: spacing.md },
  ctaBtn: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md + 2,
    borderRadius: radius.full,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  ctaBtnText: { color: colors.bg, fontSize: typography.base, fontWeight: typography.bold },
});
