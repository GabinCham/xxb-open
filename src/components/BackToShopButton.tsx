import { Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  label?: string;
  onPress: () => void;
};

export function BackToShopButton({ label = '← Boutique', onPress }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.button, { top: Math.max(insets.top, 12) + 10 }]}
    >
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    left: 16,
    zIndex: 8,
    borderColor: '#c99a48',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(23, 13, 8, 0.9)',
  },
  text: { color: '#f4d895', fontSize: 13, fontWeight: '800' },
});
