import { RealEstateFinanceOutput, SupportType } from '../../types';

export function calculateRealEstateFinance(params: {
  netSalaryBefore: number;
  pensionSalaryAfter: number;
  dsrBefore: number;
  dsrAfter: number;
  monthlySupport: number;
  downPaymentSupport: number;
  monthsBeforeRetirement: number;
  monthsAfterRetirement: number;
  annualMargin: number;
  obligations: number;
  supportType: SupportType;
}): RealEstateFinanceOutput {
  const {
    netSalaryBefore,
    pensionSalaryAfter,
    dsrBefore,
    dsrAfter,
    monthlySupport,
    downPaymentSupport,
    monthsBeforeRetirement,
    monthsAfterRetirement,
    annualMargin,
    obligations,
    supportType
  } = params;

  const totalMonths = monthsBeforeRetirement + monthsAfterRetirement;
  if (totalMonths <= 0) {
    return {
      realEstateFinanceAmount: 0,
      monthlyInstallmentBeforeRetirement: 0,
      monthlyInstallmentAfterRetirement: 0,
      totalCashflow: 0,
      totalRepayment: 0,
      profitAmount: 0,
      housingSupportAmount: 0,
      totalPurchasingPower: 0,
      annualMargin,
      termMonths: 0
    };
  }

  if (monthsBeforeRetirement === 0 && monthsAfterRetirement > 0) {
    const effectiveSalaryRetired = pensionSalaryAfter + (supportType === 'monthly' ? monthlySupport : 0);
    const installmentRetired = Math.max(0, effectiveSalaryRetired * (dsrAfter / 100) - obligations);

    const totalCashflow = installmentRetired * monthsAfterRetirement;
    const termYears = monthsAfterRetirement / 12;
    const denominator = 1 + (annualMargin / 100) * termYears;
    const realEstateFinanceAmount = Math.round(totalCashflow / denominator);

    const housingSupportAmount = supportType === 'downpayment'
      ? downPaymentSupport
      : monthlySupport;

    const totalPurchasingPower = realEstateFinanceAmount + (supportType === 'downpayment' ? downPaymentSupport : 0);
    return {
      realEstateFinanceAmount,
      monthlyInstallmentBeforeRetirement: 0,
      monthlyInstallmentAfterRetirement: Math.round(installmentRetired),
      totalCashflow,
      totalRepayment: Math.round(totalCashflow),
      profitAmount: Math.max(0, Math.round(totalCashflow) - realEstateFinanceAmount),
      housingSupportAmount,
      totalPurchasingPower,
      annualMargin,
      termMonths: monthsAfterRetirement
    };
  }

  // Calculate pre-retirement monthly installment capacity
  // Installment capacity = Net * DSR - obligations
  const effectiveSalaryBefore = netSalaryBefore + (supportType === 'monthly' ? monthlySupport : 0);
  let installmentBefore = Math.max(0, effectiveSalaryBefore * (dsrBefore / 100) - obligations);

  // Calculate post-retirement monthly installment capacity
  const effectiveSalaryAfter = pensionSalaryAfter + (supportType === 'monthly' ? monthlySupport : 0);
  let installmentAfter = 0;
  if (monthsAfterRetirement > 0) {
    installmentAfter = Math.max(0, effectiveSalaryAfter * (dsrAfter / 100));
  }

  // Total cashflow represents the lifetime installment contributions of the contract
  const totalCashflow = (installmentBefore * monthsBeforeRetirement) + (installmentAfter * monthsAfterRetirement);

  // Present Value (PV) / Loan Amount calculation matching the user's explicit equation:
  // Loan Amount = Total Cashflow / (1 + (annualMargin/100) * (termYears))
  const termYears = totalMonths / 12;
  const denominator = 1 + (annualMargin / 100) * termYears;

  const realEstateFinanceAmount = Math.round(totalCashflow / denominator);
  const totalRepayment = Math.round(totalCashflow);
  const profitAmount = Math.max(0, totalRepayment - realEstateFinanceAmount);

  // Total Housing support received over the term
  const housingSupportAmount = supportType === 'downpayment'
    ? downPaymentSupport
    : monthlySupport;

  // Purchasing power = loan amount + cash grant (if downpayment type)
  let totalPurchasingPower = realEstateFinanceAmount;
  if (supportType === 'downpayment') {
    totalPurchasingPower += downPaymentSupport;
  }

  return {
    realEstateFinanceAmount: Math.round(realEstateFinanceAmount),
    monthlyInstallmentBeforeRetirement: Math.round(installmentBefore),
    monthlyInstallmentAfterRetirement: Math.round(installmentAfter),
    totalCashflow,
    totalRepayment,
    profitAmount,
    housingSupportAmount,
    totalPurchasingPower,
    annualMargin,
    termMonths: totalMonths
  };
}
