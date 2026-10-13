import type { Finish, PulledCard, Rarity } from './types';

const HIT_FINISHES = new Set<Finish>(['aa', 'manga', 'tr', 'laa', 'saa', 'poster']);
const HIT_RARITIES = new Set<Rarity>(['SEC', 'TR']);

export function isSpecialCard(card: Pick<PulledCard, 'finish' | 'rarity' | 'variantLabel'>) {
  return card.finish === 'sp' || card.variantLabel === 'SP' || card.rarity === 'SP';
}

/** Hits = SEC / AA / manga / SAA / LAA / TR / poster. SP reprints are not hits. */
export function isHitCard(card: Pick<PulledCard, 'finish' | 'rarity' | 'variantLabel'>): boolean {
  if (isSpecialCard(card)) return false;
  const finish = card.finish ?? 'base';
  if (HIT_FINISHES.has(finish)) return true;
  return finish === 'base' && HIT_RARITIES.has(card.rarity);
}
