import AsyncStorage from '@react-native-async-storage/async-storage';

import { allCatalogCards, printedCodeFromId } from './catalog';
import { catalogThumb } from './images';
import type { CardDef } from './types';

const STORE = 'op-tcg-visual-index-v1';
const HASH_W = 17;
const HASH_H = 16;
const CELL = 4;

export type VisualEntry = {
  id: string;
  code: string;
  name: string;
  hash: string;
  colors: number[];
  imageUrl?: string;
  finish?: string;
  variantLabel?: string;
};

export type VisualMatch = VisualEntry & { distance: number };

const index: VisualEntry[] = [];
let warming: Promise<void> | null = null;
let done = 0;
let total = 0;

export function visualIndexProgress() {
  return { ready: index.length > 0 && done >= total && total > 0, done, total: total || index.length };
}

function hamming(a: string, b: string) {
  try {
    let x = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
    let n = 0;
    while (x) {
      x &= x - 1n;
      n += 1;
    }
    return n;
  } catch {
    return 256;
  }
}

function colorDist(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  if (!n) return 1;
  let sum = 0;
  for (let i = 0; i < n; i += 1) {
    const d = (a[i] - b[i]) / 255;
    sum += d * d;
  }
  return Math.sqrt(sum / n);
}

async function canvasFromUrl(url: string): Promise<HTMLCanvasElement> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('image');
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('image'));
      image.src = objectUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('canvas');
    ctx.drawImage(img, 0, 0);
    return canvas;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function cropRect(source: HTMLCanvasElement, x: number, y: number, w: number, h: number, outW: number, outH: number) {
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('canvas');
  ctx.drawImage(source, x, y, w, h, 0, 0, outW, outH);
  return canvas;
}

export function cropPhotoToCard(source: HTMLCanvasElement) {
  const ratio = 63 / 88;
  let width = source.width;
  let height = width / ratio;
  if (height > source.height) {
    height = source.height;
    width = height * ratio;
  }
  const x = (source.width - width) / 2 + width * 0.05;
  const y = (source.height - height) / 2 + height * 0.04;
  return cropRect(source, x, y, width * 0.9, height * 0.92, 252, 352);
}

export function cropArtWindow(card: HTMLCanvasElement) {
  return cropRect(card, card.width * 0.08, card.height * 0.13, card.width * 0.84, card.height * 0.48, HASH_W, HASH_H);
}

function fingerprint(art: HTMLCanvasElement) {
  const ctx = art.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('canvas');
  const { data, width, height } = ctx.getImageData(0, 0, art.width, art.height);
  const gray = new Float32Array(width * height);
  for (let i = 0; i < gray.length; i += 1) {
    const j = i * 4;
    gray[i] = data[j] * 0.299 + data[j + 1] * 0.587 + data[j + 2] * 0.114;
  }
  let bits = '';
  for (let y = 0; y < HASH_H; y += 1) {
    for (let x = 0; x < HASH_W - 1; x += 1) {
      bits += gray[y * width + x] > gray[y * width + x + 1] ? '1' : '0';
    }
  }
  const hash = BigInt(`0b${bits}`).toString(16).padStart(64, '0');
  const colors: number[] = [];
  const cellW = Math.max(1, Math.floor(width / CELL));
  const cellH = Math.max(1, Math.floor(height / CELL));
  for (let cy = 0; cy < CELL; cy += 1) {
    for (let cx = 0; cx < CELL; cx += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let y = cy * cellH; y < (cy + 1) * cellH; y += 1) {
        for (let x = cx * cellW; x < (cx + 1) * cellW; x += 1) {
          const j = (y * width + x) * 4;
          r += data[j];
          g += data[j + 1];
          b += data[j + 2];
          n += 1;
        }
      }
      colors.push(r / n, g / n, b / n);
    }
  }
  return { hash, colors };
}

export async function fingerprintFromUri(uri: string) {
  if (typeof document === 'undefined') throw new Error('Scan visuel indisponible');
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('photo'));
    image.src = uri;
  });
  const full = document.createElement('canvas');
  full.width = img.width;
  full.height = img.height;
  const ctx = full.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('canvas');
  ctx.drawImage(img, 0, 0);
  const card = cropPhotoToCard(full);
  const art = cropArtWindow(card);
  return fingerprint(art);
}

async function fingerprintCard(card: CardDef) {
  if (!card.imageUrl) return null;
  const canvas = await canvasFromUrl(catalogThumb(card.imageUrl, 180));
  const art = cropArtWindow(canvas);
  const print = fingerprint(art);
  return {
    id: card.id,
    code: printedCodeFromId(card.id) ?? card.id,
    name: card.name,
    hash: print.hash,
    colors: print.colors,
    imageUrl: card.imageUrl,
    finish: card.finish,
    variantLabel: card.variantLabel,
  } satisfies VisualEntry;
}

export function matchVisual(hash: string, colors: number[], limit = 8): VisualMatch[] {
  return index
    .map((entry) => ({
      ...entry,
      distance: hamming(hash, entry.hash) / 256 * 0.72 + colorDist(colors, entry.colors) * 0.28,
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

export async function ensureVisualIndex(onStatus?: (msg: string) => void) {
  if (index.length && done >= total && total > 0) return;
  if (warming) {
    onStatus?.('Index visuel du catalogue…');
    return warming;
  }
  warming = (async () => {
    const cards = allCatalogCards().filter((card) => card.imageUrl);
    total = cards.length;
    done = 0;
    const saved = await AsyncStorage.getItem(STORE);
    const cached = saved ? (JSON.parse(saved) as VisualEntry[]) : [];
    const byId = new Map(cached.map((entry) => [entry.id, entry]));
    index.length = 0;
    const missing: CardDef[] = [];
    for (const card of cards) {
      const hit = byId.get(card.id);
      if (hit) {
        index.push(hit);
        done += 1;
      } else {
        missing.push(card);
      }
    }
    const queue = [...missing];
    const workers = Array.from({ length: Math.min(6, queue.length) }, async () => {
      while (queue.length) {
        const card = queue.shift();
        if (!card) return;
        try {
          const entry = await fingerprintCard(card);
          if (entry) index.push(entry);
        } catch {
          /* image bloquée */
        }
        done += 1;
        if (done % 40 === 0) onStatus?.(`Index visuel ${done}/${total}`);
      }
    });
    await Promise.all(workers);
    await AsyncStorage.setItem(STORE, JSON.stringify(index)).catch(() => {});
  })();
  try {
    await warming;
  } finally {
    warming = null;
  }
}
