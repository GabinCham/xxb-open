const PROXY = 'https://wsrv.nl/';

export function proxiedImage(url: string, width?: number): string {
  const query = new URLSearchParams({ url, output: 'jpg', q: '88' });
  if (width) query.set('w', String(width));
  return `${PROXY}?${query.toString()}`;
}

export function officialPackImage(setFolder: string, width = 500): string {
  return proxiedImage(
    `https://en.onepiece-cardgame.com/images/products/boosters/${setFolder}/img_thumbnail.png`,
    width,
  );
}

export function officialCardImage(source: string, width = 600): string {
  return proxiedImage(source, width);
}
