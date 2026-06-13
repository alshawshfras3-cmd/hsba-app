import { DsrOutput, DsrRule } from '../../types';
import { initialDsrRules } from '../../seeds/dsr-rules';

export function resolveDsrProductType(productId: string): 'real_estate_only' | 'real_estate_with_new_personal' | 'real_estate_with_existing_personal' | 'personal_only' {
  if (productId === 'personal_only' || productId === 'personal') return 'personal_only';

  if (
    productId === 'real_estate_only' ||
    productId === 'real_estate_with_new_personal' ||
    productId === 'real_estate_with_existing_personal' ||
    productId === 'both'
  ) {
    return 'real_estate_only';
  }

  return 'real_estate_only';
}

export function mapProductIdToType(productId: string): 'real_estate_only' | 'real_estate_with_new_personal' | 'real_estate_with_existing_personal' | 'personal_only' {
  return resolveDsrProductType(productId);
}

export function mapSupportType(supportType: string): 'none' | 'monthly' | 'downpayment' | 'not_applicable' {
  if (supportType === 'monthly') return 'monthly';
  if (supportType === 'down_payment' || supportType === 'downpayment') return 'downpayment';
  if (supportType === 'not_applicable') return 'not_applicable';
  if (supportType === 'unsupported' || supportType === 'no_support' || supportType === 'none') {
    return 'none';
  }
  return 'none';
}

export function mapCustomerStage(phase: string): 'active_before_retirement' | 'retired_after_retirement' {
  if (phase === 'after_retirement' || phase === 'retired') return 'retired_after_retirement';
  return 'active_before_retirement';
}

export function getDsrRule(params: {
  bankId: string;
  productType: 'real_estate_only' | 'real_estate_with_new_personal' | 'real_estate_with_existing_personal' | 'personal_only';
  supportType: 'none' | 'monthly' | 'downpayment' | 'not_applicable';
  customerStage: 'active_before_retirement' | 'retired_after_retirement';
  dsrRules: DsrRule[];
  sectorId?: string;
}): DsrRule {
  const { bankId, productType, supportType, customerStage, dsrRules, sectorId } = params;

  const isRealEstate = productType !== 'personal_only';

  // Helper to query rules from a given muli-rule source
  const lookupInSource = (rulesSource: DsrRule[]): DsrRule | null => {
    if (!rulesSource || rulesSource.length === 0) return null;

    // 1. Check for specific combination
    const bankMatches = rulesSource.filter(
      r => r.bankId === bankId &&
           r.productType === productType &&
           r.supportType === supportType &&
           r.customerStage === customerStage &&
           r.active !== false &&
           (!('employmentSector' in r) || !(r as any).employmentSector || (r as any).employmentSector === 'all' || (r as any).employmentSector === sectorId) &&
           (!('sector' in r) || !(r as any).sector || (r as any).sector === 'all' || (r as any).sector === sectorId) &&
           (!('sectorId' in r) || !(r as any).sectorId || (r as any).sectorId === 'all' || (r as any).sectorId === sectorId)
    );

    if (bankMatches.length > 1) {
      throw new Error(
        `مفرط: هناك أكثر من قاعدة DSR نشطة للجهة التمويلية (${bankId}) لنفس التوليفة (${productType} — ${supportType} — ${customerStage}). يرجى تفعيل واحدة فقط.`
      );
    }

    if (bankMatches.length === 1) {
      return bankMatches[0];
    }

    // 1.5 Fallback matching for real-estate rules if specific combination isn't found
    if (isRealEstate) {
      const fallbackBankMatches = rulesSource.filter(
        r => r.bankId === bankId &&
             (r.productType === 'real_estate_only' || r.productType === 'real_estate_with_new_personal' || r.productType === 'real_estate_with_existing_personal') &&
             r.supportType === supportType &&
             r.customerStage === customerStage &&
             r.active !== false &&
             (!('employmentSector' in r) || !(r as any).employmentSector || (r as any).employmentSector === 'all' || (r as any).employmentSector === sectorId) &&
             (!('sector' in r) || !(r as any).sector || (r as any).sector === 'all' || (r as any).sector === sectorId) &&
             (!('sectorId' in r) || !(r as any).sectorId || (r as any).sectorId === 'all' || (r as any).sectorId === sectorId)
      );
      if (fallbackBankMatches.length > 0) {
        return fallbackBankMatches[0];
      }
    }

    // 2. Search default general bank rule
    const defaultMatches = rulesSource.filter(
      r => r.bankId === 'default' &&
           r.productType === productType &&
           r.supportType === supportType &&
           r.customerStage === customerStage &&
           r.active !== false &&
           (!('employmentSector' in r) || !(r as any).employmentSector || (r as any).employmentSector === 'all' || (r as any).employmentSector === sectorId) &&
           (!('sector' in r) || !(r as any).sector || (r as any).sector === 'all' || (r as any).sector === sectorId) &&
           (!('sectorId' in r) || !(r as any).sectorId || (r as any).sectorId === 'all' || (r as any).sectorId === sectorId)
    );

    if (defaultMatches.length > 1) {
      throw new Error(
        `مفرط: هناك أكثر من قاعدة DSR افتراضية (default) نشطة لنفس التوليفة (${productType} — ${supportType} — ${customerStage}). يرجى تفعيل واحدة فقط.`
      );
    }

    if (defaultMatches.length === 1) {
      return defaultMatches[0];
    }

    // Default fallback search for real_estate_only if specific defaulted combination fails
    if (isRealEstate) {
      const fallbackDefaultMatches = rulesSource.filter(
        r => r.bankId === 'default' &&
             (r.productType === 'real_estate_only' || r.productType === 'real_estate_with_new_personal' || r.productType === 'real_estate_with_existing_personal') &&
             r.supportType === supportType &&
             r.customerStage === customerStage &&
             r.active !== false &&
             (!('employmentSector' in r) || !(r as any).employmentSector || (r as any).employmentSector === 'all' || (r as any).employmentSector === sectorId) &&
             (!('sector' in r) || !(r as any).sector || (r as any).sector === 'all' || (r as any).sector === sectorId) &&
             (!('sectorId' in r) || !(r as any).sectorId || (r as any).sectorId === 'all' || (r as any).sectorId === sectorId)
      );
      if (fallbackDefaultMatches.length > 0) {
        return fallbackDefaultMatches[0];
      }
    }

    return null;
  };

  // Step 1: Look up in the custom db rules (app_settings.dsrRules)
  let rule = lookupInSource(dsrRules);

  // Step 2: Use seed fallback ONLY to complete the missing rules
  if (!rule) {
    rule = lookupInSource(initialDsrRules);
  }

  // Step 3: Programmatic absolute fallback according to business guidelines
  if (!rule) {
    let fallbackPercent = 55;
    if (productType === 'personal_only') {
      fallbackPercent = customerStage === 'retired_after_retirement' ? 25 : 33.33;
    } else {
      fallbackPercent = supportType === 'monthly' ? 65 : 55;
    }
    rule = {
      id: `dev_fallback_${bankId}_${productType}`,
      bankId,
      productType,
      supportType,
      customerStage,
      dsrPercent: fallbackPercent,
      deductExistingObligations: true,
      active: true
    };
  }

  return rule;
}

export function calculateDSR(params: {
  bankId: string;
  productId: any;
  sectorId: any;
  supportType: any;
  phase: 'active_before_retirement' | 'retired_after_retirement' | 'before_retirement' | 'after_retirement' | 'retired';
  netSalary: number;
  dsrRules: DsrRule[];
}): DsrOutput {
  const { bankId, productId, sectorId, supportType, phase, netSalary, dsrRules } = params;

  const productType = resolveDsrProductType(productId);
  const normalizedSupport = productType === 'personal_only' ? 'not_applicable' : mapSupportType(supportType);
  const customerStage = mapCustomerStage(phase);

  try {
    const matchedRule = getDsrRule({
      bankId,
      productType,
      supportType: normalizedSupport,
      customerStage,
      dsrRules,
      sectorId
    });

    const dsrPercent = matchedRule.dsrPercent;
    const maxInstallment = Math.round(netSalary * (dsrPercent / 100));

    return {
      dsrPercentage: dsrPercent,
      maxInstallment,
      ruleUsed: `تم تطبيق قاعدة الاستقطاع (${matchedRule.bankId === 'default' ? 'الافتراضية العامة' : 'الخاصة بالجهة'}) ونسبة ${dsrPercent}% لمنتج ${productType === 'real_estate_only' ? 'عقاري فقط' : productType === 'real_estate_with_new_personal' ? 'عقاري وشخصي جديد' : productType === 'real_estate_with_existing_personal' ? 'عقاري وشخصي قائم' : 'شخصي فقط'} (${customerStage === 'active_before_retirement' ? 'موظف نشط' : 'بعد التقاعد'}).`,
      deductExistingObligations: matchedRule.deductExistingObligations
    };
  } catch (err: any) {
    return {
      dsrPercentage: 0,
      maxInstallment: 0,
      ruleUsed: `خطأ استقطاع: ${err.message || 'لا توجد قاعدة DSR مفعلة لهذا البنك/نوع التمويل في لوحة التحكم'}`,
      error: err.message || 'لا توجد قاعدة DSR مفعلة لهذا البنك/نوع التمويل في لوحة التحكم'
    };
  }
}
