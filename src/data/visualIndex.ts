const HASH_W = 17;
const HASH_H = 16;
const CELL = 4;

export type Print = { hash: string; colors: number[] };

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

function cropRect(source: HTMLCanvasElement, x: number, y: number, w: number, h: number, outW: number, outH: number) {
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('canvas');
  ctx.drawImage(source, x, y, w, h, 0, 0, outW, outH);
  return canvas;
}

function sample(data: Uint8ClampedArray, width: number, height: number, x: number, y: number) {
  const sx = Math.max(0, Math.min(width - 1, Math.floor(x)));
  const sy = Math.max(0, Math.min(height - 1, Math.floor(y)));
  const i = (sy * width + sx) * 4;
  return [data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0] as const;
}

function lum(r: number, g: number, b: number) {
  return r * 0.299 + g * 0.587 + b * 0.114;
}

function colorFamily(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const s = max === 0 ? 0 : d / max;
  const l = lum(r, g, b);
  if (l < 58 && s < 0.28) return 'black';
  if (s < 0.22) return 'gray';
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  if (h < 18 || h >= 345) return 'red';
  if (h < 70) return 'yellow';
  if (h < 170) return 'green';
  if (h < 255) return 'blue';
  return 'purple';
}

function avgColor(data: Uint8ClampedArray, width: number, height: number, x0: number, y0: number, x1: number, y1: number) {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let y = y0; y <= y1; y += Math.max(1, (y1 - y0) / 4)) {
    for (let x = x0; x <= x1; x += Math.max(1, (x1 - x0) / 6)) {
      const px = sample(data, width, height, x, y);
      r += px[0];
      g += px[1];
      b += px[2];
      n += 1;
    }
  }
  return n ? ([r / n, g / n, b / n] as const) : ([0, 0, 0] as const);
}

function scoreCardWindow(data: Uint8ClampedArray, width: number, height: number, x: number, y: number, w: number, h: number) {
  const n = 12;
  let border = 0;
  let inner = 0;
  let edge = 0;
  let corner = 0;
  const corners = [
    [x + w * 0.05, y + h * 0.04],
    [x + w * 0.95, y + h * 0.04],
    [x + w * 0.05, y + h * 0.96],
    [x + w * 0.95, y + h * 0.96],
  ];
  for (const [cx, cy] of corners) {
    const [r, g, b] = sample(data, width, height, cx, cy);
    corner += lum(r, g, b);
  }
  corner /= 4;
  for (let i = 0; i < n; i += 1) {
    const t = (i + 0.5) / n;
    const pts = [
      [x + w * t, y + 1, x + w * t, y + h * 0.08],
      [x + w * t, y + h - 2, x + w * t, y + h * 0.92],
      [x + 1, y + h * t, x + w * 0.08, y + h * t],
      [x + w - 2, y + h * t, x + w * 0.92, y + h * t],
    ];
    for (const [bx, by, ix, iy] of pts) {
      const bo = sample(data, width, height, bx, by);
      const inn = sample(data, width, height, ix, iy);
      const bl = lum(bo[0], bo[1], bo[2]);
      const il = lum(inn[0], inn[1], inn[2]);
      border += bl;
      inner += il;
      edge += Math.abs(bl - il);
    }
  }
  const edgeCount = n * 4;
  border /= edgeCount;
  inner /= edgeCount;
  edge /= edgeCount;
  const top = avgColor(data, width, height, x + w * 0.22, y + h * 0.03, x + w * 0.55, y + h * 0.11);
  const bottom = avgColor(data, width, height, x + w * 0.18, y + h * 0.86, x + w * 0.82, y + h * 0.96);
  const topFam = colorFamily(top[0], top[1], top[2]);
  const botFam = colorFamily(bottom[0], bottom[1], bottom[2]);
  const ink = ['red', 'green', 'blue', 'purple', 'yellow', 'black'].includes(topFam);
  const bars = ink && topFam === botFam ? 2.4 : ink ? 0.4 : -0.8;
  let sat = 0;
  let mean = 0;
  let mean2 = 0;
  let cells = 0;
  for (let gy = 2; gy < 7; gy += 1) {
    for (let gx = 1; gx < 7; gx += 1) {
      const [r, g, b] = sample(data, width, height, x + (w * gx) / 8, y + (h * gy) / 10);
      const l = lum(r, g, b);
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      sat += max ? (max - min) / max : 0;
      mean += l;
      mean2 += l * l;
      cells += 1;
    }
  }
  sat /= cells;
  mean /= cells;
  const variance = Math.max(0, mean2 / cells - mean * mean);
  const frac = (w * h) / (width * height);
  const area = Math.exp(-(((Math.log(frac) - Math.log(0.16)) / 0.7) ** 2));
  const cx = x / width + w / width / 2;
  const cy = y / height + h / height / 2;
  const center = Math.max(0, 1 - Math.hypot(cx - 0.5, cy - 0.48) * 1.7);
  const whiteFrame = Math.max(0, corner - 140) / 115;
  const borderPop = Math.max(0, border - inner) / 70;
  return (
    whiteFrame * 2.6 +
    borderPop * 1.2 +
    Math.min(1, edge / 45) * 1.8 +
    bars +
    sat * 0.8 +
    Math.min(1, variance / 2800) * 0.6 +
    area * 2.2 +
    center * 1.1
  );
}

function findCardBox(source: HTMLCanvasElement) {
  const ratio = 63 / 88;
  const probeW = 360;
  const scale = probeW / source.width;
  const probe = document.createElement('canvas');
  probe.width = probeW;
  probe.height = Math.max(8, Math.round(source.height * scale));
  const pctx = probe.getContext('2d', { willReadFrequently: true });
  if (!pctx) {
    return { x: 0, y: 0, w: source.width, h: source.height };
  }
  pctx.drawImage(source, 0, 0, probe.width, probe.height);
  const { data, width, height } = pctx.getImageData(0, 0, probe.width, probe.height);
  let best = { score: -Infinity, x: 0, y: 0, w: width * 0.4, h: (width * 0.4) / ratio };

  for (let h = height * 0.95; h >= height * 0.18; h *= 0.8) {
    const w = h * ratio;
    if (w > width * 0.98 || w < 28) continue;
    const stepX = Math.max(5, w * 0.1);
    const stepY = Math.max(5, h * 0.1);
    for (let y = 0; y + h <= height; y += stepY) {
      for (let x = 0; x + w <= width; x += stepX) {
        const score = scoreCardWindow(data, width, height, x, y, w, h);
        if (score > best.score) best = { score, x, y, w, h };
      }
    }
  }

  const pad = 0.03;
  const inv = 1 / scale;
  const x = Math.max(0, (best.x - best.w * pad) * inv);
  const y = Math.max(0, (best.y - best.h * pad) * inv);
  const w = Math.min(source.width - x, (best.w + best.w * pad * 2) * inv);
  const h = Math.min(source.height - y, (best.h + best.h * pad * 2) * inv);
  return { x, y, w, h };
}

export function cropPhotoToCard(source: HTMLCanvasElement) {
  const ratio = 63 / 88;
  const box = findCardBox(source);
  let { x, y, w, h } = box;
  if (w / h > ratio) {
    const next = h * ratio;
    x += (w - next) / 2;
    w = next;
  } else {
    const next = w / ratio;
    y += (h - next) / 2;
    h = next;
  }
  const outW = 1000;
  const outH = Math.round(outW / ratio);
  return cropRect(source, x, y, w, h, outW, outH);
}

export function enhanceForOcr(source: HTMLCanvasElement) {
  const scale = source.height < 140 ? 140 / source.height : 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(source.width * scale);
  canvas.height = Math.round(source.height * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return source;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = image;
  let min = 255;
  let max = 0;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    min = Math.min(min, gray);
    max = Math.max(max, gray);
  }
  const span = Math.max(1, max - min);
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const stretched = ((gray - min) / span) * 255;
    const value = stretched < 110 ? 0 : stretched > 185 ? 255 : stretched;
    data[i] = data[i + 1] = data[i + 2] = value;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

export function cropArtWindow(card: HTMLCanvasElement) {
  return cropRect(card, card.width * 0.08, card.height * 0.13, card.width * 0.84, card.height * 0.48, HASH_W, HASH_H);
}

export function cropBand(source: HTMLCanvasElement, y0: number, y1: number, x0 = 0, x1 = 1, outW = 1000) {
  const w = Math.max(8, source.width * (x1 - x0));
  const h = Math.max(8, source.height * (y1 - y0));
  const outH = Math.max(140, Math.round(outW * (h / w)));
  return cropRect(source, source.width * x0, source.height * y0, w, h, outW, outH);
}

export function cropNumberStrip(card: HTMLCanvasElement) {
  return cropBand(card, 0.82, 0.99, 0.35, 0.99, 900);
}

export function fingerprint(art: HTMLCanvasElement): Print {
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

export async function canvasFromUri(uri: string) {
  if (typeof document === 'undefined') throw new Error('Scan visuel indisponible');
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('photo'));
    image.src = uri;
  });
  const max = 2800;
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('canvas');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

async function canvasFromUrl(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('image');
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    return await canvasFromUri(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function scorePrint(a: Print, b: Print) {
  return (hamming(a.hash, b.hash) / 256) * 0.7 + colorDist(a.colors, b.colors) * 0.3;
}

export async function pickClosestArt<T extends { imageUrl?: string }>(photo: Print, candidates: T[]) {
  const ranked: { item: T; distance: number }[] = [];
  for (const item of candidates) {
    if (!item.imageUrl) continue;
    try {
      const canvas = await canvasFromUrl(item.imageUrl);
      const print = fingerprint(cropArtWindow(canvas));
      ranked.push({ item, distance: scorePrint(photo, print) });
    } catch {
      /* skip */
    }
  }
  ranked.sort((a, b) => a.distance - b.distance);
  return ranked[0];
}
