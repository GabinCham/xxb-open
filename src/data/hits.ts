import type { Finish, PulledCard, Rarity } from './types';

const CHASE_FINISHES = new Set<Finish>(['aa', 'manga', 'sp', 'tr', 'laa', 'saa', 'poster']);
const CHASE_RARITIES = new Set<Rarity>(['SEC', 'SP', 'TR']);

export function isHitCard(card: Pick<PulledCard, 'finish' | 'rarity'>): boolean {
  const finish = card.finish ?? 'base';
  if (CHASE_FINISHES.has(finish)) return true;
  return finish === 'base' && CHASE_RARITIES.has(card.rarity);
}
