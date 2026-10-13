import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CardStack } from '../components/CardStack';
import { useGame } from '../game/GameContext';

export function RevealScreen() {
  const { pulls, finishReveal, goHome } = useGame();
  const [stack, setStack] = useState(pulls);

  useEffect(() => {
    setStack(pulls);
  }, [pulls]);

  const dismissTop = () => {
    setStack((current) => {
      if (current.length <= 1) {
        setTimeout(finishReveal, 40);
        return [];
      }
      return current.slice(1);
    });
  };

  const finishToShop = () => {
    finishReveal();
    goHome();
  };

  return (
    <View style={styles.fill}>
      <CardStack cards={stack} onDismissTop={dismissTop} onLastShop={finishToShop} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: 'transparent' },
});
