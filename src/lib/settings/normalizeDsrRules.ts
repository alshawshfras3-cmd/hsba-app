import { DsrRule } from '../../types';

export function normalizeDsrRules(rules: DsrRule[]): DsrRule[] {
  const map = new Map<string, DsrRule>();

  for (const rule of rules || []) {
    let normalizedProductType = rule.productType as string;
    if (normalizedProductType === 'real_estate' || normalizedProductType === 'real_estate_only') {
      normalizedProductType = 'real_estate_only';
    } else if (normalizedProductType === 'personal' || normalizedProductType === 'personal_only') {
      normalizedProductType = 'personal_only';
    } else if (normalizedProductType === 'both' || normalizedProductType === 'real_estate_with_new_personal') {
      normalizedProductType = 'real_estate_with_new_personal';
    } else if (normalizedProductType === 'real_estate_with_personal_existing' || normalizedProductType === 'real_estate_with_existing_personal') {
      normalizedProductType = 'real_estate_with_existing_personal';
    } else {
      normalizedProductType = 'real_estate_only';
    }

    let normalizedSupportType = (rule.supportType as string) || 'none';
    if (normalizedSupportType === 'down_payment' || normalizedSupportType === 'downpayment') {
      normalizedSupportType = 'downpayment';
    } else if (normalizedSupportType === 'monthly') {
      normalizedSupportType = 'monthly';
    } else if (normalizedSupportType === 'none') {
      normalizedSupportType = 'none';
    } else if (normalizedSupportType === 'not_applicable') {
      normalizedSupportType = 'not_applicable';
    } else {
      normalizedSupportType = 'none';
    }

    if (normalizedProductType === 'personal_only') {
      normalizedSupportType = 'not_applicable';
    }

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
