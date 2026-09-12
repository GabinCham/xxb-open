const PROXY = 'https://wsrv.nl/';

export function proxiedImage(url: string, width?: number): string {
  const query = new URLSearchParams({ url, output: 'jpg', q: '88' });
  if (width) query.set('w', String(width));
  return `${PROXY}?${query.toString()}`;
}

function packSourceUrl(folder: string, tcgProductId?: number): string {
  if (tcgProductId) {
    return `https://tcgplayer-cdn.tcgplayer.com/product/${tcgProductId}_in_1000x1000.jpg`;
  }
  return `https://en.onepiece-cardgame.com/images/products/boosters/${folder}/img_thumbnail.png`;
}

export function officialPackImage(setFolder: string, width = 500, tcgProductId?: number): string {
  return proxiedImage(packSourceUrl(setFolder, tcgProductId), width);
}

export function officialPackTexture(setFolder: string, width = 1024, tcgProductId?: number): string {
  const query = new URLSearchParams({
    url: packSourceUrl(setFolder, tcgProductId),
    output: 'png',
    q: '92',
    trim: 'auto',
    trimtol: '8',
    w: String(width),
  });
  return `${PROXY}?${query.toString()}`;
}

export function officialCardImage(source: string, width = 600): string {
  return proxiedImage(source, width);
}
