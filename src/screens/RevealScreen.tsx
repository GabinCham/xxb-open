import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BackToShopButton } from '../components/BackToShopButton';
import { CardStack } from '../components/CardStack';
import { useGame } from '../game/GameContext';

export function RevealScreen() {
  const { pulls, finishReveal, goHome, setTab } = useGame();
  const [stack, setStack] = useState(pulls);

  useEffect(() => {
    setStack(pulls);
  }, [pulls]);

  const dismissTop = () => {
    setStack((current) => {
      if (current.length <= 1) {
        setTimeout(finishReveal, 180);
        return [];
      }
      return current.slice(1);
    });
  };

  const finishToShop = () => {
    finishReveal();
    goHome();
  };

  const finishToBinder = () => {
    finishReveal();
    setTab('binder');
  };

  return (
    <View style={styles.fill}>
      {stack.length === 1 ? <BackToShopButton onPress={finishToShop} /> : null}
      <CardStack cards={stack} onDismissTop={dismissTop} onLastBinder={finishToBinder} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: 'transparent' },
});
