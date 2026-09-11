export const colors = {
  bg: '#07070c',
  bgElevated: '#12121c',
  gold: '#e8c36a',
  goldDim: '#a8843a',
  cream: '#f4ead2',
  muted: '#9a937f',
  white: '#fff8ea',
  danger: '#c44536',
};

export const colorInk: Record<string, { from: string; to: string; accent: string; label: string }> = {
  red: { from: '#7a1420', to: '#d4352c', accent: '#ff6b5a', label: 'Rouge' },
  green: { from: '#0f3d24', to: '#2f9e57', accent: '#6dff9c', label: 'Vert' },
  blue: { from: '#0d2a5c', to: '#2d6dff', accent: '#7eb6ff', label: 'Bleu' },
  purple: { from: '#3a1466', to: '#8a3dff', accent: '#d2a6ff', label: 'Violet' },
  black: { from: '#141418', to: '#3b3b48', accent: '#d0d0d8', label: 'Noir' },
  yellow: { from: '#6a4a00', to: '#e0b000', accent: '#ffe566', label: 'Jaune' },
};

export const rarityStyle: Record<string, { label: string; tint: string; glow: string }> = {
  C: { label: 'Commune', tint: '#b8b2a4', glow: 'transparent' },
  UC: { label: 'Peu commune', tint: '#7ed0a1', glow: 'rgba(126,208,161,0.25)' },
  R: { label: 'Rare', tint: '#6cb6ff', glow: 'rgba(108,182,255,0.35)' },
  SR: { label: 'Super Rare', tint: '#f0c24b', glow: 'rgba(240,194,75,0.5)' },
  SEC: { label: 'Secret', tint: '#ff6bd6', glow: 'rgba(255,107,214,0.55)' },
  L: { label: 'Leader', tint: '#ff8a3d', glow: 'rgba(255,138,61,0.5)' },
  SP: { label: 'Special', tint: '#c9f06c', glow: 'rgba(201,240,108,0.5)' },
  TR: { label: 'Treasure Rare', tint: '#f0e6a8', glow: 'rgba(240,230,168,0.55)' },
  MANGA: { label: 'Manga Rare', tint: '#f4ead2', glow: 'rgba(244,234,210,0.6)' },
  AA: { label: 'Alternate Art', tint: '#9ad7ff', glow: 'rgba(154,215,255,0.45)' },
  LAA: { label: 'Leader Alt Art', tint: '#ffb347', glow: 'rgba(255,179,71,0.5)' },
  SAA: { label: 'Super Alt Art', tint: '#e8fff4', glow: 'rgba(232,255,244,0.5)' },
  POSTER: { label: 'Wanted Poster', tint: '#d4b483', glow: 'rgba(212,180,131,0.5)' },
};
