import { useMemo, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackToShopButton } from '../components/BackToShopButton';
import { CardInspectModal } from '../components/CardInspectModal';
import { TAB_BAR_HEIGHT } from '../components/TabBar';
import { TradingCard } from '../components/TradingCard';
import { formatBerries } from '../data/berries';
import { collectionStats, type OwnedCard } from '../data/collection';
import { cardSellKey, SELL_RARITIES, sellableCount, sellPrice } from '../data/sell';
import { useGame } from '../game/GameContext';
import { colors } from '../theme';

export function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const { collection, pickSlot, binderSlots, placeBinderCard, clearBinderSlot, selling, sellCards, setTab } = useGame();
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [qtyCard, setQtyCard] = useState<{ card: OwnedCard; max: number; qty: number } | null>(null);
  const [inspectCard, setInspectCard] = useState<OwnedCard | null>(null);
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
      const take = Math.min(selected[card.id] ?? 0, sellableCount(card, reserved.get(card.id) ?? 0));
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

  const pickSellCard = (card: OwnedCard, extras: number) => {
    setSoldNote('');
    if (selected[card.id]) {
      setSelected((current) => {
        const next = { ...current };
        delete next[card.id];
        return next;
      });
      return;
    }
    if (extras > 1) {
      setQtyCard({ card, max: extras, qty: 1 });
      return;
    }
    setSelected((current) => ({ ...current, [card.id]: 1 }));
  };

  const confirmQty = () => {
    if (!qtyCard) return;
    const take = Math.max(1, Math.min(qtyCard.max, qtyCard.qty));
    setSelected((current) => ({ ...current, [qtyCard.card.id]: take }));
    setQtyCard(null);
  };

  const sellAmounts = (amounts: Record<string, number>) => {
    const payout = sellCards(amounts);
    setSelected({});
    setQtyCard(null);
    if (payout > 0) setSoldNote(`+${formatBerries(payout)} Berrys`);
  };

  const sellRarity = (rarity: string) => {
    const amounts: Record<string, number> = {};
    for (const card of collection) {
      if (cardSellKey(card) !== rarity) continue;
      const take = sellableCount(card, reserved.get(card.id) ?? 0);
      if (take > 0) amounts[card.id] = take;
    }
    sellAmounts(amounts);
  };

  return (
    <LinearGradient colors={['#12080c', colors.bg]} style={styles.fill}>
      {selling ? <BackToShopButton onPress={() => setTab('boosters')} /> : null}
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, 12) + (selling ? 58 : 36), paddingBottom: TAB_BAR_HEIGHT + insets.bottom + (selling && selectedPayout.copies ? 96 : 24) },
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
            const chosenQty = selling ? selected[card.id] ?? 0 : 0;
            return (
              <Pressable
                key={card.id}
                disabled={selling && extras <= 0}
                onPress={() => {
                  if (picking) {
                    placeBinderCard(card.id);
                    return;
                  }
                  if (selling) {
                    pickSellCard(card, extras);
                    return;
                  }
                  setInspectCard(card);
                }}
                style={[styles.cell, picking && placed.has(card.id) && styles.placed, chosenQty > 0 && styles.chosen]}
              >
                <TradingCard card={{ ...card, pullId: card.id }} compact count={card.count} />
                {picking && placed.has(card.id) ? <Text style={styles.inBinder}>Dans le classeur</Text> : null}
                {selling ? (
                  <Text style={styles.sellPrice}>
                    {extras > 0
                      ? `${formatBerries(sellPrice(card))} · ×${chosenQty || extras}`
                      : 'Dans le classeur'}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {selling && selectedPayout.copies ? (
        <Pressable
          onPress={() => sellAmounts(selected)}
          style={[styles.sellNow, { bottom: TAB_BAR_HEIGHT + insets.bottom + 12 }]}
        >
          <Text style={styles.sellNowText}>
            Vendre {selectedPayout.copies} · +{formatBerries(selectedPayout.berries)}
          </Text>
        </Pressable>
      ) : null}

      <CardInspectModal
        card={inspectCard ? { ...inspectCard, pullId: inspectCard.id } : null}
        onClose={() => setInspectCard(null)}
      />

      <Modal transparent visible={qtyCard != null} animationType="fade" onRequestClose={() => setQtyCard(null)}>
        <Pressable style={styles.qtyBackdrop} onPress={() => setQtyCard(null)}>
          <Pressable style={styles.qtyCard} onPress={() => {}}>
            <Text style={styles.qtyTitle}>Combien en vendre ?</Text>
            <Text style={styles.qtyName} numberOfLines={2}>{qtyCard?.card.name}</Text>
            <Text style={styles.qtyMeta}>{qtyCard?.max} exemplaire{(qtyCard?.max ?? 0) > 1 ? 's' : ''} vendable{(qtyCard?.max ?? 0) > 1 ? 's' : ''}</Text>
            <View style={styles.qtyRow}>
              <Pressable
                style={styles.qtyStep}
                onPress={() => setQtyCard((current) => current ? { ...current, qty: Math.max(1, current.qty - 1) } : current)}
              >
                <Text style={styles.qtyStepText}>−</Text>
              </Pressable>
              <Text style={styles.qtyValue}>{qtyCard?.qty}</Text>
              <Pressable
                style={styles.qtyStep}
                onPress={() => setQtyCard((current) => current ? { ...current, qty: Math.min(current.max, current.qty + 1) } : current)}
              >
                <Text style={styles.qtyStepText}>+</Text>
              </Pressable>
            </View>
            <Text style={styles.qtyPayout}>
              +{formatBerries((qtyCard?.qty ?? 0) * sellPrice(qtyCard?.card ?? { rarity: 'C' }))} Berrys
            </Text>
            <Pressable style={styles.qtyConfirm} onPress={confirmQty}>
              <Text style={styles.qtyConfirmText}>Ajouter à la vente</Text>
            </Pressable>
            <Pressable onPress={() => setQtyCard(null)}>
              <Text style={styles.qtyCancel}>Annuler</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
  sellNow: {
    position: 'absolute',
    alignSelf: 'center',
    left: 24,
    right: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gold,
    borderRadius: 14,
    paddingVertical: 14,
  },
  sellNowText: { color: '#1a1208', fontWeight: '900', fontSize: 16 },
  qtyBackdrop: { flex: 1, backgroundColor: 'rgba(8, 4, 2, 0.72)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  qtyCard: { width: '100%', maxWidth: 340, backgroundColor: '#1a100c', borderColor: colors.gold, borderWidth: 1, borderRadius: 18, padding: 20, alignItems: 'center' },
  qtyTitle: { color: colors.gold, fontWeight: '900', fontSize: 16 },
  qtyName: { color: colors.white, fontWeight: '800', fontSize: 18, marginTop: 8, textAlign: 'center' },
  qtyMeta: { color: colors.muted, marginTop: 6 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 18 },
  qtyStep: { width: 44, height: 44, borderRadius: 22, borderColor: colors.gold, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  qtyStepText: { color: colors.gold, fontSize: 24, fontWeight: '800', marginTop: -2 },
  qtyValue: { color: colors.white, fontSize: 28, fontWeight: '900', minWidth: 36, textAlign: 'center' },
  qtyPayout: { color: '#7ed0a1', fontWeight: '800', marginTop: 12 },
  qtyConfirm: { marginTop: 16, backgroundColor: colors.gold, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 12 },
  qtyConfirmText: { color: '#1a1208', fontWeight: '900' },
  qtyCancel: { color: colors.muted, marginTop: 12, fontWeight: '700' },
});
