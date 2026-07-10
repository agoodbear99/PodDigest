import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../i18n/LanguageContext';
import { usePremium } from '../context/PremiumContext';
import { purchaseMonthly, purchaseYearly, restorePurchases } from '../services/purchaseService';
import { notifySuccess, impactLight } from '../utils/haptics';
import { colors, gradients } from '../theme/colors';

export default function PaywallScreen() {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { isPremium, refresh } = usePremium();
  const [purchasingPlan, setPurchasingPlan] = useState(null);
  const [restoring, setRestoring] = useState(false);

  const busy = purchasingPlan !== null || restoring;

  const handlePurchase = async (plan) => {
    if (busy) return;
    impactLight();
    setPurchasingPlan(plan);
    try {
      const active = await (plan === 'monthly' ? purchaseMonthly() : purchaseYearly());
      await refresh();
      if (active) {
        notifySuccess();
        Alert.alert(t('paywall.successTitle'), t('paywall.successMessage'), [
          { text: t('summary.backButton'), onPress: () => navigation.goBack() },
        ]);
      }
    } catch (err) {
      if (!err.userCancelled) {
        Alert.alert(t('paywall.errorTitle'), err.message);
      }
    } finally {
      setPurchasingPlan(null);
    }
  };

  const handleRestore = async () => {
    if (busy) return;
    impactLight();
    setRestoring(true);
    try {
      const active = await restorePurchases();
      await refresh();
      if (active) {
        notifySuccess();
        Alert.alert(t('paywall.restoreSuccessTitle'), t('paywall.restoreSuccessMessage'));
      } else {
        Alert.alert(t('paywall.restoreEmptyTitle'), t('paywall.restoreEmptyMessage'));
      }
    } catch (err) {
      Alert.alert(t('paywall.errorTitle'), err.message);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <LinearGradient colors={gradients.background} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.headline}>{t('paywall.headline')}</Text>
        <Text style={styles.subheadline}>{t('paywall.subheadline')}</Text>

        <View style={styles.comparisonCard}>
          <View style={styles.comparisonHeaderRow}>
            <View style={styles.comparisonLabelCol} />
            <Text style={styles.comparisonColHeader}>{t('paywall.freeTitle')}</Text>
            <Text style={[styles.comparisonColHeader, styles.comparisonColHeaderPro]}>
              {t('paywall.proTitle')}
            </Text>
          </View>
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>{t('paywall.featureLimitLabel')}</Text>
            <Text style={styles.comparisonValue}>{t('paywall.featureLimitFree')}</Text>
            <Text style={[styles.comparisonValue, styles.comparisonValuePro]}>
              {t('paywall.featureLimitPro')}
            </Text>
          </View>
          <View style={[styles.comparisonRow, styles.comparisonRowLast]}>
            <Text style={styles.comparisonLabel}>{t('paywall.featureAllFeaturesLabel')}</Text>
            <Text style={styles.comparisonValue}>✓</Text>
            <Text style={[styles.comparisonValue, styles.comparisonValuePro]}>✓</Text>
          </View>
        </View>

        {isPremium ? (
          <Text style={styles.alreadyProHint}>{t('paywall.alreadyProHint')}</Text>
        ) : (
          <View style={styles.plans}>
            <Pressable
              onPress={() => handlePurchase('monthly')}
              disabled={busy}
              style={({ pressed }) => [
                styles.planCard,
                pressed && !busy && styles.planCardPressed,
                busy && styles.planCardDisabled,
              ]}
            >
              <Text style={styles.planTitle}>{t('paywall.monthlyPlanTitle')}</Text>
              <Text style={styles.planPrice}>{t('paywall.monthlyPlanPrice')}</Text>
              {purchasingPlan === 'monthly' && (
                <ActivityIndicator color={colors.textPrimary} style={styles.planSpinner} />
              )}
            </Pressable>

            <Pressable
              onPress={() => handlePurchase('yearly')}
              disabled={busy}
              style={({ pressed }) => [
                styles.planCard,
                styles.planCardFeatured,
                pressed && !busy && styles.planCardPressed,
                busy && styles.planCardDisabled,
              ]}
            >
              <View style={styles.planBadge}>
                <Text style={styles.planBadgeText}>{t('paywall.yearlyPlanBadge')}</Text>
              </View>
              <Text style={styles.planTitle}>{t('paywall.yearlyPlanTitle')}</Text>
              <Text style={styles.planPrice}>{t('paywall.yearlyPlanPrice')}</Text>
              {purchasingPlan === 'yearly' && (
                <ActivityIndicator color={colors.textPrimary} style={styles.planSpinner} />
              )}
            </Pressable>
          </View>
        )}

        <Pressable
          onPress={handleRestore}
          disabled={busy}
          hitSlop={8}
          style={({ pressed }) => [styles.restoreButton, pressed && styles.restoreButtonPressed]}
        >
          {restoring ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : (
            <Text style={styles.restoreButtonText}>{t('paywall.restoreButton')}</Text>
          )}
        </Pressable>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 24,
  },
  headline: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 8,
  },
  subheadline: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  comparisonCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  comparisonHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  comparisonLabelCol: {
    flex: 1.4,
  },
  comparisonColHeader: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  comparisonColHeaderPro: {
    color: colors.accent,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  comparisonRowLast: {
    marginBottom: 0,
  },
  comparisonLabel: {
    flex: 1.4,
    color: colors.textPrimary,
    fontSize: 13,
  },
  comparisonValue: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  comparisonValuePro: {
    color: colors.success,
    fontWeight: '700',
  },
  alreadyProHint: {
    color: colors.success,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  plans: {
    flexDirection: 'row',
    gap: 12,
  },
  planCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 110,
  },
  planCardFeatured: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  planCardPressed: {
    opacity: 0.85,
  },
  planCardDisabled: {
    opacity: 0.6,
  },
  planBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  planBadgeText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  planTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  planPrice: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  planSpinner: {
    marginTop: 4,
  },
  restoreButton: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  restoreButtonPressed: {
    opacity: 0.6,
  },
  restoreButtonText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
