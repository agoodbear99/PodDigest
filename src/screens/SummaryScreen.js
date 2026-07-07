import { useEffect, useLayoutEffect, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LoadingOverlay from '../components/LoadingOverlay';
import SummaryToggle from '../components/SummaryToggle';
import PrimaryButton from '../components/PrimaryButton';
import { summarizeEpisode, summarizeAudio } from '../services/api';
import { addHistoryItem } from '../services/history';
import { isFavorite, toggleFavorite } from '../services/favorites';
import { useLanguage } from '../i18n/LanguageContext';
import { impactLight, notifySuccess } from '../utils/haptics';
import { colors } from '../theme/colors';

function episodeHeading(source, t) {
  if (source.type === 'audio') return source.file?.name || t('history.audioFallback');
  return source.showTitle ? `${source.showTitle} - ${source.episodeTitle}` : source.episodeTitle;
}

function buildShareMessage(source, summary, mode, t) {
  const heading = episodeHeading(source, t);
  const body =
    mode === 'bullets'
      ? summary.bulletPoints.map((point) => `• ${point}`).join('\n')
      : summary.shortSummary;
  return `${heading}\n\n${body}\n\n${t('summary.shareFooter')}`;
}

export default function SummaryScreen({ route, navigation }) {
  const { source, cachedSummary } = route.params;
  const { t } = useLanguage();

  const [loading, setLoading] = useState(!cachedSummary);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(cachedSummary || null);
  const [mode, setMode] = useState('bullets');
  const [isFav, setIsFav] = useState(false);

  const handleShare = async () => {
    try {
      await Share.share({
        message: buildShareMessage(source, summary, mode, t),
        title: episodeHeading(source, t),
      });
    } catch (err) {
      Alert.alert(t('summary.shareFailedTitle'), err.message);
    }
  };

  const handleToggleFavorite = async () => {
    const nextState = await toggleFavorite({ source, summary });
    setIsFav(nextState);
    if (nextState) {
      notifySuccess();
    } else {
      impactLight();
    }
  };

  useEffect(() => {
    if (!summary) return;
    isFavorite(source).then(setIsFav);
  }, [summary, source]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: summary
        ? () => (
            <View style={styles.headerActions}>
              <Pressable onPress={handleToggleFavorite} hitSlop={12} style={styles.favoriteButton}>
                <Text style={[styles.favoriteButtonText, isFav && styles.favoriteButtonTextActive]}>
                  {isFav ? '♥' : '♡'}
                </Text>
              </Pressable>
              <Pressable onPress={handleShare} hitSlop={12} style={styles.shareButton}>
                <Text style={styles.shareButtonText}>{t('summary.shareButton')}</Text>
              </Pressable>
            </View>
          )
        : undefined,
    });
  }, [navigation, summary, mode, isFav, t]);

  useEffect(() => {
    if (cachedSummary) return;

    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const result =
          source.type === 'audio'
            ? await summarizeAudio(source.file)
            : await summarizeEpisode({
                showTitle: source.showTitle,
                episodeTitle: source.episodeTitle,
                description: source.description,
                audioUrl: source.audioUrl,
              });
        if (!cancelled) {
          setSummary(result);
          addHistoryItem({ source, summary: result }).catch(() => {});
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [source, cachedSummary]);

  if (loading) {
    return <LoadingOverlay message={t('summary.loadingMessage')} />;
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <View style={styles.centerContent}>
          <Text style={styles.errorTitle}>{t('summary.errorTitle')}</Text>
          <Text style={styles.errorText}>{error}</Text>
          <PrimaryButton title={t('summary.backButton')} onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <View style={styles.header}>
        {source.type === 'episode' && (
          <>
            <Text style={styles.showTitle}>{source.showTitle}</Text>
            <Text style={styles.episodeTitle}>{source.episodeTitle}</Text>
          </>
        )}
        {source.type === 'audio' && <Text style={styles.episodeTitle}>{source.file.name}</Text>}
      </View>

      <View style={styles.body}>
        <SummaryToggle
          mode={mode}
          onChangeMode={setMode}
          bulletPoints={summary.bulletPoints}
          shortSummary={summary.shortSummary}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  favoriteButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  favoriteButtonText: {
    color: colors.textSecondary,
    fontSize: 20,
  },
  favoriteButtonTextActive: {
    color: colors.danger,
  },
  shareButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 4,
  },
  shareButtonText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 4,
  },
  showTitle: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  episodeTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  errorTitle: {
    color: colors.danger,
    fontSize: 18,
    fontWeight: '700',
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
});
