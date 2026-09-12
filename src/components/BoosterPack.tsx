import { Pressable, StyleSheet, Text, View } from 'react-native';

import { packTextureModule } from '../data/packTextures';
import type { BoosterSet } from '../data/types';
import { PackCanvas } from './pack3d/PackCanvas';

type Props = {
  set: BoosterSet;
  size?: 'shop' | 'hero';
  disabled?: boolean;
  onPress?: () => void;
};

export function BoosterPack({ set, size = 'shop', disabled, onPress }: Props) {
  const hero = size === 'hero';
  const width = hero ? 220 : 132;
  const height = hero ? 340 : 204;
  const textureModule = packTextureModule(set.id);

  const body = (
    <View style={[styles.shadow, disabled && styles.disabled, { width, height }]}>
      <View style={[styles.stage, { pointerEvents: 'none' }]}>
        <PackCanvas textureModule={textureModule} accent={set.packTo} autoRotate={hero} />
      </View>
      <View style={[styles.ribbon, { backgroundColor: set.ribbon }]}>
        <Text style={styles.ribbonText}>{set.code}</Text>
      </View>
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
    backgroundColor: 'transparent',
  },
  stage: {
    ...StyleSheet.absoluteFill,
  },
  ribbon: {
    position: 'absolute',
    left: 8,
    top: 8,
    zIndex: 2,
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
