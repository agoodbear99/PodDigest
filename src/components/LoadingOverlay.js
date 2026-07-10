import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '../theme/colors';

export default function LoadingOverlay({ message = '產生摘要中…' }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // `Animated.loop()` + `useNativeDriver: true` can silently stop after one
    // iteration on react-native-web (the CSS-driven native-driver emulation
    // doesn't always re-trigger the loop's internal restart). A manual
    // recursive restart is more robust across platforms — each cycle
    // explicitly resets the value and kicks off the next one itself, so it
    // keeps going for as long as the component stays mounted (i.e. until the
    // summary is ready), and only stops because we tell it to on unmount.
    let stopped = false;

    const runPulse = () => {
      pulse.setValue(0);
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished && !stopped) runPulse();
      });
    };

    const runSpin = () => {
      spin.setValue(0);
      Animated.timing(spin, {
        toValue: 1,
        duration: 2200,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && !stopped) runSpin();
      });
    };

    runPulse();
    runSpin();

    return () => {
      stopped = true;
      pulse.stopAnimation();
      spin.stopAnimation();
    };
  }, [pulse, spin]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <LinearGradient colors={gradients.background} style={styles.container}>
      <View style={styles.spinnerWrap}>
        <Animated.View style={[styles.pulseRing, { transform: [{ scale }], opacity }]} />
        <Animated.View style={[styles.ring, { transform: [{ rotate }] }]} />
        <Text style={styles.emoji}>🎧</Text>
      </View>
      <Text style={styles.text}>{message}</Text>
    </LinearGradient>
  );
}

const RING_SIZE = 88;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  spinnerWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    backgroundColor: colors.accent,
  },
  ring: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 3,
    borderColor: colors.accentMuted,
    borderTopColor: colors.accent,
  },
  emoji: {
    fontSize: 30,
  },
  text: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});
