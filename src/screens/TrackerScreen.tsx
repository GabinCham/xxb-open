import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { TAB_BAR_HEIGHT } from '../components/TabBar';
import { getCachedSetCards } from '../data/catalog';
import { BOOSTER_SETS } from '../data/sets';
import { useGame } from '../game/GameContext';
import { colors } from '../theme';

export function TrackerScreen() {
  const { collection } = useGame();
  const owned = new Set(collection.map((card) => card.id));
  const sets = BOOSTER_SETS.filter((set) => !set.guaranteedHit);

  return (
    <LinearGradient colors={['#081018', colors.bg]} style={styles.fill}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>PROGRESSION</Text>
        <Text style={styles.title}>Tracker</Text>
        <Text style={styles.lead}>Suivi des cartes uniques récupérées par set.</Text>

        {sets.map((set) => {
          const pool = getCachedSetCards(set.id);
          const have = pool.filter((card) => owned.has(card.id)).length;
          const total = pool.length;
          const ratio = total ? have / total : 0;
          return (
            <View key={set.id} style={styles.row}>
              <View style={styles.rowHead}>
                <Text style={styles.code}>{set.code}</Text>
                <Text style={styles.count}>
                  {have} / {total || '—'}
                </Text>
              </View>
              <Text style={styles.name}>{set.name}</Text>
              <View style={styles.track}>
                <View style={[styles.fillBar, { width: `${Math.round(ratio * 100)}%` }]} />
              </View>
            </View>
          );
        })}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: {
    paddingTop: 64,
    paddingBottom: TAB_BAR_HEIGHT + 24,
    paddingHorizontal: 20,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  kicker: { color: colors.gold, letterSpacing: 2, fontWeight: '800', fontSize: 12 },
  title: { color: colors.white, fontSize: 32, fontWeight: '900', marginTop: 8 },
  lead: { color: colors.muted, marginTop: 8, marginBottom: 28, lineHeight: 22 },
  row: { marginBottom: 22 },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  code: { color: colors.cream, fontWeight: '800', fontSize: 16 },
  count: { color: colors.gold, fontWeight: '700' },
  name: { color: colors.muted, fontSize: 13, marginTop: 2, marginBottom: 8 },
  track: { height: 8, borderRadius: 99, backgroundColor: '#1c1c28', overflow: 'hidden' },
  fillBar: { height: '100%', backgroundColor: colors.gold, borderRadius: 99 },
});
