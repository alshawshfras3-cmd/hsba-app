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
  let selectedMarginYear: number;
  if (termMonths <= 60) {
    selectedMarginYear = 5;
  } else if (termMonths <= 120) {
    selectedMarginYear = 10;
  } else {
    selectedMarginYear = Math.ceil(termMonths / 12);
  }
  selectedMarginYear = Math.min(Math.max(selectedMarginYear, 5), 30);
  if (selectedMarginYear > 5 && selectedMarginYear < 10) {
    selectedMarginYear = 10;
  }

  const targetMonthsForLookup = selectedMarginYear * 12;

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

  // Find the bracket that contains our targetMonthsForLookup
  const matchedRule = rules.find(
    r => targetMonthsForLookup >= r.fromTermMonths && targetMonthsForLookup <= r.toTermMonths
  );

  const bankNameAr = bankId === 'rajhi' ? 'مصرف الراجحي' : bankId === 'alahli' ? 'البنك الأهلي السعودي' : bankId === 'alinma' ? 'مصرف الإنماء' : bankId;
  const productNameAr = normProduct === 'real_estate_only' ? 'عقاري فقط' : normProduct === 'real_estate_with_new_personal' ? 'عقاري + شخصي جديد' : 'عقاري مع شخصي قائم';
  const supportNameAr = normSupport === 'none' ? 'غير مدعوم' : normSupport === 'monthly' ? 'دعم شهري' : 'دعم دفعة';

  if (!matchedRule) {
    // Return last rule or general default
    if (rules.length > 0) {
      const lastRule = rules[rules.length - 1];
      return {
        annualMargin: lastRule.endMargin,
        marginType: 'fixed',
        ruleUsed: `أقصى هامش متاح للبنك: ${lastRule.endMargin}%`,
        salaryTier,
        selectedMarginYear,
        bankName: bankNameAr,
        productName: productNameAr,
        supportName: supportNameAr
      };
    }
    return {
      annualMargin: 3.50,
      marginType: 'fixed',
      ruleUsed: 'الهامش القياسي الافتراضي للمنصة (3.5%).',
      salaryTier,
      selectedMarginYear,
      bankName: bankNameAr,
      productName: productNameAr,
      supportName: supportNameAr
    };
  }

  let annualMargin = matchedRule.endMargin;

  if (matchedRule.calcType === 'linear') {
    // If it's linear interpolation, we can interpolate using the actual termMonths
    const t = termMonths;
    const tStart = matchedRule.fromTermMonths;
    const tEnd = matchedRule.toTermMonths;
    const mStart = matchedRule.startMargin;
    const mEnd = matchedRule.endMargin;

    if (tEnd > tStart) {
      annualMargin = mStart + ((t - tStart) / (tEnd - tStart)) * (mEnd - mStart);
    } else {
      annualMargin = mEnd;
    }
  }

  // Round margin to 3 decimal places
  annualMargin = Number(annualMargin.toFixed(3));

  return {
    annualMargin,
    marginType: matchedRule.calcType,
    ruleUsed: `هامش سنة ${selectedMarginYear} للجهة التمويلية بمعدل ${annualMargin}%.`,
    salaryTier,
    selectedMarginYear,
    bankName: bankNameAr,
    productName: productNameAr,
    supportName: supportNameAr
  };
}
