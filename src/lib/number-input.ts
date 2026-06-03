export function convertArabicToEnglishDigits(input: string): string {
  if (!input) return '';
  let result = String(input);
  const arabicIndic = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
  for (let i = 0; i < 10; i++) {
    result = result.replace(arabicIndic[i], i.toString());
  }
  const persian = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /٦/g, /٧/g, /٨/g, /٩/g];
  for (let i = 0; i < 10; i++) {
    result = result.replace(persian[i], i.toString());
  }
  result = result.replace(/،/g, '.');
  return result;
}

export function normalizeNumberInput(value: string): string {
  const converted = convertArabicToEnglishDigits(value);
  return converted
    .replace(/,/g, '')
    .replace(/[^\d.]/g, '')
    .replace(/(\..*)\./g, '$1');
}

export function parseNumberInput(value: string, fallback = 0): number {
  const normalized = normalizeNumberInput(value);
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

