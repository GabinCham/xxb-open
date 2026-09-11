import * as Haptics from 'expo-haptics';
import { Platform, StyleSheet, Text, Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { PulledCard } from '../data/types';
import { colors } from '../theme';
import { TradingCard } from './TradingCard';

type Props = {
  cards: PulledCard[];
  onDismissTop: () => void;
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

  const pan = Gesture.Pan()
    .enabled(active)
    .onUpdate((event) => {
      x.value = event.translationX;
      y.value = event.translationY;
    })
    .onEnd((event) => {
      const shouldFly =
        Math.abs(event.translationX) > 90 ||
        Math.abs(event.velocityX) > 850 ||
        Math.abs(event.translationY) > 140;

      if (shouldFly) {
        const dirX = event.translationX === 0 ? (event.velocityX >= 0 ? 1 : -1) : Math.sign(event.translationX);
        runOnJS(buzz)();
        x.value = withTiming(dirX * 620, { duration: 240 });
        y.value = withTiming(event.translationY * 1.4, { duration: 240 }, (finished) => {
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
      { scale: 1 - index * 0.035 },
      { rotate: `${interpolate(x.value, [-200, 0, 200], [-14, 0, 14])}deg` },
    ],
    zIndex: 40 - index,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.cardAbs, style]} pointerEvents={active ? 'auto' : 'none'}>
        <TradingCard card={card} />
      </Animated.View>
    </GestureDetector>
  );
}

export function CardStack({ cards, onDismissTop }: Props) {
  const visible = cards.slice(0, 4);

  return (
    <View style={styles.wrap}>
      <Text style={styles.counter}>
        {cards.length} carte{cards.length > 1 ? 's' : ''}
      </Text>
      <View style={styles.stack}>
        {visible
          .map((card, index) => (
            <StackCard key={card.pullId} card={card} index={index} active={index === 0} onDismiss={onDismissTop} />
          ))
          .reverse()}
      </View>
      <Text style={styles.hint}>Glisse avec le doigt pour faire partir la carte</Text>
      <Pressable onPress={onDismissTop}>
        <Text style={styles.alt}>Ou appuie ici pour envoyer la carte du dessus</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 18 },
  counter: { color: colors.gold, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  stack: { width: 250, height: 380 },
  cardAbs: { position: 'absolute', left: 0, top: 0 },
  hint: { color: colors.muted, fontSize: 14, textAlign: 'center', paddingHorizontal: 24 },
  alt: { color: colors.goldDim, fontSize: 13, textDecorationLine: 'underline' },
});
