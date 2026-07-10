import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '../i18n/LanguageContext';
import { colors } from '../theme/colors';

const STEP_INTERVAL_MS = 1100;
const RING_SIZE = 64;
const MIC_SPIN_DURATION_MS = 1800;
const RING_SPIN_DURATION_MS = 1000;

/**
 * A small inline "resolving a podcast feed" animation — an iOS-style spinning
 * ring behind a slowly-rotating mic, with a cycling progress caption underneath.
 * All motion runs on the native driver so it stays smooth regardless of
 * concurrent JS-thread work (the network request, JSON/XML parsing, etc.).
 */
export default function FeedLoadingAnimation() {
  const { t } = useLanguage();
  const micSpin = useRef(new Animated.Value(0)).current;
  const ringSpin = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(1)).current;
  const [stepIndex, setStepIndex] = useState(0);

  const steps = [t('rss.parsingStep1'), t('rss.parsingStep2'), t('rss.parsingStep3')];

  useEffect(() => {
    const micLoop = Animated.loop(
      Animated.timing(micSpin, {
        toValue: 1,
        duration: MIC_SPIN_DURATION_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const ringLoop = Animated.loop(
      Animated.timing(ringSpin, {
        toValue: 1,
        duration: RING_SPIN_DURATION_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    micLoop.start();
    ringLoop.start();
    return () => {
      micLoop.stop();
      ringLoop.stop();
    };
  }, [micSpin, ringSpin]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setStepIndex((i) => (i + 1) % steps.length);
    }, STEP_INTERVAL_MS);
    return () => clearInterval(intervalId);
    // `steps` is derived fresh from `t()` every render but always has the same
    // length — the cycle only needs to be set up once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    textOpacity.setValue(0);
    Animated.timing(textOpacity, {
      toValue: 1,
      duration: 250,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [stepIndex, textOpacity]);

  const micRotate = micSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const ringRotate = ringSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Animated.View style={[styles.spinnerRing, { transform: [{ rotate: ringRotate }] }]} />
        <Animated.Text style={[styles.icon, { transform: [{ rotate: micRotate }] }]}>🎙️</Animated.Text>
      </View>
      <Animated.Text style={[styles.stepText, { opacity: textOpacity }]}>{steps[stepIndex]}</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingVertical: 28,
  },
  iconWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerRing: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 3,
    borderColor: colors.accentMuted,
    borderTopColor: colors.accent,
  },
  icon: {
    fontSize: 32,
  },
  stepText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});
