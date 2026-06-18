import { PensionOutput, SectorId } from '../../types';
import { 
  getAgeInMonths, 
  getServiceTenureInMonths, 
  getStandardizedDate, 
  convertHijriToGregorian, 
  convertGregorianToHijri,
  calculateMonthsBetween 
} from '../date-utils';
import { ApprovedSalarySourceRule, PensionCalculationRule, SectorClassificationMapping, BankRetirementRule, PensionLibraryRule, BankSectorPensionRule } from '../../types/pension-rules';

const getSectorRetirementAge = (sectorId: string, defaultValue = 60, customSectors?: any[]): number => {
  if (customSectors && Array.isArray(customSectors)) {
    let idToLookup = sectorId;
    if (sectorId === 'gov_civil') idToLookup = ['government', 'civilian'].join('_');
    const matched = customSectors.find(s => s.id === sectorId || s.id === idToLookup);
    if (matched && typeof matched.retirementAge === 'number' && matched.retirementAge > 0) {
      return matched.retirementAge;
    }
  }
  try {
    const cachedUnified = localStorage.getItem("hasba_settings_cache");
    if (cachedUnified) {
      const parsed = JSON.parse(cachedUnified);
      if (parsed && Array.isArray(parsed.customSectors)) {
        let idToLookup = sectorId;
        if (sectorId === 'gov_civil') idToLookup = ['government', 'civilian'].join('_');
        const matched = parsed.customSectors.find((s: any) => s.id === sectorId || s.id === idToLookup);
        if (matched && typeof matched.retirementAge === 'number' && matched.retirementAge > 0) {
          return matched.retirementAge;
        }
      }
    }
  } catch (e) {
    console.error("Error reading sector retirement age:", e);
  }
  return defaultValue;
};

export function getBankRetirementRule(params: {
  bankId: string;
  sectorId: string;
  rules: BankRetirementRule[];
  sectorMappings: SectorClassificationMapping[];
}): BankRetirementRule {
  const { bankId, sectorId, rules, sectorMappings } = params;
  const normalized = normalizeSectorId(sectorId);

  // 1. Check mapping
  const mapping = sectorMappings.find(
    m => m.bankId === bankId && m.sectorId === normalized
  );
  const resolvedSector = mapping ? mapping.bankSectorId : normalized;

  // 2. Find closest matching rule
  const matchedRule = 
    rules.find(r => r.bankId === bankId && r.sectorId === resolvedSector) ||
    rules.find(r => r.bankId === bankId && r.sectorId === normalized) ||
    rules.find(r => r.bankId === bankId && r.sectorId === 'default') ||
    rules.find(r => r.sectorId === 'default') ||
    rules[0];

  return matchedRule;
}

export function calculateApprovedBase(params: {
  source: 'basic_only' | 'basic_housing' | 'basic_housing_allowances' | 'net_salary' | 'manual';
  basicSalary: number;
  housingAllowance: number;
  otherAllowances: number;
  netSalary: number;
  manualApprovedSalary?: number;
}): number {
  const { source, basicSalary, housingAllowance, otherAllowances, netSalary, manualApprovedSalary } = params;
  switch (source) {
    case 'basic_only':
      return basicSalary;
    case 'basic_housing':
      return basicSalary + housingAllowance;
    case 'basic_housing_allowances':
      return basicSalary + housingAllowance + otherAllowances;
    case 'net_salary':
      return netSalary;
    case 'manual':
      return manualApprovedSalary ?? (basicSalary + housingAllowance);
    default:
      return basicSalary + housingAllowance;
  }
}

export function calculatePensionByBankRule(params: {
  approvedSalary: number;
  serviceMonthsAtRetirement: number;
  yearsToRetirement: number;
  directPensionSalary?: number;
  rule: BankRetirementRule;
}): number {
  const { approvedSalary, serviceMonthsAtRetirement, yearsToRetirement, directPensionSalary, rule } = params;

  if (rule.calculationMethod === 'direct') {
    return directPensionSalary ?? approvedSalary;
  }

  if (rule.calculationMethod === 'fixed_percentage') {
    const threshold = rule.yearsThreshold ?? 5;
    const ratio = yearsToRetirement <= threshold
      ? (rule.rateBelowThreshold ?? 70)
      : (rule.rateAboveThreshold ?? 80);
    return (approvedSalary * ratio) / 100;
  }

  // service_based
  const divisor = rule.divisorMonths ?? 480;
  if (divisor <= 0) return approvedSalary;
  let pension = (approvedSalary * serviceMonthsAtRetirement) / divisor;

  if (pension > approvedSalary) {
    pension = approvedSalary;
  }
  return pension;
}


export function calculatePensionSalary(params: {
  sectorId: SectorId;
  basicSalary: number;
  
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthCalendar: 'gregorian' | 'hijri';

  appointmentYear?: number;
  appointmentMonth?: number;
  appointmentDay?: number;
  appointmentCalendar?: 'gregorian' | 'hijri';

  retirementAgeCustom?: number;
  pensionMultiplierCustom?: number;
  directPensionSalary?: number;

  ageCalcCalendar?: 'gregorian' | 'hijri';
  serviceCalcCalendar?: 'gregorian' | 'hijri';
  customSectors?: any[];
}): PensionOutput {
  const {
    sectorId,
    basicSalary,
    
    birthYear,
    birthMonth,
    birthDay,
    birthCalendar,

    appointmentYear,
    appointmentMonth,
    appointmentDay = 1,
    appointmentCalendar = 'gregorian',

    retirementAgeCustom,
    pensionMultiplierCustom,
    directPensionSalary,

    ageCalcCalendar = 'gregorian',
    serviceCalcCalendar = 'gregorian',
    customSectors
  } = params;

  // If retiree, use direct input
  if (sectorId === 'retired') {
    return {
      retirementAge: 0,
      currentAgeMonths: 0,
      monthsUntilRetirement: 0,
      serviceMonthsAtRetirement: 0,
      pensionSalary: directPensionSalary || basicSalary
    };
  }

  const today = new Date();

  // 1. Calculate age in months using the age calculations calendar
  const currentAgeMonths = getAgeInMonths(
    { year: birthYear, month: birthMonth, day: birthDay, calendar: birthCalendar },
    today,
    ageCalcCalendar
  );

  // 2. Determine retirement age (e.g., 60 years or military specific)
  const isMilitary = (sectorId as string) === 'military';
  const retirementAge = retirementAgeCustom || (isMilitary ? 45 : getSectorRetirementAge(sectorId, 60, customSectors));
  const retirementAgeMonths = Math.round(retirementAge * 12);

  // 3. Months until retirement
  const monthsUntilRetirement = Math.max(0, retirementAgeMonths - currentAgeMonths);

  // 4. Calculate current service months using the service calculation calendar
  let currentServiceMonths = 0;
  if (appointmentYear && appointmentMonth) {
    currentServiceMonths = getServiceTenureInMonths(
      { year: appointmentYear, month: appointmentMonth, day: appointmentDay, calendar: appointmentCalendar },
      today,
      serviceCalcCalendar
    );
  } else {
    currentServiceMonths = 60; // 5 years default
  }

  // 5. Calculate service months at retirement with precise date calculation
  // We locate the exact retirement date in target calendars and count Service Months to that date!
  let serviceMonthsAtRetirement = 0;
  if (appointmentYear && appointmentMonth) {
    const birthInAgeCal = getStandardizedDate(birthYear, birthMonth, birthDay, birthCalendar, ageCalcCalendar);
    const retirementAgeYears = Math.floor(retirementAge);
    const retirementFractionMonths = Math.round((retirementAge - retirementAgeYears) * 12);

    let retirementDateInAgeCal = {
      year: birthInAgeCal.year + retirementAgeYears,
      month: birthInAgeCal.month + retirementFractionMonths,
      day: birthInAgeCal.day
    };

    // Adjust month overflow (e.g. if month is 13, increment year)
    if (retirementDateInAgeCal.month > 12) {
      retirementDateInAgeCal.year += Math.floor((retirementDateInAgeCal.month - 1) / 12);
      retirementDateInAgeCal.month = ((retirementDateInAgeCal.month - 1) % 12) + 1;
    }

    // Standardize retirement date from age calculation calendar to service calculation calendar
    const retirementDateInServiceCal = getStandardizedDate(
      retirementDateInAgeCal.year,
      retirementDateInAgeCal.month,
      retirementDateInAgeCal.day,
      ageCalcCalendar,
      serviceCalcCalendar
    );

    const appointmentInServiceCal = getStandardizedDate(
      appointmentYear,
      appointmentMonth,
      appointmentDay,
      appointmentCalendar,
      serviceCalcCalendar
    );

    serviceMonthsAtRetirement = calculateMonthsBetween(appointmentInServiceCal, retirementDateInServiceCal);
  } else {
    serviceMonthsAtRetirement = currentServiceMonths + monthsUntilRetirement;
  }

  // 6. Select pension multiplier (e.g. 420 for military, 480 for civilians)
  const multiplier = pensionMultiplierCustom || (isMilitary ? 420 : 480);

  // 7. Calculate pension salary
  // Formula: Pension = Basic * serviceMonthsAtRetirement / multiplier (capped at basic salary)
  let pensionSalary = (basicSalary * serviceMonthsAtRetirement) / multiplier;
  if (pensionSalary > basicSalary) {
    pensionSalary = basicSalary;
  }

  return {
    retirementAge,
    currentAgeMonths,
    monthsUntilRetirement,
    serviceMonthsAtRetirement: Math.round(serviceMonthsAtRetirement),
    pensionSalary: Math.round(Math.max(0, pensionSalary))
  };
}

/**
 * يوحد معرفات القطاع بين الواجهة وقواعد قاعدة البيانات وقواعد الاستيراد والتصدير
 */
export function normalizeSectorId(sectorId: string): string {
  const map: Record<string, string> = {
    [['government', 'civilian'].join('_')]: 'gov_civil',
    'gov_civil':           'gov_civil',
    'companies':           'companies',
    'semi_gov':            'semi_gov',
    'military':            'military',
    'military_individual': 'military',
    'military_enlisted':   'military',
    'military_officer':    'military',
    'retired':             'retired',
  };
  return map[sectorId] || sectorId;
}

/**
 * يجلب قاعدة الراتب المعتمد لبنك × قطاع معين
 */
export function getApprovedSalaryRule(
  bankId: string,
  sectorId: string,
  rules: ApprovedSalarySourceRule[]
): ApprovedSalarySourceRule | null {
  const normalized = normalizeSectorId(sectorId);
  return (
    rules.find(r => r.bankId === bankId && r.sectorId === normalized) ||
    rules.find(r => r.bankId === bankId && r.sectorId === 'default') ||
    null
  );
}

/**
 * يحسب الراتب المعتمد (approved salary) قبل تطبيق معادلة التقاعد
 */
export function getApprovedSalary(params: {
  basicSalary: number;
  housingAllowance: number;
  otherAllowances: number;
  rule: ApprovedSalarySourceRule | null;
}): number {
  const { basicSalary, housingAllowance, otherAllowances, rule } = params;

  if (!rule) {
    // افتراضي: أساسي + سكن
    return basicSalary + housingAllowance;
  }

  switch (rule.salarySource) {
    case 'basic_only':
      return basicSalary * (rule.multiplier ?? 1.0);
    case 'basic_housing':
      return (basicSalary + housingAllowance) * (rule.multiplier ?? 1.0);
    case 'gross':
      return basicSalary + housingAllowance + otherAllowances;
    case 'custom_multiplier':
      return basicSalary * (rule.multiplier ?? 1.0);
    default:
      return basicSalary + housingAllowance;
  }
}

/**
 * يحسب الراتب التقاعدي المتوقع بناءً على قاعدة البنك × القطاع
 */
export function calculatePensionFromRule(params: {
  approvedSalary: number;
  serviceMonths: number;          // أشهر الخدمة عند التقاعد
  yearsToRetirement: number;      // السنوات المتبقية للتقاعد (للأهلي)
  rule: PensionCalculationRule | null;
}): { pension: number; ruleId: string | null; method: string; rate?: number } {
  const { approvedSalary, serviceMonths, yearsToRetirement, rule } = params;

  if (!rule) {
    // افتراضي: مدني 480
    const pension = Math.round(approvedSalary * serviceMonths / 480);
    return { pension, ruleId: null, method: 'default_service_based_480' };
  }

  if (rule.calculationMethod === 'service_based') {
    const divisor = rule.divisorMonths ?? 480;
    const pension = Math.round(approvedSalary * serviceMonths / divisor);
    return { pension, ruleId: rule.id, method: 'service_based', rate: divisor > 0 ? serviceMonths / divisor : 0 };
  }

  if (rule.calculationMethod === 'fixed_percentage') {
    const threshold = rule.yearsThreshold ?? 5;
    // كلما كانت السنوات لـ التقاعد أقل من العتبة (أي ≤ 5) -> نسبة أدنى (Below)
    // كلما كانت أكثر (> 5) -> نسبة أعلى (Above)
    const rate = yearsToRetirement <= threshold
      ? (rule.rateBelowThreshold ?? 70)
      : (rule.rateAboveThreshold ?? 80);
    const pension = Math.round(approvedSalary * rate / 100);
    return { pension, ruleId: rule.id, method: 'fixed_percentage', rate };
  }

  return { pension: 0, ruleId: rule.id, method: 'unknown' };
}

/**
 * يجلب قاعدة التقاعد لبنك × قطاع (مع تطبيق sectorMappings أولاً)
 */
export function getPensionRule(
  bankId: string,
  sectorId: string,
  rules: PensionCalculationRule[],
  sectorMappings: SectorClassificationMapping[]
): PensionCalculationRule | null {
  const normalized = normalizeSectorId(sectorId);

  // 1. طبّق sectorMappings أولاً (مثلاً: الأهلي gov_civil → strong)
  const mapping = sectorMappings.find(
    m => m.bankId === bankId && m.sectorId === normalized
  );
  const resolvedSector = mapping ? mapping.bankSectorId : normalized;

  // 2. ابحث بالقطاع المُحوَّل (strong/weak للأهلي، أو الاسم المباشر للراجحي)
  return (
    rules.find(r => r.bankId === bankId && r.sectorId === resolvedSector) ||
    rules.find(r => r.bankId === bankId && r.sectorId === normalized) ||
    rules.find(r => r.bankId === bankId && r.sectorId === 'default') ||
    null
  );
}



export const defaultLibraryRules: PensionLibraryRule[] = [
  {
    id: "tpl_rajhi_civil",
    name: "خدمة مدني الراجحي",
    calcMethod: "service_growth",
    salarySource: "basic_only",
    divisorYears: 40,
    growthRate: 2.5,
    growthMinYears: 5,
    growthMaxYears: 12,
    noGrowthAboveYears: 25,
    capAtApprovedSalary: true,
    isActive: true,
    notes: "معادلة الخدمة المدنية للراجحي مع نمو وبقاسم 40 سنة"
  },
  {
    id: "tpl_rajhi_military",
    name: "خدمة عسكري الراجحي",
    calcMethod: "service_growth",
    salarySource: "basic_only",
    divisorYears: 35,
    growthRate: 2.5,
    growthMinYears: 5,
    growthMaxYears: 12,
    noGrowthAboveYears: 25,
    capAtApprovedSalary: true,
    isActive: true,
    notes: "معادلة الخدمة العسكرية للراجحي بقاسم 35 سنة ونمو"
  },
  {
    id: "tpl_rajhi_semi",
    name: "خدمة شبه حكومي الراجحي",
    calcMethod: "service_growth",
    salarySource: "basic_only",
    divisorYears: 40,
    growthRate: 1.25,
    growthMinYears: 5,
    growthMaxYears: 12,
    noGrowthAboveYears: 25,
    capAtApprovedSalary: true,
    isActive: true,
    notes: "معادلة شبه حكومي الراجحي بحد نمو 1.25%"
  },
  {
    id: "tpl_rajhi_companies",
    name: "خدمة شركات الراجحي",
    calcMethod: "service_growth",
    salarySource: "basic_only",
    divisorYears: 40,
    growthRate: 0,
    growthMinYears: 0,
    growthMaxYears: 0,
    noGrowthAboveYears: 0,
    capAtApprovedSalary: true,
    isActive: true,
    notes: "معادلة الشركات للراجحي بدون نمو وبقاسم 40 سنة"
  },
  {
    id: "tpl_fixed_strong",
    name: "قالب نسبة ثابتة قوي",
    calcMethod: "fixed_percentage",
    salarySource: "basic_housing",
    thresholdYears: 5,
    rateBelow: 70,
    rateAbove: 80,
    capAtApprovedSalary: false,
    isActive: true,
    notes: "حساب نسبة ثابتة للقطاعات القوية (مثال: الأهلي)"
  },
  {
    id: "tpl_fixed_weak",
    name: "قالب نسبة ثابتة ضعيف",
    calcMethod: "fixed_percentage",
    salarySource: "basic_housing",
    thresholdYears: 5,
    rateBelow: 60,
    rateAbove: 70,
    capAtApprovedSalary: false,
    isActive: true,
    notes: "حساب نسبة ثابتة للقطاعات الضعيفة (مثال: الأهلي)"
  },
  {
    id: "tpl_direct",
    name: "مباشر متقاعد",
    calcMethod: "direct",
    salarySource: "manual",
    capAtApprovedSalary: false,
    isActive: true,
    notes: "اعتماد الدخل التقاعدي المباشر المدخل"
  }
];

export interface CalculateRulePensionParams {
  bankId: string;
  sectorId: string;
  militaryType?: 'officer' | 'individual' | string;
  rankId?: string;
  basicSalary: number;
  housingAllowance: number;
  otherAllowances: number;
  netSalary: number;
  directPensionSalary?: number;
  birthDate?: any;
  appointmentDate?: any;
  serviceMonthsAtRetirement: number;
  yearsToRetirement: number;
  bankSectorRules?: BankSectorPensionRule[];
}

export interface PensionDiagnostic {
  bankId: string;
  originalSectorId: string;
  effectiveSectorId: string;
  ruleName: string;
  ruleId: string;
  approvedSalarySource: string;
  basicSalary: number;
  housingAllowance: number;
  otherAllowances: number;
  netSalary: number;
  hasHousingAllowanceEntered: boolean;
  approvedSalaryBase: number;
  calculationMethod: string;
  serviceMonthsAtRetirement: number;
  divisorMonths: number;
  yearsToRetirement: number;
  yearsThreshold: number;
  usedPercentage: number;
  finalPensionSalary: number;
  growthRate?: number;
  growthYears?: number;
  totalServiceYears?: number;
  approvedSalaryAfterGrowth?: number;
}

export function calculatePensionFromTemplate(params: {
  template: PensionLibraryRule;
  basicSalary: number;
  housingAllowance: number;
  otherAllowances: number;
  netSalary: number;
  directPensionSalary?: number;
  currentServiceMonths: number;
  monthsToRetirement: number;
}): number {
  const {
    template,
    basicSalary = 0,
    housingAllowance = 0,
    otherAllowances = 0,
    netSalary = 0,
    directPensionSalary,
    currentServiceMonths = 0,
    monthsToRetirement = 0
  } = params;

  let approvedBase = 0;
  if (template.salarySource === 'basic_only') {
    approvedBase = basicSalary;
  } else if (template.salarySource === 'basic_housing') {
    approvedBase = basicSalary + housingAllowance;
  } else if (template.salarySource === 'net_salary') {
    approvedBase = netSalary;
  } else if (template.salarySource === 'manual') {
    approvedBase = directPensionSalary ?? basicSalary;
  } else {
    approvedBase = basicSalary + housingAllowance;
  }

  let finalPensionSalary = 0;

  if (template.calcMethod === 'direct') {
    finalPensionSalary = directPensionSalary ?? approvedBase;
  } else if (template.calcMethod === 'fixed_percentage') {
    const yearsToRetirement = monthsToRetirement / 12;
    const thresholdYears = template.thresholdYears ?? 5;
    const rateBelow = template.rateBelow ?? 70;
    const rateAbove = template.rateAbove ?? 80;

    const rate = yearsToRetirement <= thresholdYears ? rateBelow : rateAbove;
    finalPensionSalary = (approvedBase * rate) / 100;
  } else if (template.calcMethod === 'service_growth') {
    const totalServiceYears = (currentServiceMonths + monthsToRetirement) / 12;
    const divisorYears = template.divisorYears ?? 40;

    let growthRate = template.growthRate ?? 0;
    // Always divide stored percentage growthRate by 100 to get decimal
    growthRate = growthRate / 100;

    let approvedSalary = approvedBase;
    const minYears = template.growthMinYears ?? 0;
    const maxYears = template.growthMaxYears ?? 0;
    const noGrowthAbove = template.noGrowthAboveYears ?? 0;
    const yearsToRetirement = monthsToRetirement / 12;

    if (growthRate > 0 && yearsToRetirement >= minYears && (!noGrowthAbove || yearsToRetirement <= noGrowthAbove)) {
      const limitYears = maxYears > 0 ? maxYears : 15;
      const growthYears = Math.min(Math.floor(yearsToRetirement), limitYears);
      // Protection against infinite compounding or massive numbers
      const compoundFactor = Math.min(Math.pow(1 + growthRate, growthYears), 3.0);
      approvedSalary = approvedBase * compoundFactor;
    } else {
      approvedSalary = approvedBase;
    }

    let pension = divisorYears > 0 ? (totalServiceYears * approvedSalary) / divisorYears : approvedSalary;
    if (template.capAtApprovedSalary !== false) {
      pension = Math.min(pension, approvedSalary);
    }
    finalPensionSalary = pension;
  }

  // Safety cap to prevent pension from becoming millions or unrealistic
  if (finalPensionSalary > 250000) {
    finalPensionSalary = 250000;
  }

  return Math.round(Math.max(0, finalPensionSalary));
}

export function getPensionRuleForBankAndSector(
  bankId: string,
  sectorId: string,
  bankSectorRules?: BankSectorPensionRule[],
  rankId?: string
) {
  let normalizedSector = normalizeSectorId(sectorId);
  const isMilitary = normalizedSector === 'military';
  
  let ruleSector = isMilitary ? 'military' : normalizedSector;

  const sectorNamesAr: Record<string, string> = {
    gov_civil: "مدني حكومي",
    military: "عسكري",
    semi_gov: "شبه حكومي",
    companies: "موظف شركات",
    retired: "متقاعد"
  };

  // Look for exact match from the saved rules
  let rule = bankSectorRules?.find(
    r => r.bankId === bankId && normalizeSectorId(r.sectorId) === ruleSector
  );

  // If we found a saved rule, use its properties
  if (rule && rule.calcMethod) {
    return {
      id: rule.id,
      name: sectorNamesAr[ruleSector] || ruleSector,
      calcMethod: rule.calcMethod,
      salarySource: rule.salarySource || 'basic_only',
      divisorYears: rule.divisorYears ?? (ruleSector === 'military' ? 35 : 40),
      growthRate: rule.growthRate ?? 0,
      growthMinYears: rule.growthMinYears ?? 0,
      growthMaxYears: rule.growthMaxYears ?? 0,
      noGrowthAboveYears: rule.noGrowthAboveYears ?? 0,
      thresholdYears: rule.thresholdYears ?? 5,
      rateBelow: rule.rateBelow ?? 70,
      rateAbove: rule.rateAbove ?? 80,
      capAtApprovedSalary: rule.capAtApprovedSalary !== false,
      isActive: rule.isActive !== false
    };
  }

  // Fallback defaults if no rule is stored
  const isAlahli = bankId === 'ahli' || bankId === 'alahli';
  
  if (ruleSector === 'retired') {
    return {
      id: `${bankId}_retired`,
      name: "متقاعد",
      calcMethod: "direct" as const,
      salarySource: "manual" as const,
      capAtApprovedSalary: false,
      isActive: true,
      divisorYears: 40,
      growthRate: 0,
      growthMinYears: 0,
      growthMaxYears: 0,
      noGrowthAboveYears: 0,
      thresholdYears: 5,
      rateBelow: 100,
      rateAbove: 100
    };
  }

  if (isAlahli) {
    // Alahli default fixed percentage behavior for remaining active sectors
    let isGroupA = true;
    if (isMilitary) {
      const isOfficerList = ['mulazim', 'mulazim_pilot', 'naqeeb', 'naqeeb_pilot', 'raid', 'raid_pilot', 'muqaddam', 'muqaddam_pilot', 'aqeed', 'aqeed_pilot', 'ameed', 'ameed_pilot', 'liwa', 'liwa_pilot'];
      const isOfficer = rankId ? isOfficerList.includes(rankId) : false;
      if (!isOfficer) {
        isGroupA = false;
      }
    } else if (normalizedSector === 'companies') {
      isGroupA = false;
    }

    if (isGroupA) {
      // Group A (70% / 80%)
      return {
        id: `${bankId}_${ruleSector}`,
        name: sectorNamesAr[ruleSector] || ruleSector,
        calcMethod: "fixed_percentage" as const,
        salarySource: "basic_housing" as const,
        thresholdYears: 5,
        rateBelow: 70,
        rateAbove: 80,
        capAtApprovedSalary: false,
        isActive: true,
        divisorYears: 40,
        growthRate: 0,
        growthMinYears: 0,
        growthMaxYears: 0,
        noGrowthAboveYears: 0
      };
    } else {
      // Group B (60% / 70%)
      return {
        id: `${bankId}_${ruleSector}`,
        name: sectorNamesAr[ruleSector] || ruleSector,
        calcMethod: "fixed_percentage" as const,
        salarySource: "basic_housing" as const,
        thresholdYears: 5,
        rateBelow: 60,
        rateAbove: 70,
        capAtApprovedSalary: false,
        isActive: true,
        divisorYears: 40,
        growthRate: 0,
        growthMinYears: 0,
        growthMaxYears: 0,
        noGrowthAboveYears: 0
      };
    }
  } else {
    // Other bank - Rajhi or custom fallbacks
    let calcMethod: 'service_growth' | 'fixed_percentage' | 'direct' = 'service_growth';
    let salarySource: 'basic_only' | 'basic_housing' | 'net_salary' | 'manual' = 'basic_only';
    let divisorYears = 40;
    let growthRate = 0;
    let growthMinYears = 0;
    let growthMaxYears = 0;
    let noGrowthAboveYears = 0;
    let capAtApprovedSalary = true;

    if (isMilitary) {
      divisorYears = 35;
    }

    if (normalizedSector === 'gov_civil' || isMilitary) {
      growthRate = 2.5;
      growthMinYears = 5;
      growthMaxYears = 12;
      noGrowthAboveYears = 25;
    } else if (normalizedSector === 'semi_gov') {
      growthRate = 1.25;
      growthMinYears = 5;
      growthMaxYears = 12;
      noGrowthAboveYears = 25;
    }

    return {
      id: `${bankId}_${ruleSector}`,
      name: sectorNamesAr[ruleSector] || ruleSector,
      calcMethod,
      salarySource,
      divisorYears,
      growthRate,
      growthMinYears,
      growthMaxYears,
      noGrowthAboveYears,
      thresholdYears: 5,
      rateBelow: 70,
      rateAbove: 80,
      capAtApprovedSalary,
      isActive: true
    };
  }
}

export function calculatePensionSalaryByRule(params: CalculateRulePensionParams): { pensionSalary: number; diagnostic: PensionDiagnostic } {
  const {
    bankId,
    sectorId,
    militaryType,
    rankId,
    basicSalary = 0,
    housingAllowance = 0,
    otherAllowances = 0,
    netSalary = 0,
    directPensionSalary,
    serviceMonthsAtRetirement = 0,
    yearsToRetirement = 0,
    bankSectorRules
  } = params;

  let normalizedSector = normalizeSectorId(sectorId);
  const isMilitary = normalizedSector === 'military';
  if (isMilitary) {
    normalizedSector = 'military';
  }

  let assignments: BankSectorPensionRule[] = [];
  if (bankSectorRules && bankSectorRules.length > 0) {
    assignments = bankSectorRules;
  } else {
    try {
      if (typeof window !== 'undefined') {
        const cachedUnified = localStorage.getItem("hasba_settings_cache");
        if (cachedUnified) {
          const parsed = JSON.parse(cachedUnified);
          if (parsed && Array.isArray(parsed.bankSectorRules)) {
            assignments = parsed.bankSectorRules;
          }
        }
      }
    } catch (e) {
      console.error("Failed to load bankSectorRules from cache in engine:", e);
    }
  }

  const template = getPensionRuleForBankAndSector(bankId, normalizedSector, assignments, rankId);

  const monthsToRetirement = Math.round(yearsToRetirement * 12);
  const currentServiceMonths = Math.max(0, serviceMonthsAtRetirement - monthsToRetirement);

  const finalPensionSalary = calculatePensionFromTemplate({
    template,
    basicSalary,
    housingAllowance,
    otherAllowances,
    netSalary,
    directPensionSalary,
    currentServiceMonths,
    monthsToRetirement
  });

  let approvedSalaryBase = 0;
  if (template.salarySource === 'basic_only') {
    approvedSalaryBase = basicSalary;
  } else if (template.salarySource === 'basic_housing') {
    approvedSalaryBase = basicSalary + housingAllowance;
  } else if (template.salarySource === 'net_salary') {
    approvedSalaryBase = netSalary;
  } else if (template.salarySource === 'manual') {
    approvedSalaryBase = directPensionSalary ?? basicSalary;
  } else {
    approvedSalaryBase = basicSalary + housingAllowance;
  }

  // Calculate detailed parameters specifically for diagnostic logs
  let growthRate = template.growthRate ?? 0;
  growthRate = growthRate / 100;
  const minYears = template.growthMinYears ?? 0;
  const maxYears = template.growthMaxYears ?? 0;
  const noGrowthAbove = template.noGrowthAboveYears ?? 0;

  let growthYears = 0;
  let approvedSalaryAfterGrowth = approvedSalaryBase;

  if (template.calcMethod === 'service_growth') {
    if (growthRate > 0 && yearsToRetirement >= minYears && (!noGrowthAbove || yearsToRetirement <= noGrowthAbove)) {
      const limitYears = maxYears > 0 ? maxYears : 15;
      growthYears = Math.min(Math.floor(yearsToRetirement), limitYears);
      const compoundFactor = Math.min(Math.pow(1 + growthRate, growthYears), 3.0);
      approvedSalaryAfterGrowth = approvedSalaryBase * compoundFactor;
    }
  }

  const totalServiceYears = (currentServiceMonths + monthsToRetirement) / 12;

  const diagnostic: PensionDiagnostic = {
    bankId,
    originalSectorId: sectorId,
    effectiveSectorId: normalizedSector,
    ruleName: template.name,
    ruleId: template.id,
    approvedSalarySource: template.salarySource,
    basicSalary,
    housingAllowance,
    otherAllowances,
    netSalary,
    hasHousingAllowanceEntered: template.salarySource === 'basic_housing',
    approvedSalaryBase,
    calculationMethod: template.calcMethod,
    serviceMonthsAtRetirement,
    divisorMonths: (template.divisorYears ?? 40) * 12,
    yearsToRetirement,
    yearsThreshold: template.thresholdYears ?? 5,
    usedPercentage: yearsToRetirement <= (template.thresholdYears ?? 5) ? (template.rateBelow ?? 70) : (template.rateAbove ?? 80),
    finalPensionSalary,
    growthRate,
    growthYears,
    totalServiceYears,
    approvedSalaryAfterGrowth
  };

  return {
    pensionSalary: finalPensionSalary,
    diagnostic
  };
}


