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

export function resolveSalaryTransferStatus(
  targetBankId: string,
  salaryBankId?: string | null
): 'salary_transfer' | 'no_salary_transfer' {
  if (salaryBankId && salaryBankId === targetBankId) {
    return 'salary_transfer';
  }
  return 'no_salary_transfer';
}

export function resolveMatchingRules(params: {
  bankId: string;
  productId: ProductId;
  supportType: SupportType;
  sectorId: SectorId;
  marginRules: MarginRule[];
  netSalary?: number;
  salaryBankId?: string | null;
}): MarginRule[] {
  const { bankId, productId, supportType, sectorId, marginRules, netSalary, salaryBankId } = params;

  // Normalize Product ID
  let normProduct = productId;
  if (normProduct === 'real_estate' || normProduct === 'real_estate_only') {
    normProduct = 'real_estate_only';
  } else if (normProduct === 'both' || normProduct === 'real_estate_with_new_personal') {
    normProduct = 'real_estate_with_new_personal';
  } else if (normProduct === 'real_estate_with_personal_existing' || normProduct === 'real_estate_with_existing_personal') {
    normProduct = 'real_estate_with_existing_personal';
  }

  // Normalize Support Type
  const normSup = (s?: string) => {
    if (!s || s === 'none') return 'none';
    if (s === 'down_payment' || s === 'downpayment') return 'downpayment';
    return s;
  };
  const targetSupportNorm = normSup(supportType);

  // Determine Salary Band
  let salaryBand: 'below_25000' | 'from_25000' | 'all' = 'all';
  if (netSalary !== undefined) {
    salaryBand = netSalary < 25000 ? 'below_25000' : 'from_25000';
  }

  // Determine Salary Transfer Status
  const salaryTransferStatus = resolveSalaryTransferStatus(bankId, salaryBankId);

  // Normalization value extractors for robust old/new rules support
  const getRuleSalaryTransferStatus = (r: MarginRule): 'all' | 'salary_transfer' | 'no_salary_transfer' => {
    return r.salaryTransferStatus || 'all';
  };

  const getRuleSalaryBand = (r: MarginRule): 'all' | 'below_25000' | 'from_25000' => {
    if (r.salaryBand) return r.salaryBand;
    if (r.salaryTier === 'below_25000') return 'below_25000';
    if (r.salaryTier === 'above_or_equal_25000') return 'from_25000';
    return 'all';
  };

  const getRuleSupportType = (r: MarginRule): 'all' | 'none' | 'monthly' | 'downpayment' => {
    const s = r.supportType;
    if (!s || s === 'all') return 'all';
    if (s === 'none') return 'none';
    if (s === 'monthly') return 'monthly';
    if (s === 'downpayment' || s === 'down_payment') return 'downpayment';
    return 'all';
  };

  const activeRules = marginRules.filter(r => r.isActive && !r.isExceptionOnly && !r.isConfigOnly);

  // Sequence matching:
  // 1. Full Match: matching bankId, productId, salaryTransferStatus, salaryBand, supportType
  const match1 = activeRules.filter(
    r => r.bankId === bankId &&
         r.productId === normProduct &&
         (getRuleSalaryTransferStatus(r) === salaryTransferStatus) &&
         (getRuleSalaryBand(r) === salaryBand) &&
         (getRuleSupportType(r) === 'all' || getRuleSupportType(r) === targetSupportNorm)
  );
  if (match1.length > 0) return match1;

  // 2. Fallback salaryTransferStatus = all
  const match2 = activeRules.filter(
    r => r.bankId === bankId &&
         r.productId === normProduct &&
         (getRuleSalaryTransferStatus(r) === 'all') &&
         (getRuleSalaryBand(r) === salaryBand) &&
         (getRuleSupportType(r) === 'all' || getRuleSupportType(r) === targetSupportNorm)
  );
  if (match2.length > 0) return match2;

  // 3. Fallback salaryBand = all
  const match3 = activeRules.filter(
    r => r.bankId === bankId &&
         r.productId === normProduct &&
         (getRuleSalaryTransferStatus(r) === salaryTransferStatus || getRuleSalaryTransferStatus(r) === 'all') &&
         (getRuleSalaryBand(r) === 'all') &&
         (getRuleSupportType(r) === 'all' || getRuleSupportType(r) === targetSupportNorm)
  );
  if (match3.length > 0) return match3;

  // 4. Fallback supportType = all
  const match4 = activeRules.filter(
    r => r.bankId === bankId &&
         r.productId === normProduct &&
         (getRuleSalaryTransferStatus(r) === salaryTransferStatus || getRuleSalaryTransferStatus(r) === 'all') &&
         (getRuleSalaryBand(r) === salaryBand || getRuleSalaryBand(r) === 'all') &&
         (getRuleSupportType(r) === 'all')
  );
  if (match4.length > 0) return match4;

  // 5. Fallback both salaryBand and supportType = all
  const match5 = activeRules.filter(
    r => r.bankId === bankId &&
         r.productId === normProduct &&
         (getRuleSalaryTransferStatus(r) === 'all') &&
         (getRuleSalaryBand(r) === 'all') &&
         (getRuleSupportType(r) === 'all')
  );
  if (match5.length > 0) return match5;

  // 6. Global fallback rule matching bankId === 'all'
  const matchGlobal = activeRules.filter(
    r => r.bankId === 'all' &&
         r.productId === normProduct
  );
  return matchGlobal;
}

export function resolveConfiguredMarginMode(params: {
  bankId: string;
  productId: ProductId;
  supportType: SupportType;
  sectorId: SectorId;
  marginRules: MarginRule[];
  netSalary?: number;
  salaryBankId?: string | null;
}): 'duration_tiers' | 'yearly' | 'key_points' {
  const matchingRules = resolveMatchingRules(params);

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
  salaryBankId?: string | null;
  calculationMode: 'duration_tiers' | 'yearly' | 'key_points';
}): MarginOutput {
  const { bankId, productId, supportType, sectorId, termMonths, marginRules, netSalary, salaryBankId, calculationMode } = params;

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

  // Retrieve sequenced matching rules
  const rules = resolveMatchingRules({
    bankId,
    productId,
    supportType,
    sectorId,
    marginRules,
    netSalary,
    salaryBankId
  });

  const bankNameAr = bankId === 'rajhi' ? 'مصرف الراجحي' : bankId === 'alahli' ? 'البنك الأهلي السعودي' : bankId === 'alinma' ? 'مصرف الإنماء' : bankId;
  const productNameAr = normProduct === 'real_estate_only' ? 'عقاري فقط' : normProduct === 'real_estate_with_new_personal' ? 'عقاري + شخصي جديد' : 'عقاري مع شخصي قائم';
  const supportNameAr = normSupport === 'none' ? 'بدون دعم' : normSupport === 'monthly' ? 'دعم شهري' : 'دعم دفعة';

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
