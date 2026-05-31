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

  // حساب الدعم المطبق في الخصم الشهري (دعم الراجحي)
  // إذا كانت فترة التمويل تزيد عن 240 شهراً (20 سنة)، نستغرق الدعم على كامل الفترة (القسط الشهري مدعوم بـ 240 / فترة التمويل)
  const supportInDeduction = supportType === 'monthly'
    ? (totalMonths > 240 ? (monthlySupport * 240) / totalMonths : monthlySupport)
    : 0;

  // إجمالي الدعم المستلم طوال فترة التمويل (بحد أقصى 240 شهر)
  const totalHousingSupportReceived = supportType === 'monthly'
    ? (monthlySupport * Math.min(totalMonths, 240))
    : (supportType === 'downpayment' ? downPaymentSupport : 0);

  if (monthsBeforeRetirement === 0 && monthsAfterRetirement > 0) {
    const effectiveSalaryRetired = pensionSalaryAfter + supportInDeduction;
    const installmentRetired = Math.max(0, effectiveSalaryRetired * (dsrAfter / 100) - obligations);

    const totalCashflow = installmentRetired * monthsAfterRetirement;
    const termYears = monthsAfterRetirement / 12;
    const denominator = 1 + (annualMargin / 100) * termYears;
    const realEstateFinanceAmount = Math.round(totalCashflow / denominator);

    const totalPurchasingPower = realEstateFinanceAmount + (supportType === 'downpayment' ? downPaymentSupport : 0);
    return {
      realEstateFinanceAmount,
      monthlyInstallmentBeforeRetirement: 0,
      monthlyInstallmentAfterRetirement: Math.round(installmentRetired),
      totalCashflow,
      totalRepayment: Math.round(totalCashflow),
      profitAmount: Math.max(0, Math.round(totalCashflow) - realEstateFinanceAmount),
      housingSupportAmount: totalHousingSupportReceived,
      totalPurchasingPower,
      annualMargin,
      termMonths: monthsAfterRetirement
    };
  }

  // حساب القدرة الاستقطاعية قبل التقاعد مع دمج دعم القسط الشهري
  const effectiveSalaryBefore = netSalaryBefore + supportInDeduction;
  let installmentBefore = Math.max(0, effectiveSalaryBefore * (dsrBefore / 100) - obligations);

  // حساب القدرة الاستقطاعية بعد التقاعد مع دمج دعم القسط الشهري
  const effectiveSalaryAfter = pensionSalaryAfter + supportInDeduction;
  let installmentAfter = 0;
  if (monthsAfterRetirement > 0) {
    installmentAfter = Math.max(0, effectiveSalaryAfter * (dsrAfter / 100));
  }

  // إجمالي التدفق النقدي للأقساط لمزج قبل وبعد التقاعد
  const totalCashflow = (installmentBefore * monthsBeforeRetirement) + (installmentAfter * monthsAfterRetirement);

  const termYears = totalMonths / 12;
  const denominator = 1 + (annualMargin / 100) * termYears;

  const realEstateFinanceAmount = Math.round(totalCashflow / denominator);
  const totalRepayment = Math.round(totalCashflow);
  const profitAmount = Math.max(0, totalRepayment - realEstateFinanceAmount);

  // القدرة الشرائية الكلية = مبلغ التمويل + منحة الدفعة المقدمة (إذا كانت من نوع دفعة مقدمة)
  const totalPurchasingPower = realEstateFinanceAmount + (supportType === 'downpayment' ? downPaymentSupport : 0);

  return {
    realEstateFinanceAmount: Math.round(realEstateFinanceAmount),
    monthlyInstallmentBeforeRetirement: Math.round(installmentBefore),
    monthlyInstallmentAfterRetirement: Math.round(installmentAfter),
    totalCashflow,
    totalRepayment,
    profitAmount,
    housingSupportAmount: totalHousingSupportReceived,
    totalPurchasingPower,
    annualMargin,
    termMonths: totalMonths
  };
}
