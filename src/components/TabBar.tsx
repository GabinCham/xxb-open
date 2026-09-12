import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { TabId } from '../game/GameContext';
import { colors } from '../theme';

export const TAB_BAR_HEIGHT = 78;

const TABS: { id: TabId; label: string; mark: string }[] = [
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
        return (
          <Pressable key={tab.id} onPress={() => onChange(tab.id)} style={styles.tab} accessibilityRole="tab">
            <Text style={[styles.mark, on && styles.markOn]}>{tab.mark}</Text>
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
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  mark: { color: colors.muted, fontSize: 16 },
  markOn: { color: colors.gold },
  label: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  labelOn: { color: colors.gold },
});
