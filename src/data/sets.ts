import type { BoosterSet } from './types';

/** Local test only. Must be `false` / `0` before any commit / push. */
export const DEV_SHELF_OP13_HITS = false;
export const DEV_GRANT_BERRIES = 0;

export const BOOSTER_PRICES: Record<string, number> = {
  op01: 9,
  op02: 5,
  op03: 5,
  op04: 5,
  op05: 12,
  op06: 5,
  op07: 5,
  op08: 6,
  op09: 11,
  op10: 8,
  op11: 11,
  op12: 8,
  op13: 9,
  'op13-hits': 90,
  op14: 7,
  op15: 7,
  op16: 7,
  op17: 8,
  eb01: 6,
};

export function boosterPrice(setId: string): number {
  return BOOSTER_PRICES[setId] ?? 10;
}

function daySeed(day: string) {
  return [...day].reduce((seed, char) => (seed * 31 + char.charCodeAt(0)) >>> 0, 2166136261);
}

/** Shop day flips at local noon, not midnight. */
export function shopDayKey(date = new Date()): string {
  const shifted = new Date(date);
  if (shifted.getHours() < 12) shifted.setDate(shifted.getDate() - 1);
  return `${shifted.getFullYear()}-${shifted.getMonth() + 1}-${shifted.getDate()}`;
}

/** Three daily featured packs. OP-13 or OP-17 is guaranteed; both appear on one day out of four. */
export function dailyBoosterIds(date = new Date()): string[] {
  const day = shopDayKey(date);
  let seed = daySeed(day);
  const next = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed;
  };
  const featured = [next() % 2 === 0 ? 'op13' : 'op17'];
  if (next() % 4 === 0) featured.push(featured[0] === 'op13' ? 'op17' : 'op13');

  const candidates = BOOSTER_SETS.filter(
    (set) => !set.guaranteedHit && set.id !== 'op13-hits' && !featured.includes(set.id),
  ).map((set) => set.id);
  while (featured.length < 3 && candidates.length) {
    featured.push(candidates.splice(next() % candidates.length, 1)[0]);
  }
  if (!DEV_SHELF_OP13_HITS) return featured;
  return ['op13-hits', ...featured.filter((id) => id !== 'op13' && id !== 'op13-hits')].slice(0, 3);
}

export const BOOSTER_SETS: BoosterSet[] = [
  {
    id: 'op01',
    code: 'OP-01',
    name: 'Romance Dawn',
    tagline: 'L’équipage prend la mer',
    packFrom: '#8b1a1a',
    packTo: '#1a0a0a',
    ribbon: '#e8c36a',
    folder: 'op01',
    tcgProductId: 450085,
  },
  {
    id: 'op02',
    code: 'OP-02',
    name: 'Paramount War',
    tagline: 'Marineford s’embrase',
    packFrom: '#1b2a4a',
    packTo: '#070b16',
    ribbon: '#7eb6ff',
    folder: 'op02',
    tcgProductId: 455865,
  },
  {
    id: 'op03',
    code: 'OP-03',
    name: 'Pillars of Strength',
    tagline: 'Les piliers du gouvernement',
    packFrom: '#2a1848',
    packTo: '#0c0818',
    ribbon: '#c9a6ff',
    folder: 'op03',
    tcgProductId: 477175,
  },
  {
    id: 'op05',
    code: 'OP-05',
    name: 'Awakening of the New Era',
    tagline: 'L’éveil d’une ère',
    packFrom: '#0f3d32',
    packTo: '#061410',
    ribbon: '#7dffc2',
    folder: 'op05',
    tcgProductId: 498733,
  },
  {
    id: 'op06',
    code: 'OP-06',
    name: 'Wings of the Captain',
    tagline: 'Les ailes du capitaine',
    packFrom: '#4a2a08',
    packTo: '#140c04',
    ribbon: '#ffb347',
    folder: 'op06',
    tcgProductId: 515077,
  },
  {
    id: 'op09',
    code: 'OP-09',
    name: 'Emperors in the New World',
    tagline: 'Les empereurs s’affrontent',
    packFrom: '#3a0c18',
    packTo: '#0e0408',
    ribbon: '#ff6b8a',
    folder: 'op09',
    tcgProductId: 563833,
  },
  {
    id: 'eb01',
    code: 'EB-01',
    name: 'Memorial Collection',
    tagline: 'Souvenirs de Grand Line',
    packFrom: '#14303a',
    packTo: '#061014',
    ribbon: '#f4ead2',
    folder: 'eb01',
    tcgProductId: 521160,
  },
  {
    id: 'op13',
    code: 'OP-13',
    name: 'Carrying On His Will',
    tagline: 'Porter sa volonté',
    packFrom: '#102040',
    packTo: '#050814',
    ribbon: '#6cb6ff',
    folder: 'op13',
    tcgProductId: 628351,
  },
  {
    id: 'op13-hits',
    code: 'OP-13-HITS',
    name: 'Carrying On His Will',
    tagline: 'Test · hit garanti (SEC / AA / manga)',
    packFrom: '#5a3a08',
    packTo: '#140c04',
    ribbon: '#ffd36b',
    folder: 'op13',
    catalogCode: 'OP-13',
    tcgProductId: 628351,
    guaranteedHit: true,
  },
  {
    id: 'op14',
    code: 'OP-14',
    name: 'The Azure Sea’s Seven',
    tagline: 'Les sept grands corsaires',
    packFrom: '#123a62',
    packTo: '#061018',
    ribbon: '#7ec8ff',
    folder: 'op14-eb04',
    catalogCode: 'OP14-EB04',
    tcgProductId: 666577,
  },
  {
    id: 'op15',
    code: 'OP-15',
    name: 'Adventure on Kami’s Island',
    tagline: 'Aventure sur l’île de Dieu',
    packFrom: '#6a4a10',
    packTo: '#160e04',
    ribbon: '#ffd36b',
    folder: 'op15-eb04',
    catalogCode: 'OP15-EB04',
    tcgProductId: 682056,
  },
  {
    id: 'op16',
    code: 'OP-16',
    name: 'The Time of Battle',
    tagline: 'L’heure de la guerre',
    packFrom: '#1a2448',
    packTo: '#08060c',
    ribbon: '#ff6b6b',
    folder: 'op16',
    tcgProductId: 689341,
  },
  {
    id: 'op17',
    code: 'OP-17',
    name: 'The World’s Strongest Warriors',
    tagline: 'Les plus forts du monde',
    packFrom: '#1a3a22',
    packTo: '#08140c',
    ribbon: '#e8c36a',
    folder: 'op17',
    tcgProductId: 704756,
  },
];
