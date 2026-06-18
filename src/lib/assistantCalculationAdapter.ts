import { calculateBanksFinancing } from './finance-engine';
import { 
  Bank, 
  ProductAcceptance, 
  MilitaryRank, 
  NetSalaryRule, 
  PensionRule, 
  TermRule, 
  MarginRule, 
  DsrRule, 
  SupportSettings, 
  PersonalFinanceRules,
  HousingSupportTier,
  AdvancePaymentTier,
  SectorId,
  ProductId,
  SupportType,
  TermMode
} from '../types';

export interface AssistantCalculationInput {
  sectorId?: SectorId;
  productId?: ProductId;
  militarySubType?: 'military_officer' | 'military_individual';
  rankId?: string;
  birthYear?: number;
  birthMonth?: number;
  birthDay?: number;
  birthCalendar?: 'gregorian' | 'hijri';
  appointmentYear?: number;
  appointmentMonth?: number;
  appointmentDay?: number;
  appointmentCalendar?: 'gregorian' | 'hijri';
  salaryMode?: 'direct' | 'details';
  basicSalary?: number;
  housingAllowance?: number;
  otherAllowances?: number;
  directNetSalary?: number;
  directPensionSalary?: number;
  obligations?: number;
  supportType?: SupportType;
  selectedBankId?: string;
  salaryBankId?: string | null;
  termMode?: TermMode;
  manualTermYears?: number;
}

export interface AssistantValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates the parsed assistant variables before feeding them to the Hesba Finance Engine.
 */
export function validateAssistantInput(input: AssistantCalculationInput): AssistantValidationResult {
  const errors: string[] = [];

  // 1. Basic Fields Presence
  if (!input.sectorId) errors.push("الرجاء تحديد قطاع العمل (مدني، عسكري، شركات معتمدة، قطاع خاص، متقاعد).");
  
  if (!input.birthYear || !input.birthMonth || !input.birthDay) {
    errors.push("الرجاء إدخال تاريخ الميلاد كاملاً (يوم/شهر/سنة).");
  }

  if (input.sectorId !== 'retired') {
    if (!input.appointmentYear || !input.appointmentMonth || !input.appointmentDay) {
      errors.push("الرجاء إدخال تاريخ التعيين كاملاً (يوم/شهر/سنة).");
    }
  }

  // Determine Net Salary representing income
  const totalIncome = input.salaryMode === 'details' 
    ? ((input.basicSalary ?? 0) + (input.housingAllowance ?? 0) + (input.otherAllowances ?? 0))
    : (input.directNetSalary ?? 0);

  if (totalIncome <= 0) {
    errors.push("الراتب المدخل غير صحيح أو يساوي صفر.");
  }

  // 2. Cross Field Logical Inspections
  if (input.birthYear && input.appointmentYear) {
    if (input.birthCalendar === input.appointmentCalendar) {
      if (input.appointmentYear < input.birthYear) {
        errors.push("تنبيه منطقي: تاريخ التعيين لا يمكن أن يكون قبل تاريخ الميلاد.");
      } else if (input.appointmentYear - input.birthYear < 15) {
        errors.push("تنبيه منطقي: العمر عند التعيين صغير جداً وغير حقيقي للعمل.");
      }
    }
    
    const ageRoughG = 2026 - input.birthYear;
    if (ageRoughG > 100 || ageRoughG < 18) {
      errors.push(`تنبيه منطقي: عمر العميل المدخل غير اعتيادي للتمويل السكني (${ageRoughG} سنة).`);
    }
  }

  // 3. Obligations versus income
  const obs = input.obligations ?? 0;
  if (obs >= totalIncome && totalIncome > 0) {
    errors.push("الالتزامات الضريبية والشرطية الشهرية لا يمكن أن تزيد أو تساوى الدخل الصافي الكلي للتمويل.");
  }

  // 4. Military rank check
  if (input.sectorId === 'military') {
    if (!input.rankId) {
      errors.push("الرجاء تحديد الرتبة العسكرية المناسبة لتعديل مصفوفة التقاعد المحدثة.");
    }
  } else {
    if (input.rankId) {
      errors.push("تنبيه منطقي: تم تحديد رتبة عسكرية لقطاع عمل غير عسكري.");
    }
  }

  // 5. Calendar mixing check
  if (input.birthCalendar && input.appointmentCalendar) {
    if (input.birthCalendar !== input.appointmentCalendar) {
      errors.push("يرجى توحيد نوع التقويم لحساب دقيق (هجري أو ميلادي لجميع الفترات).");
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Adapter that maps high-level assistant properties to the exact context input needed by the finance engine.
 */
export function runAssistantCalculation(
  input: AssistantCalculationInput,
  context: {
    banks: Bank[];
    products: ProductAcceptance[];
    militaryRanks: MilitaryRank[];
    salaryRules: NetSalaryRule[];
    pensionRules: PensionRule[];
    termRules: TermRule[];
    marginRules: MarginRule[];
    dsrRules: DsrRule[];
    supportSettings: SupportSettings;
    personalRules: PersonalFinanceRules[];
    housingSupportTiers: HousingSupportTier[];
    advancePaymentTiers: AdvancePaymentTier[];
    bankSectorRules?: any;
    customSectors?: any;
  }
) {
  // Translate manual term years to months
  const termMode: TermMode = input.termMode ?? 'max';
  const manualTermMonths = (termMode === 'manual' && input.manualTermYears) 
    ? Number(input.manualTermYears) * 12 
    : undefined;

  const basicSalary = Number(input.basicSalary) || 0;
  const housingAllowance = Number(input.housingAllowance) || 0;
  const otherAllowances = Number(input.otherAllowances) || 0;
  const directNetSalary = Number(input.directNetSalary) || 0;

  // Compile inputs for calculateBanksFinancing
  const mappedParams = {
    sectorId: input.sectorId ?? 'gov_civil',
    productId: input.productId ?? 'real_estate_with_new_personal',
    militarySubType: input.militarySubType,
    birthYear: Number(input.birthYear) || 1990,
    birthMonth: Number(input.birthMonth) || 1,
    birthDay: Number(input.birthDay) || 1,
    birthCalendar: input.birthCalendar ?? 'gregorian',
    appointmentYear: input.sectorId === 'retired' ? undefined : (input.appointmentYear ? Number(input.appointmentYear) : undefined),
    appointmentMonth: input.sectorId === 'retired' ? undefined : (input.appointmentMonth ? Number(input.appointmentMonth) : undefined),
    appointmentDay: input.sectorId === 'retired' ? undefined : (input.appointmentDay ? Number(input.appointmentDay) : undefined),
    appointmentCalendar: input.sectorId === 'retired' ? undefined : (input.appointmentCalendar ?? 'gregorian'),
    rankId: input.rankId,
    salaryMode: input.salaryMode ?? 'direct',
    basicSalary,
    housingAllowance,
    otherAllowances,
    directNetSalary,
    directPensionSalary: Number(input.directPensionSalary) || 0,
    obligations: Number(input.obligations) || 0,
    existingMonthlyObligations: Number(input.obligations) || 0,
    obligationRemainingMonths: 0,
    supportType: input.supportType ?? 'none',
    selectedBankId: input.selectedBankId ?? 'all',
    salaryBankId: input.salaryBankId ?? null,
    termMode,
    manualTermMonths,
    personalTenorSelectionMode: 'auto' as const,
    requestedPersonalTenorMonths: undefined,
    
    // Dynamic settings from state
    banks: context.banks,
    products: context.products,
    militaryRanks: context.militaryRanks,
    salaryRules: context.salaryRules,
    pensionRules: context.pensionRules,
    termRules: context.termRules,
    marginRules: context.marginRules,
    dsrRules: context.dsrRules,
    supportSettings: context.supportSettings,
    personalRules: context.personalRules,
    housingSupportTiers: context.housingSupportTiers,
    advancePaymentTiers: context.advancePaymentTiers,
    bankSectorRules: context.bankSectorRules ?? [],
    customSectors: context.customSectors ?? []
  };

  // Execute and return safe, pruned output to avoid exposing internal calculation steps
  const rawResults = calculateBanksFinancing(mappedParams);

  // Return formatted answers
  return rawResults.map(r => ({
    bankId: r.bankId,
    bankName: r.bankName || r.bankId,
    isEligible: r.isEligible,
    rejectionReason: r.rejectionReason || '',
    totalPurchasingPower: r.totalPurchasingPower,
    realEstateAmount: r.realEstateAmount,
    personalAmount: r.personalAmount,
    monthlyInstallment: r.monthlyInstallmentBeforeRetirement,
    monthlyPremiumBeforeRetirement: r.monthlyInstallmentBeforeRetirement,
    monthlyPremiumAfterRetirement: r.monthlyInstallmentAfterRetirement,
    termMonths: r.termMonths,
    termYears: Math.round(r.termMonths / 12),
    annualMargin: r.annualMargin,
    supportAmount: r.housingSupportAmount || 0,
    supportType: r.supportType,
    profitMargin: r.annualMargin,
    calculatedNetSalary: r.netSalary,
    calculatedPensionSalary: r.pensionSalary
  }));
}

export interface AssistantVisibleResult {
  bankId: string;
  bankName: string;
  eligible: boolean;
  status: any; // CalculationStatus
  totalFinance: number;
  realEstateFinance: number;
  personalFinance: number;
  monthlyInstallment: number;
  realEstateInstallment: number;
  personalInstallment: number;
  installmentAfterPersonal: number | null;
  termMonths: number;
  termYears: number;
  annualMargin: number;
  dsrPercentage: number;
  supportType: 'monthly' | 'downpayment' | 'none';
  supportAmount: number;
  etizazAmount: number;
  rejectionReason: string;
}

/**
 * Maps raw finance engine or context results into secure AssistantVisibleResult objects
 * with unified housing support fields.
 */
export function mapToAssistantVisibleResults(rawResults: any[] | null | undefined): AssistantVisibleResult[] {
  if (!rawResults || !Array.isArray(rawResults)) return [];
  
  return rawResults.map(r => {
    // 1. Resolve housing support amount across potential naming variations safely
    let resolvedSupportAmount = 0;
    if (typeof r.housingSupportAmount === 'number') {
      resolvedSupportAmount = r.housingSupportAmount;
    } else if (typeof r.supportAmount === 'number') {
      resolvedSupportAmount = r.supportAmount;
    } else if (typeof r.monthlySupport === 'number') {
      resolvedSupportAmount = r.monthlySupport;
    } else if (typeof r.downPaymentSupport === 'number') {
      resolvedSupportAmount = r.downPaymentSupport;
    }

    // 2. Resolve support type
    let resolvedSupportType: 'monthly' | 'downpayment' | 'none' = 'none';
    const st = typeof r.supportType === 'string' ? r.supportType.trim().toLowerCase() : '';
    if (st === 'monthly') {
      resolvedSupportType = 'monthly';
    } else if (st === 'downpayment' || st === 'down_payment') {
      resolvedSupportType = 'downpayment';
    } else if (st === 'none') {
      resolvedSupportType = 'none';
    } else {
      resolvedSupportType = 'none';
    }

    // 3. Resolve etizaz support independently
    const resolvedEtizazAmount = typeof r.etizazAmount === 'number' ? r.etizazAmount : 0;

    // 4. Resolve eligibility
    const eligible = r.isEligible === true || r.eligible === true;

    const rawInstallmentAfter = r.monthlyInstallmentAfterPersonal ?? r.installmentAfterPersonal;
    const installmentAfterPersonal = rawInstallmentAfter !== undefined && rawInstallmentAfter !== null && !isNaN(Number(rawInstallmentAfter)) ? Number(rawInstallmentAfter) : null;

    return {
      bankId: r.bankId || '',
      bankName: r.bankName || r.bankId || '',
      eligible,
      status: r.status,
      totalFinance: Number(r.totalPurchasingPower ?? r.totalFinance ?? 0),
      realEstateFinance: Number(r.realEstateAmount ?? r.realEstateFinance ?? 0),
      personalFinance: Number(r.personalAmount ?? r.personalFinance ?? 0),
      monthlyInstallment: Number(r.monthlyInstallmentBeforeRetirement ?? r.monthlyInstallment ?? 0),
      realEstateInstallment: Number(r.realEstateInstallmentOnly ?? r.realEstateInstallment ?? 0),
      personalInstallment: Number(r.personalInstallmentAmount ?? r.personalInstallment ?? 0),
      installmentAfterPersonal,
      termMonths: Number(r.termMonths ?? 0),
      termYears: typeof r.termMonths === 'number' ? Math.floor(r.termMonths / 12) : Number(r.termYears ?? 0),
      annualMargin: Number(r.annualMargin ?? r.profitMargin ?? 0),
      dsrPercentage: Number(r.dsrUsed ?? r.dsrPercentage ?? 0),
      supportType: resolvedSupportType,
      supportAmount: resolvedSupportAmount,
      etizazAmount: resolvedEtizazAmount,
      rejectionReason: r.rejectionReason || ''
    };
  });
}

