import { DsrOutput, DsrRule } from '../../types';

export function mapProductIdToType(productId: string): 'real_estate_only' | 'real_estate_with_new_personal' | 'real_estate_with_existing_personal' | 'personal_only' {
  const p = productId ? productId.trim().toLowerCase() : '';
  if (p === 'personal' || p === 'personal_only') {
    return 'personal_only';
  }
  if (p === 'real_estate' || p === 'real_estate_only') {
    return 'real_estate_only';
  }
  if (p === 'both' || p === 'real_estate_with_new_personal') {
    return 'real_estate_with_new_personal';
  }
  if (p === 'real_estate_with_personal_existing' || p === 'real_estate_with_existing_personal') {
    return 'real_estate_with_existing_personal';
  }
  return 'real_estate_only';
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
}): DsrRule {
  const { bankId, productType, supportType, customerStage, dsrRules } = params;

  // 1. Check for duplicate active rules matching the selected bank by bankId + productType + supportType + customerStage
  const bankMatches = dsrRules.filter(
    r => r.bankId === bankId &&
         r.productType === productType &&
         r.supportType === supportType &&
         r.customerStage === customerStage &&
         r.active
  );

  if (bankMatches.length > 1) {
    throw new Error(
      `مفرط: هناك أكثر من قاعدة DSR نشطة للجهة التمويلية (${bankId}) لنفس التوليفة (${productType} — ${supportType} — ${customerStage}). يرجى تفعيل واحدة فقط.`
    );
  }

  let rule = bankMatches[0];

  // 2. If specific rule not found, search the 'default' rule
  if (!rule) {
    const defaultMatches = dsrRules.filter(
      r => r.bankId === 'default' &&
           r.productType === productType &&
           r.supportType === supportType &&
           r.customerStage === customerStage &&
           r.active
    );

    if (defaultMatches.length > 1) {
      throw new Error(
        `مفرط: هناك أكثر من قاعدة DSR افتراضية (default) نشطة لنفس التوليفة (${productType} — ${supportType} — ${customerStage}). يرجى تفعيل واحدة فقط.`
      );
    }

    rule = defaultMatches[0];
  }

  // 3. If still not found, throw error
  if (!rule) {
    throw new Error(
      `مفقود: لم يتم العثور على قاعدة DSR مناسبة للمدخلات التالية: البنك (${bankId})، الدعم (${supportType})، المرحلة (${customerStage}). يرجى إضافة قاعدة DSR وتفعيلها للبنك.`
    );
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
  const { bankId, productId, supportType, phase, netSalary, dsrRules } = params;

  const productType = mapProductIdToType(productId);
  const normalizedSupport = productType === 'personal_only' ? 'not_applicable' : mapSupportType(supportType);
  const customerStage = mapCustomerStage(phase);

  try {
    const matchedRule = getDsrRule({
      bankId,
      productType,
      supportType: normalizedSupport,
      customerStage,
      dsrRules
    });

    const dsrPercent = matchedRule.dsrPercent;
    const maxInstallment = Math.round(netSalary * (dsrPercent / 100));

    return {
      dsrPercentage: dsrPercent,
      maxInstallment,
      ruleUsed: `تم تطبيق قاعدة الاستقطاع (${matchedRule.bankId === 'default' ? 'الافتراضية العامة' : 'الخاصة بالجهة'}) ونسبة ${dsrPercent}% لمنتج ${productType === 'real_estate_only' ? 'عقاري فقط' : productType === 'real_estate_with_new_personal' ? 'عقاري وشخصي جديد' : productType === 'real_estate_with_existing_personal' ? 'عقاري وشخصي قائم' : 'شخصي فقط'} (${customerStage === 'active_before_retirement' ? 'موظف نشط' : 'بعد التقاعد'}).`
    };
  } catch (err: any) {
    return {
      dsrPercentage: 0,
      maxInstallment: 0,
      ruleUsed: `خطأ استقطاع: ${err.message || 'فشل جلب قاعدة DSR.'}`,
      error: err.message || 'فشل جلب قاعدة DSR.'
    };
  }
}
