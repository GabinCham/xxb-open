import { LinearGradient } from 'expo-linear-gradient';
import { Platform, StyleSheet } from 'react-native';
import Animated, { interpolate, type SharedValue, useAnimatedStyle } from 'react-native-reanimated';

type Props = {
  mx: SharedValue<number>;
  my: SharedValue<number>;
  active: SharedValue<number>;
  lit: SharedValue<number>;
};

const SHINE =
  'repeating-linear-gradient(30deg, rgba(10, 10, 10, 0.7) 8%, rgba(255, 255, 255, 0.6) 12%, rgba(10, 10, 10, 0.2) 15%, rgba(255, 255, 255, 0.6) 12%, rgba(10, 10, 10, 0.2) 16%, rgba(10, 10, 10, 0.5) 20%, rgba(10, 10, 10, 0.2) 36%)';

export function HitFoilOverlay({ mx, my, active, lit }: Props) {
  const webShine = useAnimatedStyle(() => ({
    opacity: active.value * interpolate(lit.value, [0, 1], [0.08, 0.25]),
    backgroundImage: SHINE,
    backgroundSize: '300% 100%',
    backgroundPosition: `${50 + mx.value * 50}% center`,
  }));

  const wrap = useAnimatedStyle(() => ({
    opacity: active.value * interpolate(lit.value, [0, 1], [0.08, 0.85]),
  }));

  const slash = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(mx.value, [-1, 1], [-90, 90]) },
      { translateY: interpolate(my.value, [-1, 1], [-56, 56]) },
      { rotate: `${118 + mx.value * 14}deg` },
    ],
  }));

  if (Platform.OS === 'web') {
    return <Animated.View pointerEvents="none" style={[styles.clip, styles.webShine, webShine]} />;
  }

  return (
    <Animated.View pointerEvents="none" style={[styles.clip, wrap]}>
      <Animated.View style={[styles.slash, slash]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.7)', 'rgba(255,255,255,0.08)', 'transparent']}
          locations={[0, 0.38, 0.5, 0.62, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.fill}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  clip: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    borderRadius: 12,
  },
  webShine: {
    mixBlendMode: 'overlay',
  },
  slash: {
    position: 'absolute',
    width: '240%',
    height: 54,
    left: '-70%',
    top: '42%',
  },
  fill: { flex: 1 },
});
