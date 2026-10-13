import type { OwnedCard } from './collection';

export const SELL_RARITIES = ['C', 'UC', 'R', 'SR'] as const;

/** C = 0,02 Berry pour ~0,07 $ : hits calés sur les médianes TCGplayer (oct. 2026). */
const SELL_PRICES: Record<string, number> = {
  C: 0.02,
  UC: 0.05,
  R: 0.1,
  SR: 0.5,
  L: 0.05,
  SEC: 1.8,
  AA: 4.7,
  LAA: 11.5,
  TR: 15.3,
  SP: 50.2,
  POSTER: 60.6,
  MANGA: 318,
  SAA: 540,
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
