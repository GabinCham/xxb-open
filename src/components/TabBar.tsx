import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { TabId } from '../game/GameContext';
import { colors } from '../theme';

export const TAB_BAR_HEIGHT = 82;

const TABS: { id: TabId; label: string; mark: string; grow?: number }[] = [
  { id: 'scanner', label: 'Scanner', mark: '⌖', grow: 1.7 },
  { id: 'tracker', label: 'Tracker', mark: '◎' },
  { id: 'boosters', label: 'Boosters', mark: '✦' },
  { id: 'library', label: 'Bibliothèque', mark: '▤' },
  { id: 'binder', label: 'Classeur', mark: '▣' },
];

type Props = {
  active: TabId;
  onChange: (tab: TabId) => void;
};

export function TabBar({ active, onChange }: Props) {
  return (
    <View style={styles.bar}>
      {TABS.map((tab) => {
        const on = tab.id === active;
        const big = tab.id === 'scanner';
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={[styles.tab, { flex: tab.grow ?? 1 }, big && styles.tabBig, on && big && styles.tabBigOn]}
            accessibilityRole="tab"
          >
            <Text style={[styles.mark, big && styles.markBig, on && styles.markOn]}>{tab.mark}</Text>
            <Text style={[styles.label, big && styles.labelBig, on && styles.labelOn]} numberOfLines={1}>
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
    gap: 4,
  },
  tab: { alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 12 },
  tabBig: { backgroundColor: '#16141c' },
  tabBigOn: { backgroundColor: '#2a2214' },
  mark: { color: colors.muted, fontSize: 16 },
  markBig: { fontSize: 22 },
  markOn: { color: colors.gold },
  label: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  labelBig: { fontSize: 12, letterSpacing: 0.6 },
  labelOn: { color: colors.gold },
});
