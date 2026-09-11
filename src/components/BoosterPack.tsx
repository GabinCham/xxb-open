import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { officialPackImage } from '../data/images';
import type { BoosterSet } from '../data/types';

type Props = {
  set: BoosterSet;
  size?: 'shop' | 'hero';
  disabled?: boolean;
  onPress?: () => void;
};

export function BoosterPack({ set, size = 'shop', disabled, onPress }: Props) {
  const hero = size === 'hero';
  const width = hero ? 240 : 148;
  const height = hero ? 240 : 148;
  const uri = officialPackImage(set.folder, hero ? 720 : 400);

  const body = (
    <View style={[styles.shadow, disabled && styles.disabled, { width, height }]}>
      <LinearGradient colors={['#1a140c', set.packTo]} style={styles.pack}>
        <Image source={{ uri }} style={styles.art} resizeMode="contain" />
        <View style={[styles.ribbon, { backgroundColor: set.ribbon }]}>
          <Text style={styles.ribbonText}>{set.code}</Text>
        </View>
      </LinearGradient>
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => pressed && !disabled && styles.pressed}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
    backgroundColor: '#120c08',
  },
  pack: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  art: { ...StyleSheet.absoluteFill, backgroundColor: '#efe6d2' },
  ribbon: {
    position: 'absolute',
    left: 8,
    top: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  ribbonText: {
    color: '#140c04',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 1,
  },
  disabled: { opacity: 0.38 },
  pressed: { transform: [{ scale: 0.97 }] },
});
