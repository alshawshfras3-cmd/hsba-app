import { DsrRule } from '../../types';

export function normalizeDsrRules(rules: DsrRule[]): DsrRule[] {
  const map = new Map<string, DsrRule>();

  for (const rule of rules || []) {
    const normalizedProductType =
      rule.productType === 'personal_only'
        ? 'personal_only'
        : 'real_estate_only';

    const normalizedSupportType =
      (rule.supportType as string) === 'downpayment'
        ? 'down_payment'
        : rule.supportType;

    const key = [
      rule.bankId,
      normalizedProductType,
      normalizedSupportType,
      rule.customerStage
    ].join('|');

    if (!map.has(key)) {
      map.set(key, {
        ...rule,
        productType: normalizedProductType as any,
        supportType: normalizedSupportType as any
      });
    }
  }

  return Array.from(map.values());
}
