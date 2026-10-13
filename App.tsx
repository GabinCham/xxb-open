import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { TabBar } from './src/components/TabBar';
import { GameProvider, useGame } from './src/game/GameContext';
import { BinderScreen } from './src/screens/BinderScreen';
import { InspectScreen } from './src/screens/InspectScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { RevealScreen } from './src/screens/RevealScreen';
import { SelectScreen } from './src/screens/SelectScreen';
import { SummaryScreen } from './src/screens/SummaryScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { colors } from './src/theme';

const BERRY_COIN = require('./assets/berry-coin.png');

function Root() {
  const { ready, phase, tab, setTab, coins, coinsPerInterval, nextCoinInMs } = useGame();
  const { user, signOut } = useAuth();

  if (!ready) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  const opening = phase !== 'select';

  return (
    <View style={styles.fill}>
      {phase === 'inspect' ? (
        <View style={styles.page}>
          <SelectScreen blurred />
          <View style={styles.openingOverlay}>
            <InspectScreen overlay />
          </View>
        </View>
      ) : opening ? (
        <View style={styles.page}>
          {phase === 'reveal' ? <RevealScreen /> : null}
          {phase === 'summary' ? <SummaryScreen /> : null}
        </View>
      ) : (
        <>
          <View style={styles.page}>
            {tab === 'boosters' ? <SelectScreen /> : null}
            {tab === 'library' ? <LibraryScreen /> : null}
            {tab === 'binder' ? <BinderScreen /> : null}
          </View>
          <TabBar active={tab} onChange={setTab} />
        </>
      )}
      {!opening ? (
        <>
          <View pointerEvents="none" style={styles.coinBalance}>
            <View style={styles.coinLine}>
              <Image source={BERRY_COIN} style={styles.coinIcon} />
              <Text style={styles.coinValue}>{coins}</Text>
            </View>
            <Text style={styles.coinTimer}>+{coinsPerInterval} Berrys dans {formatRemaining(nextCoinInMs)}</Text>
          </View>
          <Pressable onPress={() => signOut()} style={({ pressed }) => [styles.accountButton, pressed && styles.accountPressed]} accessibilityLabel="Se déconnecter">
            <Text numberOfLines={1} style={styles.accountEmail}>{user?.email ?? 'Compte'}</Text>
            <Text style={styles.accountAction}>Déconnexion</Text>
          </Pressable>
        </>
      ) : null}
      <StatusBar style="light" />
    </View>
  );
}

function AppContent() {
  const { ready, user } = useAuth();

  if (!ready) {
    return <View style={styles.boot}><ActivityIndicator color={colors.gold} /></View>;
  }
  if (!user) return <AuthScreen />;

  return (
    <GameProvider>
      <Root />
    </GameProvider>
  );
}

function formatRemaining(milliseconds: number) {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.fill}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  page: { flex: 1 },
  openingOverlay: { ...StyleSheet.absoluteFill },
  coinBalance: { position: 'absolute', top: 46, right: 16, alignItems: 'flex-end', backgroundColor: 'rgba(25, 14, 7, 0.88)', borderWidth: 1, borderColor: '#e8c36a', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  coinLine: { flexDirection: 'row', alignItems: 'center' },
  coinIcon: { width: 20, height: 20, marginRight: 5 },
  coinValue: { color: '#ffe2a0', fontWeight: '900', fontSize: 17 },
  coinTimer: { color: '#d0b77b', fontSize: 10, marginTop: 1 },
  accountButton: { position: 'absolute', left: 14, top: 46, maxWidth: 150, borderColor: '#80642c', borderWidth: 1, borderRadius: 10, backgroundColor: 'rgba(25, 14, 7, 0.88)', paddingHorizontal: 9, paddingVertical: 5 },
  accountEmail: { color: '#f4ead2', fontSize: 11, fontWeight: '800' },
  accountAction: { color: '#e8c36a', fontSize: 10, marginTop: 1 },
  accountPressed: { opacity: 0.7 },
  boot: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
});
