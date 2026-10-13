import { BOOSTER_SETS } from './sets';

export type OpenStats = {
  boostersOpened: Record<string, number>;
  hitsPulled: number;
  berriesSpent: number;
};

export function emptyOpenStats(): OpenStats {
  return { boostersOpened: {}, hitsPulled: 0, berriesSpent: 0 };
}

export function packStatId(setId: string) {
  return setId === 'op13-hits' ? 'op13' : setId;
}

export function parseOpenStats(value: unknown): OpenStats {
  if (!value || typeof value !== 'object') return emptyOpenStats();
  const raw = value as Partial<OpenStats>;
  const boostersOpened: Record<string, number> = {};
  if (raw.boostersOpened && typeof raw.boostersOpened === 'object') {
    for (const [id, count] of Object.entries(raw.boostersOpened)) {
      const n = Number(count);
      if (n > 0) boostersOpened[packStatId(id)] = (boostersOpened[packStatId(id)] ?? 0) + n;
    }
  }
  return {
    boostersOpened,
    hitsPulled: Math.max(0, Math.floor(Number(raw.hitsPulled) || 0)),
    berriesSpent: Math.max(0, Number(raw.berriesSpent) || 0),
  };
}

export function mergeOpenStats(left: OpenStats, right: OpenStats): OpenStats {
  const ids = new Set([...Object.keys(left.boostersOpened), ...Object.keys(right.boostersOpened)]);
  const boostersOpened: Record<string, number> = {};
  for (const id of ids) {
    boostersOpened[id] = Math.max(left.boostersOpened[id] ?? 0, right.boostersOpened[id] ?? 0);
  }
  return {
    boostersOpened,
    hitsPulled: Math.max(left.hitsPulled, right.hitsPulled),
    berriesSpent: Math.max(left.berriesSpent, right.berriesSpent),
  };
}

export function totalBoosters(stats: OpenStats) {
  return Object.values(stats.boostersOpened).reduce((sum, count) => sum + count, 0);
}

export function boosterBreakdown(stats: OpenStats) {
  return Object.entries(stats.boostersOpened)
    .filter(([, count]) => count > 0)
    .map(([id, count]) => {
      const set = BOOSTER_SETS.find((item) => item.id === id);
      return { id, code: set?.code ?? id.toUpperCase(), count };
    })
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
}
