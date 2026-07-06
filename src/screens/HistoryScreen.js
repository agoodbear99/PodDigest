import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getHistory, removeHistoryItem, clearHistory } from '../services/history';
import { useLanguage } from '../i18n/LanguageContext';
import { notifyWarning } from '../utils/haptics';
import { colors } from '../theme/colors';

function formatDate(iso, locale) {
  const date = new Date(iso);
  return date.toLocaleString(locale, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function itemTitle(source, t) {
  if (source.type === 'audio') return source.file?.name || t('history.audioFallback');
  return source.episodeTitle || t('history.episodeFallback');
}

function itemSubtitle(source, t) {
  if (source.type === 'audio') return t('history.audioLabel');
  return source.showTitle || '';
}

export default function HistoryScreen() {
  const navigation = useNavigation();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const locale = language === 'en' ? 'en-US' : 'zh-TW';
  const [history, setHistory] = useState([]);

  useFocusEffect(
    useCallback(() => {
      getHistory().then(setHistory);
    }, [])
  );

  const handleOpen = (item) => {
    navigation.navigate('Summary', {
      source: item.source,
      cachedSummary: item.summary,
    });
  };

  const handleDelete = (id) => {
    notifyWarning();
    Alert.alert(t('history.deleteConfirmTitle'), t('history.deleteConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('history.deleteButton'),
        style: 'destructive',
        onPress: async () => {
          await removeHistoryItem(id);
          setHistory((prev) => prev.filter((item) => item.id !== id));
        },
      },
    ]);
  };

  const handleClearAll = () => {
    if (history.length === 0) return;
    notifyWarning();
    Alert.alert(t('history.deleteAllTitle'), t('history.deleteAllMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('history.deleteAllConfirm'),
        style: 'destructive',
        onPress: async () => {
          await clearHistory();
          setHistory([]);
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {history.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{t('history.empty')}</Text>
          <Text style={styles.emptyHint}>{t('history.emptyHint')}</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: 16 + insets.bottom }]}
          ListHeaderComponent={
            <Pressable onPress={handleClearAll} style={styles.clearButton} hitSlop={8}>
              <Text style={styles.clearButtonText}>{t('history.clearAll')}</Text>
            </Pressable>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleOpen(item)}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              <View style={styles.cardMain}>
                {itemSubtitle(item.source, t) ? (
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {itemSubtitle(item.source, t)}
                  </Text>
                ) : null}
                <Text style={styles.title} numberOfLines={2}>
                  {itemTitle(item.source, t)}
                </Text>
                <Text style={styles.date}>{formatDate(item.createdAt, locale)}</Text>
              </View>
              <Pressable
                hitSlop={12}
                style={styles.deleteButton}
                onPress={() => handleDelete(item.id)}
              >
                <Text style={styles.deleteButtonText}>{t('history.deleteButton')}</Text>
              </Pressable>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  clearButton: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  clearButtonText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
  cardPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  cardMain: {
    flex: 1,
    gap: 2,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  date: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  deleteButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  deleteButtonText: {
    color: colors.danger,
    fontSize: 13,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
  },
  emptyText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyHint: {
    color: colors.textSecondary,
    fontSize: 13,
  },
});
