import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { CardStack } from '../components/CardStack';
import { useGame } from '../game/GameContext';
import { colors } from '../theme';

export function RevealScreen() {
  const { pulls, finishReveal } = useGame();
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

  return (
    <LinearGradient colors={['#0c0814', colors.bg]} style={styles.fill}>
      <CardStack cards={stack} onDismissTop={dismissTop} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
});
