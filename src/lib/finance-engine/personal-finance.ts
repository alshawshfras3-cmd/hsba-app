import { PersonalFinanceOutput, PersonalFinanceRules, SectorId } from '../../types';

export function getPersonalFinanceRule(params: {
  bankId: string;
  pathType: 'personal_only' | 'real_estate_with_new_personal' | 'real_estate_with_existing_personal';
  customerStatus: 'active' | 'retired' | 'active_employee';
  rules: PersonalFinanceRules[];
}): PersonalFinanceRules | null {
  const { bankId, pathType, customerStatus, rules } = params;

  // Standardize customerStatus
  const isRetired = customerStatus === 'retired';
  const targetStatus: 'active_employee' | 'retired' = isRetired ? 'retired' : 'active_employee';

  // Standardize pathType for searching
  let targetPathType: 'personal_only' | 'real_estate_with_new_personal' = 'personal_only';
  if (pathType === 'real_estate_with_new_personal') {
    targetPathType = 'real_estate_with_new_personal';
  }

  // 1. Try to find precise bank match
  let rule = rules.find(
    r => r.bankId === bankId &&
    r.pathType === targetPathType &&
    r.customerStatus === targetStatus &&
    r.isActive
  );

  // 2. Fall back to 'all' default bank match
  if (!rule) {
    rule = rules.find(
      r => (r.bankId === 'all' || r.bankId === 'default') &&
      r.pathType === targetPathType &&
      r.customerStatus === targetStatus &&
      r.isActive
    );
  }

  return rule || null;
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
}): PersonalFinanceOutput {
  const { netSalary, obligations, sectorId, bankId, rules, productId, monthsBeforeRetirement, remainingMonthsToMaxAge } = params;

  // Map sectorId to customerStatus
  const customerStatus: 'active' | 'retired' = sectorId === 'retired' ? 'retired' : 'active';

  // Map productId to pathType
  let pathType: 'personal_only' | 'real_estate_with_new_personal' | 'real_estate_with_existing_personal' = 'personal_only';
  if (productId === 'both' || productId === 'real_estate_with_new_personal') {
    pathType = 'real_estate_with_new_personal';
  } else if (productId === 'real_estate_with_personal_existing' || productId === 'real_estate_with_existing_personal') {
    pathType = 'real_estate_with_existing_personal';
  }

  // Get matching rule
  const rule = getPersonalFinanceRule({
    bankId,
    pathType,
    customerStatus,
    rules
  });

  const targetStatus = customerStatus === 'retired' ? 'retired' : 'active_employee';

  let source: 'bank_specific' | 'default_bank' | 'fallback' = 'fallback';
  let matchError: string | undefined = undefined;

  let finalRule = rule;

  if (rule) {
    source = rule.bankId === bankId ? 'bank_specific' : 'default_bank';
  } else {
    if (bankId === 'rajhi') {
      source = 'fallback';
      finalRule = {
        bankId: 'rajhi',
        sectorId: 'all',
        dsrPercentage: customerStatus === 'retired' ? 25 : 33.33,
        termMonths: 60,
        financeCoefficient: 0,
        annualMargin: 4.59,
        minSalary: 2000,
        minAge: 18,
        maxAge: customerStatus === 'retired' ? 75 : 65,
        retireeDsrPercentage: 25,
        isActive: true,
        calculationMethod: 'flat_rate',
        pathType: pathType === 'real_estate_with_existing_personal' ? 'personal_only' : pathType,
        customerStatus: targetStatus
      };
    } else if (customerStatus === 'retired') {
      // If the customer is retired and no rule is found, we should NOT fall back to active employee
      matchError = "لا توجد قاعدة تمويل شخصي للمتقاعد لهذا البنك";
    } else {
      source = 'fallback';
      finalRule = {
        bankId: bankId,
        sectorId: 'all',
        dsrPercentage: 33.33,
        termMonths: 60,
        financeCoefficient: 50.42,
        annualMargin: 4.80,
        minSalary: 4000,
        minAge: 18,
        maxAge: 65,
        retireeDsrPercentage: 25,
        isActive: true,
        calculationMethod: 'multiplier',
        pathType: pathType === 'real_estate_with_existing_personal' ? 'personal_only' : pathType,
        customerStatus: 'active_employee'
      };
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

  // Only apply strict hardcoded defaults if it is a fallback rule from the calculator
  if (source === 'fallback' && finalRule.bankId === 'alahli') {
    annualMargin = 5.00;
    ruleTermMonths = 60;
    dsrPercent = customerStatus === 'retired' ? 25 : 33.33;
    coeff = 0;
  } else if (source === 'fallback' && finalRule.bankId === 'rajhi') {
    annualMargin = 4.59;
    ruleTermMonths = 60;
    dsrPercent = customerStatus === 'retired' ? 25 : 33.33;
    coeff = 0;
    calculationMethod = 'flat_rate';
  }

  // تحديد مدة التمويل الشخصي الفعلية
  let termMonths = ruleTermMonths;
  if (customerStatus === 'retired') {
    termMonths = remainingMonthsToMaxAge
      ? Math.min(ruleTermMonths, remainingMonthsToMaxAge)
      : ruleTermMonths;
  } else {
    termMonths = monthsBeforeRetirement
      ? Math.min(ruleTermMonths, monthsBeforeRetirement)
      : ruleTermMonths;
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
      source
    }
  };
}

