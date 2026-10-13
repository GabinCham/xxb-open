import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { TabId } from '../game/GameContext';
import { colors } from '../theme';

export const TAB_BAR_HEIGHT = 82;

const TABS: { id: TabId; label: string; icon: keyof typeof Ionicons.glyphMap; iconOn: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'boosters', label: 'Shop', icon: 'storefront-outline', iconOn: 'storefront' },
  { id: 'library', label: 'Bibliothèque', icon: 'albums-outline', iconOn: 'albums' },
  { id: 'binder', label: 'Classeur', icon: 'book-outline', iconOn: 'book' },
  { id: 'account', label: 'Compte', icon: 'person-circle-outline', iconOn: 'person-circle' },
];

type Props = {
  active: TabId;
  onChange: (tab: TabId) => void;
};

export function TabBar({ active, onChange }: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabWidth = Math.min(108, (width - 20) / TABS.length);

  return (
    <View style={[styles.bar, { height: TAB_BAR_HEIGHT + insets.bottom, paddingBottom: 10 + insets.bottom }]}>
      {TABS.map((tab) => {
        const on = tab.id === active;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={[styles.tab, { width: tabWidth }, on && styles.tabOn]}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
          >
            <Ionicons name={on ? tab.iconOn : tab.icon} size={22} color={on ? colors.gold : colors.muted} />
            <Text style={[styles.label, on && styles.labelOn]} numberOfLines={1}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: TAB_BAR_HEIGHT,
    flexDirection: 'row',
    backgroundColor: '#0c0c14',
    borderTopWidth: 1,
    borderTopColor: colors.goldDim,
    paddingBottom: 10,
    paddingTop: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 4,
    justifyContent: 'center',
  },
  tab: { alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 12, height: '100%' },
  tabOn: { backgroundColor: '#2a2214' },
  label: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  labelOn: { color: colors.gold },
});
