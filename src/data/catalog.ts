import { CARD_POOL } from './cards';
import { officialCardImage } from './images';
import { BOOSTER_SETS } from './sets';
import type { CardDef, CardKind, ColorId, Finish, Rarity } from './types';

type ApiCard = {
  card_name: string;
  set_id: string;
  rarity: string;
  card_set_id: string;
  card_color: string;
  card_type: string;
  card_cost: string | null;
  card_power: string | null;
  counter_amount: string | null;
  sub_types: string | null;
  card_image: string;
  card_image_id: string;
};

const COLOR_MAP: Record<string, ColorId> = {
  Red: 'red',
  Green: 'green',
  Blue: 'blue',
  Purple: 'purple',
  Black: 'black',
  Yellow: 'yellow',
};

const KIND_MAP: Record<string, CardKind> = {
  Character: 'Character',
  Event: 'Event',
  Stage: 'Stage',
  Leader: 'Leader',
};

const RARITY_MAP: Record<string, Rarity> = {
  C: 'C',
  UC: 'UC',
  R: 'R',
  SR: 'SR',
  SEC: 'SEC',
  L: 'L',
  SP: 'SP',
  TR: 'TR',
};

const cache: Record<string, CardDef[]> = {};

function parseNum(value: string | null): number | undefined {
  if (value == null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function classify(raw: ApiCard): { finish: Finish; variantLabel?: string } | null {
  const name = raw.card_name;
  if (/box topper/i.test(name)) return null;

  if (/manga/i.test(name)) return { finish: 'manga', variantLabel: 'MANGA' };
  if (/super alt|saa/i.test(name)) return { finish: 'saa', variantLabel: 'SAA' };
  if (/\(sp\)/i.test(name) || raw.rarity === 'SP') return { finish: 'sp', variantLabel: 'SP' };
  if (/\(tr\)/i.test(name) || raw.rarity === 'TR') return { finish: 'tr', variantLabel: 'TR' };
  if (/wanted poster/i.test(name)) return { finish: 'sp', variantLabel: 'POSTER' };

  const isAlt = /parallel|alternate art/i.test(name) || /_p\d/i.test(raw.card_image_id);
  if (isAlt && (raw.rarity === 'L' || raw.card_type === 'Leader')) {
    return { finish: 'laa', variantLabel: 'LAA' };
  }
  if (isAlt) return { finish: 'aa', variantLabel: 'AA' };
  return { finish: 'base' };
}

function mapCard(raw: ApiCard, setId: string): CardDef | null {
  if (/don/i.test(raw.card_type)) return null;
  const variant = classify(raw);
  if (!variant) return null;

  let rarity = RARITY_MAP[raw.rarity];
  if (!rarity && variant.finish === 'sp') rarity = 'SP';
  if (!rarity && variant.finish === 'tr') rarity = 'TR';
  const kind = KIND_MAP[raw.card_type];
  const color = COLOR_MAP[raw.card_color?.split(/[\/&]/)[0].trim()];
  if (!rarity || !kind || !color) return null;

  const cleanName = raw.card_name
    .replace(/\s*\(\d+\)\s*/g, ' ')
    .replace(/\s*\((Parallel|Alternate Art|Manga|SP|TR|Wanted Poster)\)\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    id: raw.card_image_id || raw.card_set_id,
    name: cleanName,
    subtitle: variant.variantLabel || raw.sub_types?.split(' ').slice(0, 3).join(' ') || raw.card_set_id,
    color,
    rarity,
    kind,
    cost: parseNum(raw.card_cost) ?? 0,
    power: parseNum(raw.card_power),
    counter: parseNum(raw.counter_amount),
    setId,
    motif: '☠',
    imageUrl: officialCardImage(raw.card_image, 700),
    finish: variant.finish,
    variantLabel: variant.variantLabel,
  };
}

async function fetchSetCards(set: { id: string; code: string; catalogCode?: string }): Promise<CardDef[]> {
  if (cache[set.id]?.length) return cache[set.id];
  const apiCode = set.catalogCode ?? set.code;
  const response = await fetch(`https://optcgapi.com/api/sets/${apiCode}/`);
  if (!response.ok) throw new Error(`Set ${set.code} unavailable`);
  const payload = (await response.json()) as ApiCard[] | { error?: string };
  if (!Array.isArray(payload)) throw new Error(`Set ${set.code} empty`);

  const unique = new Map<string, CardDef>();
  for (const raw of payload) {
    const card = mapCard(raw, set.id);
    if (card && !unique.has(card.id)) unique.set(card.id, card);
  }
  const list = [...unique.values()];
  cache[set.id] = list.length ? list : fallbackPool(set.id);
  return cache[set.id];
}

function fallbackPool(setId: string): CardDef[] {
  const set = BOOSTER_SETS.find((item) => item.id === setId);
  if (set?.catalogCode) {
    const source = BOOSTER_SETS.find((item) => item.code === set.catalogCode);
    if (source) {
      const fromSource = CARD_POOL.filter((card) => card.setId === source.id);
      if (fromSource.length) return fromSource;
    }
  }
  return CARD_POOL.filter((card) => card.setId === setId);
}

export function getCachedSetCards(setId: string): CardDef[] {
  if (cache[setId]?.length) return cache[setId];
  const set = BOOSTER_SETS.find((item) => item.id === setId);
  if (set?.catalogCode) {
    const source = BOOSTER_SETS.find((item) => item.code === set.catalogCode);
    if (source && cache[source.id]?.length) return cache[source.id];
  }
  return fallbackPool(setId);
}

export async function loadCatalog(): Promise<void> {
  await Promise.all(
    BOOSTER_SETS.map(async (set) => {
      try {
        await fetchSetCards(set);
      } catch {
        cache[set.id] = fallbackPool(set.id);
      }
    }),
  );
}
