import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { TAB_BAR_HEIGHT } from '../components/TabBar';
import { TradingCard } from '../components/TradingCard';
import type { OwnedCard } from '../data/collection';
import { useGame } from '../game/GameContext';
import { colors } from '../theme';

const SLOTS = 4;

function pagesFromSlots(slots: (string | null)[], collection: OwnedCard[]) {
  const byId = new Map(collection.map((card) => [card.id, card]));
  const pages: (OwnedCard | undefined)[][] = [];
  const list = slots.length ? slots : [null, null, null, null];
  for (let i = 0; i < list.length; i += SLOTS) {
    pages.push(list.slice(i, i + SLOTS).map((id) => (id ? byId.get(id) : undefined)));
  }
  return pages;
}

function Pocket({ card, onPress }: { card?: OwnedCard; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.pocket}>
      {card ? <TradingCard card={{ ...card, pullId: card.id }} compact count={card.count} /> : <Text style={styles.empty}>+</Text>}
    </Pressable>
  );
}

export function BinderScreen() {
  const { collection, binderSlots, pickBinderSlot } = useGame();
  const pages = pagesFromSlots(binderSlots, collection);
  const { width } = useWindowDimensions();
  const pageWidth = Math.min(width, 760);
  const [index, setIndex] = useState(0);
  const x = useSharedValue(0);
  const startX = useSharedValue(0);
  const last = pages.length - 1;
  const placed = binderSlots.filter(Boolean).length;

  const pan = Gesture.Pan()
    .activeOffsetX([-24, 24])
    .onStart(() => {
      startX.value = x.value;
    })
    .onUpdate((event) => {
      x.value = startX.value + event.translationX;
    })
    .onEnd((event) => {
      const raw = -(startX.value + event.translationX) / pageWidth;
      let next = Math.round(raw);
      if (event.velocityX < -550) next = Math.floor(-startX.value / pageWidth) + 1;
      if (event.velocityX > 550) next = Math.ceil(-startX.value / pageWidth) - 1;
      if (next < 0) next = 0;
      if (next > last) next = last;
      x.value = withTiming(-next * pageWidth, { duration: 240 });
      runOnJS(setIndex)(next);
    });

  const stripStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  return (
    <LinearGradient colors={['#10080c', colors.bg]} style={styles.fill}>
      <View style={styles.header}>
        <Text style={styles.kicker}>ALBUM</Text>
        <Text style={styles.title}>Classeur</Text>
        <Text style={styles.lead}>
          {placed
            ? `Page ${index + 1} / ${pages.length} · appuie sur une case pour y placer une carte`
            : 'Appuie sur une case vide, puis choisis une carte dans la bibliothèque.'}
        </Text>
      </View>

      <GestureDetector gesture={pan}>
        <View style={[styles.viewport, { width: pageWidth }]}>
          <Animated.View style={[styles.strip, { width: pageWidth * pages.length }, stripStyle]}>
            {pages.map((page, pageIndex) => (
              <View key={pageIndex} style={[styles.sheet, { width: pageWidth }]}>
                <View style={styles.pockets}>
                  <View style={styles.row}>
                    <Pocket card={page[0]} onPress={() => pickBinderSlot(pageIndex * SLOTS)} />
                    <Pocket card={page[1]} onPress={() => pickBinderSlot(pageIndex * SLOTS + 1)} />
                  </View>
                  <View style={styles.row}>
                    <Pocket card={page[2]} onPress={() => pickBinderSlot(pageIndex * SLOTS + 2)} />
                    <Pocket card={page[3]} onPress={() => pickBinderSlot(pageIndex * SLOTS + 3)} />
                  </View>
                </View>
              </View>
            ))}
          </Animated.View>
        </View>
      </GestureDetector>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    paddingTop: 64,
    paddingHorizontal: 20,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  kicker: { color: colors.gold, letterSpacing: 2, fontWeight: '800', fontSize: 12 },
  title: { color: colors.white, fontSize: 32, fontWeight: '900', marginTop: 8 },
  lead: { color: colors.muted, marginTop: 8, marginBottom: 16, lineHeight: 22 },
  viewport: {
    flex: 1,
    alignSelf: 'center',
    overflow: 'hidden',
    marginBottom: TAB_BAR_HEIGHT,
  },
  strip: { flex: 1, flexDirection: 'row' },
  sheet: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 12,
    justifyContent: 'center',
  },
  pockets: {
    alignSelf: 'center',
    backgroundColor: '#16120e',
    borderWidth: 1,
    borderColor: '#3a3228',
    borderRadius: 16,
    padding: 12,
    gap: 12,
  },
  row: { flexDirection: 'row', gap: 12 },
  pocket: {
    width: 108,
    height: 151,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a241c',
    backgroundColor: '#0c0a08',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  empty: { color: colors.goldDim, fontSize: 28, fontWeight: '300' },
});
