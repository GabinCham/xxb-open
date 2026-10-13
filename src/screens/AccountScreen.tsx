import { LinearGradient } from 'expo-linear-gradient';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../auth/AuthContext';
import { TAB_BAR_HEIGHT } from '../components/TabBar';
import { formatBerries } from '../data/berries';
import { collectionStats } from '../data/collection';
import { boosterBreakdown, totalBoosters } from '../data/stats';
import { useGame } from '../game/GameContext';
import { colors } from '../theme';

const BERRY_COIN = require('../../assets/berry-coin.png');

function formatRemaining(milliseconds: number) {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatPercent(value: number) {
  return `${(value * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`;
}

export function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { coins, coinsPerInterval, nextCoinInMs, collection, openStats } = useGame();
  const cards = collectionStats(collection);
  const packs = totalBoosters(openStats);
  const hits = openStats.hitsPulled;
  const sets = boosterBreakdown(openStats);

  return (
    <LinearGradient colors={['#12080c', colors.bg]} style={styles.fill}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, 12) + 18, paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>PIRATE</Text>
        <Text style={styles.title}>Compte</Text>
        <Text style={styles.lead}>Tes Berrys et tes cartes restent liés à cet e-mail.</Text>

        <View style={styles.card}>
          <Text style={styles.label}>E-mail</Text>
          <Text style={styles.value}>{user?.email ?? '—'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Berrys</Text>
          <View style={styles.coinRow}>
            <Image source={BERRY_COIN} style={styles.coin} />
            <Text style={styles.value}>{formatBerries(coins)}</Text>
          </View>
          <Text style={styles.meta}>+{coinsPerInterval} dans {formatRemaining(nextCoinInMs)}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Berrys dépensés</Text>
          <View style={styles.coinRow}>
            <Image source={BERRY_COIN} style={styles.coin} />
            <Text style={styles.value}>{formatBerries(openStats.berriesSpent)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Boosters ouverts</Text>
          <Text style={styles.value}>{packs} booster{packs > 1 ? 's' : ''}</Text>
          {sets.length ? (
            <Text style={styles.meta}>{sets.map((set) => `${set.count} ${set.code}`).join(', ')}</Text>
          ) : (
            <Text style={styles.meta}>Aucun booster ouvert depuis le suivi.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Hits</Text>
          <Text style={styles.value}>{hits} hit{hits > 1 ? 's' : ''}</Text>
          <Text style={styles.meta}>
            {packs === 0
              ? 'Le taux se calcule après le premier booster.'
              : hits === 0
                ? `0 % · 0 hit sur ${packs} booster${packs > 1 ? 's' : ''}`
                : `${formatPercent(hits / packs)} · 1 hit tous les ${formatBerries(packs / hits)} boosters`}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Collection</Text>
          <Text style={styles.value}>
            {cards.unique} carte{cards.unique > 1 ? 's' : ''} unique{cards.unique > 1 ? 's' : ''}
          </Text>
          <Text style={styles.meta}>{cards.total} en tout</Text>
        </View>

        <Pressable onPress={() => signOut()} style={({ pressed }) => [styles.logout, pressed && styles.pressed]} accessibilityLabel="Se déconnecter">
          <Text style={styles.logoutText}>Déconnexion</Text>
        </Pressable>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: 22, maxWidth: 520, width: '100%', alignSelf: 'center' },
  kicker: { color: colors.gold, letterSpacing: 2, fontWeight: '800', fontSize: 12 },
  title: { color: colors.white, fontSize: 32, fontWeight: '900', marginTop: 8 },
  lead: { color: colors.muted, marginTop: 8, marginBottom: 24, lineHeight: 22 },
  card: { backgroundColor: 'rgba(25, 14, 7, 0.88)', borderColor: '#80642c', borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 12 },
  label: { color: '#d0b77b', fontSize: 11, fontWeight: '800', letterSpacing: 0.6, marginBottom: 6 },
  value: { color: colors.cream, fontSize: 16, fontWeight: '800' },
  coinRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  coin: { width: 22, height: 22 },
  meta: { color: '#d0b77b', fontSize: 12, marginTop: 6, lineHeight: 18 },
  logout: { marginTop: 12, alignItems: 'center', borderColor: colors.gold, borderWidth: 1, borderRadius: 12, paddingVertical: 14 },
  logoutText: { color: colors.gold, fontWeight: '900', fontSize: 15 },
  pressed: { opacity: 0.7 },
});
