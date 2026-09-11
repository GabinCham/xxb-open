import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { TradingCard } from '../components/TradingCard';
import { collectionStats } from '../data/collection';
import { useGame } from '../game/GameContext';
import { colors } from '../theme';

export function LibraryScreen() {
  const { collection, goHome } = useGame();
  const stats = collectionStats(collection);

  return (
    <LinearGradient colors={['#12080c', colors.bg]} style={styles.fill}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable onPress={goHome}>
          <Text style={styles.back}>← Boosters</Text>
        </Pressable>
        <Text style={styles.kicker}>COLLECTION</Text>
        <Text style={styles.title}>Bibliothèque</Text>
        <Text style={styles.lead}>
          {stats.unique
            ? `${stats.unique} carte${stats.unique > 1 ? 's' : ''} unique${stats.unique > 1 ? 's' : ''} · ${stats.total} en tout`
            : 'Aucune carte pour l’instant. Ouvre un booster pour commencer.'}
        </Text>

        <View style={styles.grid}>
          {collection.map((card) => (
            <View key={card.id} style={styles.cell}>
              <TradingCard card={{ ...card, pullId: card.id }} compact count={card.count} />
            </View>
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
    paddingBottom: 48,
    paddingHorizontal: 16,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  back: { color: colors.muted, fontSize: 15, marginBottom: 16 },
  kicker: { color: colors.gold, letterSpacing: 2, fontWeight: '800', fontSize: 12 },
  title: { color: colors.white, fontSize: 32, fontWeight: '900', marginTop: 8 },
  lead: { color: colors.muted, marginTop: 8, marginBottom: 24, lineHeight: 22 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  cell: { alignItems: 'center' },
});
