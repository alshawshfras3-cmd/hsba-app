import { MarginOutput, ProductId, SupportType, SectorId, MarginRule } from '../../types';

export const getRuleInputMode = (r: MarginRule): 'yearly' | 'key_points' | 'duration_tiers' => {
  if (r.marginInputMode) return r.marginInputMode;
  if (r.fromMonth !== undefined || r.toMonth !== undefined) return 'duration_tiers';
  const y = r.year || (r.toTermMonths ? r.toTermMonths / 12 : undefined);
  if (y !== undefined) {
    if ([5, 10, 15, 20, 25, 30].includes(y)) {
      return 'key_points';
    } else if (y >= 5 && y <= 30) {
      return 'yearly';
    }
  }
  return 'key_points';
};

export function resolveConfiguredMarginMode(params: {
  bankId: string;
  productId: ProductId;
  supportType: SupportType;
  sectorId: SectorId;
  marginRules: MarginRule[];
  netSalary?: number;
}): 'duration_tiers' | 'yearly' | 'key_points' {
  let normProduct = params.productId;
  if (normProduct === 'real_estate' || normProduct === 'real_estate_only') {
    normProduct = 'real_estate_only';
  } else if (normProduct === 'both' || normProduct === 'real_estate_with_new_personal') {
    normProduct = 'real_estate_with_new_personal';
  } else if (normProduct === 'real_estate_with_personal_existing' || normProduct === 'real_estate_with_existing_personal') {
    normProduct = 'real_estate_with_existing_personal';
  }

  const normSup = (s?: string) => {
    if (!s || s === 'none') return 'none';
    if (s === 'down_payment' || s === 'downpayment') return 'downpayment';
    return s;
  };
  const normSec = (s?: string) => (!s || s === 'all') ? 'all' : s;
  const normSal = (t?: string) => (!t || t === 'not_applicable') ? 'not_applicable' : t;

  let salaryTier: 'below_25000' | 'above_or_equal_25000' | 'not_applicable' = 'not_applicable';
  if (normSup(params.supportType) !== 'none' && params.netSalary !== undefined) {
    salaryTier = params.netSalary < 25000 ? 'below_25000' : 'above_or_equal_25000';
  }

  const targetSupportNorm = normSup(params.supportType);
  const targetSalaryTierNorm = normSal(salaryTier);
  const targetSectorNorm = normSec(params.sectorId);

  let matchingRules = params.marginRules.filter(
    r => r.bankId === params.bankId &&
         r.productId === normProduct &&
         (normSup(r.supportType) === 'all' || normSup(r.supportType) === targetSupportNorm) &&
         (normSec(r.sectorId) === targetSectorNorm) &&
         r.isActive &&
         (normSal(r.salaryTier) === 'not_applicable' || normSal(r.salaryTier) === targetSalaryTierNorm) &&
         !r.isExceptionOnly
  );

  if (matchingRules.length === 0) {
    matchingRules = params.marginRules.filter(
      r => r.bankId === params.bankId &&
           r.productId === normProduct &&
           (normSup(r.supportType) === 'all' || normSup(r.supportType) === targetSupportNorm) &&
           (normSec(r.sectorId) === 'all') &&
           r.isActive &&
           (normSal(r.salaryTier) === 'not_applicable' || normSal(r.salaryTier) === targetSalaryTierNorm) &&
           !r.isExceptionOnly
    );
  }

  const specificRules = matchingRules.filter(r => normSal(r.salaryTier) === targetSalaryTierNorm);
  if (specificRules.length > 0) {
    matchingRules = specificRules;
  }

  if (matchingRules.length === 0) {
    matchingRules = params.marginRules.filter(
      r => r.bankId === 'all' &&
           r.productId === normProduct &&
           r.isActive &&
           !r.isExceptionOnly
    );
  }

  const withInputMode = matchingRules.find(r => r.marginInputMode);
  if (withInputMode && withInputMode.marginInputMode) {
    return withInputMode.marginInputMode as 'duration_tiers' | 'yearly' | 'key_points';
  }

  return 'key_points';
}

export function calculateMargin(params: {
  bankId: string;
  productId: ProductId;
  supportType: SupportType;
  sectorId: SectorId;
  termMonths: number;
  marginRules: MarginRule[];
  netSalary?: number;
  calculationMode: 'duration_tiers' | 'yearly' | 'key_points';
}): MarginOutput {
  const { bankId, productId, supportType, sectorId, termMonths, marginRules, netSalary, calculationMode } = params;

  // 1. Normalize productId to the values defined inside margin settings
  let normProduct: ProductId = productId;
  if (productId === 'real_estate' || productId === 'real_estate_only') {
    normProduct = 'real_estate_only';
  } else if (productId === 'both' || productId === 'real_estate_with_new_personal') {
    normProduct = 'real_estate_with_new_personal';
  } else if (productId === 'real_estate_with_personal_existing' || productId === 'real_estate_with_existing_personal') {
    normProduct = 'real_estate_with_existing_personal';
  }

  // Normalize support type
  let normSupport = supportType;
  if ((supportType as string) === 'down_payment' || supportType === 'downpayment') {
    normSupport = 'downpayment';
  }

  // 2. Determine salary tier
  let salaryTier: 'below_25000' | 'above_or_equal_25000' | 'not_applicable' = 'not_applicable';
  if (normSupport !== 'none' && netSalary !== undefined) {
    salaryTier = netSalary < 25000 ? 'below_25000' : 'above_or_equal_25000';
  }

  // 3. Determine selected margin year based on term of payment
  let selectedMarginYear = Math.round(termMonths / 12);
  selectedMarginYear = Math.min(Math.max(selectedMarginYear, 5), 30);

  // Normalization helpers inside calculator
  const normSec = (s?: string) => (!s || s === 'all') ? 'all' : s;
  const normSup = (s?: string) => {
    if (!s || s === 'none') return 'none';
    if (s === 'down_payment' || s === 'downpayment') return 'downpayment';
    return s;
  };
  const normSal = (t?: string) => (!t || t === 'not_applicable') ? 'not_applicable' : t;

  const targetSupportNorm = normSup(normSupport);
  const targetSalaryTierNorm = normSal(salaryTier);
  const targetSectorNorm = normSec(sectorId);

  // Filter base rules (which are our margin rules across years)
  // Try matching exact sectorId first
  let rules = marginRules.filter(
    r => r.bankId === bankId &&
         r.productId === normProduct &&
         (normSup(r.supportType) === 'all' || normSup(r.supportType) === targetSupportNorm) &&
         (normSec(r.sectorId) === targetSectorNorm) &&
         r.isActive &&
         (normSal(r.salaryTier) === 'not_applicable' || normSal(r.salaryTier) === targetSalaryTierNorm) &&
         !r.isExceptionOnly
  );

  // If no sector-specific rules exist, fallback to general/all sector rules
  if (rules.length === 0) {
    rules = marginRules.filter(
      r => r.bankId === bankId &&
           r.productId === normProduct &&
           (normSup(r.supportType) === 'all' || normSup(r.supportType) === targetSupportNorm) &&
           (normSec(r.sectorId) === 'all') &&
           r.isActive &&
           (normSal(r.salaryTier) === 'not_applicable' || normSal(r.salaryTier) === targetSalaryTierNorm) &&
           !r.isExceptionOnly
    );
  }

  // If we have rules that explicitly specify our target salaryTier, prioritize them
  const specificRules = rules.filter(r => normSal(r.salaryTier) === targetSalaryTierNorm);
  if (specificRules.length > 0) {
    rules = specificRules;
  }

  // If no bank-specific rule, look for general rules
  if (rules.length === 0) {
    rules = marginRules.filter(
      r => r.bankId === 'all' &&
           r.productId === normProduct &&
           r.isActive &&
           !r.isExceptionOnly
    );
  }

  const bankNameAr = bankId === 'rajhi' ? 'مصرف الراجحي' : bankId === 'alahli' ? 'البنك الأهلي السعودي' : bankId === 'alinma' ? 'مصرف الإنماء' : bankId;
  const productNameAr = normProduct === 'real_estate_only' ? 'عقاري فقط' : normProduct === 'real_estate_with_new_personal' ? 'عقاري + شخصي جديد' : 'عقاري مع شخصي قائم';
  const supportNameAr = normSupport === 'none' ? 'غير مدعوم' : normSupport === 'monthly' ? 'دعم شهري' : 'دعم دفعة';

  if (rules.length === 0) {
    return {
      annualMargin: 0,
      marginType: 'fixed',
      ruleUsed: `مرفوض — الهامش غير متاح للتركيبة: البنك ${bankNameAr} + المنتج ${productNameAr} + نوع الدعم ${supportNameAr}`,
      error: `الهامش غير مهيأ لهذه الجهة التمويلية (البنك والمنتج ونوع الدعم والراتب) في لوحة التحكم.`,
      salaryTier,
      selectedMarginYear,
      bankName: bankNameAr,
      productName: productNameAr,
      supportName: supportNameAr,
      baseMargin: 0,
      exceptionBps: 0
    };
  }

  // Helper to look up margin for an exact month count (e.g. year*12)
  const getMarginForExactMonths = (targetMonths: number): { margin: number; error?: string } => {
    const matchedRule = rules.find(
      r => targetMonths >= r.fromTermMonths && targetMonths <= r.toTermMonths
    );
    if (!matchedRule) {
      return {
        margin: 0,
        error: "لا توجد قاعدة هامش مطابقة لهذه المدة."
      };
    }
    if (matchedRule.calcType === 'linear' && matchedRule.toTermMonths > matchedRule.fromTermMonths) {
      const t = targetMonths;
      const tStart = matchedRule.fromTermMonths;
      const tEnd = matchedRule.toTermMonths;
      const mStart = matchedRule.startMargin;
      const mEnd = matchedRule.endMargin;
      return { margin: mStart + ((t - tStart) / (tEnd - tStart)) * (mEnd - mStart) };
    }
    return { margin: matchedRule.endMargin };
  };

  let annualMargin = 0;
  let ruleUsed = '';
  let marginType: 'fixed' | 'linear' = 'fixed';
  let annualMarginError: string | undefined = undefined;

  const activeInputMode = calculationMode;

  switch (activeInputMode) {
    case 'duration_tiers': {
      const tierRules = rules.filter(r => r.fromMonth !== undefined && r.toMonth !== undefined);
      const matchedTier = tierRules.find(r => termMonths >= r.fromMonth! && termMonths <= r.toMonth!);
      if (matchedTier) {
        annualMargin = matchedTier.marginRate ?? 0;
        if (matchedTier.marginRate === undefined || matchedTier.marginRate === null) {
          annualMarginError = "لا تتوفر شريحة هامش صالحة لهذه المدة (القيمة غير محددة).";
        }
        ruleUsed = `هامش شريحة مدة التمويل (${matchedTier.fromMonth} إلى ${matchedTier.toMonth} شهر) بمعدل ${annualMargin}%.`;
      } else {
        annualMargin = 0;
        annualMarginError = "لا توجد شريحة هامش مطابقة لمدة التمويل لهذا البنك.";
        ruleUsed = `لم يتم العثور على شريحة مدة تمويل مطابقة لـ ${termMonths} شهر لهذا البنك.`;
      }
      break;
    }
    case 'key_points': {
      const termYearsFloat = termMonths / 12;
      if (termYearsFloat <= 5) {
        const res = getMarginForExactMonths(60);
        if (res.error) {
          annualMarginError = `لا توجد قاعدة هامش مطابقة لسنة 5 (60 شهر) لهذه الجهة التمويلية.`;
        }
        annualMargin = res.margin;
        ruleUsed = `هامش سنة 5 للجهة التمويلية بمعدل ${annualMargin}%.`;
      } else if (termYearsFloat >= 30) {
        const res = getMarginForExactMonths(360);
        if (res.error) {
          annualMarginError = `لا توجد قاعدة هامش مطابقة لسنة 30 (360 شهر) لهذه الجهة التمويلية.`;
        }
        annualMargin = res.margin;
        ruleUsed = `هامش سنة 30 للجهة التمويلية بمعدل ${annualMargin}%.`;
      } else {
        const points = [5, 10, 15, 20, 25, 30];
        const lowYear = points.reduce((prev, curr) => curr <= termYearsFloat ? curr : prev, 5);
        const highYear = points.find(p => p >= termYearsFloat) || 30;

        if (lowYear === highYear) {
          const res = getMarginForExactMonths(lowYear * 12);
          if (res.error) {
            annualMarginError = `لا توجد قاعدة هامش مطابقة لسنة ${lowYear} (${lowYear * 12} شهر) لهذه الجهة التمويلية.`;
          }
          annualMargin = res.margin;
          ruleUsed = `هامش سنة ${lowYear} للجهة التمويلية بمعدل ${annualMargin}%.`;
        } else {
          const lowMonths = lowYear * 12;
          const highMonths = highYear * 12;
          const resLow = getMarginForExactMonths(lowMonths);
          const resHigh = getMarginForExactMonths(highMonths);

          if (resLow.error || resHigh.error) {
            annualMarginError = `لا توجد قاعدة هامش مطابقة للاستقراء بين سنة ${lowYear} وسنة ${highYear} لهذه الجهة التمويلية.`;
          }
          const mLow = resLow.margin;
          const mHigh = resHigh.margin;

          annualMargin = mLow + ((termMonths - lowMonths) / (highMonths - lowMonths)) * (mHigh - mLow);
          marginType = 'linear';
          ruleUsed = `هامش مستقرأ بين سنة ${lowYear} (${mLow}%) وسنة ${highYear} (${mHigh}%) بمعدل ${annualMargin.toFixed(3)}%.`;
        }
      }
      break;
    }
    case 'yearly': {
      const termYearsFloat = termMonths / 12;
      if (termYearsFloat <= 5) {
        const res = getMarginForExactMonths(60);
        if (res.error) {
          annualMarginError = `لا توجد قاعدة هامش مطابقة لسنة 5 (60 شهر) لهذه الجهة التمويلية.`;
        }
        annualMargin = res.margin;
        ruleUsed = `هامش سنة 5 للجهة التمويلية بمعدل ${annualMargin}%.`;
      } else if (termYearsFloat >= 30) {
        const res = getMarginForExactMonths(360);
        if (res.error) {
          annualMarginError = `لا توجد قاعدة هامش مطابقة لسنة 30 (360 شهر) لهذه الجهة التمويلية.`;
        }
        annualMargin = res.margin;
        ruleUsed = `هامش سنة 30 للجهة التمويلية بمعدل ${annualMargin}%.`;
      } else {
        if (termMonths % 12 === 0) {
          const res = getMarginForExactMonths(termMonths);
          if (res.error) {
            annualMarginError = `لا توجد قاعدة هامش مطابقة لسنة ${selectedMarginYear} (${termMonths} شهر) لهذه الجهة التمويلية.`;
          }
          annualMargin = res.margin;
          ruleUsed = `هامش سنة ${selectedMarginYear} للجهة التمويلية بمعدل ${annualMargin}%.`;
        } else {
          const lowYear = Math.floor(termYearsFloat);
          const highYear = Math.ceil(termYearsFloat);
          const lowMonths = lowYear * 12;
          const highMonths = highYear * 12;

          const resLow = getMarginForExactMonths(lowMonths);
          const resHigh = getMarginForExactMonths(highMonths);

          if (resLow.error || resHigh.error) {
            annualMarginError = `لا توجد قاعدة هامش مطابقة للاستقراء بين سنة ${lowYear} وسنة ${highYear} لهذه الجهة التمويلية.`;
          }
          const mLow = resLow.margin;
          const mHigh = resHigh.margin;

          annualMargin = mLow + ((termMonths - lowMonths) / (highMonths - lowMonths)) * (mHigh - mLow);
          marginType = 'linear';
          ruleUsed = `هامش مستقرأ بين سنة ${lowYear} (${mLow}%) وسنة ${highYear} (${mHigh}%) بمعدل ${annualMargin.toFixed(3)}%.`;
        }
      }
      break;
    }
    default:
      throw new Error('Invalid calculation mode');
  }

  // Round margin to 3 decimal places
  const baseMarginPercent = Number(annualMargin.toFixed(3));

  // Determine if it is a real estate product and calculate exception adjustments
  const isRealEstate = normProduct !== 'personal' && normProduct !== 'personal_only';
  // Find the sector exception rule matching bank + sector only
  const matchedExceptionRule = rules.find(
    r =>
      r.bankId === bankId &&
      r.sectorId === sectorId &&
      r.productId === normProduct &&
      r.isActive !== false &&
      r.exceptionBps !== undefined
  );
  const exceptionBps = isRealEstate && matchedExceptionRule ? (matchedExceptionRule.exceptionBps ?? 0) : 0;
  const finalMarginPercent = Number(Math.max(0, baseMarginPercent + (exceptionBps / 100)).toFixed(3));

  let finalRuleUsed = ruleUsed;
  if (isRealEstate && exceptionBps !== 0) {
    finalRuleUsed += ` (تم تطبيق استثناء بمقدار ${exceptionBps} نقطة أساس، الهامش النهائي: ${finalMarginPercent.toFixed(3)}%)`;
  }

  return {
    annualMargin: finalMarginPercent,
    marginType,
    ruleUsed: finalRuleUsed,
    salaryTier,
    selectedMarginYear,
    bankName: bankNameAr,
    productName: productNameAr,
    supportName: supportNameAr,
    baseMargin: Number((baseMarginPercent / 100).toFixed(6)),
    exceptionBps,
    error: annualMarginError
  };
}
