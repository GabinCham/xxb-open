import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { TabBar } from './src/components/TabBar';
import { GameProvider, useGame } from './src/game/GameContext';
import { BinderScreen } from './src/screens/BinderScreen';
import { ScannerScreen } from './src/screens/ScannerScreen';
import { InspectScreen } from './src/screens/InspectScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { RevealScreen } from './src/screens/RevealScreen';
import { SelectScreen } from './src/screens/SelectScreen';
import { SummaryScreen } from './src/screens/SummaryScreen';
import { TrackerScreen } from './src/screens/TrackerScreen';
import { colors } from './src/theme';

function Root() {
  const { ready, phase, tab, setTab } = useGame();

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
          {phase === 'inspect' ? <InspectScreen /> : null}
          {phase === 'reveal' ? <RevealScreen /> : null}
          {phase === 'summary' ? <SummaryScreen /> : null}
        </View>
      ) : (
        <>
          <View style={styles.page}>
            {tab === 'scanner' ? <ScannerScreen /> : null}
            {tab === 'tracker' ? <TrackerScreen /> : null}
            {tab === 'boosters' ? <SelectScreen /> : null}
            {tab === 'library' ? <LibraryScreen /> : null}
            {tab === 'binder' ? <BinderScreen /> : null}
          </View>
          <TabBar active={tab} onChange={setTab} />
        </>
      )}
      <StatusBar style="light" />
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.fill}>
      <GameProvider>
        <Root />
      </GameProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  page: { flex: 1 },
  boot: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
});
