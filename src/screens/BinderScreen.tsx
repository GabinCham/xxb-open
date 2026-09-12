import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
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
const CARD_W = 108;
const CARD_H = 151;
const GAP = 10;
const PAD = 12;
const PAGE_W = CARD_W * 2 + GAP + PAD * 2;
const PAGE_H = CARD_H * 2 + GAP + PAD * 2;
const SPINE = 26;
const PEEK = 56;

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
  page?: (OwnedCard | undefined)[];
  pageIndex: number;
  onPick: (slot: number) => void;
}) {
  const slots = page ?? [undefined, undefined, undefined, undefined];
  return (
    <View style={styles.pageFace}>
      <View style={styles.row}>
        <Pocket card={slots[0]} onPress={() => onPick(pageIndex * SLOTS)} />
        <Pocket card={slots[1]} onPress={() => onPick(pageIndex * SLOTS + 1)} />
      </View>
      <View style={styles.row}>
        <Pocket card={slots[2]} onPress={() => onPick(pageIndex * SLOTS + 2)} />
        <Pocket card={slots[3]} onPress={() => onPick(pageIndex * SLOTS + 3)} />
      </View>
    </View>
  );
}

function ScaledPage({
  scale,
  children,
}: {
  scale: number;
  children: ReactNode;
}) {
  return (
    <View style={{ width: PAGE_W * scale, height: PAGE_H * scale, overflow: 'hidden' }}>
      <View
        style={{
          width: PAGE_W,
          height: PAGE_H,
          transform: [{ scale }],
          transformOrigin: '0px 0px',
        }}
      >
        {children}
      </View>
    </View>
  );
}

function TurningLeaf({
  turn,
  mode,
  children,
}: {
  turn: SharedValue<number>;
  mode: SharedValue<number>;
  children: ReactNode;
}) {
  const style = useAnimatedStyle(() => {
    const flipping = mode.value === 1;
    const angle = flipping ? turn.value : 0;
    return {
      transform: [{ perspective: 1600 }, { rotateY: `${angle}deg` }],
      zIndex: mode.value === 2 ? 0 : 30,
      opacity: mode.value === 2 ? 0 : 1,
      boxShadow: Math.abs(angle) > 2 ? '10px 6px 24px rgba(0,0,0,0.4)' : 'none',
    };
  });
  return <Animated.View style={[styles.turnLeaf, style]}>{children}</Animated.View>;
}

export function BinderScreen() {
  const { collection, binderSlots, pickBinderSlot } = useGame();
  const pages = pagesFromSlots(binderSlots, collection);
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const current = useSharedValue(0);
  const turn = useSharedValue(0);
  const busy = useSharedValue(0);
  const mode = useSharedValue(0);
  const lastLeft = useSharedValue(Math.max(0, pages.length - 1));

  const availW = width - 28;
  const availH = height - 210 - TAB_BAR_HEIGHT;
  const spreadW = PAGE_W * 2 + SPINE;
  const scale = Math.min(1, availW / spreadW, availH / PAGE_H);
  const leafW = PAGE_W * scale;
  const leafH = PAGE_H * scale;
  const spineW = SPINE * scale;
  const leftover = availW - (leafW * 2 + spineW);
  const peekW = Math.min(PEEK * scale, Math.max(0, leftover - 12));

  useEffect(() => {
    const max = Math.max(0, pages.length - 1);
    lastLeft.value = max;
    if (index > max) {
      setIndex(max);
      current.value = max;
    }
  }, [current, index, lastLeft, pages.length]);

  const leftPage = pages[index];
  const rightPage = pages[index + 1];
  const peekPage = peekW >= 28 ? pages[index + 2] : undefined;

  const syncIndex = (next: number) => setIndex(next);

  const pan = Gesture.Pan()
    .activeOffsetX([-18, 18])
    .onStart(() => {
      if (!busy.value) mode.value = 0;
    })
    .onUpdate((event) => {
      if (busy.value) return;
      const tx = event.translationX;
      if (mode.value === 0) {
        if (tx < -12 && current.value < lastLeft.value) mode.value = 1;
        else if (tx > 12 && current.value > 0) mode.value = 2;
      }
      if (mode.value === 1) {
        turn.value = Math.max(-180, Math.min(0, (tx / leafW) * 180));
      }
      if (mode.value === 2) {
        turn.value = Math.min(180, Math.max(0, (tx / leafW) * 180));
      }
    })
    .onEnd(() => {
      if (busy.value) return;
      if (mode.value === 1) {
        if (turn.value < -86) {
          busy.value = 1;
          turn.value = withTiming(-180, { duration: 320, easing: Easing.inOut(Easing.cubic) }, (finished) => {
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
        if (turn.value > 86) {
          busy.value = 1;
          turn.value = withTiming(180, { duration: 320, easing: Easing.inOut(Easing.cubic) }, (finished) => {
            if (!finished) return;
            current.value -= 1;
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
      turn.value = withTiming(0, { duration: 200 });
    });

  const backTurnStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1600 }, { rotateY: `${-180 + turn.value}deg` }],
    zIndex: mode.value === 2 ? 32 : 0,
    opacity: mode.value === 2 ? 1 : 0,
  }));

  return (
    <LinearGradient colors={['#1a100c', colors.bg]} style={styles.fill}>
      <View style={styles.header}>
        <Text style={styles.kicker}>ALBUM</Text>
        <Text style={styles.title}>Classeur</Text>
        <Text style={styles.lead}>
          Pages {index + 1}
          {rightPage ? `–${index + 2}` : ''} / {pages.length} · tire la page de droite vers la gauche
        </Text>
      </View>

      <GestureDetector gesture={pan}>
        <View style={styles.stage}>
          <View
            style={[
              styles.binder,
              {
                width: leafW * 2 + spineW + (peekPage ? peekW + 4 : 0) + 16,
                height: leafH + 20,
              },
            ]}
          >
            <View style={[styles.leafShell, { width: leafW, height: leafH }]}>
              <ScaledPage scale={scale}>
                <PageFace page={leftPage} pageIndex={index} onPick={pickBinderSlot} />
              </ScaledPage>
            </View>

            <View style={[styles.spine, { width: spineW }]}>
              {[0, 1, 2, 3].map((ring) => (
                <View key={ring} style={styles.ring} />
              ))}
            </View>

            <View style={[styles.rightStack, { width: leafW, height: leafH }]}>
              <View pointerEvents="none" style={[styles.leafShell, { width: leafW, height: leafH }]}>
                <ScaledPage scale={scale}>
                  <PageFace page={pages[index + 2]} pageIndex={index + 2} onPick={pickBinderSlot} />
                </ScaledPage>
              </View>

              <TurningLeaf turn={turn} mode={mode}>
                <View style={[styles.leafShell, { width: leafW, height: leafH }]}>
                  <ScaledPage scale={scale}>
                    <PageFace page={rightPage} pageIndex={index + 1} onPick={pickBinderSlot} />
                  </ScaledPage>
                </View>
              </TurningLeaf>

              <Animated.View pointerEvents="none" style={[styles.turnLeaf, backTurnStyle]}>
                <ScaledPage scale={scale}>
                  <PageFace page={leftPage} pageIndex={index} onPick={pickBinderSlot} />
                </ScaledPage>
              </Animated.View>
            </View>

            {peekPage ? (
              <View style={[styles.peek, { width: peekW, height: leafH }]}>
                <ScaledPage scale={scale}>
                  <PageFace page={peekPage} pageIndex={index + 2} onPick={pickBinderSlot} />
                </ScaledPage>
              </View>
            ) : null}
          </View>
        </View>
      </GestureDetector>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    paddingTop: 52,
    paddingHorizontal: 20,
    maxWidth: 900,
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
  },
  binder: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a1a12',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#5a3a22',
    padding: 8,
    overflow: 'visible',
  },
  leafShell: {
    overflow: 'visible',
    backgroundColor: '#efe4d2',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#cbb89a',
  },
  rightStack: { position: 'relative' },
  turnLeaf: {
    position: 'absolute',
    top: 0,
    left: 0,
    transformOrigin: 'left center',
    backfaceVisibility: 'hidden',
  },
  peek: {
    overflow: 'hidden',
    marginLeft: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#cbb89a',
    backgroundColor: '#efe4d2',
    opacity: 0.92,
    pointerEvents: 'none',
  },
  spine: {
    height: '100%',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: 20,
  },
  ring: {
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#c0c4cc',
    backgroundColor: '#6a7080',
  },
  pageFace: {
    width: PAGE_W,
    height: PAGE_H,
    padding: PAD,
    gap: GAP,
    backgroundColor: '#efe4d2',
  },
  row: { flexDirection: 'row', gap: GAP },
  pocket: {
    width: CARD_W,
    height: CARD_H,
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
