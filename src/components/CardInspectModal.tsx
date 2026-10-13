import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { CARD_PIXEL_H, CARD_PIXEL_W } from '../data/cardSize';
import { isHitCard } from '../data/hits';
import type { PulledCard } from '../data/types';
import { colors } from '../theme';
import { HitFoilOverlay } from './HitFoilOverlay';
import { TAB_BAR_HEIGHT } from './TabBar';
import { TradingCard } from './TradingCard';

type Props = {
  card: PulledCard | null;
  onClose: () => void;
};

export function CardInspectModal({ card, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const scale = Math.min(1.52, (width - 56) / CARD_PIXEL_W, (height - TAB_BAR_HEIGHT - 160) / CARD_PIXEL_H);

  return (
    <Modal transparent visible={card != null} animationType="fade" onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.root}>
      <Pressable style={[styles.backdrop, { paddingBottom: TAB_BAR_HEIGHT + 24 }]} onPress={onClose}>
        {card ? (
          <Pressable
            onPress={() => {}}
            style={[styles.stage, { width: CARD_PIXEL_W * scale, height: CARD_PIXEL_H * scale, alignItems: 'center', justifyContent: 'center' }]}
          >
            <View style={{ transform: [{ scale }] }}>
              {isHitCard(card) ? <HitInspectCard card={card} /> : <TradingCard card={card} />}
            </View>
          </Pressable>
        ) : null}
        <Pressable onPress={onClose} style={styles.close}>
          <Text style={styles.closeText}>Fermer</Text>
        </Pressable>
      </Pressable>
      </GestureHandlerRootView>
    </Modal>
  );
}

function HitInspectCard({ card }: { card: PulledCard }) {
  const mx = useSharedValue(0);
  const my = useSharedValue(0);
  const lit = useSharedValue(0);
  const foil = useSharedValue(1);
  const lastTx = useSharedValue(0);
  const lastTy = useSharedValue(0);

  const pan = Gesture.Pan()
    .minDistance(0)
    .shouldCancelWhenOutside(false)
    .onStart(() => {
      lastTx.value = 0;
      lastTy.value = 0;
      lit.value = withTiming(1, { duration: 80 });
    })
    .onUpdate((event) => {
      mx.value = Math.max(-1, Math.min(1, mx.value + (event.translationX - lastTx.value) / 78));
      my.value = Math.max(-1, Math.min(1, my.value + (event.translationY - lastTy.value) / 96));
      lastTx.value = event.translationX;
      lastTy.value = event.translationY;
    })
    .onEnd(() => {
      lit.value = withTiming(0, { duration: 180 });
      mx.value = withSpring(0, { damping: 16, stiffness: 140 });
      my.value = withSpring(0, { damping: 16, stiffness: 140 });
    });

  const tiltStyle = useAnimatedStyle(() => ({
    transformStyle: 'preserve-3d' as const,
    transform: [
      { perspective: 1100 },
      { rotateX: `${interpolate(my.value, [-1, 1], [28, -28])}deg` },
      { rotateY: `${interpolate(mx.value, [-1, 1], [-36, 36])}deg` },
      { rotateZ: `${interpolate(mx.value, [-1, 1], [-6, 6])}deg` },
    ],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.hitPad, tiltStyle]}>
        <View style={styles.foilHost}>
          <TradingCard card={card} />
          <HitFoilOverlay mx={mx} my={my} active={foil} lit={lit} />
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 4, 2, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: {
    width: CARD_PIXEL_W,
    height: CARD_PIXEL_H,
  },
  hitPad: {
    width: CARD_PIXEL_W,
    height: CARD_PIXEL_H,
  },
  foilHost: {
    width: CARD_PIXEL_W,
    height: CARD_PIXEL_H,
    borderRadius: 12,
    overflow: 'hidden',
    isolation: 'isolate',
  },
  close: {
    marginTop: 28,
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 10,
  },
  closeText: { color: colors.gold, fontWeight: '800' },
});
