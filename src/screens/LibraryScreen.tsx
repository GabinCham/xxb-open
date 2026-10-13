import { useMemo, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_HEIGHT } from '../components/TabBar';
import { TradingCard } from '../components/TradingCard';
import { formatBerries } from '../data/berries';
import { collectionStats } from '../data/collection';
import { cardSellKey, SELL_RARITIES, sellableCount, sellPrice } from '../data/sell';
import { useGame } from '../game/GameContext';
import { colors } from '../theme';

export function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const { collection, pickSlot, binderSlots, placeBinderCard, clearBinderSlot, selling, sellCards, setTab } = useGame();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [soldNote, setSoldNote] = useState('');
  const stats = collectionStats(collection);
  const picking = pickSlot != null;
  const placed = new Set(binderSlots.filter(Boolean));
  const reserved = useMemo(() => {
    const map = new Map<string, number>();
    for (const id of binderSlots) if (id) map.set(id, 1);
    return map;
  }, [binderSlots]);

  const selectedPayout = useMemo(() => {
    let copies = 0;
    let berries = 0;
    for (const card of collection) {
      if (!selected.has(card.id)) continue;
      const take = sellableCount(card, reserved.get(card.id) ?? 0);
      copies += take;
      berries += take * sellPrice(card);
    }
    return { copies, berries };
  }, [collection, reserved, selected]);

  const rarityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const card of collection) {
      const take = sellableCount(card, reserved.get(card.id) ?? 0);
      if (take <= 0) continue;
      const key = cardSellKey(card);
      counts[key] = (counts[key] ?? 0) + take;
    }
    return counts;
  }, [collection, reserved]);

  const toggleCard = (id: string) => {
    setSoldNote('');
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sellIds = (ids: string[]) => {
    const payout = sellCards(ids);
    setSelected(new Set());
    if (payout > 0) setSoldNote(`+${formatBerries(payout)} Berrys`);
  };

  const sellRarity = (rarity: string) => {
    sellIds(collection.filter((card) => cardSellKey(card) === rarity).map((card) => card.id));
  };

  return (
    <LinearGradient colors={['#12080c', colors.bg]} style={styles.fill}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, 12) + 36, paddingBottom: TAB_BAR_HEIGHT + insets.bottom + (selling ? 118 : 24) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>{picking ? 'CLASSEUR' : selling ? 'VENTE' : 'COLLECTION'}</Text>
        <Text style={styles.title}>{picking ? 'Choisir une carte' : selling ? 'Vendre des cartes' : 'Bibliothèque'}</Text>
        <Text style={styles.lead}>
          {picking
            ? collection.length
              ? 'Touche une carte pour la placer dans la case choisie.'
              : 'Aucune carte en bibliothèque. Ouvre d’abord un booster.'
            : selling
              ? 'Touche les cartes à vendre. Les exemplaires du classeur sont gardés.'
              : stats.unique
                ? `${stats.unique} carte${stats.unique > 1 ? 's' : ''} unique${stats.unique > 1 ? 's' : ''} · ${stats.total} en tout`
                : 'Aucune carte pour l’instant. Ouvre un booster pour commencer.'}
        </Text>

        {picking && pickSlot != null && binderSlots[pickSlot] ? (
          <Pressable style={styles.clear} onPress={clearBinderSlot}>
            <Text style={styles.clearText}>Vider cet emplacement</Text>
          </Pressable>
        ) : null}

        {selling ? (
          <View style={styles.bulkRow}>
            {SELL_RARITIES.map((rarity) => {
              const count = rarityCounts[rarity] ?? 0;
              return (
                <Pressable
                  key={rarity}
                  disabled={count === 0}
                  onPress={() => sellRarity(rarity)}
                  style={[styles.bulk, count === 0 && styles.bulkOff]}
                >
                  <Text style={styles.bulkTitle}>Toutes les {rarity}</Text>
                  <Text style={styles.bulkMeta}>{count} · +{formatBerries(count * sellPrice({ rarity }))}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {soldNote ? <Text style={styles.soldNote}>{soldNote}</Text> : null}

        <View style={styles.grid}>
          {collection.map((card) => {
            const extras = sellableCount(card, reserved.get(card.id) ?? 0);
            const chosen = selling && selected.has(card.id);
            return (
              <Pressable
                key={card.id}
                disabled={!picking && !(selling && extras > 0)}
                onPress={() => (picking ? placeBinderCard(card.id) : toggleCard(card.id))}
                style={[styles.cell, picking && placed.has(card.id) && styles.placed, chosen && styles.chosen]}
              >
                <TradingCard card={{ ...card, pullId: card.id }} compact count={card.count} />
                {picking && placed.has(card.id) ? <Text style={styles.inBinder}>Dans le classeur</Text> : null}
                {selling ? (
                  <Text style={styles.sellPrice}>
                    {extras > 0 ? `${formatBerries(sellPrice(card))} · ×${extras}` : 'Dans le classeur'}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {selling ? (
        <View style={[styles.sellBar, { bottom: TAB_BAR_HEIGHT + insets.bottom }]}>
          <Pressable onPress={() => setTab('boosters')} style={styles.cancel}>
            <Text style={styles.cancelText}>Retour boutique</Text>
          </Pressable>
          <Pressable
            disabled={selectedPayout.copies === 0}
            onPress={() => sellIds([...selected])}
            style={[styles.sellNow, selectedPayout.copies === 0 && styles.sellNowOff]}
          >
            <Text style={styles.sellNowText}>
              {selectedPayout.copies
                ? `Vendre ${selectedPayout.copies} · +${formatBerries(selectedPayout.berries)}`
                : 'Choisir des cartes'}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: {
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
  bulkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  bulk: {
    backgroundColor: 'rgba(40, 22, 10, 0.9)',
    borderColor: colors.goldDim,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 92,
  },
  bulkOff: { opacity: 0.38 },
  bulkTitle: { color: colors.gold, fontWeight: '900', fontSize: 12 },
  bulkMeta: { color: colors.muted, fontSize: 11, marginTop: 2 },
  soldNote: { color: '#7ed0a1', fontWeight: '800', marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  cell: { alignItems: 'center' },
  placed: { opacity: 0.72 },
  chosen: { borderWidth: 2, borderColor: colors.gold, borderRadius: 10, padding: 4 },
  inBinder: { color: colors.goldDim, fontSize: 11, marginTop: 6, fontWeight: '700' },
  sellPrice: { color: colors.gold, fontSize: 11, marginTop: 6, fontWeight: '700' },
  sellBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(12, 7, 5, 0.94)',
    borderTopWidth: 1,
    borderTopColor: '#80642c',
  },
  cancel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.goldDim,
    borderRadius: 12,
    paddingVertical: 12,
  },
  cancelText: { color: colors.gold, fontWeight: '800' },
  sellNow: {
    flex: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gold,
    borderRadius: 12,
    paddingVertical: 12,
  },
  sellNowOff: { opacity: 0.4 },
  sellNowText: { color: '#1a1208', fontWeight: '900' },
});
