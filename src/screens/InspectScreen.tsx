import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { BoosterPack } from '../components/BoosterPack';
import { useGame } from '../game/GameContext';
import { colors } from '../theme';

export function InspectScreen() {
  const { selectedSet, startReveal, goHome } = useGame();
  const [opening, setOpening] = useState(false);
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);
  const burst = useSharedValue(0);

  const open = () => {
    if (opening) return;
    setOpening(true);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    scale.value = withSequence(
      withTiming(1.08, { duration: 160 }),
      withTiming(1.22, { duration: 180 }),
      withTiming(0.2, { duration: 320, easing: Easing.in(Easing.cubic) }),
    );
    rotate.value = withTiming(8, { duration: 420 });
    opacity.value = withTiming(0, { duration: 480 });
    burst.value = withTiming(1, { duration: 480 });
    setTimeout(startReveal, 520);
  };

  const packStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
    opacity: opacity.value,
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: burst.value * 0.85,
    transform: [{ scale: 0.6 + burst.value * 1.4 }],
  }));

  if (!selectedSet) return null;

  return (
    <LinearGradient colors={['#10060a', colors.bg]} style={styles.fill}>
      <Pressable onPress={goHome} style={styles.back}>
        <Text style={styles.backText}>← Changer de booster</Text>
      </Pressable>

      <Text style={styles.kicker}>{selectedSet.code}</Text>
      <Text style={styles.title}>{selectedSet.name}</Text>
      <Text style={styles.lead}>{opening ? 'Le paquet se déchire…' : 'Appuie sur le booster pour l’ouvrir'}</Text>

      <Pressable onPress={open} style={styles.stage}>
        <Animated.View style={[styles.flash, flashStyle]} />
        <Animated.View style={packStyle}>
          <BoosterPack set={selectedSet} size="hero" />
        </Animated.View>
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  back: { position: 'absolute', top: 56, left: 20 },
  backText: { color: colors.muted, fontSize: 15 },
  kicker: { color: colors.gold, letterSpacing: 3, fontWeight: '800' },
  title: { color: colors.white, fontSize: 28, fontWeight: '900', marginTop: 8, textAlign: 'center' },
  lead: { color: colors.muted, marginTop: 8, marginBottom: 28, textAlign: 'center' },
  stage: { alignItems: 'center', justifyContent: 'center', minHeight: 360, minWidth: 260 },
  flash: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.gold,
  },
});
