import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { CardStack } from '../components/CardStack';
import { useGame } from '../game/GameContext';
import { colors } from '../theme';

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
    <LinearGradient colors={['#0c0814', colors.bg]} style={styles.fill}>
      {stack.length === 1 ? (
        <Pressable onPress={finishToShop} style={styles.shopButton}>
          <Text style={styles.shopButtonText}>← Boutique</Text>
        </Pressable>
      ) : null}
      <CardStack cards={stack} onDismissTop={dismissTop} onLastBinder={finishToBinder} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  shopButton: { position: 'absolute', top: 26, left: 18, zIndex: 5, borderColor: '#c99a48', borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(23, 13, 8, 0.9)' },
  shopButtonText: { color: '#f4d895', fontSize: 13, fontWeight: '800' },
});
