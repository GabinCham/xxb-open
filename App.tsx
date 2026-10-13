import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { TabBar } from './src/components/TabBar';
import { GameProvider, useGame } from './src/game/GameContext';
import { AccountScreen } from './src/screens/AccountScreen';
import { BinderScreen } from './src/screens/BinderScreen';
import { InspectScreen } from './src/screens/InspectScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { RevealScreen } from './src/screens/RevealScreen';
import { SelectScreen } from './src/screens/SelectScreen';
import { SummaryScreen } from './src/screens/SummaryScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { formatBerries } from './src/data/berries';
import { colors } from './src/theme';

const BERRY_COIN = require('./assets/berry-coin.png');

function Root() {
  const insets = useSafeAreaInsets();
  const { ready, phase, tab, setTab, coins, coinsPerInterval, nextCoinInMs } = useGame();

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
      {opening ? (
        <View style={styles.page}>
          <SelectScreen blurred />
          <View style={styles.openingOverlay}>
            {phase === 'inspect' ? <InspectScreen overlay /> : null}
            {phase === 'reveal' ? <RevealScreen /> : null}
            {phase === 'summary' ? <SummaryScreen /> : null}
          </View>
        </View>
      ) : (
        <>
          <View style={styles.page}>
            {tab === 'boosters' ? <SelectScreen /> : null}
            {tab === 'library' ? <LibraryScreen /> : null}
            {tab === 'binder' ? <BinderScreen /> : null}
            {tab === 'account' ? <AccountScreen /> : null}
          </View>
          <TabBar active={tab} onChange={setTab} />
        </>
      )}
      {!opening && tab !== 'account' ? (
        <View pointerEvents="none" style={[styles.coinBalance, { top: Math.max(insets.top, 12) + 8 }]}>
          <View style={styles.coinLine}>
            <Image source={BERRY_COIN} style={styles.coinIcon} />
            <Text style={styles.coinValue}>{formatBerries(coins)}</Text>
          </View>
          <Text style={styles.coinTimer}>+{coinsPerInterval} Berrys dans {formatRemaining(nextCoinInMs)}</Text>
        </View>
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
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.fill}>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  page: { flex: 1 },
  openingOverlay: { ...StyleSheet.absoluteFill },
  coinBalance: { position: 'absolute', right: 16, alignItems: 'flex-end', backgroundColor: 'rgba(25, 14, 7, 0.88)', borderWidth: 1, borderColor: '#e8c36a', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  coinLine: { flexDirection: 'row', alignItems: 'center' },
  coinIcon: { width: 20, height: 20, marginRight: 5 },
  coinValue: { color: '#ffe2a0', fontWeight: '900', fontSize: 17 },
  coinTimer: { color: '#d0b77b', fontSize: 10, marginTop: 1 },
  boot: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
});
