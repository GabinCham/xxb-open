export type ScanLang = 'en' | 'jp' | 'fr' | 'de' | 'it' | 'es';

export type PriceQuote = {
  usd: number;
  amount: number;
  currency: 'USD' | 'EUR' | 'JPY';
  market: string;
};

type ApiCard = {
  market_price?: number;
  inventory_price?: number;
  card_name: string;
  card_set_id: string;
  card_image_id?: string;
  card_image?: string;
  rarity?: string;
  set_name?: string;
};

const FX_CACHE: { at: number; eur?: number; jpy?: number } = { at: 0 };

export const LANG_COPY: Record<ScanLang, { label: string; currency: PriceQuote['currency']; market: string }> = {
  en: { label: 'Anglais', currency: 'USD', market: 'TCGPlayer' },
  jp: { label: 'Japonais', currency: 'JPY', market: 'TCGPlayer · converti ¥' },
  fr: { label: 'Français', currency: 'EUR', market: 'TCGPlayer · converti €' },
  de: { label: 'Allemand', currency: 'EUR', market: 'TCGPlayer · converti €' },
  it: { label: 'Italien', currency: 'EUR', market: 'TCGPlayer · converti €' },
  es: { label: 'Espagnol', currency: 'EUR', market: 'TCGPlayer · converti €' },
};

function isStarter(code: string) {
  return /^ST\d/i.test(code);
}

export async function fetchPrintedCard(code: string): Promise<ApiCard[]> {
  const path = isStarter(code) ? `decks/card/${code}` : `sets/card/${code}`;
  const response = await fetch(`https://optcgapi.com/api/${path}/`);
  if (!response.ok) throw new Error('Carte introuvable dans le catalogue prix');
  const payload = (await response.json()) as ApiCard[] | { error?: string };
  if (!Array.isArray(payload) || !payload.length) throw new Error('Aucune cote pour ce code');
  return payload;
}

async function fxRates() {
  if (Date.now() - FX_CACHE.at < 1000 * 60 * 60 && FX_CACHE.eur && FX_CACHE.jpy) return FX_CACHE;
  const response = await fetch('https://api.frankfurter.app/latest?from=USD&to=EUR,JPY');
  if (!response.ok) return { at: Date.now(), eur: 0.92, jpy: 150 };
  const json = (await response.json()) as { rates?: { EUR?: number; JPY?: number } };
  FX_CACHE.at = Date.now();
  FX_CACHE.eur = json.rates?.EUR ?? 0.92;
  FX_CACHE.jpy = json.rates?.JPY ?? 150;
  return FX_CACHE;
}

export async function quoteForLang(usd: number, lang: ScanLang): Promise<PriceQuote> {
  const meta = LANG_COPY[lang];
  if (meta.currency === 'USD') {
    return { usd, amount: usd, currency: 'USD', market: meta.market };
  }
  const rates = await fxRates();
  const amount = meta.currency === 'JPY' ? usd * (rates.jpy ?? 150) : usd * (rates.eur ?? 0.92);
  return { usd, amount, currency: meta.currency, market: meta.market };
}

export function formatMoney(amount: number, currency: PriceQuote['currency']) {
  if (currency === 'JPY') return `${Math.round(amount).toLocaleString('fr-FR')} ¥`;
  const value = amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency === 'EUR' ? `${value} €` : `${value} $`;
}

export function pickVariant(cards: ApiCard[], imageId?: string) {
  if (imageId) {
    const exact = cards.find((card) => card.card_image_id?.toUpperCase() === imageId.toUpperCase());
    if (exact) return exact;
  }
  return cards.find((card) => !/_p\d/i.test(card.card_image_id ?? '')) ?? cards[0];
}
