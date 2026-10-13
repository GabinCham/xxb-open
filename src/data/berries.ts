export function roundBerries(value: number) {
  return Math.round(value * 100) / 100;
}

export function formatBerries(value: number) {
  return roundBerries(value).toLocaleString('fr-FR', {
    minimumFractionDigits: Number.isInteger(roundBerries(value)) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}
