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

export function getTemplateDsrPercent(productType: string, supportType: string, customerStage: string): number {
  if (productType === 'personal_only') {
    return customerStage === 'active_before_retirement' ? 33.33 : 25;
  }
  if (supportType === 'monthly') {
    return 65;
  }
  return 55;
}

export interface MissingDsrRuleDescriptor {
  bankId: string;
  bankName: string;
  productType: string;
  supportType: string;
  customerStage: string;
}

export function getMissingDsrRulesList(banks: any[], dsrRules: DsrRule[]): MissingDsrRuleDescriptor[] {
  const existingRulesKeys = new Set(
    (dsrRules || []).map(r => {
      let p = (r.productType as string) || '';
      if (p === 'real_estate' || p === 'real_estate_only') p = 'real_estate_only';
      if (p === 'personal' || p === 'personal_only') p = 'personal_only';
      if (p === 'both' || p === 'real_estate_with_new_personal') p = 'real_estate_with_new_personal';
      if (p === 'real_estate_with_personal_existing' || p === 'real_estate_with_existing_personal') p = 'real_estate_with_existing_personal';

      let s = (r.supportType as string) || 'none';
      if (s === 'down_payment' || s === 'downpayment') s = 'downpayment';

      return `${r.bankId}|${p}|${s}|${r.customerStage}`;
    })
  );

  const missing: MissingDsrRuleDescriptor[] = [];

  const combos = [
    { productType: 'real_estate_only', supportType: 'none', customerStage: 'active_before_retirement' },
    { productType: 'real_estate_only', supportType: 'none', customerStage: 'retired_after_retirement' },
    { productType: 'real_estate_only', supportType: 'monthly', customerStage: 'active_before_retirement' },
    { productType: 'real_estate_only', supportType: 'monthly', customerStage: 'retired_after_retirement' },
    { productType: 'real_estate_only', supportType: 'downpayment', customerStage: 'active_before_retirement' },
    { productType: 'real_estate_only', supportType: 'downpayment', customerStage: 'retired_after_retirement' },

    { productType: 'real_estate_with_new_personal', supportType: 'none', customerStage: 'active_before_retirement' },
    { productType: 'real_estate_with_new_personal', supportType: 'none', customerStage: 'retired_after_retirement' },
    { productType: 'real_estate_with_new_personal', supportType: 'monthly', customerStage: 'active_before_retirement' },
    { productType: 'real_estate_with_new_personal', supportType: 'monthly', customerStage: 'retired_after_retirement' },
    { productType: 'real_estate_with_new_personal', supportType: 'downpayment', customerStage: 'active_before_retirement' },
    { productType: 'real_estate_with_new_personal', supportType: 'downpayment', customerStage: 'retired_after_retirement' },

    { productType: 'real_estate_with_existing_personal', supportType: 'none', customerStage: 'active_before_retirement' },
    { productType: 'real_estate_with_existing_personal', supportType: 'none', customerStage: 'retired_after_retirement' },
    { productType: 'real_estate_with_existing_personal', supportType: 'monthly', customerStage: 'active_before_retirement' },
    { productType: 'real_estate_with_existing_personal', supportType: 'monthly', customerStage: 'retired_after_retirement' },
    { productType: 'real_estate_with_existing_personal', supportType: 'downpayment', customerStage: 'active_before_retirement' },
    { productType: 'real_estate_with_existing_personal', supportType: 'downpayment', customerStage: 'retired_after_retirement' },

    { productType: 'personal_only', supportType: 'not_applicable', customerStage: 'active_before_retirement' },
    { productType: 'personal_only', supportType: 'not_applicable', customerStage: 'retired_after_retirement' }
  ];

  for (const bank of banks || []) {
    for (const combo of combos) {
      const key = `${bank.id}|${combo.productType}|${combo.supportType}|${combo.customerStage}`;
      if (!existingRulesKeys.has(key)) {
        missing.push({
          bankId: bank.id,
          bankName: bank.nameAr || bank.id,
          productType: combo.productType,
          supportType: combo.supportType,
          customerStage: combo.customerStage
        });
      }
    }
  }

  return missing;
}

