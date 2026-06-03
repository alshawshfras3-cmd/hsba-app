export function normalizeNumberInput(value: string): string {
  return value
    .replace(/,/g, '')
    .replace(/[^\d.]/g, '')
    .replace(/(\..*)\./g, '$1');
}

export function parseNumberInput(value: string, fallback = 0): number {
  const normalized = normalizeNumberInput(value);
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}
