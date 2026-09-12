import { createWorker, type Worker } from 'tesseract.js';

import { findCardsByOcrName, findCardsByPrintedCode, printedCodeFromId, allPrintedCodes } from './catalog';
import { fetchPrintedCard, formatMoney, LANG_COPY, pickVariant, quoteForLang, type ScanLang } from './cardPrices';
import { officialCardImage } from './images';
import type { CardDef } from './types';
import { ensureVisualIndex, fingerprintFromUri, matchVisual, visualIndexProgress } from './visualIndex';

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
  for (const match of src.matchAll(/\b(OP|EB|ST|PRB)\s*0?(\d{1,2})\s*[-–—]?\s*(\d{3})\b/g)) {
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
  if (/\b(personnage|événement|evenement|coût)\b/i.test(text) || /[àâçéèêëîïôùûü]/i.test(text)) return 'fr';
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

function levenshtein(a: string, b: string) {
  const rows = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let prev = i - 1;
    rows[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cur = rows[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[j] = Math.min(rows[j] + 1, rows[j - 1] + 1, prev + cost);
      prev = cur;
    }
  }
  return rows[b.length];
}

function fuzzyCodes(text: string): string[] {
  const known = allPrintedCodes();
  const tokens = normalizeOcr(text).match(/[A-Z0-9]{2,6}[-–—]\d{3}/g) ?? [];
  const ranked: { code: string; d: number }[] = [];
  for (const raw of tokens) {
    const token = raw.replace(/[-–—]/g, '-');
    const suffix = token.slice(-3);
    for (const code of known) {
      if (code.slice(-3) !== suffix) continue;
      const d = levenshtein(token.replace(/-/g, ''), code.replace(/-/g, ''));
      if (d <= 3) ranked.push({ code, d });
    }
  }
  ranked.sort((a, b) => a.d - b.d);
  return [...new Set(ranked.map((item) => item.code))];
}

function pickCode(text: string): string | null {
  const exact = extractCodes(text).filter((code) => findCardsByPrintedCode(code).length || true);
  const fuzzy = fuzzyCodes(text);
  const named = [
    ...new Set(
      findCardsByOcrName(text)
        .map((card) => printedCodeFromId(card.id))
        .filter((code): code is string => Boolean(code)),
    ),
  ];
  const knownExact = exact.filter((code) => findCardsByPrintedCode(code).length);
  if (knownExact[0]) return knownExact[0];
  if (exact[0]) return exact[0];
  const overlap = fuzzy.filter((code) => named.includes(code));
  if (overlap[0]) return overlap[0];
  if (named.length === 1) return named[0];
  if (fuzzy[0]) return fuzzy[0];
  return null;
}

async function cropCardNumber(uri: string): Promise<string | null> {
  if (typeof document === 'undefined') return null;
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('image'));
    image.src = uri;
  });
  const canvas = document.createElement('canvas');
  const height = Math.max(32, Math.round(img.height * 0.2));
  canvas.width = img.width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(img, 0, img.height - height, img.width, height, 0, 0, img.width, height);
  return canvas.toDataURL('image/jpeg', 0.95);
}

export async function recognizeCard(uri: string, onStatus?: (msg: string) => void): Promise<ScanResult> {
  onStatus?.('Analyse de l’illustration…');
  const visualReady = visualIndexProgress().ready;
  const visualJob = (async () => {
    try {
      await ensureVisualIndex(onStatus);
      const print = await fingerprintFromUri(uri);
      return matchVisual(print.hash, print.colors, 10);
    } catch {
      return [];
    }
  })();
  const ocrJob = (async () => {
    try {
      const tess = await ocrWorker();
      const full = await tess.recognize(uri);
      let text = full.data.text ?? '';
      const strip = await cropCardNumber(uri);
      if (strip) {
        const bottom = await tess.recognize(strip);
        text = `${text}\n${bottom.data.text ?? ''}`;
      }
      return text;
    } catch {
      return '';
    }
  })();

  if (!visualReady) onStatus?.('Index visuel du catalogue…');
  const [visual, text] = await Promise.all([visualJob, ocrJob]);
  const ocrCode = text ? pickCode(text) : null;
  const best = visual[0];
  const ocrHits = ocrCode ? visual.filter((entry) => entry.code === ocrCode) : [];
  let chosen =
    ocrHits[0] && (ocrHits[0].distance < 0.42 || !best || ocrHits[0].distance <= (best.distance ?? 1) + 0.04)
      ? ocrHits[0]
      : best && best.distance < 0.38
        ? best
        : ocrHits[0] ?? (best && best.distance < 0.5 ? best : null);

  if (!chosen?.code && ocrCode) {
    const catalogHit = findCardsByPrintedCode(ocrCode)[0];
    chosen = {
      id: catalogHit?.id ?? ocrCode,
      code: ocrCode,
      name: catalogHit?.name ?? ocrCode,
      hash: '',
      colors: [],
      imageUrl: catalogHit?.imageUrl,
      finish: catalogHit?.finish,
      variantLabel: catalogHit?.variantLabel,
      distance: 1,
    };
  }

  if (!chosen?.code) {
    throw new Error('Carte non reconnue. Cadre-la entière, bien nette, dans le rectangle.');
  }

  onStatus?.(`Carte ${chosen.code}…`);
  const lang = detectLang(text);
  const variants = await fetchPrintedCard(chosen.code);
  const catalog = findCardsByPrintedCode(chosen.code);
  const variant = pickVariant(variants, chosen.id);
  const usd = Number(variant.market_price ?? variant.inventory_price ?? 0);
  const quote = await quoteForLang(usd, lang);
  const matched =
    catalog.find((card) => card.id.toUpperCase() === chosen.id.toUpperCase()) ??
    catalog.find((card) => card.id.toUpperCase() === (variant.card_image_id ?? '').toUpperCase()) ??
    catalog[0];

  return {
    code: chosen.code,
    name: (matched?.name ?? chosen.name ?? variant.card_name).replace(/\s*\(\d+\)\s*/g, ' ').trim(),
    lang,
    langLabel: LANG_COPY[lang].label,
    priceLabel: formatMoney(quote.amount, quote.currency),
    market: quote.market,
    usd: quote.usd,
    variant:
      chosen.variantLabel ||
      (/_p/i.test(variant.card_image_id ?? '') || /parallel/i.test(variant.card_name) ? 'Alternate Art' : 'Base'),
    imageUrl: variant.card_image ? officialCardImage(variant.card_image, 500) : matched?.imageUrl ?? chosen.imageUrl,
    card: matched,
  };
}
