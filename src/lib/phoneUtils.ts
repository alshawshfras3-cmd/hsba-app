import { normalizePhone } from './subscriptionService';

/**
 * Normalizes a raw Saudi phone number into standard +9665xxxxxxxx format.
 */
export function normalizeSaudiPhone(rawPhone: string): string {
  return normalizePhone(rawPhone);
}

/**
 * Validates whether the given phone is a correct Saudi phone number.
 * Standard format is starts with +9665 or 05 or 9665 and followed by 8 prefix numbers.
 * Normalized format must match +9665xxxxxxxx.
 */
export function isValidSaudiPhone(rawPhone: string): boolean {
  if (!rawPhone) return false;
  const normalized = normalizeSaudiPhone(rawPhone);
  const saudiRegex = /^\+9665\d{8}$/;
  return saudiRegex.test(normalized);
}
