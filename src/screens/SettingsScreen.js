import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../i18n/LanguageContext';
import { getSummaryLanguage, setSummaryLanguage } from '../services/summaryLanguage';
import { usePremium } from '../context/PremiumContext';
import { restorePurchases } from '../services/purchaseService';
import { selection, notifySuccess, impactLight } from '../utils/haptics';
import { colors } from '../theme/colors';

const APP_LANGUAGE_OPTIONS = [
  { code: 'zh', labelKey: 'settings.languageZh' },
  { code: 'en', labelKey: 'settings.languageEn' },
];

const SUMMARY_LANGUAGE_OPTIONS = [
  { code: 'zh-TW', labelKey: 'summary.languageZh' },
  { code: 'en', labelKey: 'summary.languageEn' },
];

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { language, setLanguage, t } = useLanguage();
  const { isPremium, refresh } = usePremium();
  const [summaryLang, setSummaryLang] = useState('zh-TW');
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    getSummaryLanguage().then(setSummaryLang);
  }, []);

  const handleSelectAppLanguage = (code) => {
    if (code === language) return;
    selection();
    setLanguage(code);
  };

  const handleSelectSummaryLanguage = (code) => {
    if (code === summaryLang) return;
    selection();
    setSummaryLang(code);
    setSummaryLanguage(code).catch(() => {});
  };

  const handleUpgrade = () => {
    impactLight();
    navigation.navigate('Paywall');
  };

  const handleRestore = async () => {
    if (restoring) return;
    impactLight();
    setRestoring(true);
    try {
      const active = await restorePurchases();
      await refresh();
      if (active) {
        notifySuccess();
        Alert.alert(t('paywall.restoreSuccessTitle'), t('paywall.restoreSuccessMessage'));
      } else {
        Alert.alert(t('paywall.restoreEmptyTitle'), t('paywall.restoreEmptyMessage'));
      }
    } catch (err) {
      Alert.alert(t('paywall.errorTitle'), err.message);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.sectionTitle}>{t('settings.languageSectionTitle')}</Text>
        <Text style={styles.sectionHint}>{t('settings.languageHint')}</Text>

        <View style={styles.optionsGroup}>
          {APP_LANGUAGE_OPTIONS.map((option) => {
            const isActive = option.code === language;
            return (
              <Pressable
                key={option.code}
                style={({ pressed }) => [
                  styles.option,
                  isActive && styles.optionActive,
                  pressed && !isActive && styles.optionPressed,
                ]}
                onPress={() => handleSelectAppLanguage(option.code)}
              >
                <Text style={[styles.optionText, isActive && styles.optionTextActive]}>
                  {t(option.labelKey)}
                </Text>
                {isActive && <Text style={styles.checkmark}>✓</Text>}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View>
        <Text style={styles.sectionTitle}>{t('settings.summaryLanguageSectionTitle')}</Text>
        <Text style={styles.sectionHint}>{t('settings.summaryLanguageHint')}</Text>

        <View style={styles.optionsGroup}>
          {SUMMARY_LANGUAGE_OPTIONS.map((option) => {
            const isActive = option.code === summaryLang;
            return (
              <Pressable
                key={option.code}
                style={({ pressed }) => [
                  styles.option,
                  isActive && styles.optionActive,
                  pressed && !isActive && styles.optionPressed,
                ]}
                onPress={() => handleSelectSummaryLanguage(option.code)}
              >
                <Text style={[styles.optionText, isActive && styles.optionTextActive]}>
                  {t(option.labelKey)}
                </Text>
                {isActive && <Text style={styles.checkmark}>✓</Text>}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View>
        <Text style={styles.sectionTitle}>{t('settings.proSectionTitle')}</Text>

        {isPremium ? (
          <Text style={styles.proBadge}>{t('settings.proBadge')}</Text>
        ) : (
          <Pressable
            onPress={handleUpgrade}
            style={({ pressed }) => [styles.upgradeButton, pressed && styles.upgradeButtonPressed]}
          >
            <Text style={styles.upgradeButtonText}>{t('settings.upgradeButton')}</Text>
          </Pressable>
        )}

        <Pressable
          onPress={handleRestore}
          disabled={restoring}
          style={({ pressed }) => [styles.restoreButton, pressed && !restoring && styles.restoreButtonPressed]}
        >
          {restoring ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : (
            <Text style={styles.restoreButtonText}>{t('paywall.restoreButton')}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
    gap: 28,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionHint: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 16,
  },
  optionsGroup: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionActive: {
    backgroundColor: colors.surfaceAlt,
  },
  optionPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  optionText: {
    color: colors.textPrimary,
    fontSize: 15,
  },
  optionTextActive: {
    fontWeight: '700',
    color: colors.accent,
  },
  checkmark: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
  },
  proBadge: {
    color: colors.success,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  upgradeButton: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  upgradeButtonPressed: {
    opacity: 0.85,
  },
  upgradeButtonText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  restoreButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  restoreButtonPressed: {
    opacity: 0.6,
  },
  restoreButtonText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
