import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import TabSwitcher from '../components/TabSwitcher';
import SearchTab from '../components/SearchTab';
import RSSInputTab from '../components/RSSInputTab';
import AudioUploadTab from '../components/AudioUploadTab';
import { getUsageStatus } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import { usePremium } from '../context/PremiumContext';
import { impactLight } from '../utils/haptics';
import { colors, gradients, glow } from '../theme/colors';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { isPremium, refresh: refreshPremium } = usePremium();
  const { height } = useWindowDimensions();
  const isCompact = height < 700;
  const [activeTab, setActiveTab] = useState('search');
  const [usage, setUsage] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getUsageStatus()
        .then((result) => {
          if (!cancelled) setUsage(result);
        })
        .catch(() => {});
      refreshPremium();
      return () => {
        cancelled = true;
      };
    }, [refreshPremium])
  );

  const handleUpgrade = () => {
    impactLight();
    navigation.navigate('Paywall');
  };

  const TABS = [
    { key: 'search', label: t('home.tabSearch') },
    { key: 'rss', label: t('home.tabRss') },
    { key: 'upload', label: t('home.tabUpload') },
  ];

  return (
    <LinearGradient colors={gradients.background} style={styles.gradient}>
      <View style={styles.glowTopRight} pointerEvents="none" />
      <View style={styles.glowBottomLeft} pointerEvents="none" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.hero, isCompact && styles.heroCompact]}>
              <View style={styles.topActionsRow}>
                <Pressable
                  style={styles.topActionIconButton}
                  onPress={() => navigation.navigate('Subscriptions')}
                  hitSlop={8}
                >
                  <Text style={styles.topActionIconText}>{t('home.subscriptionsButton')}</Text>
                </Pressable>
                <Pressable
                  style={styles.topActionIconButton}
                  onPress={() => navigation.navigate('Settings')}
                  hitSlop={8}
                >
                  <Text style={styles.topActionIconText}>⚙️</Text>
                </Pressable>
                <Pressable
                  style={styles.topActionButton}
                  onPress={() => navigation.navigate('Favorites')}
                  hitSlop={8}
                >
                  <Text style={styles.topActionButtonText}>{t('home.favoritesButton')}</Text>
                </Pressable>
                <Pressable
                  style={styles.topActionButton}
                  onPress={() => navigation.navigate('History')}
                  hitSlop={8}
                >
                  <Text style={styles.topActionButtonText}>{t('home.historyButton')}</Text>
                </Pressable>
              </View>
              <LinearGradient
                colors={gradients.accent}
                style={[styles.logoBadge, isCompact && styles.logoBadgeCompact]}
              >
                <Text style={styles.logo}>🎙️</Text>
              </LinearGradient>
              <Text style={[styles.title, isCompact && styles.titleCompact]}>
                {t('home.appName')}
              </Text>
              <Text style={styles.subtitle}>{t('home.tagline')}</Text>
              {!isPremium && usage && (
                <Text style={styles.usageText}>
                  {t('home.usageRemaining', { remaining: usage.remaining, limit: usage.limit })}
                </Text>
              )}
              {!isPremium && usage && usage.remaining <= 0 && (
                <Pressable
                  onPress={handleUpgrade}
                  style={({ pressed }) => [styles.upgradeButton, pressed && styles.upgradeButtonPressed]}
                >
                  <Text style={styles.upgradeButtonText}>{t('home.upgradeButton')}</Text>
                </Pressable>
              )}
            </View>

            <View style={styles.card}>
              <TabSwitcher tabs={TABS} activeKey={activeTab} onChange={setActiveTab} />

              <View style={styles.tabContent}>
                {activeTab === 'search' && <SearchTab />}
                {activeTab === 'rss' && <RSSInputTab usage={usage} isPremium={isPremium} />}
                {activeTab === 'upload' && <AudioUploadTab />}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  glowTopRight: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: glow.primary,
  },
  glowBottomLeft: {
    position: 'absolute',
    bottom: -100,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: glow.secondary,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
    gap: 20,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 8,
    gap: 8,
  },
  heroCompact: {
    paddingBottom: 4,
    gap: 6,
  },
  topActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 8,
    marginBottom: 8,
  },
  topActionButton: {
    backgroundColor: 'rgba(36, 40, 50, 0.7)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  topActionButtonText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  topActionIconButton: {
    backgroundColor: 'rgba(36, 40, 50, 0.7)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topActionIconText: {
    fontSize: 14,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: colors.accent,
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  logoBadgeCompact: {
    width: 56,
    height: 56,
    borderRadius: 18,
  },
  logo: {
    fontSize: 34,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  titleCompact: {
    fontSize: 26,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  usageText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  upgradeButton: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  upgradeButtonPressed: {
    opacity: 0.85,
  },
  upgradeButtonText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    backgroundColor: 'rgba(26, 29, 36, 0.7)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 16,
  },
  tabContent: {
    flex: 1,
  },
});
