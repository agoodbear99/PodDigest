import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { resolvePodcast } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import { selection, notifySuccess, impactLight } from '../utils/haptics';
import { ensureNotificationPermission, getPushToken } from '../services/notifications';
import { isSubscribed, subscribeToFeed, unsubscribeFromFeed } from '../services/subscriptions';
import PrimaryButton from './PrimaryButton';

export default function RSSInputTab() {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [feed, setFeed] = useState(null);
  const [subscribed, setSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeError, setSubscribeError] = useState(null);

  useEffect(() => {
    if (!feed) return;
    isSubscribed(feed.rssUrl).then(setSubscribed);
  }, [feed]);

  const handleResolve = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setFeed(null);
    try {
      const result = await resolvePodcast(url.trim());
      setFeed(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePickEpisode = (episode) => {
    selection();
    navigation.navigate('Summary', {
      source: {
        type: 'episode',
        showTitle: feed.showTitle,
        episodeTitle: episode.title,
        description: episode.description,
      },
    });
  };

  const handleToggleSubscription = async () => {
    if (!feed || subscribing) return;
    setSubscribing(true);
    setSubscribeError(null);
    try {
      if (subscribed) {
        await unsubscribeFromFeed(feed.rssUrl);
        setSubscribed(false);
        impactLight();
      } else {
        const granted = await ensureNotificationPermission();
        if (!granted) {
          throw new Error(t('rss.notificationPermissionDenied'));
        }
        const pushToken = await getPushToken();
        await subscribeToFeed({ rssUrl: feed.rssUrl, showTitle: feed.showTitle, pushToken });
        setSubscribed(true);
        notifySuccess();
      }
    } catch (err) {
      setSubscribeError(err.message);
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('rss.label')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('rss.placeholder')}
        placeholderTextColor={colors.textSecondary}
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
      <PrimaryButton
        title={t('rss.resolveButton')}
        onPress={handleResolve}
        loading={loading}
        disabled={!url.trim()}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      {feed && (
        <View style={styles.feedSection}>
          <View style={styles.feedHeaderRow}>
            <Text style={styles.showTitle}>{feed.showTitle}</Text>
            <Pressable
              onPress={handleToggleSubscription}
              disabled={subscribing}
              hitSlop={8}
              style={({ pressed }) => [
                styles.subscribeButton,
                subscribed && styles.subscribeButtonActive,
                pressed && styles.subscribeButtonPressed,
              ]}
            >
              {subscribing ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Text style={styles.subscribeButtonText}>
                  {subscribed ? t('rss.unsubscribe') : t('rss.subscribe')}
                </Text>
              )}
            </Pressable>
          </View>
          {subscribeError && <Text style={styles.error}>{subscribeError}</Text>}
          <Text style={styles.hint}>{t('rss.chooseEpisodeHint')}</Text>
          <View style={styles.episodeList}>
            {feed.episodes.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => handlePickEpisode(item)}
                style={({ pressed }) => [styles.episodeItem, pressed && styles.episodeItemPressed]}
              >
                <Text style={styles.episodeTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                {item.pubDate ? <Text style={styles.episodeDate}>{item.pubDate}</Text> : null}
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 15,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
  feedSection: {
    marginTop: 8,
    gap: 8,
  },
  feedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  showTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  subscribeButton: {
    minHeight: 32,
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  subscribeButtonActive: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  subscribeButtonPressed: {
    opacity: 0.8,
  },
  subscribeButtonText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  episodeList: {
    gap: 8,
  },
  episodeItem: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 14,
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  episodeItemPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  episodeTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  episodeDate: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
});
