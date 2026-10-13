import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { useAuth } from '../auth/AuthContext';
import { roundBerries } from '../data/berries';
import { addPulls, type OwnedCard } from '../data/collection';
import { loadCatalog } from '../data/catalog';
import { openBooster } from '../data/openPack';
import { removeCopies, sellableCount, sellPrice } from '../data/sell';
import { BOOSTER_SETS, boosterPrice } from '../data/sets';
import type { BoosterSet, PulledCard } from '../data/types';
import { supabase } from '../lib/supabase';

const COINS_KEY = 'op-tcg-coins';
const COINS_LAST_EARNED_AT_KEY = 'op-tcg-coins-last-earned-at';
const COINS_VERSION_KEY = 'op-tcg-coins-version';
const COLLECTION_KEY = 'op-tcg-collection';
const BINDER_KEY = 'op-tcg-binder';
const PAGE = 4;
const COINS_PER_INTERVAL = 60;
const COIN_INTERVAL_MS = 15 * 60 * 1000;
const STARTING_COINS = 60;
const COINS_VERSION = '2';
export const OP13_DISPLAY_PRICE = 1500;
const OP13_DISPLAY_PACKS = 24;
const OP13_DISPLAY_HITS = 3;

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

function mergeOwned(left: OwnedCard[], right: OwnedCard[]): OwnedCard[] {
  const map = new Map<string, OwnedCard>();
  for (const card of [...left, ...right]) {
    const prev = map.get(card.id);
    if (!prev || card.count > prev.count) map.set(card.id, card);
  }
  return [...map.values()];
}

type PlayerSnapshot = {
  userId: string | null;
  coins: number;
  lastCoinEarnedAt: number;
  collection: OwnedCard[];
  binderSlots: (string | null)[];
};

function mergeBinder(left: (string | null)[], right: (string | null)[]): (string | null)[] {
  const length = Math.max(left.length, right.length, PAGE);
  return withTrailingPage(Array.from({ length }, (_, index) => right[index] ?? left[index] ?? null));
}

function op13DisplayQueue(): string[] {
  const queue = Array<string>(OP13_DISPLAY_PACKS).fill('op13');
  const slots = new Set<number>();
  while (slots.size < OP13_DISPLAY_HITS) slots.add(Math.floor(Math.random() * OP13_DISPLAY_PACKS));
  slots.forEach((slot) => { queue[slot] = 'op13-hits'; });
  return queue;
}

export type TabId = 'boosters' | 'library' | 'binder' | 'account';
export type Phase = 'select' | 'inspect' | 'reveal' | 'summary';

type GameContextValue = {
  ready: boolean;
  coins: number;
  coinsPerInterval: number;
  coinIntervalMs: number;
  nextCoinInMs: number;
  loginBonusReady: boolean;
  phase: Phase;
  tab: TabId;
  selectedSet: BoosterSet | null;
  pulls: PulledCard[];
  collection: OwnedCard[];
  binderSlots: (string | null)[];
  pickSlot: number | null;
  selling: boolean;
  displayPacksRemaining: number;
  startSelling: () => void;
  sellCards: (cardIds: string[]) => number;
  selectSet: (id: string) => void;
  selectOp13Display: () => void;
  startReveal: () => void;
  finishReveal: () => void;
  continueDisplay: () => void;
  goHome: () => void;
  goLibrary: () => void;
  setTab: (tab: TabId) => void;
  pickBinderSlot: (slot: number) => void;
  placeBinderCard: (cardId: string) => void;
  clearBinderSlot: () => void;
};

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [localReady, setLocalReady] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);
  const [coins, setCoins] = useState(STARTING_COINS);
  const [lastCoinEarnedAt, setLastCoinEarnedAt] = useState(Date.now());
  const [clock, setClock] = useState(Date.now());
  const [phase, setPhase] = useState<Phase>('select');
  const [tab, setActiveTab] = useState<TabId>('boosters');
  const [selectedSet, setSelectedSet] = useState<BoosterSet | null>(null);
  const [pulls, setPulls] = useState<PulledCard[]>([]);
  const [collection, setCollection] = useState<OwnedCard[]>([]);
  const [binderSlots, setBinderSlots] = useState<(string | null)[]>(emptyPage());
  const [pickSlot, setPickSlot] = useState<number | null>(null);
  const [selling, setSelling] = useState(false);
  const [displayQueue, setDisplayQueue] = useState<string[]>([]);
  const remoteSynced = useRef(false);
  const snapshot = useRef<PlayerSnapshot>({
    userId: user?.id ?? null,
    coins,
    lastCoinEarnedAt,
    collection,
    binderSlots,
  });
  snapshot.current = {
    userId: user?.id ?? null,
    coins,
    lastCoinEarnedAt,
    collection,
    binderSlots,
  };

  useEffect(() => {
    Promise.all([
      Promise.all([AsyncStorage.getItem(COINS_KEY), AsyncStorage.getItem(COINS_LAST_EARNED_AT_KEY), AsyncStorage.getItem(COINS_VERSION_KEY)]).then(([storedCoins, storedAt, version]) => {
        const savedCoins = storedCoins == null ? Number.NaN : Number(storedCoins);
        const savedAt = storedAt == null ? Number.NaN : Number(storedAt);
        const isNewEconomy = version !== COINS_VERSION;
        const baseCoins = isNewEconomy || !Number.isFinite(savedCoins) ? STARTING_COINS : savedCoins;
        const baseAt = isNewEconomy || !Number.isFinite(savedAt) || savedAt <= 0 ? Date.now() : savedAt;
        // A reward is granted once per qualifying app launch. Time spent away
        // from the app never stacks multiple rewards.
        const earned = !isNewEconomy && Date.now() - baseAt >= COIN_INTERVAL_MS ? 1 : 0;
        const nextCoins = baseCoins + earned * COINS_PER_INTERVAL;
        const nextAt = earned ? Date.now() : baseAt;
        setCoins(nextCoins);
        setLastCoinEarnedAt(nextAt);
        if (earned || isNewEconomy || storedCoins == null || storedAt == null) {
          AsyncStorage.multiSet([[COINS_KEY, String(nextCoins)], [COINS_LAST_EARNED_AT_KEY, String(nextAt)], [COINS_VERSION_KEY, COINS_VERSION]]).catch(() => {});
        }
      }),
      AsyncStorage.getItem(COLLECTION_KEY).then((value) => {
        if (value) setCollection(JSON.parse(value) as OwnedCard[]);
      }),
      AsyncStorage.getItem(BINDER_KEY).then((value) => {
        if (!value) return;
        const parsed = JSON.parse(value) as (string | null)[];
        if (Array.isArray(parsed)) setBinderSlots(withTrailingPage(parsed));
      }),
      loadCatalog(),
    ]).finally(() => setLocalReady(true));
  }, []);

  useEffect(() => {
    if (!localReady || !user) return;
    let mounted = true;
    remoteSynced.current = false;
    setRemoteReady(false);

    const syncAccount = async () => {
      const local = snapshot.current;
      const { data, error } = await supabase
        .from('booster_player_state')
        .select('coins, last_coin_earned_at, collection, binder_slots')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!mounted) return;

      const remoteCollection = Array.isArray(data?.collection) ? (data.collection as OwnedCard[]) : [];
      const remoteBinder = Array.isArray(data?.binder_slots)
        ? withTrailingPage(data.binder_slots as (string | null)[])
        : emptyPage();
      const nextCollection = mergeOwned(local.collection, remoteCollection);
      const nextBinder = mergeBinder(local.binderSlots, remoteBinder);
      const savedCoins = Math.max(0, Number(data?.coins) || 0);
      const savedAt = Date.parse(data?.last_coin_earned_at ?? '');
      const baseAt = Number.isFinite(savedAt) ? savedAt : local.lastCoinEarnedAt;
      const earnLoginBonus = Date.now() - baseAt >= COIN_INTERVAL_MS;
      const nextCoins = Math.max(savedCoins, local.coins) + (earnLoginBonus ? COINS_PER_INTERVAL : 0);
      const nextAt = earnLoginBonus ? Date.now() : baseAt;

      setCoins(nextCoins);
      setLastCoinEarnedAt(nextAt);
      setCollection(nextCollection);
      setBinderSlots(nextBinder);
      snapshot.current = { ...local, coins: nextCoins, lastCoinEarnedAt: nextAt, collection: nextCollection, binderSlots: nextBinder };
      AsyncStorage.multiSet([
        [COINS_KEY, String(nextCoins)],
        [COINS_LAST_EARNED_AT_KEY, String(nextAt)],
        [COINS_VERSION_KEY, COINS_VERSION],
        [COLLECTION_KEY, JSON.stringify(nextCollection)],
        [BINDER_KEY, JSON.stringify(nextBinder)],
      ]).catch(() => {});

      remoteSynced.current = true;
      const { error: saveError } = await supabase.from('booster_player_state').upsert({
        user_id: user.id,
        coins: nextCoins,
        last_coin_earned_at: new Date(nextAt).toISOString(),
        collection: nextCollection,
        binder_slots: nextBinder,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      if (saveError && error) {
        console.warn('Sauvegarde compte impossible', saveError.message);
      }
      if (mounted) setRemoteReady(true);
    };

    syncAccount();
    return () => { mounted = false; };
  }, [localReady, user?.id]);

  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const persistRemote = (changes: Partial<PlayerSnapshot>) => {
    const userId = snapshot.current.userId;
    if (!userId || !remoteSynced.current) return;
    const next = { ...snapshot.current, ...changes };
    snapshot.current = next;
    supabase.from('booster_player_state').upsert({
      user_id: userId,
      coins: next.coins,
      last_coin_earned_at: new Date(next.lastCoinEarnedAt).toISOString(),
      collection: next.collection,
      binder_slots: next.binderSlots,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' }).then(({ error }) => {
      if (error) console.warn('Sauvegarde compte impossible', error.message);
    });
  };

  const persistCoins = (next: number) => {
    const rounded = roundBerries(next);
    setCoins(rounded);
    AsyncStorage.setItem(COINS_KEY, String(rounded)).catch(() => {});
    persistRemote({ coins: rounded });
  };

  const reservedBinderCopies = (slots: (string | null)[]) => {
    const reserved = new Map<string, number>();
    for (const id of slots) {
      if (!id) continue;
      reserved.set(id, 1);
    }
    return reserved;
  };

  const sellFromCollection = (ids: string[]) => {
    const wanted = new Set(ids);
    const reserved = reservedBinderCopies(binderSlots);
    const amounts = new Map<string, number>();
    let payout = 0;
    for (const card of collection) {
      if (!wanted.has(card.id)) continue;
      const take = sellableCount(card, reserved.get(card.id) ?? 0);
      if (take <= 0) continue;
      amounts.set(card.id, take);
      payout += take * sellPrice(card);
    }
    if (amounts.size === 0) return 0;
    persistCollection(removeCopies(collection, amounts));
    persistCoins(coins + payout);
    return roundBerries(payout);
  };

  const persistCollection = (next: OwnedCard[]) => {
    setCollection(next);
    AsyncStorage.setItem(COLLECTION_KEY, JSON.stringify(next)).catch(() => {});
    persistRemote({ collection: next });
  };

  const persistBinder = (next: (string | null)[]) => {
    const slots = withTrailingPage(next);
    setBinderSlots(slots);
    AsyncStorage.setItem(BINDER_KEY, JSON.stringify(slots)).catch(() => {});
    persistRemote({ binderSlots: slots });
  };

  useEffect(() => {
    if (!localReady || !remoteReady || clock - lastCoinEarnedAt < COIN_INTERVAL_MS) return;
    const awardedAt = Date.now();
    const nextCoins = coins + COINS_PER_INTERVAL;
    setCoins(nextCoins);
    setLastCoinEarnedAt(awardedAt);
    AsyncStorage.multiSet([
      [COINS_KEY, String(nextCoins)],
      [COINS_LAST_EARNED_AT_KEY, String(awardedAt)],
      [COINS_VERSION_KEY, COINS_VERSION],
    ]).catch(() => {});
    persistRemote({ coins: nextCoins, lastCoinEarnedAt: awardedAt });
  }, [localReady, remoteReady, clock, lastCoinEarnedAt, coins]);

  const value = useMemo<GameContextValue>(
    () => ({
      ready: localReady && remoteReady,
      coins,
      coinsPerInterval: COINS_PER_INTERVAL,
      coinIntervalMs: COIN_INTERVAL_MS,
      nextCoinInMs: Math.max(0, COIN_INTERVAL_MS - (clock - lastCoinEarnedAt)),
      loginBonusReady: clock - lastCoinEarnedAt >= COIN_INTERVAL_MS,
      phase,
      tab,
      selectedSet,
      pulls,
      collection,
      binderSlots,
      pickSlot,
      selling,
      displayPacksRemaining: displayQueue.length,
      startSelling: () => {
        setSelling(true);
        setPickSlot(null);
        setPhase('select');
        setActiveTab('library');
      },
      sellCards: (cardIds) => sellFromCollection(cardIds),
      selectSet: (id) => {
        const set = BOOSTER_SETS.find((item) => item.id === id);
        if (!set || coins < boosterPrice(id)) return;
        persistCoins(coins - boosterPrice(id));
        setSelectedSet(set);
        setPulls(openBooster(id));
        setPickSlot(null);
        setSelling(false);
        setActiveTab('boosters');
        setPhase('inspect');
      },
      selectOp13Display: () => {
        if (coins < OP13_DISPLAY_PRICE) return;
        const set = BOOSTER_SETS.find((item) => item.id === 'op13');
        if (!set) return;
        persistCoins(coins - OP13_DISPLAY_PRICE);
        setDisplayQueue(op13DisplayQueue());
        setSelectedSet(set);
        setPulls([]);
        setPickSlot(null);
        setSelling(false);
        setActiveTab('boosters');
        setPhase('inspect');
      },
      startReveal: () => {
        const packId = displayQueue[0] ?? selectedSet?.id;
        const set = BOOSTER_SETS.find((item) => item.id === packId);
        if (!packId || !set) return;
        setSelectedSet(set);
        setPulls(openBooster(packId));
        setPhase('reveal');
      },
      finishReveal: () => {
        persistCollection(addPulls(collection, pulls));
        setPhase('summary');
      },
      continueDisplay: () => {
        if (displayQueue.length <= 1) {
          setDisplayQueue([]);
          setSelectedSet(null);
          setPulls([]);
          setPhase('select');
          return;
        }
        const nextQueue = displayQueue.slice(1);
        const nextSet = BOOSTER_SETS.find((item) => item.id === nextQueue[0]);
        setDisplayQueue(nextQueue);
        setSelectedSet(nextSet ?? null);
        setPulls([]);
        setPhase('inspect');
      },
      goHome: () => {
        setPickSlot(null);
        setSelling(false);
        setActiveTab('boosters');
        setPhase('select');
        setSelectedSet(null);
        setPulls([]);
        setDisplayQueue([]);
      },
      goLibrary: () => {
        setPhase('select');
        setActiveTab('library');
      },
      setTab: (next) => {
        setPhase('select');
        if (next !== 'library') {
          setPickSlot(null);
          setSelling(false);
        }
        setActiveTab(next);
      },
      pickBinderSlot: (slot) => {
        setPickSlot(slot);
        setSelling(false);
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
    [localReady, remoteReady, coins, clock, lastCoinEarnedAt, phase, tab, selectedSet, pulls, collection, binderSlots, pickSlot, selling, displayQueue],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}
