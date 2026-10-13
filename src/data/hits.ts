import type { Finish, PulledCard, Rarity } from './types';

const HIT_FINISHES = new Set<Finish>(['aa', 'manga', 'tr', 'laa', 'saa', 'poster', 'sp']);
const HIT_RARITIES = new Set<Rarity>(['SEC', 'TR', 'SP']);

export function isSpecialCard(card: Pick<PulledCard, 'finish' | 'rarity' | 'variantLabel'>) {
  return card.finish === 'sp' || card.variantLabel === 'SP' || card.rarity === 'SP';
}

/** Hits = SP / SEC / AA / manga / SAA / LAA / TR / poster. SP always beats SR. */
export function isHitCard(card: Pick<PulledCard, 'finish' | 'rarity' | 'variantLabel'>): boolean {
  if (isSpecialCard(card)) return true;
  const finish = card.finish ?? 'base';
  if (HIT_FINISHES.has(finish)) return true;
  return HIT_RARITIES.has(card.rarity);
}
