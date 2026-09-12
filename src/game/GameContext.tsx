import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { addPulls, type OwnedCard } from '../data/collection';
import { loadCatalog } from '../data/catalog';
import { ensureVisualIndex } from '../data/visualIndex';
import { openBooster } from '../data/openPack';
import { BOOSTER_SETS } from '../data/sets';
import type { BoosterSet, PulledCard } from '../data/types';

const STORAGE_KEY = 'op-tcg-boosters-remaining';
const COLLECTION_KEY = 'op-tcg-collection';
const BINDER_KEY = 'op-tcg-binder';
const PAGE = 4;

function emptyPage(): (string | null)[] {
  return [null, null, null, null];
}

function withTrailingPage(slots: (string | null)[]): (string | null)[] {
  const next = slots.length ? [...slots] : emptyPage();
  while (next.length % PAGE !== 0) next.push(null);
  const last = next.slice(-PAGE);
  if (last.every(Boolean)) next.push(...emptyPage());
  return next.length ? next : emptyPage();
}

export type TabId = 'scanner' | 'tracker' | 'boosters' | 'library' | 'binder';
export type Phase = 'select' | 'inspect' | 'reveal' | 'summary';

type GameContextValue = {
  ready: boolean;
  remaining: number;
  phase: Phase;
  tab: TabId;
  selectedSet: BoosterSet | null;
  pulls: PulledCard[];
  collection: OwnedCard[];
  binderSlots: (string | null)[];
  pickSlot: number | null;
  selectSet: (id: string) => void;
  startReveal: () => void;
  finishReveal: () => void;
  goHome: () => void;
  goLibrary: () => void;
  setTab: (tab: TabId) => void;
  grantBooster: () => void;
  pickBinderSlot: (slot: number) => void;
  placeBinderCard: (cardId: string) => void;
  clearBinderSlot: () => void;
};

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [remaining, setRemaining] = useState(1);
  const [phase, setPhase] = useState<Phase>('select');
  const [tab, setActiveTab] = useState<TabId>('boosters');
  const [selectedSet, setSelectedSet] = useState<BoosterSet | null>(null);
  const [pulls, setPulls] = useState<PulledCard[]>([]);
  const [collection, setCollection] = useState<OwnedCard[]>([]);
  const [binderSlots, setBinderSlots] = useState<(string | null)[]>(emptyPage());
  const [pickSlot, setPickSlot] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY).then((value) => {
        if (value != null) setRemaining(Number(value));
      }),
      AsyncStorage.getItem(COLLECTION_KEY).then((value) => {
        if (value) setCollection(JSON.parse(value) as OwnedCard[]);
      }),
      AsyncStorage.getItem(BINDER_KEY).then((value) => {
        if (!value) return;
        const parsed = JSON.parse(value) as (string | null)[];
        if (Array.isArray(parsed)) setBinderSlots(withTrailingPage(parsed));
      }),
      loadCatalog().then(() => {
        ensureVisualIndex().catch(() => {});
      }),
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

  const persistBinder = (next: (string | null)[]) => {
    const slots = withTrailingPage(next);
    setBinderSlots(slots);
    AsyncStorage.setItem(BINDER_KEY, JSON.stringify(slots)).catch(() => {});
  };

  const value = useMemo<GameContextValue>(
    () => ({
      ready,
      remaining,
      phase,
      tab,
      selectedSet,
      pulls,
      collection,
      binderSlots,
      pickSlot,
      selectSet: (id) => {
        if (remaining <= 0) return;
        const set = BOOSTER_SETS.find((item) => item.id === id);
        if (!set) return;
        setSelectedSet(set);
        setPulls(openBooster(id));
        setPickSlot(null);
        setActiveTab('boosters');
        setPhase('inspect');
      },
      startReveal: () => setPhase('reveal'),
      finishReveal: () => {
        persistCollection(addPulls(collection, pulls));
        persistRemaining(Math.max(0, remaining - 1));
        setPhase('summary');
      },
      goHome: () => {
        setPickSlot(null);
        setActiveTab('boosters');
        setPhase('select');
        setSelectedSet(null);
        setPulls([]);
      },
      goLibrary: () => {
        setPhase('select');
        setActiveTab('library');
      },
      setTab: (next) => {
        setPhase('select');
        if (next !== 'library') setPickSlot(null);
        setActiveTab(next);
      },
      grantBooster: () => persistRemaining(remaining + 1),
      pickBinderSlot: (slot) => {
        setPickSlot(slot);
        setPhase('select');
        setActiveTab('library');
      },
      placeBinderCard: (cardId) => {
        if (pickSlot == null) return;
        const next = [...binderSlots];
        while (next.length <= pickSlot) next.push(null);
        for (let i = 0; i < next.length; i += 1) {
          if (next[i] === cardId) next[i] = null;
        }
        next[pickSlot] = cardId;
        persistBinder(next);
        setPickSlot(null);
        setActiveTab('binder');
      },
      clearBinderSlot: () => {
        if (pickSlot == null) return;
        const next = [...binderSlots];
        if (pickSlot < next.length) next[pickSlot] = null;
        persistBinder(next);
        setPickSlot(null);
        setActiveTab('binder');
      },
    }),
    [ready, remaining, phase, tab, selectedSet, pulls, collection, binderSlots, pickSlot],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}
