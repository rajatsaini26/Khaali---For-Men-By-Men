import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Alert, ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { api } from '../../src/api/client';
import { colors, typography, spacing, radius } from '../../src/theme';
import { KhaaliBannerAd } from '../../src/components/ads/KhaaliBannerAd';
import { router } from 'expo-router';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { state, setLanguage, clearSession } = useApp();
  const [deletingAccount, setDeletingAccount] = React.useState(false);

  const handleLanguageToggle = async (lang: 'en' | 'hi') => {
    await setLanguage(lang);
    // Sync to server
    try { await api.patch('/settings', { language: lang }); } catch { /* non-critical */ }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('settings_delete'),
      t('settings_delete_confirm'),
      [
        { text: t('common_back'), style: 'cancel' },
        {
          text: t('settings_delete'),
          style: 'destructive',
          onPress: async () => {
            setDeletingAccount(true);
            try {
              // Call server DELETE — cascades all data server-side
              await api.delete('/settings/account');
            } catch {
              // Even if network fails, clear local session
            } finally {
              await clearSession();
              setDeletingAccount(false);
              router.replace('/onboarding/founder-letter');
            }
          },
        },
      ]
    );
  };

  const currentLang = i18n.language as 'en' | 'hi';

  if (deletingAccount) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.lg }}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={{ color: colors.textSecondary, fontSize: typography.base }}>
            {currentLang === 'hi' ? 'मिटा रहे हैं...' : 'Deleting everything...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t('settings_title')}</Text>

        {/* Language */}
        <SectionHeader label={t('settings_language')} />
        <View style={styles.card}>
          <View style={styles.langRow}>
            {(['en', 'hi'] as const).map((lang) => (
              <Pressable
                key={lang}
                style={[styles.langBtn, currentLang === lang && styles.langBtnActive]}
                onPress={() => handleLanguageToggle(lang)}
                accessibilityLabel={lang === 'en' ? 'English' : 'हिंदी'}
              >
                <Text style={[styles.langBtnText, currentLang === lang && styles.langBtnTextActive]}>
                  {lang === 'en' ? 'English' : 'हिंदी'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Notifications — coming v1.1 */}
        <SectionHeader label={t('settings_notifications')} />
        <View style={[styles.card, styles.comingSoonCard]}>
          <Text style={styles.comingSoonEmoji}>🔔</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.comingSoonTitle}>Push notifications</Text>
            <Text style={styles.comingSoonSub}>Coming in v1.1</Text>
          </View>
        </View>

        {/* Account info */}
        <SectionHeader label="Account" />
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name (local only)</Text>
            <Text style={styles.infoValue}>{state.localName ?? '—'}</Text>
          </View>
          <Divider />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Streak</Text>
            <Text style={[styles.infoValue, { color: colors.accent }]}>
              🔥 {state.currentStreak} days
            </Text>
          </View>
        </View>

        {/* About */}
        <SectionHeader label="About" />
        <View style={styles.card}>
          <Pressable
            style={styles.linkRow}
            onPress={() => router.push('/onboarding/founder-letter')}
            accessibilityLabel={t('settings_founder')}
          >
            <Text style={styles.linkRowText}>{t('settings_founder')}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </View>

        {/* Privacy */}
        <View style={styles.privacyCard}>
          <Text style={styles.privacyText}>{t('settings_privacy')}</Text>
          <View style={styles.neverStoreBox}>
            {[
              'Your real name',
              'Your location or IP address',
              'Your photo',
              'Chat messages (deleted after 7 days)',
              'Anything that connects your words to your identity',
            ].map((item) => (
              <Text key={item} style={styles.neverStoreItem}>· {item}</Text>
            ))}
          </View>
        </View>

        {/* Banner ad */}
        <KhaaliBannerAd style={{ marginVertical: spacing.lg }} />

        {/* Danger zone */}
        <Pressable
          style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.7 }]}
          onPress={handleDeleteAccount}
          accessibilityLabel={t('settings_delete')}
        >
          <Text style={styles.deleteBtnText}>{t('settings_delete')}</Text>
        </Pressable>

        <Text style={styles.versionText}>Khaali v1.0.0 · com.goalfinstech.khaali</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ label }: { label: string }) {
  return <Text style={styles.sectionHeader}>{label.toUpperCase()}</Text>;
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  title: {
    color: colors.textPrimary, fontSize: typography.xl,
    fontWeight: typography.bold, marginBottom: spacing.xl,
  },
  sectionHeader: {
    color: colors.textMuted, fontSize: typography.xs,
    letterSpacing: 1.5, fontWeight: typography.semibold,
    marginTop: spacing.xl, marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  langRow: { flexDirection: 'row', padding: spacing.xs, gap: spacing.xs },
  langBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, alignItems: 'center' },
  langBtnActive: { backgroundColor: colors.accent },
  langBtnText: { color: colors.textSecondary, fontSize: typography.base, fontWeight: typography.medium },
  langBtnTextActive: { color: colors.bg, fontWeight: typography.bold },
  comingSoonCard: {
    flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.md,
  },
  comingSoonEmoji: { fontSize: 22, opacity: 0.4 },
  comingSoonTitle: { color: colors.textMuted, fontSize: typography.base },
  comingSoonSub: { color: colors.textMuted, fontSize: typography.xs, marginTop: 2 },
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: spacing.md,
  },
  infoLabel: { color: colors.textSecondary, fontSize: typography.base },
  infoValue: { color: colors.textPrimary, fontSize: typography.base, fontWeight: typography.medium },
  linkRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: spacing.md,
  },
  linkRowText: { color: colors.textPrimary, fontSize: typography.base },
  chevron: { color: colors.textMuted, fontSize: typography.lg },
  divider: { height: 1, backgroundColor: colors.borderLight, marginHorizontal: spacing.md },
  privacyCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    padding: spacing.lg, marginTop: spacing.xl,
    borderWidth: 1, borderColor: colors.border,
    borderLeftWidth: 3, borderLeftColor: colors.accentDim,
  },
  privacyText: { color: colors.textSecondary, fontSize: typography.sm, marginBottom: spacing.md, lineHeight: 20 },
  neverStoreBox: { gap: spacing.xs },
  neverStoreItem: { color: colors.textMuted, fontSize: typography.xs, lineHeight: 18 },
  deleteBtn: {
    marginTop: spacing.xl,
    borderWidth: 1, borderColor: colors.danger,
    borderRadius: radius.full, paddingVertical: spacing.md,
    alignItems: 'center',
  },
  deleteBtnText: { color: colors.danger, fontSize: typography.base, fontWeight: typography.semibold },
  versionText: {
    color: colors.textMuted, fontSize: typography.xs,
    textAlign: 'center', marginTop: spacing.xl,
  },
});
