import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { CARD_PIXEL_H, CARD_PIXEL_W } from '../data/cardSize';
import { isHitCard } from '../data/hits';
import type { PulledCard } from '../data/types';
import { colors } from '../theme';
import { HitFoilOverlay } from './HitFoilOverlay';
import { TradingCard } from './TradingCard';

const CARD_BACK = require('../../assets/OP_CARD_BACK.webp');

type Props = {
  cards: PulledCard[];
  onDismissTop: () => void;
  onLastShop: () => void;
};

function buzz() {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

function StackCard({
  card,
  index,
  active,
  onDismiss,
}: {
  card: PulledCard;
  index: number;
  active: boolean;
  onDismiss: () => void;
}) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const spin = useSharedValue(0);
  const pop = useSharedValue(1);
  const foil = useSharedValue(0);
  const mx = useSharedValue(0);
  const my = useSharedValue(0);
  const lit = useSharedValue(0);
  const lastTx = useSharedValue(0);
  const lastTy = useSharedValue(0);
  const inspecting = useSharedValue(0);
  const [artReady, setArtReady] = useState(!card.imageUrl);
  const [spinning, setSpinning] = useState(false);
  const [inspect, setInspect] = useState(false);
  const hit = isHitCard(card);
  const markReady = useCallback(() => setArtReady(true), []);

  const showFoil = useCallback(() => {
    setSpinning(false);
    setInspect(true);
    inspecting.value = 1;
    foil.value = withTiming(1, { duration: 220 });
  }, [foil, inspecting]);

  useEffect(() => {
    if (!active || !hit || !artReady) {
      setSpinning(false);
      setInspect(false);
      inspecting.value = 0;
      spin.value = 0;
      pop.value = 1;
      foil.value = 0;
      lit.value = 0;
      mx.value = 0;
      my.value = 0;
      return;
    }
    setSpinning(true);
    setInspect(false);
    inspecting.value = 0;
    spin.value = 0;
    pop.value = 1;
    foil.value = 0;
    lit.value = 0;
    mx.value = 0;
    my.value = 0;
    const timer = setTimeout(() => {
      buzz();
      pop.value = withSequence(
        withTiming(1.14, { duration: 180, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 520, easing: Easing.inOut(Easing.cubic) }),
      );
      spin.value = withTiming(1, { duration: 720, easing: Easing.inOut(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(showFoil)();
      });
    }, 40);
    return () => clearTimeout(timer);
  }, [active, artReady, foil, hit, lit, mx, my, pop, showFoil, spin]);

  const pan = Gesture.Pan()
    .enabled(active && !spinning)
    .minDistance(hit && inspect ? 0 : 8)
    .shouldCancelWhenOutside(false)
    .onStart(() => {
      lastTx.value = 0;
      lastTy.value = 0;
      if (inspecting.value) lit.value = withTiming(1, { duration: 80 });
    })
    .onUpdate((event) => {
      if (inspecting.value) {
        mx.value = Math.max(-1, Math.min(1, mx.value + (event.translationX - lastTx.value) / 78));
        my.value = Math.max(-1, Math.min(1, my.value + (event.translationY - lastTy.value) / 96));
        lastTx.value = event.translationX;
        lastTy.value = event.translationY;
        return;
      }
      x.value = event.translationX;
      y.value = event.translationY;
    })
    .onEnd((event) => {
      if (inspecting.value) {
        lit.value = withTiming(0, { duration: 180 });
        mx.value = withSpring(0, { damping: 16, stiffness: 140 });
        my.value = withSpring(0, { damping: 16, stiffness: 140 });
        const shouldFly =
          Math.abs(event.translationX) > 220 ||
          Math.abs(event.velocityX) > 1400 ||
          Math.abs(event.translationY) > 260;
        if (shouldFly) {
          const dirX = event.translationX === 0 ? (event.velocityX >= 0 ? 1 : -1) : Math.sign(event.translationX);
          runOnJS(buzz)();
          x.value = withTiming(dirX * 620, { duration: 120 });
          y.value = withTiming(event.translationY * 1.4, { duration: 120 }, (finished) => {
            if (finished) runOnJS(onDismiss)();
          });
        }
        return;
      }

      const shouldFly =
        Math.abs(event.translationX) > 90 ||
        Math.abs(event.velocityX) > 850 ||
        Math.abs(event.translationY) > 140;

      if (shouldFly) {
        const dirX = event.translationX === 0 ? (event.velocityX >= 0 ? 1 : -1) : Math.sign(event.translationX);
        runOnJS(buzz)();
        x.value = withTiming(dirX * 620, { duration: 120 });
        y.value = withTiming(event.translationY * 1.4, { duration: 120 }, (finished) => {
          if (finished) runOnJS(onDismiss)();
        });
        return;
      }

      x.value = withSpring(0, { damping: 18, stiffness: 180 });
      y.value = withSpring(0, { damping: 18, stiffness: 180 });
    });

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value + index * 8 },
      { scale: pop.value * (1 - index * 0.035) },
      { rotate: `${interpolate(x.value, [-200, 0, 200], [-14, 0, 14])}deg` },
    ],
    zIndex: 40 - index,
  }));

  const tiltStyle = useAnimatedStyle(() => ({
    transformStyle: 'preserve-3d' as const,
    transform: [
      { perspective: 1100 },
      { rotateX: `${interpolate(my.value, [-1, 1], [28, -28])}deg` },
      { rotateY: `${interpolate(mx.value, [-1, 1], [-36, 36])}deg` },
      { rotateZ: `${interpolate(mx.value, [-1, 1], [-6, 6])}deg` },
    ],
  }));

  const frontStyle = useAnimatedStyle(() => ({
    transform: inspecting.value
      ? []
      : [{ perspective: 1100 }, { rotateY: `${spin.value * 360}deg` }],
    backfaceVisibility: inspecting.value ? ('visible' as const) : ('hidden' as const),
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1100 }, { rotateY: `${spin.value * 360 + 180}deg` }],
    backfaceVisibility: 'hidden' as const,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.cardAbs, style]} pointerEvents={active ? 'auto' : 'none'}>
        <Animated.View style={[styles.cardBody, tiltStyle]}>
          <Animated.View style={[styles.face, backStyle]} pointerEvents="none">
            <Image source={CARD_BACK} style={styles.back} resizeMode="contain" />
          </Animated.View>
          <Animated.View style={frontStyle}>
            <View style={styles.foilHost}>
              <TradingCard card={card} onReady={markReady} />
              {hit ? <HitFoilOverlay mx={mx} my={my} active={foil} lit={lit} /> : null}
            </View>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

export function CardStack({ cards, onDismissTop, onLastShop }: Props) {
  const visible = cards.slice(0, 4);
  const lastCard = cards.length === 1;

  return (
    <View style={styles.wrap}>
      <View style={styles.stack}>
        {visible
          .map((card, index) => (
            <StackCard key={card.pullId} card={card} index={index} active={index === 0} onDismiss={onDismissTop} />
          ))
          .reverse()}
      </View>
      <View style={styles.actions} pointerEvents="box-none">
        <Pressable accessibilityRole="button" onPress={onDismissTop} style={styles.nextButton}>
          <Text style={styles.nextButtonText}>Suivant</Text>
        </Pressable>
        {lastCard ? (
          <Pressable accessibilityRole="button" onPress={onLastShop} style={styles.shopButton}>
            <Text style={styles.shopButtonText}>Boutique</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 18 },
  stack: { width: CARD_PIXEL_W, height: CARD_PIXEL_H + 31, overflow: 'visible' },
  cardAbs: {
    position: 'absolute',
    left: -36,
    top: -36,
    width: CARD_PIXEL_W + 72,
    height: CARD_PIXEL_H + 48,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  cardBody: { width: CARD_PIXEL_W, height: CARD_PIXEL_H },
  foilHost: {
    width: CARD_PIXEL_W,
    height: CARD_PIXEL_H,
    borderRadius: 12,
    overflow: 'hidden',
    isolation: 'isolate',
  },
  face: { ...StyleSheet.absoluteFillObject },
  back: { width: CARD_PIXEL_W, height: CARD_PIXEL_H, borderRadius: 14 },
  actions: { zIndex: 40, alignItems: 'center', gap: 12 },
  nextButton: { borderColor: colors.gold, borderWidth: 1, borderRadius: 999, paddingHorizontal: 28, paddingVertical: 11, zIndex: 40 },
  nextButtonText: { color: colors.gold, fontSize: 14, fontWeight: '800' },
  shopButton: { backgroundColor: colors.gold, borderRadius: 999, paddingHorizontal: 28, paddingVertical: 11 },
  shopButtonText: { color: '#1a1208', fontSize: 14, fontWeight: '900' },
});
