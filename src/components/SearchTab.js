import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { resolvePodcast } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import { selection, impactLight } from '../utils/haptics';
import FeedLoadingAnimation from './FeedLoadingAnimation';

const SEARCH_DEBOUNCE_MS = 500;
const ITUNES_SEARCH_URL = 'https://itunes.apple.com/search';
const PARSE_TIME_DISPLAY_MS = 3000;

export default function SearchTab() {
  const navigation = useNavigation();
  const { t } = useLanguage();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const [selectedShow, setSelectedShow] = useState(null);
  const [feed, setFeed] = useState(null);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState(null);
  const [parseTimeText, setParseTimeText] = useState(null);

  const searchIdRef = useRef(0);
  const parseTimeTimeoutRef = useRef(null);

  useEffect(() => () => clearTimeout(parseTimeTimeoutRef.current), []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      searchIdRef.current += 1;
      setResults([]);
      setSearchError(null);
      setSearching(false);
      return undefined;
    }

    setSearching(true);
    setSearchError(null);
    const requestId = ++searchIdRef.current;

    const timeoutId = setTimeout(async () => {
      try {
        const url = `${ITUNES_SEARCH_URL}?term=${encodeURIComponent(trimmed)}&media=podcast&limit=10`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`iTunes search failed (status ${res.status}).`);
        const data = await res.json();
        if (searchIdRef.current !== requestId) return; // a newer search superseded this one
        setResults((data.results || []).filter((item) => item.feedUrl));
      } catch (err) {
        if (searchIdRef.current !== requestId) return;
        setSearchError(t('search.errorGeneric'));
        setResults([]);
      } finally {
        if (searchIdRef.current === requestId) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [query, t]);

  const handleClearQuery = () => {
    impactLight();
    setQuery('');
  };

  const handleSelectShow = async (show) => {
    selection();
    setSelectedShow(show);
    setFeed(null);
    setFeedError(null);
    setFeedLoading(true);
    setParseTimeText(null);
    clearTimeout(parseTimeTimeoutRef.current);
    const startedAt = Date.now();
    try {
      const result = await resolvePodcast(show.feedUrl);
      setFeed(result);
      const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
      setParseTimeText(t('rss.parseTimeMessage', { seconds: elapsedSeconds }));
      parseTimeTimeoutRef.current = setTimeout(() => setParseTimeText(null), PARSE_TIME_DISPLAY_MS);
    } catch (err) {
      setFeedError(err.message);
    } finally {
      setFeedLoading(false);
    }
  };

  const handleBackToResults = () => {
    selection();
    setSelectedShow(null);
    setFeed(null);
    setFeedError(null);
    setParseTimeText(null);
    clearTimeout(parseTimeTimeoutRef.current);
  };

  const handlePickEpisode = (episode) => {
    selection();
    navigation.navigate('Summary', {
      source: {
        type: 'episode',
        showTitle: feed.showTitle,
        episodeTitle: episode.title,
        description: episode.description,
        audioUrl: episode.audioUrl,
      },
    });
  };

  const showEmptyState = !searching && !searchError && query.trim().length > 0 && results.length === 0;

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <TextInput
          style={[styles.input, query.length > 0 && styles.inputWithClear]}
          placeholder={t('search.placeholder')}
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          selectTextOnFocus
        />
        {searching && (
          <ActivityIndicator size="small" color={colors.accent} style={styles.inputAccessory} />
        )}
        {!searching && query.length > 0 && (
          <Pressable
            onPress={handleClearQuery}
            hitSlop={12}
            style={({ pressed }) => [
              styles.clearButton,
              styles.inputAccessory,
              pressed && styles.clearButtonPressed,
            ]}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </Pressable>
        )}
      </View>

      {searchError && <Text style={styles.error}>{searchError}</Text>}

      {selectedShow ? (
        <View style={styles.feedSection}>
          <Pressable
            onPress={handleBackToResults}
            hitSlop={8}
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          >
            <Text style={styles.backButtonText}>‹ {t('search.backToResults')}</Text>
          </Pressable>

          {feedLoading ? (
            <FeedLoadingAnimation />
          ) : feedError ? (
            <Text style={styles.error}>{feedError}</Text>
          ) : (
            feed && (
              <>
                {parseTimeText && <Text style={styles.parseTimeText}>{parseTimeText}</Text>}
                <View style={styles.selectedShowHeader}>
                  {selectedShow.artworkUrl100 ? (
                    <Image source={{ uri: selectedShow.artworkUrl100 }} style={styles.selectedShowArtwork} />
                  ) : null}
                  <Text style={styles.showTitle} numberOfLines={2}>
                    {feed.showTitle}
                  </Text>
                </View>
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
              </>
            )
          )}
        </View>
      ) : (
        <>
          {query.trim().length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>{t('search.initialHint')}</Text>
            </View>
          )}

          {showEmptyState && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>{t('search.emptyResults')}</Text>
            </View>
          )}

          <View style={styles.resultsList}>
            {results.map((item) => (
              <Pressable
                key={item.collectionId}
                onPress={() => handleSelectShow(item)}
                style={({ pressed }) => [styles.resultItem, pressed && styles.resultItemPressed]}
              >
                {item.artworkUrl100 ? (
                  <Image source={{ uri: item.artworkUrl100 }} style={styles.resultArtwork} />
                ) : (
                  <View style={styles.resultArtworkPlaceholder} />
                )}
                <View style={styles.resultTextGroup}>
                  <Text style={styles.resultTitle} numberOfLines={2}>
                    {item.collectionName}
                  </Text>
                  <Text style={styles.resultAuthor} numberOfLines={1}>
                    {item.artistName}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  inputWrapper: {
    justifyContent: 'center',
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
  inputWithClear: {
    paddingRight: 40,
  },
  inputAccessory: {
    position: 'absolute',
    right: 6,
  },
  clearButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  clearButtonText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '700',
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyStateText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  resultsList: {
    gap: 8,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 10,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultItemPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  resultArtwork: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
  },
  resultArtworkPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
  },
  resultTextGroup: {
    flex: 1,
    gap: 2,
  },
  resultTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  resultAuthor: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  feedSection: {
    gap: 8,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  backButtonPressed: {
    opacity: 0.6,
  },
  backButtonText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  parseTimeText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '600',
  },
  selectedShowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectedShowArtwork: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
  },
  showTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
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
