import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { BOOSTER_SETS } from '../data/sets';
import { useGame } from '../game/GameContext';

const SHOP_BACKGROUND = require('../../assets/grand-line-tcg-shop.png');
const BINDER_IMAGE = require('../../assets/tcg-binder.png');

const FEATURED_BOOSTERS = [
  { id: 'op17', image: require('../../assets/packs/op17.jpg') },
  { id: 'op13-hits', image: require('../../assets/packs/op13.jpg') },
  { id: 'eb01', image: require('../../assets/packs/eb01.jpg') },
] as const;

type Props = { blurred?: boolean };

export function SelectScreen({ blurred = false }: Props) {
  const { remaining, selectSet, grantBooster, setTab } = useGame();
  const { width, height } = useWindowDimensions();
  const empty = remaining <= 0;
  const shopWidth = Math.min(width, height * (2 / 3));
  const shelfStyle = {
    left: (width - shopWidth) / 2 + shopWidth * 0.11,
    top: height * 0.18,
    width: shopWidth * 0.54,
    height: height * 0.14,
  };
  const binderStyle = {
    left: (width - shopWidth) / 2 + shopWidth * 0.64,
    top: height * 0.22,
    width: shopWidth * 0.34,
    height: height * 0.39,
  };

  return (
    <View style={styles.fill}>
      <Image source={SHOP_BACKGROUND} resizeMode="contain" blurRadius={blurred ? 11 : 0} style={styles.shopBackground} />
      <View style={[styles.fill, blurred && styles.nonInteractive]}>
        {blurred ? <View style={styles.dim} /> : null}
        <View style={[styles.shelf, shelfStyle]}>
          {FEATURED_BOOSTERS.map(({ id, image }) => {
            const set = BOOSTER_SETS.find((candidate) => candidate.id === id);
            if (!set) return null;
            return (
              <Pressable
                key={id}
                accessibilityLabel={`Ouvrir ${set.code}`}
                disabled={empty}
                onPress={() => selectSet(id)}
                style={({ pressed }) => [styles.boosterButton, pressed && !empty && styles.pressed, empty && styles.empty]}
              >
                <Image source={image} resizeMode="contain" style={styles.booster} />
              </Pressable>
            );
          })}
        </View>
        {!blurred ? (
          <Pressable
            accessibilityLabel="Ouvrir le classeur"
            onPress={() => setTab('binder')}
            style={({ pressed }) => [styles.binderButton, binderStyle, pressed && styles.binderPressed]}
          >
            <Image source={BINDER_IMAGE} resizeMode="contain" style={styles.binderImage} />
          </Pressable>
        ) : null}
        {!blurred && empty ? (
          <Pressable style={styles.refill} onPress={grantBooster}>
            <Text style={styles.refillText}>Recevoir un booster</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  shopBackground: { ...StyleSheet.absoluteFill, width: '100%', height: '100%', backgroundColor: '#130b08' },
  nonInteractive: { pointerEvents: 'none' },
  dim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(10, 5, 4, 0.35)' },
  shelf: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingBottom: '3%',
  },
  boosterButton: { width: '25%', height: '94%', alignItems: 'center', justifyContent: 'flex-end' },
  booster: { width: '100%', height: '88%' },
  pressed: { transform: [{ scale: 0.94 }] },
  binderButton: { position: 'absolute', borderRadius: 20 },
  binderImage: { width: '100%', height: '100%' },
  binderPressed: { backgroundColor: 'rgba(255, 211, 112, 0.12)' },
  empty: { opacity: 0.38 },
  refill: {
    position: 'absolute', top: '45%', left: '12%', backgroundColor: '#f3c66d', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9,
  },
  refillText: { color: '#301506', fontWeight: '900', fontSize: 12 },
});
