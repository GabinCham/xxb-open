import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { useAuth } from '../auth/AuthContext';
import { roundBerries } from '../data/berries';
import { addPulls, repairCollection, type OwnedCard } from '../data/collection';
import { loadCatalog } from '../data/catalog';
import { isHitCard } from '../data/hits';
import { openBooster } from '../data/openPack';
import { removeCopies, sellableCount, sellPrice } from '../data/sell';
import { BOOSTER_SETS, boosterPrice, DEV_GRANT_BERRIES } from '../data/sets';
import { emptyOpenStats, packStatId, parseOpenStats, type OpenStats } from '../data/stats';
import type { BoosterSet, PulledCard } from '../data/types';
import { supabase } from '../lib/supabase';

const COINS_KEY = 'op-tcg-coins';
const COINS_LAST_EARNED_AT_KEY = 'op-tcg-coins-last-earned-at';
const COINS_VERSION_KEY = 'op-tcg-coins-version';
const COLLECTION_KEY = 'op-tcg-collection';
const BINDER_KEY = 'op-tcg-binder';
const STATS_KEY = 'op-tcg-open-stats';
const DISPLAY_KEY = 'op-tcg-display-progress';
const WELCOME_KEY = 'op-tcg-welcome-gift';
const GAME_KEYS = [
  COINS_KEY,
  COINS_LAST_EARNED_AT_KEY,
  COINS_VERSION_KEY,
  COLLECTION_KEY,
  BINDER_KEY,
  STATS_KEY,
  DISPLAY_KEY,
  WELCOME_KEY,
];
const WELCOME_PACK = 'op13';
const WELCOME_CLAIMED = 'claimed';
const PAGE = 4;
const COINS_PER_INTERVAL = 60;
const COIN_INTERVAL_MS = 15 * 60 * 1000;
const STARTING_COINS = 60;
const COINS_VERSION = '3';
export const OP13_DISPLAY_PRICE = 1500;
export const OP13_DISPLAY_PACKS = 24;
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

type DisplayProgress = { epoch: number; queue: string[] };

type PlayerSnapshot = {
  userId: string | null;
  coins: number;
  lastCoinEarnedAt: number;
  collection: OwnedCard[];
  binderSlots: (string | null)[];
  stats: OpenStats;
  display: DisplayProgress;
  welcomeGift: string | null;
};

function emptyDisplay(): DisplayProgress {
  return { epoch: 0, queue: [] };
}

function parseDisplay(value: unknown): DisplayProgress {
  const allowed = (id: unknown): id is string => id === 'op13' || id === 'op13-hits';
  if (Array.isArray(value)) {
    const queue = value.filter(allowed);
    return { epoch: queue.length ? 1 : 0, queue };
  }
  if (!value || typeof value !== 'object') return emptyDisplay();
  const raw = value as { epoch?: unknown; queue?: unknown };
  const queue = Array.isArray(raw.queue) ? raw.queue.filter(allowed) : [];
  return { epoch: Math.max(0, Math.floor(Number(raw.epoch) || 0)), queue };
}

function parseWelcomeGift(value: unknown): string | null {
  if (value == null || value === '') return null;
  const text = String(value);
  if (text === WELCOME_CLAIMED) return WELCOME_CLAIMED;
  return BOOSTER_SETS.some((set) => set.id === text) ? text : WELCOME_PACK;
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
  openStats: OpenStats;
  displayPacksRemaining: number;
  displaySession: boolean;
  welcomeGiftPackId: string | null;
  openingGift: boolean;
  openWelcomeGift: () => void;
  startSelling: () => void;
  sellCards: (amounts: Record<string, number>) => number;
  selectSet: (id: string) => void;
  selectOp13Display: () => void;
  resumeDisplay: () => void;
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
  const [openStats, setOpenStats] = useState<OpenStats>(emptyOpenStats);
  const [display, setDisplay] = useState<DisplayProgress>(emptyDisplay);
  const [displaySession, setDisplaySession] = useState(false);
  const [welcomeGift, setWelcomeGift] = useState<string | null>(null);
  const [openingGift, setOpeningGift] = useState(false);
  const remoteSynced = useRef(false);
  const hadUser = useRef(false);
  const snapshot = useRef<PlayerSnapshot>({
    userId: user?.id ?? null,
    coins,
    lastCoinEarnedAt,
    collection,
    binderSlots,
    stats: openStats,
    display,
    welcomeGift,
  });
  snapshot.current = {
    userId: user?.id ?? null,
    coins,
    lastCoinEarnedAt,
    collection,
    binderSlots,
    stats: openStats,
    display,
    welcomeGift,
  };

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(COINS_VERSION_KEY).then(async (version) => {
        if (version !== COINS_VERSION) {
          await AsyncStorage.multiRemove(GAME_KEYS);
        }
        const [storedCoins, storedAt] = await Promise.all([
          AsyncStorage.getItem(COINS_KEY),
          AsyncStorage.getItem(COINS_LAST_EARNED_AT_KEY),
        ]);
        const savedCoins = storedCoins == null ? Number.NaN : Number(storedCoins);
        const savedAt = storedAt == null ? Number.NaN : Number(storedAt);
        const loadedCoins = Number.isFinite(savedCoins) ? savedCoins : STARTING_COINS;
        const baseCoins = DEV_GRANT_BERRIES ? Math.max(loadedCoins, DEV_GRANT_BERRIES) : loadedCoins;
        const baseAt = Number.isFinite(savedAt) && savedAt > 0 ? savedAt : Date.now();
        const earned = Date.now() - baseAt >= COIN_INTERVAL_MS ? 1 : 0;
        const nextCoins = baseCoins + earned * COINS_PER_INTERVAL;
        const nextAt = earned ? Date.now() : baseAt;
        setCoins(nextCoins);
        setLastCoinEarnedAt(nextAt);
        if (earned || version !== COINS_VERSION || storedCoins == null || storedAt == null) {
          AsyncStorage.multiSet([[COINS_KEY, String(nextCoins)], [COINS_LAST_EARNED_AT_KEY, String(nextAt)], [COINS_VERSION_KEY, COINS_VERSION]]).catch(() => {});
        }
      }),
      AsyncStorage.getItem(COLLECTION_KEY).then((value) => {
        if (value) setCollection(repairCollection(JSON.parse(value) as OwnedCard[]));
      }),
      AsyncStorage.getItem(BINDER_KEY).then((value) => {
        if (!value) return;
        const parsed = JSON.parse(value) as (string | null)[];
        if (Array.isArray(parsed)) setBinderSlots(withTrailingPage(parsed));
      }),
      AsyncStorage.getItem(STATS_KEY).then((value) => {
        if (value) setOpenStats(parseOpenStats(JSON.parse(value)));
      }),
      AsyncStorage.getItem(DISPLAY_KEY).then((value) => {
        if (value) setDisplay(parseDisplay(JSON.parse(value)));
      }),
      AsyncStorage.getItem(WELCOME_KEY).then((value) => {
        if (value) setWelcomeGift(parseWelcomeGift(value));
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
      const accountSelect =
        'coins, last_coin_earned_at, collection, binder_slots, boosters_opened, hits_pulled, berries_spent, display_progress, welcome_gift';
      let { data, error } = await supabase
        .from('booster_player_state')
        .select(accountSelect)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) {
        const fallback = await supabase
          .from('booster_player_state')
          .select('coins, last_coin_earned_at, collection, binder_slots, boosters_opened, hits_pulled, berries_spent, display_progress')
          .eq('user_id', user.id)
          .maybeSingle();
        data = fallback.data;
        error = fallback.error;
      }

      if (!mounted) return;

      if (error && !data) {
        if (mounted) setRemoteReady(true);
        return;
      }

      const hasRemote = data != null;
      const remoteCollection = Array.isArray(data?.collection) ? (data.collection as OwnedCard[]) : [];
      const remoteBinder = Array.isArray(data?.binder_slots)
        ? withTrailingPage(data.binder_slots as (string | null)[])
        : emptyPage();
      const remoteStats = parseOpenStats({
        boostersOpened: data?.boosters_opened,
        hitsPulled: data?.hits_pulled,
        berriesSpent: data?.berries_spent,
      });
      const savedCoins = Math.max(0, Number(data?.coins) || 0);
      const savedAt = Date.parse(data?.last_coin_earned_at ?? '');
      const baseAt = Number.isFinite(savedAt) ? savedAt : local.lastCoinEarnedAt;
      const earnLoginBonus = Date.now() - baseAt >= COIN_INTERVAL_MS;
      const nextCollection = repairCollection(hasRemote ? remoteCollection : local.collection);
      const nextBinder = hasRemote ? remoteBinder : withTrailingPage(local.binderSlots);
      const nextStats = hasRemote ? remoteStats : local.stats;
      const nextDisplay = hasRemote ? parseDisplay(data?.display_progress) : local.display;
      const nextWelcomeGift = hasRemote
        ? (parseWelcomeGift(data?.welcome_gift) ?? WELCOME_PACK)
        : (local.welcomeGift ?? WELCOME_PACK);
      const mergedCoins = hasRemote ? savedCoins : Math.max(local.coins, DEV_GRANT_BERRIES);
      const nextCoins = mergedCoins + (earnLoginBonus ? COINS_PER_INTERVAL : 0);
      const nextAt = earnLoginBonus ? Date.now() : baseAt;

      setCoins(nextCoins);
      setLastCoinEarnedAt(nextAt);
      setCollection(nextCollection);
      setBinderSlots(nextBinder);
      setOpenStats(nextStats);
      setDisplay(nextDisplay);
      setWelcomeGift(nextWelcomeGift);
      snapshot.current = { ...local, coins: nextCoins, lastCoinEarnedAt: nextAt, collection: nextCollection, binderSlots: nextBinder, stats: nextStats, display: nextDisplay, welcomeGift: nextWelcomeGift };
      AsyncStorage.multiSet([
        [COINS_KEY, String(nextCoins)],
        [COINS_LAST_EARNED_AT_KEY, String(nextAt)],
        [COINS_VERSION_KEY, COINS_VERSION],
        [COLLECTION_KEY, JSON.stringify(nextCollection)],
        [BINDER_KEY, JSON.stringify(nextBinder)],
        [STATS_KEY, JSON.stringify(nextStats)],
        [DISPLAY_KEY, JSON.stringify(nextDisplay)],
        [WELCOME_KEY, nextWelcomeGift ?? ''],
      ]).catch(() => {});

      remoteSynced.current = true;
      if (!hasRemote || earnLoginBonus) {
        const { error: saveError } = await supabase.from('booster_player_state').upsert({
          user_id: user.id,
          coins: nextCoins,
          last_coin_earned_at: new Date(nextAt).toISOString(),
          collection: nextCollection,
          binder_slots: nextBinder,
          boosters_opened: nextStats.boostersOpened,
          hits_pulled: nextStats.hitsPulled,
          berries_spent: nextStats.berriesSpent,
          display_progress: nextDisplay,
          welcome_gift: nextWelcomeGift,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
        if (saveError && error) {
          console.warn('Sauvegarde compte impossible', saveError.message);
        }
      }
      if (mounted) setRemoteReady(true);
    };

    syncAccount();
    return () => { mounted = false; };
  }, [localReady, user?.id]);

  useEffect(() => {
    if (user) {
      hadUser.current = true;
      return;
    }
    if (!hadUser.current) {
      setRemoteReady(true);
      return;
    }
    hadUser.current = false;
    remoteSynced.current = false;
    setRemoteReady(true);
    setCoins(STARTING_COINS);
    setLastCoinEarnedAt(Date.now());
    setCollection([]);
    setBinderSlots(emptyPage());
    setOpenStats(emptyOpenStats());
    setDisplay(emptyDisplay());
    setWelcomeGift(null);
    AsyncStorage.multiRemove(GAME_KEYS).catch(() => {});
  }, [user]);

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
      boosters_opened: next.stats.boostersOpened,
      hits_pulled: next.stats.hitsPulled,
      berries_spent: next.stats.berriesSpent,
      display_progress: next.display,
      welcome_gift: next.welcomeGift,
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

  const sellFromCollection = (wanted: Record<string, number>) => {
    const reserved = reservedBinderCopies(binderSlots);
    const amounts = new Map<string, number>();
    let payout = 0;
    for (const card of collection) {
      const take = Math.min(
        Math.max(0, Math.floor(Number(wanted[card.id]) || 0)),
        sellableCount(card, reserved.get(card.id) ?? 0),
      );
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

  const persistStats = (next: OpenStats) => {
    setOpenStats(next);
    AsyncStorage.setItem(STATS_KEY, JSON.stringify(next)).catch(() => {});
    persistRemote({ stats: next });
  };

  const persistDisplay = (next: DisplayProgress) => {
    setDisplay(next);
    AsyncStorage.setItem(DISPLAY_KEY, JSON.stringify(next)).catch(() => {});
    persistRemote({ display: next });
  };

  const persistWelcomeGift = (next: string | null) => {
    setWelcomeGift(next);
    AsyncStorage.setItem(WELCOME_KEY, next ?? '').catch(() => {});
    persistRemote({ welcomeGift: next });
  };

  useEffect(() => {
    if (!localReady || !remoteReady || (user && !remoteSynced.current)) return;
    if (clock - lastCoinEarnedAt < COIN_INTERVAL_MS) return;
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
  }, [localReady, remoteReady, user, clock, lastCoinEarnedAt, coins]);

  const value = useMemo<GameContextValue>(
    () => ({
      ready: localReady && (!user || remoteReady),
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
      openStats,
      displayPacksRemaining: display.queue.length,
      displaySession,
      welcomeGiftPackId: welcomeGift && welcomeGift !== WELCOME_CLAIMED ? welcomeGift : null,
      openingGift,
      openWelcomeGift: () => {
        if (!welcomeGift || welcomeGift === WELCOME_CLAIMED) return;
        const pack = BOOSTER_SETS.find((item) => item.id === welcomeGift);
        if (!pack) return;
        setOpeningGift(true);
        setDisplaySession(false);
        setSelectedSet(pack);
        setPulls([]);
        setPickSlot(null);
        setSelling(false);
        setActiveTab('boosters');
        setPhase('inspect');
      },
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
        persistStats({ ...openStats, berriesSpent: roundBerries(openStats.berriesSpent + boosterPrice(id)) });
        setOpeningGift(false);
        setDisplaySession(false);
        setSelectedSet(set);
        setPulls(openBooster(id));
        setPickSlot(null);
        setSelling(false);
        setActiveTab('boosters');
        setPhase('inspect');
      },
      resumeDisplay: () => {
        if (!display.queue.length) return;
        const pack = BOOSTER_SETS.find((item) => item.id === display.queue[0]);
        if (!pack) return;
        setOpeningGift(false);
        setDisplaySession(true);
        setSelectedSet(pack);
        setPulls([]);
        setPickSlot(null);
        setSelling(false);
        setActiveTab('boosters');
        setPhase('inspect');
      },
      selectOp13Display: () => {
        if (display.queue.length) return;
        if (coins < OP13_DISPLAY_PRICE) return;
        persistCoins(coins - OP13_DISPLAY_PRICE);
        persistStats({ ...openStats, berriesSpent: roundBerries(openStats.berriesSpent + OP13_DISPLAY_PRICE) });
        persistDisplay({ epoch: display.epoch + 1, queue: op13DisplayQueue() });
        setOpeningGift(false);
        setDisplaySession(false);
        setSelectedSet(null);
        setPulls([]);
        setPickSlot(null);
        setSelling(false);
        setActiveTab('boosters');
        setPhase('select');
      },
      startReveal: () => {
        const packId = selectedSet?.id;
        const set = BOOSTER_SETS.find((item) => item.id === packId);
        if (!packId || !set) return;
        setSelectedSet(set);
        setPulls(openBooster(packId));
        setPhase('reveal');
      },
      finishReveal: () => {
        persistCollection(addPulls(collection, pulls));
        const packId = packStatId(selectedSet?.id ?? '');
        persistStats({
          ...openStats,
          boostersOpened: packId
            ? { ...openStats.boostersOpened, [packId]: (openStats.boostersOpened[packId] ?? 0) + 1 }
            : openStats.boostersOpened,
          hitsPulled: openStats.hitsPulled + pulls.filter(isHitCard).length,
        });
        if (displaySession && display.queue.length) {
          persistDisplay({ ...display, queue: display.queue.slice(1) });
        }
        if (openingGift) {
          persistWelcomeGift(WELCOME_CLAIMED);
          setOpeningGift(false);
        }
        setPhase('summary');
      },
      continueDisplay: () => {
        if (!display.queue.length) {
          setDisplaySession(false);
          setSelectedSet(null);
          setPulls([]);
          setPhase('select');
          return;
        }
        const nextSet = BOOSTER_SETS.find((item) => item.id === display.queue[0]);
        setSelectedSet(nextSet ?? null);
        setPulls([]);
        setPhase('inspect');
      },
      goHome: () => {
        setPickSlot(null);
        setSelling(false);
        setActiveTab('boosters');
        setPhase('select');
        setDisplaySession(false);
        setOpeningGift(false);
        setSelectedSet(null);
        setPulls([]);
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
    [localReady, remoteReady, user, coins, clock, lastCoinEarnedAt, phase, tab, selectedSet, pulls, collection, binderSlots, pickSlot, selling, openStats, display, displaySession, welcomeGift, openingGift],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}
