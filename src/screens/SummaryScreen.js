import { useEffect, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LoadingOverlay from '../components/LoadingOverlay';
import SummaryToggle from '../components/SummaryToggle';
import PrimaryButton from '../components/PrimaryButton';
import { summarizeEpisode, summarizeAudio } from '../services/api';
import { addHistoryItem } from '../services/history';
import { isFavorite, toggleFavorite } from '../services/favorites';
import { getSummaryLanguage } from '../services/summaryLanguage';
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

  useEffect(() => {
    if (cachedSummary) return;

    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const language = await getSummaryLanguage();
        const result =
          source.type === 'audio'
            ? await summarizeAudio(source.file, language)
            : await summarizeEpisode({
                showTitle: source.showTitle,
                episodeTitle: source.episodeTitle,
                description: source.description,
                audioUrl: source.audioUrl,
                language,
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.navBar}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={10}
          style={({ pressed }) => [styles.navBackButton, pressed && styles.navBackButtonPressed]}
        >
          <Text style={styles.navBackButtonText}>‹</Text>
        </Pressable>
        <Text style={styles.navTitle} numberOfLines={1}>
          {t('summary.title')}
        </Text>
        <View style={styles.navRightSlot}>
          {summary && (
            // These two Pressables are deliberately kept as separate, independent
            // siblings (not wrapped in any shared background/border View) — this
            // screen renders its own header instead of using native-stack's
            // headerRight specifically to avoid the OS grouping adjacent header
            // buttons into one shared highlight/glow "pill" on iOS.
            <>
              <Pressable
                onPress={handleToggleFavorite}
                hitSlop={6}
                style={({ pressed }) => [
                  styles.favoriteButton,
                  isFav && styles.favoriteButtonActive,
                  pressed && styles.favoriteButtonPressed,
                ]}
              >
                <Text style={[styles.favoriteButtonText, isFav && styles.favoriteButtonTextActive]}>
                  {isFav ? '♥' : '♡'}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleShare}
                hitSlop={6}
                style={({ pressed }) => [styles.shareButton, pressed && styles.shareButtonPressed]}
              >
                <Text style={styles.shareButtonText}>{t('summary.shareButton')}</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>

      {loading ? (
        <LoadingOverlay message={t('summary.loadingMessage')} />
      ) : error ? (
        <View style={styles.centerContent}>
          <Text style={styles.errorTitle}>{t('summary.errorTitle')}</Text>
          <Text style={styles.errorText}>{error}</Text>
          <PrimaryButton title={t('summary.backButton')} onPress={() => navigation.goBack()} />
        </View>
      ) : (
        <>
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
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    height: 52,
  },
  navBackButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  navBackButtonPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  navBackButtonText: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '400',
    marginTop: -2,
  },
  navTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  navRightSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 16,
    minWidth: 40,
  },
  favoriteButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  favoriteButtonActive: {
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    borderColor: colors.danger,
  },
  favoriteButtonPressed: {
    opacity: 0.6,
  },
  favoriteButtonText: {
    color: colors.textSecondary,
    fontSize: 17,
    lineHeight: 20,
  },
  favoriteButtonTextActive: {
    color: colors.danger,
  },
  shareButton: {
    backgroundColor: colors.accent,
    borderRadius: 17,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  shareButtonPressed: {
    opacity: 0.7,
  },
  shareButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
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
