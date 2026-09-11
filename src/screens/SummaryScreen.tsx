import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { TradingCard } from '../components/TradingCard';
import { useGame } from '../game/GameContext';
import { rarityStyle, colors } from '../theme';

function hitLabel(card: { rarity: string; variantLabel?: string; name: string }) {
  if (card.variantLabel) return `${card.variantLabel} ${card.name}`;
  if (['SR', 'SEC', 'L', 'SP', 'TR'].includes(card.rarity)) return `${card.rarity} ${card.name}`;
  return null;
}

function tone(card: { rarity: string; variantLabel?: string }) {
  return (rarityStyle[card.variantLabel ?? ''] ?? rarityStyle[card.rarity] ?? rarityStyle.R).tint;
}

export function SummaryScreen() {
  const { pulls, selectedSet, goHome, goLibrary } = useGame();
  const hits = pulls.map(hitLabel).filter((label): label is string => Boolean(label));

  return (
    <LinearGradient colors={['#12080c', colors.bg]} style={styles.fill}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>{selectedSet?.code} · OUVERT</Text>
        <Text style={styles.title}>Tes cartes</Text>
        <Text style={styles.lead}>
          {hits.length ? `Hit : ${hits.join(' · ')}` : 'Un tirage solide. Reviens quand tu auras un nouveau booster.'}
        </Text>

        <View style={styles.grid}>
          {pulls.map((card) => (
            <View key={card.pullId} style={styles.cell}>
              <TradingCard card={card} compact />
              <Text style={[styles.rare, { color: tone(card) }]}>{card.variantLabel ?? card.rarity}</Text>
            </View>
          ))}
        </View>

        <Pressable style={styles.cta} onPress={goHome}>
          <Text style={styles.ctaText}>Retour aux boosters</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={goLibrary}>
          <Text style={styles.secondaryText}>Voir la bibliothèque</Text>
        </Pressable>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: {
    paddingTop: 64,
    paddingBottom: 48,
    paddingHorizontal: 16,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  kicker: { color: colors.gold, letterSpacing: 2, fontWeight: '800', fontSize: 12 },
  title: { color: colors.white, fontSize: 32, fontWeight: '900', marginTop: 8 },
  lead: { color: colors.muted, marginTop: 8, marginBottom: 24, lineHeight: 22 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  cell: { alignItems: 'center', gap: 6 },
  rare: { fontWeight: '800', fontSize: 11 },
  cta: {
    marginTop: 28,
    alignSelf: 'center',
    backgroundColor: colors.gold,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
  },
  ctaText: { color: '#1a1208', fontWeight: '800', fontSize: 16 },
  secondary: { marginTop: 12, alignSelf: 'center', paddingVertical: 10 },
  secondaryText: { color: colors.gold, fontWeight: '700', fontSize: 15 },
});
