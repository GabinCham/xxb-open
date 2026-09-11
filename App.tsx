import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { GameProvider, useGame } from './src/game/GameContext';
import { InspectScreen } from './src/screens/InspectScreen';
import { RevealScreen } from './src/screens/RevealScreen';
import { SelectScreen } from './src/screens/SelectScreen';
import { SummaryScreen } from './src/screens/SummaryScreen';
import { colors } from './src/theme';

function Root() {
  const { ready, phase } = useGame();

  if (!ready) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
    <>
      {phase === 'select' ? <SelectScreen /> : null}
      {phase === 'inspect' ? <InspectScreen /> : null}
      {phase === 'reveal' ? <RevealScreen /> : null}
      {phase === 'summary' ? <SummaryScreen /> : null}
      <StatusBar style="light" />
    </>
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
  boot: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
});
