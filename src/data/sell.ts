import type { OwnedCard } from './collection';

export const SELL_RARITIES = ['C', 'UC', 'R', 'SR'] as const;

const SELL_PRICES: Record<string, number> = {
  C: 0.02,
  UC: 0.05,
  R: 0.1,
  SR: 0.5,
  L: 1,
  AA: 1.5,
  SEC: 2,
  SP: 2,
  POSTER: 2,
  TR: 3,
  LAA: 3,
  SAA: 5,
  MANGA: 10,
};

export function cardSellKey(card: Pick<OwnedCard, 'rarity' | 'variantLabel'>) {
  return card.variantLabel ?? card.rarity;
}

export function sellPrice(card: Pick<OwnedCard, 'rarity' | 'variantLabel'>) {
  return SELL_PRICES[cardSellKey(card)] ?? SELL_PRICES[card.rarity] ?? 0.02;
}

export function sellableCount(card: OwnedCard, reserved = 0) {
  return Math.max(0, card.count - reserved);
}

export function removeCopies(collection: OwnedCard[], amounts: Map<string, number>): OwnedCard[] {
  return collection
    .map((card) => {
      const take = amounts.get(card.id) ?? 0;
      if (take <= 0) return card;
      return { ...card, count: card.count - take };
    })
    .filter((card) => card.count > 0);
}
