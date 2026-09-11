export type ColorId = 'red' | 'green' | 'blue' | 'purple' | 'black' | 'yellow';
export type Rarity = 'C' | 'UC' | 'R' | 'SR' | 'SEC' | 'L' | 'SP' | 'TR';
export type CardKind = 'Character' | 'Event' | 'Stage' | 'Leader';
export type Finish = 'base' | 'aa' | 'manga' | 'sp' | 'tr' | 'laa' | 'saa' | 'poster';

export type BoosterSet = {
  id: string;
  code: string;
  name: string;
  tagline: string;
  packFrom: string;
  packTo: string;
  ribbon: string;
  folder: string;
  catalogCode?: string;
  guaranteedHit?: boolean;
};

export type CardDef = {
  id: string;
  name: string;
  subtitle: string;
  color: ColorId;
  rarity: Rarity;
  kind: CardKind;
  cost: number;
  power?: number;
  counter?: number;
  setId: string;
  motif: string;
  imageUrl?: string;
  finish?: Finish;
  variantLabel?: string;
};

export type PulledCard = CardDef & { pullId: string };
