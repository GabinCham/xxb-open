import type { CardDef, PulledCard } from './types';

export type OwnedCard = CardDef & { count: number };

const RARITY_RANK: Record<string, number> = {
  MANGA: 0,
  SAA: 1,
  TR: 2,
  SP: 3,
  POSTER: 4,
  LAA: 5,
  SEC: 6,
  AA: 7,
  SR: 8,
  L: 9,
  R: 10,
  UC: 11,
  C: 12,
};

export function collectionKey(card: CardDef): string {
  return card.id;
}

export function addPulls(collection: OwnedCard[], pulls: PulledCard[]): OwnedCard[] {
  const next = new Map(collection.map((card) => [collectionKey(card), { ...card }]));
  for (const pull of pulls) {
    const key = collectionKey(pull);
    const current = next.get(key);
    if (current) {
      current.count += 1;
    } else {
      const { pullId: _pullId, ...card } = pull;
      next.set(key, { ...card, count: 1 });
    }
  }
  return [...next.values()].sort(sortOwned);
}

export function sortOwned(a: OwnedCard, b: OwnedCard): number {
  const aRank = RARITY_RANK[a.variantLabel ?? a.rarity] ?? 50;
  const bRank = RARITY_RANK[b.variantLabel ?? b.rarity] ?? 50;
  if (aRank !== bRank) return aRank - bRank;
  return a.name.localeCompare(b.name);
}

export function collectionStats(collection: OwnedCard[]) {
  return {
    unique: collection.length,
    total: collection.reduce((sum, card) => sum + card.count, 0),
  };
}
