import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BoosterPack } from '../components/BoosterPack';
import { BOOSTER_SETS } from '../data/sets';
import { useGame } from '../game/GameContext';
import { colors } from '../theme';

export function SelectScreen() {
  const { remaining, selectSet, grantBooster, goLibrary, collection } = useGame();
  const empty = remaining <= 0;

  return (
    <LinearGradient colors={['#14080c', colors.bg, '#081018']} style={styles.fill}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>ONE PIECE · BOOSTERS</Text>
        <Text style={styles.title}>Ouvre un booster</Text>
        <Text style={styles.lead}>
          {empty
            ? 'Ton booster a déjà été ouvert. Tu peux en recevoir un autre pour rejouer.'
            : `Tu as ${remaining} booster${remaining > 1 ? 's' : ''}. Choisis un set, le paquet s’affiche, puis appuie pour l’ouvrir.`}
        </Text>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>{empty ? 'Plus de booster' : `${remaining} restant`}</Text>
        </View>

        <Pressable style={styles.libraryBtn} onPress={goLibrary}>
          <Text style={styles.libraryBtnText}>Bibliothèque · {collection.length}</Text>
        </Pressable>

        <View style={styles.grid}>
          {BOOSTER_SETS.map((set) => (
            <View key={set.id} style={styles.cell}>
              <BoosterPack set={set} disabled={empty} onPress={() => selectSet(set.id)} />
              <Text style={styles.setName}>{set.code}</Text>
              <Text style={styles.setTag}>{set.tagline}</Text>
              {set.guaranteedHit ? <Text style={styles.test}>BOOSTER TEST</Text> : null}
            </View>
          ))}
        </View>

        {empty ? (
          <Pressable style={styles.refill} onPress={grantBooster}>
            <Text style={styles.refillText}>Recevoir 1 booster</Text>
          </Pressable>
        ) : null}

        <Text style={styles.disclaimer}>Fan-made · non affilié à Bandai / Toei / Eiichiro Oda</Text>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingTop: 64, paddingBottom: 48, paddingHorizontal: 20, maxWidth: 720, width: '100%', alignSelf: 'center' },
  kicker: { color: colors.gold, letterSpacing: 3, fontWeight: '800', fontSize: 12 },
  title: { color: colors.white, fontSize: 34, fontWeight: '900', marginTop: 8 },
  lead: { color: colors.muted, fontSize: 16, lineHeight: 22, marginTop: 10, maxWidth: 420 },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 18,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: colors.goldDim,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: { color: colors.gold, fontWeight: '700' },
  libraryBtn: {
    alignSelf: 'flex-start',
    marginBottom: 22,
    backgroundColor: '#1c1a14',
    borderWidth: 1,
    borderColor: colors.goldDim,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  libraryBtnText: { color: colors.cream, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center' },
  cell: { width: 148, alignItems: 'center', gap: 8 },
  setName: { color: colors.cream, fontWeight: '800' },
  setTag: { color: colors.muted, fontSize: 11, textAlign: 'center' },
  test: { color: colors.gold, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  refill: {
    marginTop: 28,
    alignSelf: 'center',
    backgroundColor: colors.gold,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
  },
  refillText: { color: '#1a1208', fontWeight: '800' },
  disclaimer: { color: '#6c6658', textAlign: 'center', marginTop: 36, fontSize: 12 },
});
