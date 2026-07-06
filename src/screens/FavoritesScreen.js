import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getFavorites, removeFavorite } from '../services/favorites';
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

export default function FavoritesScreen() {
  const navigation = useNavigation();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const locale = language === 'en' ? 'en-US' : 'zh-TW';
  const [favorites, setFavorites] = useState([]);

  useFocusEffect(
    useCallback(() => {
      getFavorites().then(setFavorites);
    }, [])
  );

  const handleOpen = (item) => {
    navigation.navigate('Summary', {
      source: item.source,
      cachedSummary: item.summary,
    });
  };

  const handleRemove = (item) => {
    notifyWarning();
    Alert.alert(
      t('favorites.removeConfirmTitle'),
      t('favorites.removeConfirmMessage', { title: itemTitle(item.source, t) }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('favorites.removeConfirm'),
          style: 'destructive',
          onPress: async () => {
            await removeFavorite(item.key);
            setFavorites((prev) => prev.filter((favorite) => favorite.key !== item.key));
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {favorites.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{t('favorites.empty')}</Text>
          <Text style={styles.emptyHint}>{t('favorites.emptyHint')}</Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.key}
          contentContainerStyle={[styles.listContent, { paddingBottom: 16 + insets.bottom }]}
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
                <Text style={styles.date}>
                  {t('favorites.favoritedAt', { date: formatDate(item.createdAt, locale) })}
                </Text>
              </View>
              <Pressable hitSlop={12} style={styles.removeButton} onPress={() => handleRemove(item)}>
                <Text style={styles.removeButtonText}>♥</Text>
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
  removeButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  removeButtonText: {
    color: colors.danger,
    fontSize: 20,
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
