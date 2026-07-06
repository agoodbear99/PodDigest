import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { resolvePodcast } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import { selection } from '../utils/haptics';
import PrimaryButton from './PrimaryButton';

export default function RSSInputTab() {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [feed, setFeed] = useState(null);

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
          <Text style={styles.showTitle}>{feed.showTitle}</Text>
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
  showTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
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
