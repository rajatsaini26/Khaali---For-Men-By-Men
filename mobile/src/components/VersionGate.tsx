import React from 'react';
import {
  View, Text, StyleSheet, Pressable, Linking, Modal,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVersionCheck } from '../hooks/useVersionCheck';
import { colors, typography, spacing, radius } from '../theme';

interface Props {
  children: React.ReactNode;
}

/**
 * VersionGate wraps the app and blocks rendering if a force update is required.
 * For soft updates, shows a dismissable modal overlay.
 */
export function VersionGate({ children }: Props) {
  const { t, i18n } = useTranslation();
  const versionStatus = useVersionCheck();
  const [softDismissed, setSoftDismissed] = React.useState(false);

  const isHindi = i18n.language === 'hi';

  // ── Force update: hard wall, no way past it ───────────────────────────────
  if (versionStatus.status === 'force_update') {
    const message = (isHindi && versionStatus.messageHi)
      ? versionStatus.messageHi
      : versionStatus.messageEn ?? t('version_force_body');

    return (
      <SafeAreaView style={styles.forceContainer}>
        <View style={styles.glow} />
        <View style={styles.forceInner}>
          <Text style={styles.kLogo}>K</Text>
          <Text style={styles.forceTitle}>{t('version_force_title')}</Text>
          <Text style={styles.forceBody}>{message}</Text>
          <Pressable
            style={({ pressed }) => [styles.forceBtn, pressed && { opacity: 0.8 }]}
            onPress={() => {
              if (versionStatus.updateUrl) {
                Linking.openURL(versionStatus.updateUrl);
              } else {
                Linking.openURL('https://play.google.com/store/apps/details?id=com.goalfinstech.khaali');
              }
            }}
            accessibilityLabel={t('version_force_btn')}
          >
            <Text style={styles.forceBtnText}>{t('version_force_btn')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Soft update: modal overlay, dismissable ───────────────────────────────
  const showSoftModal =
    versionStatus.status === 'soft_update' && !softDismissed;

  return (
    <>
      {children}
      <Modal
        visible={showSoftModal}
        transparent
        animationType="fade"
        onRequestClose={() => setSoftDismissed(true)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.softCard}>
            <Text style={styles.softTitle}>
              {versionStatus.status === 'soft_update'
                ? (isHindi && versionStatus.messageHi)
                  ? versionStatus.messageHi
                  : t('version_soft_body')
                : ''}
            </Text>
            <View style={styles.softActions}>
              <Pressable
                style={styles.softUpdateBtn}
                onPress={() => {
                  if (versionStatus.status === 'soft_update' && versionStatus.updateUrl) {
                    Linking.openURL(versionStatus.updateUrl);
                  }
                }}
                accessibilityLabel={t('version_soft_update')}
              >
                <Text style={styles.softUpdateBtnText}>{t('version_soft_update')}</Text>
              </Pressable>
              <Pressable
                style={styles.softLaterBtn}
                onPress={() => setSoftDismissed(true)}
                accessibilityLabel={t('version_soft_later')}
              >
                <Text style={styles.softLaterBtnText}>{t('version_soft_later')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Force update
  forceContainer: { flex: 1, backgroundColor: colors.bg },
  glow: {
    position: 'absolute', top: -80, left: '25%',
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: colors.accent, opacity: 0.06,
  },
  forceInner: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: spacing.xl, gap: spacing.lg,
  },
  kLogo: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: colors.accent, color: colors.bg,
    fontSize: typography.xl, fontWeight: typography.bold,
    textAlign: 'center', lineHeight: 60,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  forceTitle: {
    color: colors.textPrimary, fontSize: typography.xl,
    fontWeight: typography.bold, textAlign: 'center',
  },
  forceBody: {
    color: colors.textSecondary, fontSize: typography.base,
    textAlign: 'center', lineHeight: 26,
  },
  forceBtn: {
    backgroundColor: colors.accent, borderRadius: radius.full,
    paddingVertical: spacing.md, paddingHorizontal: spacing.xxl,
    marginTop: spacing.lg,
  },
  forceBtnText: {
    color: colors.bg, fontWeight: typography.bold, fontSize: typography.base,
  },
  // Soft update modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end', alignItems: 'center',
    paddingBottom: spacing.xl,
  },
  softCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.xl,
    padding: spacing.xl, width: '90%', maxWidth: 380,
    borderWidth: 1, borderColor: colors.border,
    gap: spacing.lg,
  },
  softTitle: {
    color: colors.textPrimary, fontSize: typography.base,
    lineHeight: 24, textAlign: 'center',
  },
  softActions: { gap: spacing.sm },
  softUpdateBtn: {
    backgroundColor: colors.accent, borderRadius: radius.full,
    paddingVertical: spacing.md, alignItems: 'center',
  },
  softUpdateBtnText: {
    color: colors.bg, fontWeight: typography.bold, fontSize: typography.base,
  },
  softLaterBtn: {
    borderRadius: radius.full,
    paddingVertical: spacing.sm, alignItems: 'center',
  },
  softLaterBtnText: {
    color: colors.textMuted, fontSize: typography.base,
  },
});
