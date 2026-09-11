import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { addPulls, type OwnedCard } from '../data/collection';
import { loadCatalog } from '../data/catalog';
import { openBooster } from '../data/openPack';
import { BOOSTER_SETS } from '../data/sets';
import type { BoosterSet, PulledCard } from '../data/types';

const STORAGE_KEY = 'op-tcg-boosters-remaining';
const COLLECTION_KEY = 'op-tcg-collection';

export type Phase = 'select' | 'inspect' | 'reveal' | 'summary' | 'library';

type GameContextValue = {
  ready: boolean;
  remaining: number;
  phase: Phase;
  selectedSet: BoosterSet | null;
  pulls: PulledCard[];
  collection: OwnedCard[];
  selectSet: (id: string) => void;
  startReveal: () => void;
  finishReveal: () => void;
  goHome: () => void;
  goLibrary: () => void;
  grantBooster: () => void;
};

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [remaining, setRemaining] = useState(1);
  const [phase, setPhase] = useState<Phase>('select');
  const [selectedSet, setSelectedSet] = useState<BoosterSet | null>(null);
  const [pulls, setPulls] = useState<PulledCard[]>([]);
  const [collection, setCollection] = useState<OwnedCard[]>([]);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY).then((value) => {
        if (value != null) setRemaining(Number(value));
      }),
      AsyncStorage.getItem(COLLECTION_KEY).then((value) => {
        if (value) setCollection(JSON.parse(value) as OwnedCard[]);
      }),
      loadCatalog(),
    ]).finally(() => setReady(true));
  }, []);

  const persistRemaining = (next: number) => {
    setRemaining(next);
    AsyncStorage.setItem(STORAGE_KEY, String(next)).catch(() => {});
  };

  const persistCollection = (next: OwnedCard[]) => {
    setCollection(next);
    AsyncStorage.setItem(COLLECTION_KEY, JSON.stringify(next)).catch(() => {});
  };

  const value = useMemo<GameContextValue>(
    () => ({
      ready,
      remaining,
      phase,
      selectedSet,
      pulls,
      collection,
      selectSet: (id) => {
        if (remaining <= 0) return;
        const set = BOOSTER_SETS.find((item) => item.id === id);
        if (!set) return;
        setSelectedSet(set);
        setPulls(openBooster(id));
        setPhase('inspect');
      },
      startReveal: () => setPhase('reveal'),
      finishReveal: () => {
        persistCollection(addPulls(collection, pulls));
        persistRemaining(Math.max(0, remaining - 1));
        setPhase('summary');
      },
      goHome: () => {
        setPhase('select');
        setSelectedSet(null);
        setPulls([]);
      },
      goLibrary: () => setPhase('library'),
      grantBooster: () => persistRemaining(remaining + 1),
    }),
    [ready, remaining, phase, selectedSet, pulls, collection],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}
