import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '../i18n/LanguageContext';
import { selection } from '../utils/haptics';
import { colors } from '../theme/colors';

const LANGUAGE_OPTIONS = [
  { code: 'zh', labelKey: 'settings.languageZh' },
  { code: 'en', labelKey: 'settings.languageEn' },
];

export default function SettingsScreen() {
  const { language, setLanguage, t } = useLanguage();

  const handleSelect = (code) => {
    if (code === language) return;
    selection();
    setLanguage(code);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{t('settings.languageSectionTitle')}</Text>
      <Text style={styles.sectionHint}>{t('settings.languageHint')}</Text>

      <View style={styles.optionsGroup}>
        {LANGUAGE_OPTIONS.map((option) => {
          const isActive = option.code === language;
          return (
            <Pressable
              key={option.code}
              style={({ pressed }) => [
                styles.option,
                isActive && styles.optionActive,
                pressed && !isActive && styles.optionPressed,
              ]}
              onPress={() => handleSelect(option.code)}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
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
});
