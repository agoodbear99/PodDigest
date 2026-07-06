import { ScrollView, StyleSheet, Text, View } from 'react-native';
import TabSwitcher from './TabSwitcher';
import { useLanguage } from '../i18n/LanguageContext';
import { colors } from '../theme/colors';

export default function SummaryToggle({ mode, onChangeMode, bulletPoints, shortSummary }) {
  const { t } = useLanguage();
  const MODES = [
    { key: 'bullets', label: t('summary.modeBullets') },
    { key: 'essay', label: t('summary.modeEssay') },
  ];

  return (
    <View style={styles.container}>
      <TabSwitcher tabs={MODES} activeKey={mode} onChange={onChangeMode} />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {mode === 'bullets' ? (
          <View style={styles.bulletList}>
            {bulletPoints.map((point, index) => (
              <View key={index} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{point}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.essayText}>{shortSummary}</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 16,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingBottom: 24,
  },
  bulletList: {
    gap: 12,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 8,
  },
  bulletDot: {
    color: colors.accent,
    fontSize: 16,
    lineHeight: 22,
  },
  bulletText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
  },
  essayText: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 24,
  },
});
