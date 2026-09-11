import { CARD_POOL } from './cards';
import { getCachedSetCards } from './catalog';
import { BOOSTER_SETS } from './sets';
import type { CardDef, Finish, PulledCard } from './types';

/**
 * English 12-card booster, OP.LOG / community case data (June 2026).
 * Bandai does not publish a full official table.
 *
 * 7 Common + 3 Uncommon + 1 Rare + 1 hit
 * Hit is most often a 2nd Rare; SR ~1/3.4; AA ~1/24; SEC ~1/36; LAA ~1/72; manga ~1/1152.
 * Extra boosters (no UC): 10 Common + 1 Rare + 1 hit.
 */
type HitKey = Exclude<Finish, 'base' | 'poster'> | 'sec' | 'sr' | 'leader' | 'rare';

const HIT_TABLE: { key: HitKey; p: number }[] = [
  { key: 'saa', p: 1 / 5760 },
  { key: 'manga', p: 1 / 1152 },
  { key: 'tr', p: 1 / 288 },
  { key: 'sp', p: 1 / 144 },
  { key: 'laa', p: 1 / 72 },
  { key: 'sec', p: 1 / 36 },
  { key: 'aa', p: 1 / 24 },
  { key: 'sr', p: 1 / 3.4 },
  { key: 'leader', p: 1 / 12 },
];

const CHASE_KEYS: HitKey[] = ['saa', 'manga', 'tr', 'sp', 'laa', 'sec', 'aa'];

type Buckets = Record<string, CardDef[]>;

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function pulled(card: CardDef, index: number): PulledCard {
  return { ...card, pullId: `${card.id}-${index}-${Math.random().toString(36).slice(2, 7)}` };
}

function empty(): CardDef[] {
  return [];
}

function bucket(pool: CardDef[]): Buckets {
  const buckets: Buckets = {
    C: empty(),
    UC: empty(),
    R: empty(),
    SR: empty(),
    SEC: empty(),
    L: empty(),
    SP: empty(),
    TR: empty(),
    aa: empty(),
    manga: empty(),
    sp: empty(),
    tr: empty(),
    laa: empty(),
    saa: empty(),
    sec: empty(),
    sr: empty(),
    leader: empty(),
  };

  for (const card of pool) {
    const finish = card.finish ?? 'base';
    if (finish === 'base') {
      buckets[card.rarity]?.push(card);
      if (card.rarity === 'SR') buckets.sr.push(card);
      if (card.rarity === 'SEC') buckets.sec.push(card);
      if (card.rarity === 'L') buckets.leader.push(card);
      if (card.rarity === 'SP') buckets.sp.push(card);
      if (card.rarity === 'TR') buckets.tr.push(card);
    } else if (finish === 'poster') {
      buckets.sp.push(card);
    } else {
      buckets[finish]?.push(card);
    }
  }
  return buckets;
}

function draw(list: CardDef[], used: Set<string>): CardDef | null {
  if (!list.length) return null;
  const available = list.filter((card) => !used.has(card.id));
  const card = pick(available.length ? available : list);
  used.add(card.id);
  return card;
}

function rollHit(buckets: Buckets, guaranteedHit: boolean): HitKey {
  if (guaranteedHit) {
    const chase = CHASE_KEYS.filter((key) => buckets[key]?.length);
    if (!chase.length) return 'sec';
    return pick(chase);
  }

  let roll = Math.random();
  for (const { key, p } of HIT_TABLE) {
    if (roll < p) return buckets[key]?.length ? key : 'rare';
    roll -= p;
  }
  return 'rare';
}

export function openBooster(setId: string): PulledCard[] {
  const set = BOOSTER_SETS.find((item) => item.id === setId);
  const pool = getCachedSetCards(setId);
  const buckets = bucket(pool);
  const used = new Set<string>();
  const extra = buckets.UC.length === 0;
  const hit = rollHit(buckets, Boolean(set?.guaranteedHit));

  let commons = extra ? 10 : 7;
  let uncommons = extra ? 0 : 3;
  let rares = 1;

  // Leader packs in English product: 1 leader + 2 rares (one fewer common).
  if (hit === 'leader') {
    commons -= 1;
    rares = 2;
  }
  if (hit === 'rare') {
    rares = 2;
  }

  const pack: CardDef[] = [];
  const take = (list: CardDef[], count: number) => {
    for (let i = 0; i < count; i += 1) {
      const card = draw(list, used) ?? draw(buckets.C, used) ?? pick(pool.length ? pool : CARD_POOL);
      pack.push(card);
    }
  };

  take(buckets.C, commons);
  take(buckets.UC, uncommons);
  take(buckets.R, rares);
  if (hit !== 'rare') {
    const card = draw(buckets[hit], used);
    if (card) pack.push(card);
    else take(buckets.R, 1);
  }

  while (pack.length < 12) {
    const card = draw(buckets.C, used);
    if (!card) break;
    pack.push(card);
  }

  return pack.slice(0, 12).map((card, index) => pulled(card, index));
}
