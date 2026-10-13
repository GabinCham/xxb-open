import { PSM, createWorker, type Worker } from 'tesseract.js';

import { findCardsByOcrName, findCardsByPrintedCode, printedCodeFromId } from './catalog';
import { fetchPrintedCard, formatMoney, LANG_COPY, pickVariant, quoteForLang, searchSetCards, type ScanLang } from './cardPrices';
import { catalogThumb, officialCardImage } from './images';
import type { CardDef, ColorId } from './types';
import {
  canvasFromUri,
  cropArtWindow,
  cropBand,
  cropNumberStrip,
  cropPhotoToCard,
  enhanceForOcr,
  fingerprint,
  pickClosestArt,
} from './visualIndex';

export type ScanResult = {
  code: string;
  name: string;
  lang: ScanLang;
  langLabel: string;
  priceLabel: string;
  market: string;
  usd: number;
  variant: string;
  imageUrl?: string;
  card?: CardDef;
};

let worker: Worker | null = null;

function tessAsset(file: string) {
  if (typeof window === 'undefined') return file;
  const prefix = window.location.pathname.startsWith('/xxb-open') ? '/xxb-open' : '';
  return `${window.location.origin}${prefix}/tesseract/${file}`;
}

async function workerScriptUrl() {
  const sources = [
    tessAsset('worker.min.js'),
    'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/worker.min.js',
  ];
  for (const src of sources) {
    try {
      const response = await fetch(src);
      if (!response.ok) continue;
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch {
      /* try next source */
    }
  }
  throw new Error('Impossible de charger le moteur OCR');
}

async function ocrWorker() {
  if (worker) return worker;
  worker = await createWorker('eng', 1, {
    workerPath: await workerScriptUrl(),
    workerBlobURL: false,
  });
  return worker;
}

function normalizeOcr(text: string) {
  return text
    .toUpperCase()
    .replace(/[|\[\]]/g, 'I')
    .replace(/0P(\d)/g, 'OP$1')
    .replace(/O(\d)/g, '0$1')
    .replace(/(\d)O/g, (_, digit: string) => `${digit}0`)
    .replace(/OPO/g, 'OP0');
}

function formatCode(prefix: string, set: string, number: string) {
  if (prefix === 'P') return `P-${number}`;
  return `${prefix}${set.padStart(2, '0')}-${number}`;
}

function extractCodes(text: string): string[] {
  const src = normalizeOcr(text);
  const found = new Set<string>();
  for (const match of src.matchAll(/(OP|EB|ST|PRB)\s*0?(\d{1,2})\s*[-–—.:]?\s*(\d{3})/g)) {
    found.add(formatCode(match[1], match[2], match[3]));
  }
  for (const match of src.matchAll(/\bP\s*[-]?\s*(\d{3})\b/g)) {
    found.add(`P-${match[1]}`);
  }
  const compact = src.replace(/[^A-Z0-9]/g, '');
  for (const match of compact.matchAll(/(OP|EB|ST|PRB)(\d{2})(\d{3})/g)) {
    found.add(formatCode(match[1], match[2], match[3]));
  }
  return [...found];
}

export function detectLang(text: string): ScanLang {
  if (/[\u3040-\u30ff\u4e00-\u9faf]/.test(text)) return 'jp';
  if (
    /\b(personnage|événement|evenement|coût|votre|dessus|ajoutez|révélez|revelez)\b/i.test(text) ||
    /[àâçéèêëîïôùûü]/i.test(text)
  ) {
    return 'fr';
  }
  if (/\b(charakter|ereignis|kosten)\b/i.test(text) || /[äöüß]/i.test(text)) return 'de';
  if (/\b(personaggio|evento)\b/i.test(text)) return 'it';
  if (/\b(personaje|coste)\b/i.test(text) || /[ñ¡¿]/i.test(text)) return 'es';
  return 'en';
}

export async function applyScanLang(hit: ScanResult, lang: ScanLang): Promise<ScanResult> {
  const quote = await quoteForLang(hit.usd, lang);
  return {
    ...hit,
    lang,
    langLabel: LANG_COPY[lang].label,
    priceLabel: formatMoney(quote.amount, quote.currency),
    market: quote.market,
  };
}

function extractSetPrefixes(text: string): string[] {
  const src = normalizeOcr(text);
  const found = new Set<string>();
  for (const match of src.matchAll(/(OP|EB|ST|PRB)\s*-?\s*0?(\d{1,2})/g)) {
    found.add(`${match[1]}${match[2].padStart(2, '0')}`);
  }
  return [...found];
}

function extractPowers(text: string): number[] {
  const compact = text.replace(/[Oo]/g, '0').replace(/[^\d]/g, '');
  const values = [...compact.matchAll(/[1-9]\d{3}/g)].map((match) => Number(match[0].slice(0, 4)));
  return [...new Set(values.filter((value) => value >= 1000 && value <= 15000 && value % 1000 === 0))];
}

type ScanHints = { powers: number[]; costs: number[]; color: ColorId | null };

function uniqueByCode(cards: CardDef[]) {
  const map = new Map<string, CardDef>();
  for (const card of cards) {
    const code = printedCodeFromId(card.id);
    if (!code) continue;
    const prev = map.get(code);
    if (!prev || card.finish === 'base') map.set(code, card);
  }
  return [...map.values()];
}

function hintColor(card: HTMLCanvasElement): ColorId | null {
  const ctx = card.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  const w = card.width;
  const h = card.height;
  const img = ctx.getImageData(w * 0.22, h * 0.015, Math.max(8, w * 0.56), Math.max(8, h * 0.1));
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i < img.data.length; i += 4) {
    r += img.data[i];
    g += img.data[i + 1];
    b += img.data[i + 2];
    n += 1;
  }
  if (!n) return null;
  r /= n;
  g /= n;
  b /= n;
  if (r > g + 28 && r > b + 28) return 'red';
  if (g > r + 20 && g > b + 12) return 'green';
  if (b > r + 20 && b > g + 12) return 'blue';
  if (r > 80 && b > 80 && g < r - 15 && g < b - 15) return 'purple';
  if (r > 90 && g > 70 && b < 70 && r > b + 25) return 'yellow';
  if (r < 70 && g < 70 && b < 80) return 'black';
  return null;
}

function extractCosts(text: string): number[] {
  const src = text.replace(/O/gi, '0');
  const values = [...src.matchAll(/\b([1-9]|10)\b/g)].map((match) => Number(match[1]));
  return [...new Set(values.filter((value) => value >= 1 && value <= 10))];
}

const API_COLOR: Record<ColorId, string> = {
  red: 'Red',
  green: 'Green',
  blue: 'Blue',
  purple: 'Purple',
  black: 'Black',
  yellow: 'Yellow',
};

const NAME_STOP = new Set([
  'personnage',
  'character',
  'event',
  'evenement',
  'stage',
  'leader',
  'contre',
  'counter',
  'baron',
  'bande',
  'pirate',
  'pirates',
  'votre',
  'dessus',
  'cartes',
  'carte',
  'regardez',
  'ajoutez',
  'revelez',
  'deck',
  'combat',
  'attribut',
  'tranche',
  'slash',
  'this',
  'cannot',
  'from',
  'hand',
  'then',
  'place',
  'rest',
  'bottom',
  'order',
  'play',
]);

function editDistance(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1) return 99;
  const prev = Array.from({ length: a.length + 1 }, (_, index) => index);
  for (let j = 1; j <= b.length; j += 1) {
    let last = prev[0];
    prev[0] = j;
    for (let i = 1; i <= a.length; i += 1) {
      const cur = prev[i];
      prev[i] = a[i - 1] === b[j - 1] ? last : 1 + Math.min(last, prev[i], prev[i - 1]);
      last = cur;
    }
  }
  return prev[a.length];
}

function nameQueries(text: string): string[] {
  const hay = text.toLowerCase().replace(/[^a-z0-9]+/g, ' ');
  const out: string[] = [];
  const seen = new Set<string>();
  for (const token of hay.split(' ').filter(Boolean)) {
    let q = token;
    if (editDistance(token, 'baggy') <= 1 || editDistance(token, 'buggy') <= 1) q = 'buggy';
    if (q.length < 4 || NAME_STOP.has(q) || /^\d+$/.test(q)) continue;
    if (seen.has(q)) continue;
    seen.add(q);
    out.push(q[0].toUpperCase() + q.slice(1));
  }
  out.sort((a, b) => Number(b === 'Buggy') - Number(a === 'Buggy') || b.length - a.length);
  return out;
}

function uniqueApiHits(hits: Awaited<ReturnType<typeof searchSetCards>>) {
  const map = new Map<string, (typeof hits)[number]>();
  for (const hit of hits) {
    const code = hit.card_set_id?.toUpperCase();
    if (!code) continue;
    const prev = map.get(code);
    const alt = /_p/i.test(hit.card_image_id ?? '');
    const prevAlt = prev ? /_p/i.test(prev.card_image_id ?? '') : true;
    if (!prev || (prevAlt && !alt)) map.set(code, hit);
  }
  return [...map.entries()].map(([code, item]) => ({ code, item }));
}

async function pickCodeFromHits(hits: Awaited<ReturnType<typeof searchSetCards>>, card: HTMLCanvasElement) {
  const unique = uniqueApiHits(hits);
  if (unique.length === 1) return unique[0].code;
  if (unique.length > 1) {
    const photoPrint = fingerprint(cropArtWindow(card));
    const visual = await pickClosestArt(
      photoPrint,
      unique.slice(0, 12).map(({ code, item }) => ({
        code,
        imageUrl: item.card_image ? catalogThumb(officialCardImage(item.card_image, 180), 180) : undefined,
      })),
    );
    return visual?.item.code ?? null;
  }
  return null;
}

async function resolveFromApi(text: string, hints: ScanHints, card: HTMLCanvasElement) {
  const color = hints.color ? API_COLOR[hints.color] : undefined;
  for (const name of nameQueries(text).slice(0, 4)) {
    const code = await pickCodeFromHits(
      await searchSetCards({
        name,
        power: hints.powers[0],
        cost: hints.costs[0],
        color,
        type: 'Character',
      }),
      card,
    );
    if (code) return code;
  }
  if (hints.powers[0] && color) {
    return pickCodeFromHits(
      await searchSetCards({
        power: hints.powers[0],
        cost: hints.costs[0],
        color,
        type: 'Character',
      }),
      card,
    );
  }
  return null;
}

function narrowNamed(named: CardDef[], text: string, hints: ScanHints): CardDef[] {
  if (!named.length) return named;
  const prefixes = extractSetPrefixes(text);
  let pool = named;
  const keep = (next: CardDef[]) => {
    if (next.length) pool = next;
  };
  if (prefixes.length) {
    keep(
      pool.filter((card) => {
        const code = printedCodeFromId(card.id);
        return Boolean(code && prefixes.some((prefix) => code.startsWith(prefix)));
      }),
    );
  }
  if (hints.powers.length) {
    keep(pool.filter((card) => card.power != null && hints.powers.includes(card.power)));
  }
  if (hints.costs.length) {
    keep(pool.filter((card) => hints.costs.includes(card.cost)));
  }
  if (hints.color) {
    keep(pool.filter((card) => card.color === hints.color));
  }
  return pool;
}

function pickCode(text: string, named: CardDef[]): string | null {
  const extracted = extractCodes(text);
  const namedCodes = uniqueByCode(named)
    .map((card) => printedCodeFromId(card.id))
    .filter((code): code is string => Boolean(code));
  const exactNamed = extracted.filter((code) => namedCodes.includes(code));
  if (exactNamed[0]) return exactNamed[0];
  const inCatalog = extracted.filter((code) => findCardsByPrintedCode(code).length);
  if (inCatalog[0]) return inCatalog[0];
  if (extracted.length === 1) return extracted[0];
  if (namedCodes.length === 1) return namedCodes[0];
  return null;
}

async function readSlice(tess: Worker, slice: HTMLCanvasElement, psm: number, whitelist = '', both = false) {
  await tess.setParameters({
    tessedit_char_whitelist: whitelist,
    tessedit_pageseg_mode: psm,
    user_defined_dpi: '300',
  });
  const sources = both ? [slice, enhanceForOcr(slice)] : whitelist ? [enhanceForOcr(slice)] : [slice];
  let text = '';
  for (const source of sources) {
    const line = await tess.recognize(source.toDataURL('image/jpeg', 0.92));
    text += `\n${line.data.text ?? ''}`;
  }
  return text;
}

async function readText(card: HTMLCanvasElement) {
  const tess = await ocrWorker();
  const powerText = await readSlice(tess, cropBand(card, 0.01, 0.14, 0.58, 0.99, 700), PSM.SINGLE_LINE, '0123456789', true);
  const costText = await readSlice(tess, cropBand(card, 0.01, 0.16, 0.01, 0.22, 280), PSM.SINGLE_LINE, '0123456789', true);
  const nameText = await readSlice(tess, cropBand(card, 0.6, 0.74, 0.1, 0.9, 1400), PSM.SINGLE_LINE, '', true);
  const numberText = await readSlice(tess, cropNumberStrip(card), PSM.SPARSE_TEXT, '', true);
  const bottomText = await readSlice(tess, cropBand(card, 0.72, 1, 0, 1, 1100), PSM.SPARSE_TEXT, '', true);
  const fullText = await readSlice(tess, card, PSM.SPARSE_TEXT);
  const text = [powerText, costText, nameText, numberText, bottomText, fullText].join('\n');
  const powers = extractPowers(powerText);
  return {
    text,
    powers: powers.length ? powers : extractPowers(text),
    costs: extractCosts(costText),
  };
}

export async function recognizeCard(uri: string, onStatus?: (msg: string) => void): Promise<ScanResult> {
  onStatus?.('Lecture de la carte…');
  const photo = await canvasFromUri(uri);
  const card = cropPhotoToCard(photo);
  const { text, powers, costs } = await readText(card);
  const hints = { powers, costs, color: hintColor(card) };
  const named = narrowNamed(findCardsByOcrName(text), text, hints);
  let code = pickCode(text, named);
  if (!code && named.length) {
    const unique = uniqueByCode(named);
    if (unique.length === 1) {
      code = printedCodeFromId(unique[0].id);
    } else if (unique.length > 1) {
      onStatus?.('Comparaison des versions…');
      const photoPrint = fingerprint(cropArtWindow(card));
      const visual = await pickClosestArt(
        photoPrint,
        unique.slice(0, 8).map((item) => ({ ...item, imageUrl: item.imageUrl ? catalogThumb(item.imageUrl, 180) : undefined })),
      );
      code = visual ? printedCodeFromId(visual.item.id) : printedCodeFromId(unique[0].id);
    }
  }
  if (!code) {
    onStatus?.('Recherche dans le catalogue…');
    code = await resolveFromApi(text, hints, card);
  }
  if (!code) {
    throw new Error('Carte non reconnue. Cadre la carte de plus près, nom et numéro lisibles.');
  }

  onStatus?.(`${code} · variante…`);
  const variants = await fetchPrintedCard(code);
  const catalog = findCardsByPrintedCode(code);
  const photoPrint = fingerprint(cropArtWindow(card));
  const visual = await pickClosestArt(
    photoPrint,
    variants.map((item) => ({
      ...item,
      imageUrl: item.card_image ? catalogThumb(officialCardImage(item.card_image, 180), 180) : undefined,
    })),
  );
  const variant =
    visual && visual.distance < 0.45
      ? pickVariant(variants, visual.item.card_image_id)
      : pickVariant(variants);
  const usd = Number(variant.market_price ?? variant.inventory_price ?? 0);
  const lang = detectLang(text);
  const quote = await quoteForLang(usd, lang);
  const matched =
    catalog.find((item) => item.id.toUpperCase() === (variant.card_image_id ?? '').toUpperCase()) ?? catalog[0];

  return {
    code,
    name: (matched?.name ?? variant.card_name).replace(/\s*\(\d+\)\s*/g, ' ').trim(),
    lang,
    langLabel: LANG_COPY[lang].label,
    priceLabel: formatMoney(quote.amount, quote.currency),
    market: quote.market,
    usd: quote.usd,
    variant:
      matched?.variantLabel ||
      (/_p/i.test(variant.card_image_id ?? '') || /parallel/i.test(variant.card_name) ? 'Alternate Art' : 'Base'),
    imageUrl: variant.card_image ? officialCardImage(variant.card_image, 500) : matched?.imageUrl,
    card: matched,
  };
}
