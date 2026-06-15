import { PersonalFinanceOutput, PersonalFinanceRules, SectorId } from '../../types';

export function hasLoadedPersonalRules(personalRules?: PersonalFinanceRules[]): boolean {
  return Array.isArray(personalRules) && personalRules.length > 0;
}

export function getPersonalFinanceRule(params: {
  bankId: string;
  pathType: 'personal_only' | 'real_estate_with_new_personal' | 'real_estate_with_existing_personal';
  customerStatus: 'active' | 'retired' | 'active_employee';
  rules: PersonalFinanceRules[];
  sectorId?: SectorId;
  netSalary?: number;
  termMonths?: number;
}): PersonalFinanceRules | null {
  const { bankId, pathType, customerStatus, rules, sectorId, netSalary, termMonths } = params;

  // Standardize customerStatus
  const isRetired = customerStatus === 'retired' || sectorId === 'retired';
  const targetStatus: 'active_employee' | 'retired' = isRetired ? 'retired' : 'active_employee';

  // Standardize pathType for searching
  let targetPathType: 'personal_only' | 'real_estate_with_new_personal' = 'personal_only';
  if (pathType === 'real_estate_with_new_personal') {
    targetPathType = 'real_estate_with_new_personal';
  }

  // Development fallback ONLY if no rules are loaded in the entire app_settings
  if (!hasLoadedPersonalRules(rules)) {
    const isAlahli = bankId === 'alahli';
    const isRajhi = bankId === 'rajhi';
    return {
      id: 'dev_fallback_personal',
      bankId: bankId,
      sectorId: 'all',
      dsrPercentage: targetStatus === 'retired' ? 25 : 33.33,
      termMonths: 60,
      financeCoefficient: isRajhi || isAlahli ? 0 : 50.42,
      annualMargin: isRajhi ? 4.59 : (isAlahli ? 5.00 : 4.80),
      minSalary: 1000,
      minAge: 18,
      maxAge: targetStatus === 'retired' ? 75 : 65,
      retireeDsrPercentage: 25,
      isActive: true,
      calculationMethod: (isRajhi || isAlahli) ? 'flat_rate' : 'multiplier',
      pathType: targetPathType,
      customerStatus: targetStatus
    };
  }

  // Find rules matching the requirements
  const findMatching = (targetBank: string) => {
    return rules.filter(r => {
      // 1. check isActive
      if (!r.isActive) return false;

      // 2. check bankId
      if (r.bankId !== targetBank) return false;

      // 3. check productType / pathType (if specified in rule)
      if (r.pathType && r.pathType !== targetPathType) return false;

      // 4. check customerStatus (if specified in rule)
      if (r.customerStatus && r.customerStatus !== targetStatus) return false;

      // 5. check sectorId / employmentSector (if specified in rule)
      if (sectorId) {
        const ruleSector = (r as any).sectorId || (r as any).employmentSector || (r as any).sector;
        if (ruleSector && ruleSector !== 'all' && ruleSector !== sectorId) return false;
      }

      // 6. check salary range (if specified and netSalary is provided)
      if (netSalary !== undefined) {
        const minSal = Number(r.minSalary) || 0;
        const maxSal = r.maxSalary !== undefined ? Number(r.maxSalary) : undefined;
        if (netSalary < minSal) return false;
        if (maxSal !== undefined && maxSal > 0 && netSalary > maxSal) return false;
      }

      // 7. check termMonths range (if specified and requested termMonths is provided)
      if (termMonths !== undefined && r.termMonths && termMonths > r.termMonths) return false;

      return true;
    });
  };

  // Find candidates with precise bankId
  let candidates = findMatching(bankId);
  
  // Try fallback to 'all' or 'default' bankId if none for precise bank
  if (candidates.length === 0) {
    candidates = findMatching('all').concat(findMatching('default'));
  }

  if (candidates.length > 0) {
    // Return precise sectorId match if possible
    if (sectorId) {
      const best = candidates.find(r => {
        const ruleSector = (r as any).sectorId || (r as any).employmentSector || (r as any).sector;
        return ruleSector === sectorId;
      });
      if (best) return best;
    }
    return candidates[0];
  }

  return null;
}

export function calculatePersonalFinance(params: {
  netSalary: number;
  obligations: number;
  sectorId: SectorId;
  bankId: string;
  rules: PersonalFinanceRules[];
  productId?: string;
  monthsBeforeRetirement?: number;
  remainingMonthsToMaxAge?: number;
  personalTenorSelectionMode?: 'auto' | 'custom';
  requestedPersonalTenorMonths?: number;
}): PersonalFinanceOutput {
  const { netSalary, obligations, sectorId, bankId, rules, productId, monthsBeforeRetirement, remainingMonthsToMaxAge, personalTenorSelectionMode, requestedPersonalTenorMonths } = params;

  // Map sectorId to customerStatus
  const customerStatus: 'active' | 'retired' = sectorId === 'retired' ? 'retired' : 'active';

  // Map productId to pathType
  let pathType: 'personal_only' | 'real_estate_with_new_personal' | 'real_estate_with_existing_personal' = 'personal_only';
  if (productId === 'both' || productId === 'real_estate_with_new_personal') {
    pathType = 'real_estate_with_new_personal';
  } else if (productId === 'real_estate_with_personal_existing' || productId === 'real_estate_with_existing_personal') {
    pathType = 'real_estate_with_existing_personal';
  }

  if (!hasLoadedPersonalRules(rules)) {
    console.warn("[HESBA FALLBACK] Using fallback personal finance rules because personalRules are unavailable");
  }

  // Get matching rule
  const rule = getPersonalFinanceRule({
    bankId,
    pathType,
    customerStatus,
    rules,
    sectorId,
    netSalary
  });

  const targetStatus = customerStatus === 'retired' ? 'retired' : 'active_employee';

  let source: 'bank_specific' | 'default_bank' | 'fallback' = 'fallback';
  let matchError: string | undefined = undefined;

  let finalRule = rule;

  if (rule) {
    source = rule.id === 'dev_fallback_personal' ? 'fallback' : (rule.bankId === bankId ? 'bank_specific' : 'default_bank');
  } else {
    if (hasLoadedPersonalRules(rules)) {
      // Check if any rule for this bank exists in the configuration
      const anyRuleForBank = rules.some(r => r.bankId === bankId);
      if (anyRuleForBank) {
        const activeRuleForBank = rules.some(r => r.bankId === bankId && r.isActive);
        if (!activeRuleForBank) {
          matchError = "قاعدة التمويل الشخصي لهذا البنك غير مفعلة في لوحة التحكم";
        } else {
          matchError = "لا توجد قاعدة تمويل شخصي مفعلة لهذا البنك/القطاع في لوحة التحكم";
        }
      } else {
        matchError = "لا توجد قاعدة تمويل شخصي مفعلة لهذا البنك/القطاع في لوحة التحكم";
      }
    } else {
      matchError = "لا توجد قاعدة تمويل شخصي مفعلة لهذا البنك/القطاع في لوحة التحكم";
    }
  }

  // Validate salary limits if rule is available and no previous error
  if (finalRule && !matchError) {
    const minSal = Number(finalRule.minSalary) || 0;
    const maxSal = finalRule.maxSalary !== undefined ? Number(finalRule.maxSalary) : undefined;

    if (netSalary < minSal) {
      matchError = `صافي الراتب (${netSalary.toLocaleString('ar-SA')} ريال) أقل من الحد الأدنى المقبول للتمويل الشخصي لدى هذا البنك والمقدر بـ ${minSal.toLocaleString('ar-SA')} ريال.`;
    } else if (maxSal !== undefined && maxSal > 0 && netSalary > maxSal) {
      matchError = `صافي الراتب (${netSalary.toLocaleString('ar-SA')} ريال) أعلى من الحد الأقصى المقبول للتمويل الشخصي لدى هذا البنك والمقدر بـ ${maxSal.toLocaleString('ar-SA')} ريال.`;
    }
  }

  if (matchError || !finalRule) {
    return {
      personalFinanceAmount: 0,
      monthlyInstallment: 0,
      totalRepayment: 0,
      profitAmount: 0,
      totalProfitPercentage: 0,
      termMonths: 0,
      calculationMethod: undefined,
      multiplier: undefined,
      diagnostics: {
        ruleId: undefined,
        bankId: bankId,
        customerStatus: targetStatus,
        pathType: pathType,
        dsr: 0,
        termMonths: 0,
        calculationMethod: 'none',
        source: 'fallback',
        error: matchError
      }
    };
  }

  const safeSalary = Number(netSalary) || 0;
  const safeObligations = Number(obligations) || 0;

  let dsrPercent = Number(finalRule.dsrPercentage) || 0;
  let ruleTermMonths = Number(finalRule.termMonths) || 0;
  let coeff = Number(finalRule.financeCoefficient) || 0;
  let calculationMethod = finalRule.calculationMethod || 'flat_rate';
  let annualMargin = Number(finalRule.annualMargin) || 0;

  const rateAppType = finalRule.rateApplicationType || 'fixed';
  const brackets = finalRule.salaryBrackets || [];

  if (rateAppType === 'bracket' && brackets.length > 0) {
    const matchingBracket = brackets.find(b => {
      const fromSal = Number(b.fromSalary) || 0;
      const toSal = b.toSalary !== null && b.toSalary !== undefined ? Number(b.toSalary) : null;
      if (toSal !== null) {
        return safeSalary >= fromSal && safeSalary <= toSal;
      }
      return safeSalary >= fromSal;
    });

    if (matchingBracket) {
      dsrPercent = Number(matchingBracket.dsrPercentage) || 0;
      ruleTermMonths = Number(matchingBracket.termMonths) || 0;
      annualMargin = Number(matchingBracket.annualMargin) || 0;
    }
  }

  // Only apply strict hardcoded defaults if it is a fallback rule from the calculator in development environment
  if (finalRule.id === 'dev_fallback_personal') {
    if (finalRule.bankId === 'alahli') {
      annualMargin = 5.00;
      ruleTermMonths = 60;
      dsrPercent = customerStatus === 'retired' ? 25 : 33.33;
      coeff = 0;
    } else if (finalRule.bankId === 'rajhi') {
      annualMargin = 4.59;
      ruleTermMonths = 60;
      dsrPercent = customerStatus === 'retired' ? 25 : 33.33;
      coeff = 0;
      calculationMethod = 'flat_rate';
    }
  }

  // تحديد مدة التمويل الشخصي الفعلية
  let maxAllowedPersonalTenor = ruleTermMonths;
  const capPersonalTenorByRetirement = finalRule.capPersonalTenorByRetirement !== false;
  const allowPersonalAfterRetirementForActive = finalRule.allowPersonalAfterRetirementForActive === true;

  if (customerStatus === 'retired' || sectorId === 'retired') {
    maxAllowedPersonalTenor = remainingMonthsToMaxAge
      ? Math.min(ruleTermMonths, remainingMonthsToMaxAge)
      : ruleTermMonths;
  } else {
    // Active employee
    const monthsUntilRetirement = monthsBeforeRetirement !== undefined ? monthsBeforeRetirement : 0;
    if (capPersonalTenorByRetirement || !allowPersonalAfterRetirementForActive) {
      maxAllowedPersonalTenor = Math.min(ruleTermMonths, monthsUntilRetirement);
    } else {
      maxAllowedPersonalTenor = ruleTermMonths;
    }
  }
  if (maxAllowedPersonalTenor < 1) maxAllowedPersonalTenor = 1;

  let termMonths = maxAllowedPersonalTenor;
  let reductionReason = '';

  if (pathType === 'personal_only' && personalTenorSelectionMode === 'custom' && requestedPersonalTenorMonths !== undefined) {
    if (requestedPersonalTenorMonths > maxAllowedPersonalTenor) {
      termMonths = maxAllowedPersonalTenor;
      reductionReason = `تم تقليل مدة التمويل الشخصي المطلوبة (${requestedPersonalTenorMonths} شهرًا) وتحديدها بـ ${termMonths} شهرًا لتتوافق مع الحد الأقصى المسموح به لظروف التقاعد أو اللائحة لدى البنك البالغ ${maxAllowedPersonalTenor} شهرًا.`;
    } else {
      termMonths = requestedPersonalTenorMonths;
    }
  } else {
    // auto or other paths
    termMonths = maxAllowedPersonalTenor;
    if (customerStatus !== 'retired' && sectorId !== 'retired') {
      const monthsUntilRetirement = monthsBeforeRetirement !== undefined ? monthsBeforeRetirement : 0;
      if (termMonths < ruleTermMonths) {
        reductionReason = `تم اعتماد مدة الشخصي ${termMonths} شهرًا لأنها الأقل بين مدة البنك القصوى ${ruleTermMonths} شهرًا والأشهر المتبقية قبل التقاعد ${monthsUntilRetirement} شهرًا.`;
      }
    }
  }
  if (termMonths < 1) termMonths = 1;

  // Max personal installment allowed
  const maxDsrInstallment = safeSalary * (dsrPercent / 100);

  // Installment available after subtracting other debts/obligations
  const personalInstallmentRaw = Math.max(0, maxDsrInstallment - safeObligations);
  let rawInstallment = personalInstallmentRaw;

  let personalFinanceAmount = 0;
  let totalRepayment = 0;
  let profitAmount = 0;

  if (calculationMethod === 'pmt') {
    const monthlyRate = annualMargin / 100 / 12;
    if (monthlyRate > 0) {
      personalFinanceAmount = rawInstallment * (1 - Math.pow(1 + monthlyRate, -termMonths)) / monthlyRate;
    } else {
      personalFinanceAmount = rawInstallment * termMonths;
    }
    totalRepayment = rawInstallment * termMonths;
    profitAmount = totalRepayment - personalFinanceAmount;
  } else if (calculationMethod === 'multiplier') {
    personalFinanceAmount = rawInstallment * coeff;
    totalRepayment = rawInstallment * termMonths;
    profitAmount = totalRepayment - personalFinanceAmount;
  } else {
    // flat_rate or flat
    const termYears = termMonths / 12;
    const denominator = 1 + (annualMargin / 100) * termYears;
    personalFinanceAmount = (rawInstallment * termMonths) / denominator;
    totalRepayment = rawInstallment * termMonths;
    profitAmount = totalRepayment - personalFinanceAmount;
  }

  // Calculate annualMarginApprox for multiplier mode (for displaying and diagnostic fields)
  let annualMarginApprox: number | undefined = undefined;
  if (calculationMethod === 'multiplier' && personalFinanceAmount > 0) {
    annualMarginApprox = (profitAmount / personalFinanceAmount) / (termMonths / 12) * 100;
  }

  // Rounding values
  const roundedPersonalFinanceAmount = Math.ceil(personalFinanceAmount);
  const roundedTotalRepayment = Math.round(totalRepayment);
  const roundedProfitAmount = roundedTotalRepayment - roundedPersonalFinanceAmount;
  
  const totalProfitPercentage = roundedPersonalFinanceAmount > 0 
    ? Number(((roundedProfitAmount / roundedPersonalFinanceAmount) * 100).toFixed(2)) 
    : 0;

  return {
    personalFinanceAmount: roundedPersonalFinanceAmount,
    monthlyInstallment: Math.round(rawInstallment),
    totalRepayment: roundedTotalRepayment,
    profitAmount: roundedProfitAmount,
    totalProfitPercentage,
    termMonths,
    calculationMethod,
    multiplier: calculationMethod === 'flat_rate' ? Number((termMonths / (1 + (annualMargin / 100) * (termMonths / 12))).toFixed(2)) : coeff,
    diagnostics: {
      ruleId: finalRule.id,
      bankId: finalRule.bankId,
      customerStatus: targetStatus,
      pathType: pathType,
      dsr: dsrPercent,
      termMonths: termMonths,
      calculationMethod,
      multiplier: calculationMethod === 'flat_rate' ? Number((termMonths / (1 + (annualMargin / 100) * (termMonths / 12))).toFixed(2)) : coeff,
      flatRate: calculationMethod === 'flat_rate' ? annualMargin : (annualMarginApprox !== undefined ? Number(annualMarginApprox.toFixed(2)) : finalRule.annualMargin),
      source,
      personalMaxTenorMonths: ruleTermMonths,
      monthsUntilRetirement: monthsBeforeRetirement,
      effectivePersonalTenorMonths: termMonths,
      reductionReason: reductionReason || undefined,
    }
  };
}

