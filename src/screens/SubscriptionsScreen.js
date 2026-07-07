import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getSubscriptions, unsubscribeFromFeed } from '../services/subscriptions';
import { resolvePodcast } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import { selection, impactLight } from '../utils/haptics';
import { colors } from '../theme/colors';

function formatDate(iso, locale) {
  const date = new Date(iso);
  return date.toLocaleString(locale, { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function SubscriptionsScreen({ route }) {
  const navigation = useNavigation();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const locale = language === 'en' ? 'en-US' : 'zh-TW';

  const [subscriptions, setSubscriptions] = useState([]);
  const [expandedRssUrl, setExpandedRssUrl] = useState(null);
  const [episodesByFeed, setEpisodesByFeed] = useState({});
  const [loadingRssUrl, setLoadingRssUrl] = useState(null);

  const loadEpisodes = useCallback(async (rssUrl) => {
    setLoadingRssUrl(rssUrl);
    try {
      const result = await resolvePodcast(rssUrl);
      setEpisodesByFeed((prev) => ({ ...prev, [rssUrl]: result.episodes }));
    } catch {
      setEpisodesByFeed((prev) => ({ ...prev, [rssUrl]: [] }));
    } finally {
      setLoadingRssUrl(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      getSubscriptions().then((subs) => {
        setSubscriptions(subs);

        const focusRssUrl = route.params?.focusRssUrl;
        if (focusRssUrl && subs.some((sub) => sub.rssUrl === focusRssUrl)) {
          setExpandedRssUrl(focusRssUrl);
          loadEpisodes(focusRssUrl);
        }
      });
    }, [route.params?.focusRssUrl, loadEpisodes])
  );

  const handleToggleExpand = (rssUrl) => {
    selection();
    if (expandedRssUrl === rssUrl) {
      setExpandedRssUrl(null);
      return;
    }
    setExpandedRssUrl(rssUrl);
    if (!episodesByFeed[rssUrl]) {
      loadEpisodes(rssUrl);
    }
  };

  const handleUnsubscribe = async (rssUrl) => {
    impactLight();
    await unsubscribeFromFeed(rssUrl);
    setSubscriptions((prev) => prev.filter((sub) => sub.rssUrl !== rssUrl));
    if (expandedRssUrl === rssUrl) setExpandedRssUrl(null);
  };

  const handleOpenEpisode = (subscription, episode) => {
    selection();
    navigation.navigate('Summary', {
      source: {
        type: 'episode',
        showTitle: subscription.showTitle,
        episodeTitle: episode.title,
        description: episode.description,
        audioUrl: episode.audioUrl,
      },
    });
  };

  return (
    <View style={styles.container}>
      {subscriptions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{t('subscriptions.empty')}</Text>
          <Text style={styles.emptyHint}>{t('subscriptions.emptyHint')}</Text>
        </View>
      ) : (
        <FlatList
          data={subscriptions}
          keyExtractor={(item) => item.rssUrl}
          contentContainerStyle={[styles.listContent, { paddingBottom: 16 + insets.bottom }]}
          renderItem={({ item }) => {
            const isExpanded = expandedRssUrl === item.rssUrl;
            const isLoading = loadingRssUrl === item.rssUrl;
            const episodes = episodesByFeed[item.rssUrl];

            return (
              <View style={styles.card}>
                <Pressable
                  onPress={() => handleToggleExpand(item.rssUrl)}
                  style={({ pressed }) => [styles.cardHeader, pressed && styles.cardHeaderPressed]}
                >
                  <View style={styles.cardMain}>
                    <Text style={styles.title} numberOfLines={2}>
                      {item.showTitle}
                    </Text>
                    <Text style={styles.date}>
                      {t('subscriptions.subscribedAt', { date: formatDate(item.subscribedAt, locale) })}
                    </Text>
                  </View>
                  <Text style={styles.expandHint}>
                    {isExpanded ? t('subscriptions.hideEpisodes') : t('subscriptions.viewEpisodes')}
                  </Text>
                </Pressable>

                {isExpanded && (
                  <View style={styles.episodesBox}>
                    {isLoading && (
                      <View style={styles.loadingRow}>
                        <ActivityIndicator size="small" color={colors.accent} />
                        <Text style={styles.loadingText}>{t('subscriptions.loadingEpisodes')}</Text>
                      </View>
                    )}
                    {!isLoading &&
                      (episodes || []).map((episode) => (
                        <Pressable
                          key={episode.id}
                          onPress={() => handleOpenEpisode(item, episode)}
                          style={({ pressed }) => [
                            styles.episodeItem,
                            pressed && styles.episodeItemPressed,
                          ]}
                        >
                          <Text style={styles.episodeTitle} numberOfLines={2}>
                            {episode.title}
                          </Text>
                          {episode.pubDate ? (
                            <Text style={styles.episodeDate}>{episode.pubDate}</Text>
                          ) : null}
                        </Pressable>
                      ))}
                  </View>
                )}

                <Pressable
                  onPress={() => handleUnsubscribe(item.rssUrl)}
                  hitSlop={8}
                  style={styles.unsubscribeButton}
                >
                  <Text style={styles.unsubscribeButtonText}>{t('subscriptions.unsubscribeButton')}</Text>
                </Pressable>
              </View>
            );
          }}
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
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    gap: 12,
  },
  cardHeaderPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  cardMain: {
    flex: 1,
    gap: 2,
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
  expandHint: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  episodesBox: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 8,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  episodeItem: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    padding: 12,
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  episodeItemPressed: {
    opacity: 0.8,
  },
  episodeTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  episodeDate: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  unsubscribeButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  unsubscribeButtonText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
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
    textAlign: 'center',
  },
});
