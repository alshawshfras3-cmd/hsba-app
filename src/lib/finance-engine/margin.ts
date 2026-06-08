import { MarginOutput, ProductId, SupportType, SectorId, MarginRule } from '../../types';

export function calculateMargin(params: {
  bankId: string;
  productId: ProductId;
  supportType: SupportType;
  sectorId: SectorId;
  termMonths: number;
  marginRules: MarginRule[];
  netSalary?: number;
}): MarginOutput {
  const { bankId, productId, supportType, sectorId, termMonths, marginRules, netSalary } = params;

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

  // Filter margins for the current bank and product
  let rules = marginRules.filter(
    r => r.bankId === bankId &&
         r.productId === normProduct &&
         (r.supportType === 'all' || r.supportType === normSupport) &&
         (r.sectorId === 'all' || r.sectorId === sectorId) &&
         r.isActive &&
         (!r.salaryTier || r.salaryTier === 'not_applicable' || r.salaryTier === salaryTier)
  );

  // If we have rules that explicitly specify our target salaryTier, prioritize them
  const specificRules = rules.filter(r => r.salaryTier === salaryTier);
  if (specificRules.length > 0) {
    rules = specificRules;
  }

  // If no bank-specific rule, look for general rules
  if (rules.length === 0) {
    rules = marginRules.filter(
      r => r.bankId === 'all' &&
           r.productId === normProduct &&
           r.isActive
    );
  }

  const bankNameAr = bankId === 'rajhi' ? 'مصرف الراجحي' : bankId === 'alahli' ? 'البنك الأهلي السعودي' : bankId === 'alinma' ? 'مصرف الإنماء' : bankId;
  const productNameAr = normProduct === 'real_estate_only' ? 'عقاري فقط' : normProduct === 'real_estate_with_new_personal' ? 'عقاري + شخصي جديد' : 'عقاري مع شخصي قائم';
  const supportNameAr = normSupport === 'none' ? 'غير مدعوم' : normSupport === 'monthly' ? 'دعم شهري' : 'دعم دفعة';

  // Helper to look up margin for an exact month count (e.g. year*12)
  const getMarginForExactMonths = (targetMonths: number): number => {
    const matchedRule = rules.find(
      r => targetMonths >= r.fromTermMonths && targetMonths <= r.toTermMonths
    );
    if (!matchedRule) {
      if (rules.length > 0) {
        return rules[rules.length - 1].endMargin;
      }
      return 3.50; // standard default
    }
    if (matchedRule.calcType === 'linear' && matchedRule.toTermMonths > matchedRule.fromTermMonths) {
      const t = targetMonths;
      const tStart = matchedRule.fromTermMonths;
      const tEnd = matchedRule.toTermMonths;
      const mStart = matchedRule.startMargin;
      const mEnd = matchedRule.endMargin;
      return mStart + ((t - tStart) / (tEnd - tStart)) * (mEnd - mStart);
    }
    return matchedRule.endMargin;
  };

  let annualMargin = 3.50;
  let ruleUsed = '';
  let marginType: 'fixed' | 'linear' = 'fixed';

  // Find if there is a specified marginInputMode in the matched rules
  const activeInputModeRule = rules.find(r => r.marginInputMode);
  const activeInputMode: 'yearly' | 'key_points' = activeInputModeRule ? activeInputModeRule.marginInputMode : 'key_points';

  if (activeInputMode === 'key_points') {
    const termYearsFloat = termMonths / 12;
    if (termYearsFloat <= 5) {
      annualMargin = getMarginForExactMonths(60);
      ruleUsed = `هامش سنة 5 للجهة التمويلية بمعدل ${annualMargin}%.`;
    } else if (termYearsFloat >= 30) {
      annualMargin = getMarginForExactMonths(360);
      ruleUsed = `هامش سنة 30 للجهة التمويلية بمعدل ${annualMargin}%.`;
    } else {
      const points = [5, 10, 15, 20, 25, 30];
      const lowYear = points.reduce((prev, curr) => curr <= termYearsFloat ? curr : prev, 5);
      const highYear = points.find(p => p >= termYearsFloat) || 30;

      if (lowYear === highYear) {
        annualMargin = getMarginForExactMonths(lowYear * 12);
        ruleUsed = `هامش سنة ${lowYear} للجهة التمويلية بمعدل ${annualMargin}%.`;
      } else {
        const lowMonths = lowYear * 12;
        const highMonths = highYear * 12;
        const mLow = getMarginForExactMonths(lowMonths);
        const mHigh = getMarginForExactMonths(highMonths);

        annualMargin = mLow + ((termMonths - lowMonths) / (highMonths - lowMonths)) * (mHigh - mLow);
        marginType = 'linear';
        ruleUsed = `هامش مستقرأ بين سنة ${lowYear} (${mLow}%) وسنة ${highYear} (${mHigh}%) بمعدل ${annualMargin.toFixed(3)}%.`;
      }
    }
  } else {
    // yearly mode
    const termYearsFloat = termMonths / 12;
    if (termYearsFloat <= 5) {
      annualMargin = getMarginForExactMonths(60);
      ruleUsed = `هامش سنة 5 للجهة التمويلية بمعدل ${annualMargin}%.`;
    } else if (termYearsFloat >= 30) {
      annualMargin = getMarginForExactMonths(360);
      ruleUsed = `هامش سنة 30 للجهة التمويلية بمعدل ${annualMargin}%.`;
    } else {
      if (termMonths % 12 === 0) {
        annualMargin = getMarginForExactMonths(termMonths);
        ruleUsed = `هامش سنة ${selectedMarginYear} للجهة التمويلية بمعدل ${annualMargin}%.`;
      } else {
        const lowYear = Math.floor(termYearsFloat);
        const highYear = Math.ceil(termYearsFloat);
        const lowMonths = lowYear * 12;
        const highMonths = highYear * 12;

        const mLow = getMarginForExactMonths(lowMonths);
        const mHigh = getMarginForExactMonths(highMonths);

        annualMargin = mLow + ((termMonths - lowMonths) / (highMonths - lowMonths)) * (mHigh - mLow);
        marginType = 'linear';
        ruleUsed = `هامش مستقرأ بين سنة ${lowYear} (${mLow}%) وسنة ${highYear} (${mHigh}%) بمعدل ${annualMargin.toFixed(3)}%.`;
      }
    }
  }

  // Round margin to 3 decimal places
  const baseMarginPercent = Number(annualMargin.toFixed(3));

  // Determine if it is a real estate product and calculate exception adjustments
  const isRealEstate = normProduct !== 'personal' && normProduct !== 'personal_only';
  const matchedRule = rules.find(
    r => termMonths >= r.fromTermMonths && termMonths <= r.toTermMonths
  );
  const exceptionBps = (isRealEstate && matchedRule) ? (matchedRule.exceptionBps ?? 0) : 0;
  const finalMarginPercent = Number((baseMarginPercent - (exceptionBps / 100)).toFixed(3));

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
    exceptionBps
  };
}
