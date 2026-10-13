import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { BackToShopButton } from '../components/BackToShopButton';
import { packTextureModule } from '../data/packTextures';
import { useGame } from '../game/GameContext';
import { colors } from '../theme';

export function InspectScreen({ overlay = false }: { overlay?: boolean }) {
  const { selectedSet, startReveal, goHome, displayPacksRemaining, displaySession, openingGift } = useGame();
  const [opening, setOpening] = useState(false);
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);

  const open = () => {
    if (opening) return;
    setOpening(true);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    scale.value = withSequence(
      withTiming(1.08, { duration: 90 }),
      withTiming(1.18, { duration: 100 }),
      withTiming(0.2, { duration: 180, easing: Easing.in(Easing.cubic) }),
    );
    rotate.value = withTiming(8, { duration: 240 });
    opacity.value = withTiming(0, { duration: 260 });
    setTimeout(startReveal, 280);
  };

  const packStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
    opacity: opacity.value,
  }));

  if (!selectedSet) return null;
  const packImage = packTextureModule(selectedSet.id);

  const content = (
    <>
      <BackToShopButton label="← Boutique" onPress={goHome} />

      <Text style={styles.kicker}>{selectedSet.code}</Text>
      <Text style={styles.title}>{selectedSet.name}</Text>
      <Text style={styles.lead}>
        {opening
          ? 'Le paquet se déchire…'
            : displaySession && displayPacksRemaining
            ? `Display OP-13 · ${displayPacksRemaining} booster${displayPacksRemaining > 1 ? 's' : ''} restant${displayPacksRemaining > 1 ? 's' : ''}`
            : openingGift
              ? 'Cadeau du 1er jour — appuie pour l’ouvrir'
              : 'Appuie sur le booster pour l’ouvrir'}
      </Text>

      <Pressable onPress={open} style={styles.stage}>
        <Animated.View style={packStyle}>
          {packImage ? <Image source={packImage} resizeMode="contain" style={styles.heroPack} /> : null}
        </Animated.View>
      </Pressable>
    </>
  );

  if (overlay) return <View style={[styles.fill, styles.overlay]}>{content}</View>;
  return <LinearGradient colors={['#10060a', colors.bg]} style={styles.fill}>{content}</LinearGradient>;
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  overlay: { backgroundColor: 'transparent' },
  kicker: { color: colors.gold, letterSpacing: 3, fontWeight: '800' },
  title: { color: colors.white, fontSize: 28, fontWeight: '900', marginTop: 8, textAlign: 'center' },
  lead: { color: colors.muted, marginTop: 8, marginBottom: 28, textAlign: 'center' },
  stage: { alignItems: 'center', justifyContent: 'center', minHeight: 420, minWidth: 260 },
  heroPack: { width: 220, height: 340 },
});
