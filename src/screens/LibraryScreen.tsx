import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { TAB_BAR_HEIGHT } from '../components/TabBar';
import { TradingCard } from '../components/TradingCard';
import { collectionStats } from '../data/collection';
import { useGame } from '../game/GameContext';
import { colors } from '../theme';

export function LibraryScreen() {
  const { collection, pickSlot, binderSlots, placeBinderCard, clearBinderSlot } = useGame();
  const stats = collectionStats(collection);
  const picking = pickSlot != null;
  const placed = new Set(binderSlots.filter(Boolean));

  return (
    <LinearGradient colors={['#12080c', colors.bg]} style={styles.fill}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>{picking ? 'CLASSEUR' : 'COLLECTION'}</Text>
        <Text style={styles.title}>{picking ? 'Choisir une carte' : 'Bibliothèque'}</Text>
        <Text style={styles.lead}>
          {picking
            ? collection.length
              ? 'Touche une carte pour la placer dans la case choisie.'
              : 'Aucune carte en bibliothèque. Ouvre d’abord un booster.'
            : stats.unique
              ? `${stats.unique} carte${stats.unique > 1 ? 's' : ''} unique${stats.unique > 1 ? 's' : ''} · ${stats.total} en tout`
              : 'Aucune carte pour l’instant. Ouvre un booster pour commencer.'}
        </Text>

        {picking && pickSlot != null && binderSlots[pickSlot] ? (
          <Pressable style={styles.clear} onPress={clearBinderSlot}>
            <Text style={styles.clearText}>Vider cet emplacement</Text>
          </Pressable>
        ) : null}

        <View style={styles.grid}>
          {collection.map((card) => (
            <Pressable
              key={card.id}
              disabled={!picking}
              onPress={() => placeBinderCard(card.id)}
              style={[styles.cell, picking && placed.has(card.id) && styles.placed]}
            >
              <TradingCard card={{ ...card, pullId: card.id }} compact count={card.count} />
              {picking && placed.has(card.id) ? <Text style={styles.inBinder}>Dans le classeur</Text> : null}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: {
    paddingTop: 56,
    paddingBottom: TAB_BAR_HEIGHT + 24,
    paddingHorizontal: 16,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  kicker: { color: colors.gold, letterSpacing: 2, fontWeight: '800', fontSize: 12 },
  title: { color: colors.white, fontSize: 32, fontWeight: '900', marginTop: 8 },
  lead: { color: colors.muted, marginTop: 8, marginBottom: 24, lineHeight: 22 },
  clear: {
    alignSelf: 'flex-start',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.goldDim,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  clearText: { color: colors.gold, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  cell: { alignItems: 'center' },
  placed: { opacity: 0.72 },
  inBinder: { color: colors.goldDim, fontSize: 11, marginTop: 6, fontWeight: '700' },
});
