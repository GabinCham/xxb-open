import { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import type { PulledCard } from '../data/types';
import { colorInk, rarityStyle } from '../theme';

type Props = {
  card: PulledCard;
  compact?: boolean;
};

export function TradingCard({ card, compact }: Props) {
  const [failed, setFailed] = useState(!card.imageUrl);
  const [loaded, setLoaded] = useState(false);
  const ink = colorInk[card.color];
  const rare = rarityStyle[card.variantLabel ?? card.rarity] ?? rarityStyle[card.rarity];
  const width = compact ? 108 : 250;
  const height = compact ? 151 : 349;

  if (!failed && card.imageUrl) {
    return (
      <View style={[styles.shadow, { width, height, shadowColor: rare.tint }]}>
        {!loaded ? (
          <View style={[styles.boot, { width, height }]}>
            <ActivityIndicator color={rare.tint} />
          </View>
        ) : null}
        <Image
          source={{ uri: card.imageUrl }}
          style={[styles.photo, { width, height }, !loaded && styles.hidden]}
          resizeMode="contain"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
        {card.variantLabel ? (
          <View style={[styles.badge, { backgroundColor: rare.tint }, compact && styles.badgeCompact]}>
            <Text style={[styles.badgeText, compact && styles.badgeTextCompact]}>{card.variantLabel}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.shadow, { width, height, shadowColor: rare.glow === 'transparent' ? '#000' : rare.tint }]}>
      <LinearGradient colors={[ink.from, '#0b0b10', ink.to]} style={styles.card}>
        <View style={[styles.frame, { borderColor: rare.tint }]}>
          <View style={styles.topRow}>
            <View style={styles.cost}>
              <Text style={styles.costText}>{card.cost}</Text>
            </View>
            <Text style={[styles.rarity, { color: rare.tint }]}>{card.rarity}</Text>
            <Text style={styles.kind}>{card.kind}</Text>
          </View>
          <LinearGradient colors={[ink.to, ink.from]} style={styles.art}>
            <Text style={[styles.motif, compact && styles.motifCompact]}>{card.motif}</Text>
          </LinearGradient>
          <Text numberOfLines={1} style={[styles.name, compact && styles.nameCompact]}>
            {card.name}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: 12,
    shadowOpacity: 0.55,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 16,
    backgroundColor: '#0b0b10',
  },
  photo: { borderRadius: 12 },
  badge: {
    position: 'absolute',
    right: 8,
    top: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeCompact: { right: 4, top: 4, paddingHorizontal: 5, paddingVertical: 2 },
  badgeText: { color: '#140c04', fontWeight: '900', fontSize: 11, letterSpacing: 0.6 },
  badgeTextCompact: { fontSize: 8 },
  hidden: { opacity: 0, position: 'absolute' },
  boot: { alignItems: 'center', justifyContent: 'center', position: 'absolute' },
  card: { flex: 1, borderRadius: 12, padding: 8 },
  frame: { flex: 1, borderWidth: 2, borderRadius: 10, padding: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cost: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f4ead2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  costText: { fontWeight: '900', color: '#1a1208' },
  rarity: { fontWeight: '900', letterSpacing: 1 },
  kind: { marginLeft: 'auto', color: '#d8d0c0', fontSize: 11, textTransform: 'uppercase' },
  art: { flex: 1, marginVertical: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  motif: { fontSize: 84 },
  motifCompact: { fontSize: 36 },
  name: { color: '#fff8ea', fontSize: 16, fontWeight: '800' },
  nameCompact: { fontSize: 11 },
});
