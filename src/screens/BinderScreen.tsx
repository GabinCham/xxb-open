import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

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

function PageFace({
  page,
  pageIndex,
  onPick,
}: {
  page: (OwnedCard | undefined)[];
  pageIndex: number;
  onPick: (slot: number) => void;
}) {
  return (
    <View style={styles.pockets}>
      <View style={styles.row}>
        <Pocket card={page[0]} onPress={() => onPick(pageIndex * SLOTS)} />
        <Pocket card={page[1]} onPress={() => onPick(pageIndex * SLOTS + 1)} />
      </View>
      <View style={styles.row}>
        <Pocket card={page[2]} onPress={() => onPick(pageIndex * SLOTS + 2)} />
        <Pocket card={page[3]} onPress={() => onPick(pageIndex * SLOTS + 3)} />
      </View>
    </View>
  );
}

function FlippingPage({
  i,
  current,
  turn,
  children,
}: {
  i: number;
  current: SharedValue<number>;
  turn: SharedValue<number>;
  children: ReactNode;
}) {
  const style = useAnimatedStyle(() => {
    let deg = 0;
    if (i < current.value) deg = -180;
    else if (i === current.value) deg = turn.value;
    const lifting = i === current.value && Math.abs(turn.value) > 2;
    return {
      zIndex: i === current.value ? 40 : i < current.value ? 8 + i : 20 - i,
      transform: [{ perspective: 1800 }, { rotateY: `${deg}deg` }],
      boxShadow: lifting ? '12px 8px 28px rgba(0,0,0,0.45)' : '0px 2px 8px rgba(0,0,0,0.2)',
    };
  });

  return (
    <Animated.View pointerEvents="box-none" style={[styles.pageLeaf, style]}>
      <View style={styles.pageFront}>{children}</View>
    </Animated.View>
  );
}

export function BinderScreen() {
  const { collection, binderSlots, pickBinderSlot } = useGame();
  const pages = pagesFromSlots(binderSlots, collection);
  const { width } = useWindowDimensions();
  const stageW = Math.min(width - 16, 720);
  const leafW = Math.min(280, Math.floor(stageW * 0.48));
  const [index, setIndex] = useState(0);
  const current = useSharedValue(0);
  const turn = useSharedValue(0);
  const busy = useSharedValue(0);
  const mode = useSharedValue(0);
  const last = useSharedValue(Math.max(0, pages.length - 1));
  const placed = binderSlots.filter(Boolean).length;

  useEffect(() => {
    last.value = Math.max(0, pages.length - 1);
  }, [last, pages.length]);

  const syncIndex = (next: number) => setIndex(next);

  const pan = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onStart(() => {
      if (!busy.value) mode.value = 0;
    })
    .onUpdate((event) => {
      if (busy.value) return;
      const tx = event.translationX;
      if (mode.value === 0) {
        if (tx < -12 && current.value < last.value) mode.value = 1;
        else if (tx > 12 && current.value > 0) {
          mode.value = 2;
          current.value -= 1;
          turn.value = -180;
        }
      }
      if (mode.value === 1) {
        turn.value = Math.max(-180, Math.min(0, (tx / leafW) * 180));
      }
      if (mode.value === 2) {
        turn.value = Math.min(0, -180 + (tx / leafW) * 180);
      }
    })
    .onEnd(() => {
      if (busy.value) return;
      if (mode.value === 1) {
        if (turn.value < -86) {
          busy.value = 1;
          turn.value = withTiming(-180, { duration: 300, easing: Easing.inOut(Easing.cubic) }, (finished) => {
            if (!finished) return;
            current.value += 1;
            turn.value = 0;
            mode.value = 0;
            busy.value = 0;
            runOnJS(syncIndex)(current.value);
          });
        } else {
          turn.value = withTiming(0, { duration: 220 });
          mode.value = 0;
        }
        return;
      }
      if (mode.value === 2) {
        if (turn.value > -94) {
          busy.value = 1;
          turn.value = withTiming(0, { duration: 300, easing: Easing.inOut(Easing.cubic) }, (finished) => {
            if (!finished) return;
            mode.value = 0;
            busy.value = 0;
            runOnJS(syncIndex)(current.value);
          });
        } else {
          busy.value = 1;
          turn.value = withTiming(-180, { duration: 220, easing: Easing.inOut(Easing.cubic) }, (finished) => {
            if (!finished) return;
            current.value += 1;
            turn.value = 0;
            mode.value = 0;
            busy.value = 0;
            runOnJS(syncIndex)(current.value);
          });
        }
        return;
      }
      turn.value = withTiming(0, { duration: 200 });
    });

  const coverStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1400 }, { rotateY: `${interpolate(current.value, [0, 1], [-8, -18])}deg` }],
  }));

  return (
    <LinearGradient colors={['#1a100c', colors.bg]} style={styles.fill}>
      <View style={styles.header}>
        <Text style={styles.kicker}>ALBUM</Text>
        <Text style={styles.title}>Classeur</Text>
        <Text style={styles.lead}>
          Page {index + 1} / {pages.length}
          {placed ? ' · tire la page vers la gauche pour tourner' : ' · appuie sur une case pour y placer une carte'}
        </Text>
      </View>

      <GestureDetector gesture={pan}>
        <View style={styles.stage}>
          <View style={[styles.binder, { width: Math.min(stageW, leafW * 2 + 28) }]}>
            <Animated.View style={[styles.leftCover, { width: leafW }, coverStyle]}>
              <View style={styles.leftPaper} />
              <View style={[styles.leftPaper, styles.leftPaper2]} />
            </Animated.View>

            <View style={styles.spine}>
              {[0, 1, 2, 3].map((ring) => (
                <View key={ring} style={styles.ring} />
              ))}
            </View>

            <View style={[styles.rightWell, { width: leafW }]}>
              {pages.map((page, i) => (
                <FlippingPage key={i} i={i} current={current} turn={turn}>
                  <PageFace page={page} pageIndex={i} onPick={pickBinderSlot} />
                </FlippingPage>
              ))}
            </View>
          </View>
        </View>
      </GestureDetector>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  kicker: { color: colors.gold, letterSpacing: 2, fontWeight: '800', fontSize: 12 },
  title: { color: colors.white, fontSize: 32, fontWeight: '900', marginTop: 8 },
  lead: { color: colors.muted, marginTop: 8, marginBottom: 8, lineHeight: 22 },
  stage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: TAB_BAR_HEIGHT,
    paddingHorizontal: 8,
  },
  binder: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: 420,
    backgroundColor: '#2a1a12',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#5a3a22',
    overflow: 'hidden',
    padding: 8,
  },
  leftCover: {
    borderRadius: 4,
    backgroundColor: '#3a2418',
    justifyContent: 'center',
    transformOrigin: 'right center',
  },
  leftPaper: {
    position: 'absolute',
    right: 6,
    top: 14,
    bottom: 14,
    left: 18,
    backgroundColor: '#d8cbb8',
    borderRadius: 2,
  },
  leftPaper2: { right: 10, top: 18, bottom: 18, opacity: 0.7 },
  spine: {
    width: 22,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: 28,
  },
  ring: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#c0c4cc',
    backgroundColor: '#6a7080',
  },
  rightWell: {
    position: 'relative',
  },
  pageLeaf: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    transformOrigin: 'left center',
    backfaceVisibility: 'hidden',
  },
  pageFront: {
    flex: 1,
    backgroundColor: '#efe4d2',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#cbb89a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  pockets: { gap: 10 },
  row: { flexDirection: 'row', gap: 10 },
  pocket: {
    width: 108,
    height: 151,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#c4b49a',
    backgroundColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  empty: { color: '#8a7a62', fontSize: 26, fontWeight: '300' },
});
