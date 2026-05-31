import React, { useState, useEffect } from 'react';
import { useAppState } from '../../context/AppContext';
import { calculateBanksFinancing } from '../../lib/finance-engine';
import { calculatePensionSalary } from '../../lib/finance-engine/pension';
import { convertHijriToGregorian } from '../../lib/date-utils';
import { SectorId, ProductId, SupportType, TermMode, BankCalculationResult } from '../../types';
import { 
  Home, User, Coins, Briefcase, Calendar, Scale,
  ChevronLeft, ChevronRight, HelpCircle, AlertCircle, Info, Calculator
} from 'lucide-react';
import ResultsGrid from '../results/ResultsGrid';
import NumericInput from './NumericInput';
import { 
  fetchApprovedSalaryRules, 
  fetchPensionCalculationRules, 
  fetchSectorClassificationMappings,
  fallbackApprovedSalaryRules,
  fallbackPensionRules,
  fallbackSectorMappings
} from '../../lib/pensionDb';
import { 
  ApprovedSalarySourceRule, 
  PensionCalculationRule, 
  SectorClassificationMapping,
  BankSectorPensionRule
} from '../../types/pension-rules';
import { 
  getApprovedSalaryRule, 
  getApprovedSalary, 
  getPensionRule, 
  calculatePensionFromRule 
} from '../../lib/finance-engine/pension';

const getSectorRetirementAge = (sectorId: string, defaultValue = 60): number => {
  try {
    const saved = localStorage.getItem("hasba_custom_sectors");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        let idToLookup = sectorId;
        if (sectorId === 'gov_civil') idToLookup = 'gov_civil';
        const matched = parsed.find((s: any) => s.id === sectorId || s.id === idToLookup);
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

export const militaryRanksData = {
  enlisted: [
    { id: 'jundi', name: 'جندي / جندي أول',   retirementAge: 44, ahliGroup: 'B' },
    { id: 'areef', name: 'عريف',               retirementAge: 46, ahliGroup: 'B' },
    { id: 'wakeel_raqeeb', name: 'وكيل رقيب',          retirementAge: 48, ahliGroup: 'B' },
    { id: 'raqeeb', name: 'رقيب / رقيب أول',    retirementAge: 50, ahliGroup: 'A' },
    { id: 'rayees_ruqaba', name: 'رئيس رقباء',         retirementAge: 52, ahliGroup: 'A' },
  ],
  officer: [
    { id: 'mulazim', name: 'ملازم / ملازم أول',  retirementAge: 44, ahliGroup: 'A' },
    { id: 'mulazim_tyar', name: 'ملازم طيار',          retirementAge: 42, ahliGroup: 'A' },
    { id: 'naqeeb', name: 'نقيب',                retirementAge: 48, ahliGroup: 'A' },
    { id: 'naqeeb_tyar', name: 'نقيب طيار',           retirementAge: 46, ahliGroup: 'A' },
    { id: 'raid', name: 'رائد',                retirementAge: 50, ahliGroup: 'A' },
    { id: 'raid_tyar', name: 'رائد طيار',           retirementAge: 48, ahliGroup: 'A' },
    { id: 'muqaddam', name: 'مقدم',                retirementAge: 52, ahliGroup: 'A' },
    { id: 'muqaddam_tyar', name: 'مقدم طيار',           retirementAge: 50, ahliGroup: 'A' },
    { id: 'aqeed', name: 'عقيد',                retirementAge: 54, ahliGroup: 'A' },
    { id: 'aqeed_tyar', name: 'عقيد طيار',           retirementAge: 52, ahliGroup: 'A' },
    { id: 'ameed', name: 'عميد',                retirementAge: 56, ahliGroup: 'A' },
    { id: 'ameed_tyar', name: 'عميد طيار',           retirementAge: 54, ahliGroup: 'A' },
    { id: 'liwa', name: 'لواء',                retirementAge: 58, ahliGroup: 'A' },
    { id: 'liwa_tyar', name: 'لواء طيار',           retirementAge: 56, ahliGroup: 'A' },
  ],
} as const;

export const customMilitaryRanks = [
  ...militaryRanksData.enlisted.map((r, i) => ({
    id: r.id,
    nameAr: r.name,
    retirementAge: r.retirementAge,
    pensionMultiplier: 420,
    displayOrder: i + 1,
    isActive: true,
    ahliGroup: r.ahliGroup
  })),
  ...militaryRanksData.officer.map((r, i) => ({
    id: r.id,
    nameAr: r.name,
    retirementAge: r.retirementAge,
    pensionMultiplier: 420,
    displayOrder: i + 10,
    isActive: true,
    ahliGroup: r.ahliGroup
  }))
];

export default function StepWizard() {
  const {
    banks,
    products,
    militaryRanks,
    salaryRules,
    pensionRules,
    marginRules,
    dsrRules,
    supportSettings,
    housingSupportTiers,
    advancePaymentTiers,
    personalRules,
    termRules,
    setCalculationLogs,
    setActiveStepLabel,
    currentStep,
    setCurrentStep,
    results,
    setResults
  } = useAppState();

  // --- Step Form Values State ---
  const [mainFinanceType, setMainFinanceType] = useState<'real_estate' | 'personal_only' | 'real_estate_with_existing_personal'>('real_estate');
  const [realEstateSubType, setRealEstateSubType] = useState<'real_estate_only' | 'real_estate_with_new_personal'>('real_estate_only');
  const [customerStatus, setCustomerStatus] = useState<'active_employee' | 'retired'>('active_employee');

  const [productId, setProductId] = useState<ProductId>('real_estate');
  const [sectorId, setSectorId] = useState<SectorId>('gov_civil');
  const [militaryType, setMilitaryType] = useState<'officer' | 'individual' | ''>('');
  const [rankId, setRankId] = useState<string>('jundi');

  // New prompt requirements states
  const [sector, setSector] = useState<string>('gov_civil');
  const [militarySubtype, setMilitarySubtype] = useState<'officer' | 'enlisted' | ''>('');
  const [militaryRank, setMilitaryRank] = useState<string>('');
  const [retirementAge, setRetirementAge] = useState<number>(60);
  const [ahliGroup, setAhliGroup] = useState<'A' | 'B' | ''>('');

  const effectiveSectorId = sectorId === 'government_civilian' || (sectorId as string) === 'gov_civil'
    ? 'gov_civil' as SectorId
    : ((sectorId as string) === 'military'
        ? 'military' as SectorId
        : sectorId);

  // Dates
  const [birthYear, setBirthYear] = useState<number>(1990);
  const [birthMonth, setBirthMonth] = useState<number>(1);
  const [birthDay, setBirthDay] = useState<number>(1);
  const [birthCalendar, setBirthCalendar] = useState<'gregorian' | 'hijri'>('gregorian');

  const [appointmentYear, setAppointmentYear] = useState<number>(2015);
  const [appointmentMonth, setAppointmentMonth] = useState<number>(1);
  const [appointmentDay, setAppointmentDay] = useState<number>(1);
  const [appointmentCalendar, setAppointmentCalendar] = useState<'gregorian' | 'hijri'>('gregorian');

  // Salary
  const [salaryMode, setSalaryMode] = useState<'direct' | 'details'>('details');
  const [directNetSalary, setDirectNetSalary] = useState<number>(12000);
  const [directPensionSalary, setDirectPensionSalary] = useState<number>(8000);
  const [basicSalary, setBasicSalary] = useState<number>(9000);
  const [housingAllowance, setHousingAllowance] = useState<number>(2250);
  const [otherAllowances, setOtherAllowances] = useState<number>(1500);

  // Finance details
  const [supportType, setSupportType] = useState<SupportType>('none');
  const [selectedBankId, setSelectedBankId] = useState<string>('all');
  const [termMode, setTermMode] = useState<TermMode>('max');
  const [manualTermYears, setManualTermYears] = useState<number>(25);

  const [existingMonthlyObligations, setExistingMonthlyObligations] = useState<number>(0);
  const [obligationRemainingMonths, setObligationRemainingMonths] = useState<number>(0);

  // Validation errors
  const [errors, setErrors] = useState<string[]>([]);

  // Compute live local calculated Net salary to aid real-time UI display
  const [localCalculatedNet, setLocalCalculatedNet] = useState(12000);

  // Dynamic step structure definition
  type StepId = 
    | 'main_type'
    | 're_sub_type'
    | 'customer_status'
    | 'sector'
    | 'personal_info'
    | 'salary'
    | 'finance_options'
    | 'results';

  const realEstateFlow: StepId[] = [
    'main_type',
    're_sub_type',
    'sector',
    'personal_info',
    'salary',
    'finance_options',
    'results'
  ];

  const personalOnlyFlow: StepId[] = [
    'main_type',
    'customer_status',
    'salary',
    'results'
  ];

  const existingPersonalFlow: StepId[] = [
    'main_type',
    'sector',
    'personal_info',
    'salary',
    'finance_options',
    'results'
  ];

  const getActiveFlow = (): StepId[] => {
    if (mainFinanceType === 'real_estate') return realEstateFlow;
    if (mainFinanceType === 'personal_only') return personalOnlyFlow;
    return existingPersonalFlow;
  };

  const flow = getActiveFlow();
  const activeStepId = flow[currentStep - 1] || 'main_type';

  // Synchronize state with mobile header central text
  React.useEffect(() => {
    if (setActiveStepLabel) {
      if (currentStep === flow.length && results) {
        setActiveStepLabel('النتائج والتقارير');
      } else {
        const stepId = flow[currentStep - 1] || 'main_type';
        let stepLabel = '';
        if (stepId === 'main_type') stepLabel = 'نوع الحسبة';
        else if (stepId === 're_sub_type') stepLabel = 'نوع التمويل العقاري';
        else if (stepId === 'sector') stepLabel = 'جهة العمل للعميل';
        else if (stepId === 'customer_status') stepLabel = 'الحالة الوظيفية';
        else if (stepId === 'personal_info') stepLabel = 'السن والمعلومات';
        else if (stepId === 'salary') stepLabel = 'الدخل والرواتب';
        else if (stepId === 'finance_options') stepLabel = 'خيارات الحسبة والدعم';
        else stepLabel = 'الحاسبة الذكية';
        setActiveStepLabel(stepLabel);
      }
    }
  }, [currentStep, flow, setActiveStepLabel, results]);

  // Pension DB Rules States
  const [approvedSalaryDbRules, setApprovedSalaryDbRules] = useState<ApprovedSalarySourceRule[]>(fallbackApprovedSalaryRules);
  const [pensionDbRules, setPensionDbRules] = useState<PensionCalculationRule[]>(fallbackPensionRules);
  const [sectorMappings, setSectorMappings] = useState<SectorClassificationMapping[]>(fallbackSectorMappings);
  const [bankSectorRules, setBankSectorRules] = useState<BankSectorPensionRule[]>([]);

  useEffect(() => {
    async function loadPensionDb() {
      try {
        const [sal, pen, map] = await Promise.all([
          fetchApprovedSalaryRules(),
          fetchPensionCalculationRules(),
          fetchSectorClassificationMappings()
        ]);
        setApprovedSalaryDbRules(sal);
        setPensionDbRules(pen);
        setSectorMappings(map);
        
        // Load bank sector rules
        const saved = localStorage.getItem("bank_sector_pension_rules");
        if (saved) {
          setBankSectorRules(JSON.parse(saved));
        }
      } catch (err) {
        console.error("Failed to load pension DB in StepWizard", err);
      }
    }
    loadPensionDb();
  }, []);

  // Dynamic Pension Calculation
  const pensionCalcObj = calculatePensionSalary({
    sectorId: effectiveSectorId,
    basicSalary: effectiveSectorId === 'retired' ? 0 : (salaryMode === 'details' ? basicSalary : directNetSalary),
    birthYear,
    birthMonth,
    birthDay: 1,
    birthCalendar,
    appointmentYear: effectiveSectorId === 'retired' ? undefined : appointmentYear,
    appointmentMonth: effectiveSectorId === 'retired' ? undefined : appointmentMonth,
    appointmentDay: 1,
    appointmentCalendar: effectiveSectorId === 'retired' ? undefined : appointmentCalendar,
    directPensionSalary: effectiveSectorId === 'retired' ? directPensionSalary : undefined
  });

  // حساب تقدير الراتب التقاعدي الحقيقي المتوافق مع البنك والقطاع والخرائط والقوانين
  const targetBankIdForPensionEstimate = selectedBankId && selectedBankId !== 'all' ? selectedBankId : 'rajhi';
  const liveApprovedSalaryRule = getApprovedSalaryRule(targetBankIdForPensionEstimate, effectiveSectorId, approvedSalaryDbRules);
  const liveApprovedSalary = effectiveSectorId === 'retired'
    ? (directPensionSalary || 0)
    : (salaryMode === 'details'
        ? getApprovedSalary({
            basicSalary,
            housingAllowance,
            otherAllowances,
            rule: liveApprovedSalaryRule
          })
        : (directNetSalary || 0)
      );

  const liveRetirementAgeRule = pensionRules.find(r => r.sectorId === effectiveSectorId) || pensionRules.find(r => r.sectorId === sectorId);
  const isMilitary = effectiveSectorId === 'military' || sector === 'military' || (sectorId as string) === 'military';
  const liveRetirementAge = isMilitary
    ? (militaryRanks.find(r => r.id === rankId)?.retirementAge || retirementAge || 44)
    : (liveRetirementAgeRule?.retirementAge || 60);

  const liveYearsToRetirement = Math.max(0, liveRetirementAge - (pensionCalcObj.currentAgeMonths / 12));
  const livePensionRule = getPensionRule(targetBankIdForPensionEstimate, effectiveSectorId, pensionDbRules, sectorMappings);

  const liveCalculatedPensionObj = effectiveSectorId === 'retired'
    ? { pension: directPensionSalary || 0 }
    : calculatePensionFromRule({
        approvedSalary: liveApprovedSalary,
        serviceMonths: pensionCalcObj.serviceMonthsAtRetirement,
        yearsToRetirement: liveYearsToRetirement,
        rule: livePensionRule
      });

  const liveExpectedPensionValue = liveCalculatedPensionObj.pension;

  // Sync Product ID with Main/Sub choices
  useEffect(() => {
    if (mainFinanceType === 'personal_only') {
      setProductId('personal_only');
    } else if (mainFinanceType === 'real_estate_with_existing_personal') {
      setProductId('real_estate_with_existing_personal');
    } else {
      if (realEstateSubType === 'real_estate_only') {
        setProductId('real_estate');
      } else {
        setProductId('both');
      }
    }
  }, [mainFinanceType, realEstateSubType]);

  useEffect(() => {
    if (effectiveSectorId === 'retired') {
      setLocalCalculatedNet(Number(directPensionSalary ?? 0));
      return;
    }

    if (salaryMode === 'direct') {
      setLocalCalculatedNet(directNetSalary);
    } else {
      const rule = salaryRules.find(r => r.sectorId === effectiveSectorId && r.isActive) || {
        deductionPercentage: 9.0,
        deductionBase: 'basic_housing' as const
      };
      const gross = basicSalary + housingAllowance + otherAllowances;
      let dBase = basicSalary + housingAllowance;
      if (rule.deductionBase === 'basic_only') dBase = basicSalary;
      else if (rule.deductionBase === 'total') dBase = gross;

      const deduction = (dBase * rule.deductionPercentage) / 100;
      setLocalCalculatedNet(Math.round(gross - deduction));
    }
  }, [salaryMode, directNetSalary, basicSalary, housingAllowance, otherAllowances, effectiveSectorId, salaryRules, directPensionSalary]);

  const hijriToGreg = (year: number, calendar: 'gregorian' | 'hijri'): number => {
    if (calendar === 'hijri') {
      const greg = convertHijriToGregorian(year, 1, 1);
      return greg.year;
    }
    return year;
  };

  // Handle Step validations
  const validateStep = (stepNumber: number): boolean => {
    const stepErrors: string[] = [];
    const flow = getActiveFlow();
    const stepId = flow[stepNumber - 1];

    if (stepId === 'sector') {
      if (sectorId === 'military' && !militaryType) {
        stepErrors.push('حدد نوع العسكري لأن بعض البنوك تختلف بين الضباط والأفراد.');
      }
    }

    if (stepId === 'personal_info') {
      const today = new Date();
      const currentYear = today.getFullYear();

      // Validate birth month & year ranges
      if (!birthMonth || birthMonth < 1 || birthMonth > 12) {
        stepErrors.push('يرجى إدخال شهر ميلاد صحيح بين 1 و 12.');
      }
      const minBirthYear = birthCalendar === 'gregorian' ? 1940 : 1360;
      const maxBirthYear = birthCalendar === 'gregorian' ? 2008 : 1429;
      if (!birthYear || birthYear < minBirthYear || birthYear > maxBirthYear) {
        stepErrors.push(`يرجى إدخال سنة ميلاد صحيحة بين ${minBirthYear} و ${maxBirthYear} للتقويم المختار.`);
      }

      // Check age only if birthYear is in range
      if (birthYear && birthYear >= minBirthYear && birthYear <= maxBirthYear) {
        const ageYears = currentYear - hijriToGreg(birthYear, birthCalendar);
        if (ageYears < 18) {
          stepErrors.push('يجب ألا يقل عمر طالب التمويل عن 18 عاماً.');
        }
      }

      if (effectiveSectorId !== 'retired') {
        if (!appointmentMonth || appointmentMonth < 1 || appointmentMonth > 12) {
          stepErrors.push('يرجى إدخال شهر تعيين صحيح بين 1 و 12.');
        }
        const minAppYear = appointmentCalendar === 'gregorian' ? 1970 : 1390;
        const maxAppYear = appointmentCalendar === 'gregorian' ? currentYear : 1447;
        if (!appointmentYear || appointmentYear < minAppYear || appointmentYear > maxAppYear) {
          stepErrors.push(`يرجى إدخال سنة تعيين صحيحة بين ${minAppYear} و ${maxAppYear} للتقويم المختار.`);
        }

        if (appointmentYear && birthYear) {
          if (hijriToGreg(appointmentYear, appointmentCalendar) < hijriToGreg(birthYear, birthCalendar) + 15) {
            stepErrors.push('تاريخ التعيين لا يمكن أن يسبق السن القانوني للعمل من تاريخ الميلاد.');
          }
          if (appointmentYear > currentYear && appointmentCalendar === 'gregorian') {
            stepErrors.push('تاريخ التعيين لا يمكن أن يكون وتاريخاً مستقبلياً من اليوم.');
          }
        }
      }
    }

    if (stepId === 'salary') {
      if (mainFinanceType === 'personal_only' && customerStatus === 'active_employee' && sectorId === 'military' && !militaryType) {
        stepErrors.push('حدد نوع العسكري لأن بعض البنوك تختلف بين الضباط والأفراد.');
      }
      if (salaryMode === 'direct' || effectiveSectorId === 'retired') {
        if (effectiveSectorId === 'retired' && directPensionSalary <= 0) {
          stepErrors.push('يرجى إدخال الراتب التقاعدي الصافي المستلم صحيح أكبر من الصفر.');
        } else if (effectiveSectorId !== 'retired' && directNetSalary <= 0) {
          stepErrors.push('يرجى إدخال مبلغ الراتب الصافي الكلي صحيح أكبر من الصفر.');
        }
      } else {
        if (basicSalary <= 0) {
          stepErrors.push('يرجى إدخال الراتب الأساسي الخاص بك بدقة.');
        }
      }
    }

    if (stepId === 'finance_options') {
      if (mainFinanceType !== 'personal_only') {
        if (termMode === 'manual') {
          if (!manualTermYears || manualTermYears < 1 || manualTermYears > 30) {
            stepErrors.push('يرجى إدخال مدة تمويل مستهدفة صحيحة بين 1 و 30 سنة.');
          }
        }
      }
    }

    setErrors(stepErrors);
    return stepErrors.length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setErrors([]);
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setErrors([]);
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  // Trigger Calculations
  const triggerCalculations = () => {
    if (!validateStep(currentStep)) return;

    const calcParams = {
      sectorId: effectiveSectorId,
      militarySubType: ((effectiveSectorId === 'military' || sectorId === 'military') ? ((militarySubtype === 'officer' || militaryType === 'officer') ? 'military_officer' : 'military_individual') : undefined) as 'military_officer' | 'military_individual' | undefined,
      productId,
      birthYear,
      birthMonth,
      birthDay,
      birthCalendar,
      appointmentYear: effectiveSectorId === 'retired' ? undefined : appointmentYear,
      appointmentMonth: effectiveSectorId === 'retired' ? undefined : appointmentMonth,
      appointmentDay: effectiveSectorId === 'retired' ? undefined : appointmentDay,
      appointmentCalendar: effectiveSectorId === 'retired' ? undefined : appointmentCalendar,
      rankId: (effectiveSectorId === 'military' || sectorId === 'military') ? rankId : undefined,
      salaryMode,
      basicSalary,
      housingAllowance,
      otherAllowances,
      directNetSalary,
      directPensionSalary,
      obligations: productId === 'personal_only' ? 0 : existingMonthlyObligations,
      existingMonthlyObligations: productId === 'personal_only' ? 0 : existingMonthlyObligations,
      obligationRemainingMonths: productId === 'personal_only' ? 0 : obligationRemainingMonths,
      supportType,
      selectedBankId,
      termMode,
      manualTermMonths: termMode === 'manual' ? manualTermYears * 12 : undefined,

      banks,
      products,
      militaryRanks,
      salaryRules,
      pensionRules,
      marginRules,
      dsrRules,
      supportSettings,
      housingSupportTiers,
      advancePaymentTiers,
      personalRules,
      termRules,
      bankSectorRules
    };

    const calculationResults = calculateBanksFinancing(calcParams);
    setResults(calculationResults);

    // Save calculation to logs state to populate Admin Diagnostics log history!
    const bestMatch = calculationResults[0];
    if (bestMatch) {
      const newLog = {
        id: `log_calc_${Date.now()}`,
        timestamp: new Date().toISOString(),
        bankId: bestMatch.bankId,
        productId,
        netSalary: bestMatch.netSalary,
        termMonths: bestMatch.termMonths,
        margin: bestMatch.annualMargin,
        dsrBefore: bestMatch.dsrUsed,
        financeAmount: bestMatch.totalPurchasingPower,
        status: bestMatch.status,
        rejectionReason: bestMatch.rejectionReason,
        diagnosticSteps: bestMatch.diagnosticSteps
      };
      setCalculationLogs(prev => [newLog, ...prev]);
    }

    setCurrentStep(flow.length);
  };

  const restartWizard = () => {
    setResults(null);
    setCurrentStep(1);
  };

  // Generative options range helper
  const yearsRange = (from: number, to: number) => {
    const arr = [];
    for (let i = from; i <= to; i++) {
      arr.push(i);
    }
    return arr;
  };

  return (
    <div className="w-full bg-[#F5F7FA]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Step Wizard visual Progress stepper indicators */}
        {currentStep < flow.length && (
          <div className="mb-6 md:mb-8 select-none">
            {/* Desktop circles (hidden on mobile) */}
            <div className="hidden sm:flex items-center justify-between">
              {flow.slice(0, -1).map((stepId, index) => {
                const s = index + 1;
                const isActive = s === currentStep;
                const isCompleted = s < currentStep;

                let stepLabel = '';
                if (stepId === 'main_type') stepLabel = 'نوع الحسبة';
                else if (stepId === 're_sub_type') stepLabel = 'نوع العقاري';
                else if (stepId === 'sector') stepLabel = 'جهة العمل';
                else if (stepId === 'customer_status') stepLabel = 'حالة العميل';
                else if (stepId === 'personal_info') stepLabel = 'البيانات الشخصية';
                else if (stepId === 'salary') stepLabel = 'الراتب والدخل';
                else if (stepId === 'finance_options') stepLabel = 'خيارات الحسبة';

                return (
                  <div key={stepId} className="flex flex-col items-center flex-1 relative font-sans">
                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-xs md:text-sm border-2 transition-all ${
                      isActive
                        ? 'bg-[#0057B8] text-white border-[#0057B8] shadow-md scale-110'
                        : isCompleted
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-white text-gray-400 border-gray-200'
                    }`}>
                      {isCompleted ? '✓' : s}
                    </div>
                    <span className={`text-[9px] sm:text-xs font-semibold mt-2 text-center leading-tight truncate max-w-[64px] sm:max-w-none ${isActive ? 'text-[#0057B8] font-bold block' : 'text-[#6B7280] hidden sm:block'}`}>
                      {stepLabel}
                    </span>
                    {index < flow.length - 2 && (
                      <div className={`absolute top-4 md:top-5 -left-1/2 w-full h-[2px] -z-10 ${isCompleted ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Mobile Progress Bar (hidden on desktop) */}
            <div className="block sm:hidden space-y-2 px-1">
              <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                <span>التقدم في خطوات الحاسبة:</span>
                <span className="text-[#0057B8] font-mono">الخطوة {currentStep} من {flow.length - 1}</span>
              </div>
              <div className="w-full h-2.5 bg-slate-150 rounded-full overflow-hidden border border-slate-200/40">
                <div 
                  className="h-full bg-gradient-to-r from-[#0057B8] to-[#0ea5a4] rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min(100, (currentStep / (flow.length - 1)) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Validation Alert */}
        {errors.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 space-y-1">
            <div className="flex items-center gap-2 font-bold mb-1">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>تنبيه التحقق من صحة المدخلات:</span>
            </div>
            {errors.map((err, i) => (
              <p key={i} className="list-disc pr-4">{err}</p>
            ))}
          </div>
        )}

        {/* Main Step Cards Form container */}
        <div className="bg-white rounded-2xl md:rounded-3xl border border-[#E5E7EB] p-4 sm:p-8 md:p-10 shadow-xs">
          
          {/* STEP 1: Main Type Selection */}
          {activeStepId === 'main_type' && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center max-w-lg mx-auto mb-8">
                <h3 className="text-xl font-bold text-[#111827]">اختر التمويل المراد احتسابه</h3>
                <p className="text-sm text-[#6B7280] mt-1">نوفر نماذج حسابات دقيقة للمرونة العقارية أو التمويل الشخصي القصير أو الاستحقاقات المدمجة.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  id="re-type-card"
                  onClick={() => setMainFinanceType('real_estate')}
                  className={`flex items-center gap-4 text-right p-4 cursor-pointer transition-all border-y border-r border-l-4 rounded-xl shadow-xs md:flex-col md:text-center md:items-center md:p-6 md:rounded-2xl md:border-l ${
                    mainFinanceType === 'real_estate' 
                      ? 'border-l-[#0057B8] border-y-[#0057B8]/10 border-r-[#0057B8]/10 bg-[#0057B8]/5 md:border-[#0057B8]' 
                      : 'border-l-slate-200 border-y-slate-200 border-r-slate-200 bg-white hover:bg-slate-50 md:border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3 md:flex-col md:items-center w-full">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-[#0057B8]/10 text-[#0057B8] rounded-xl flex items-center justify-center shrink-0 md:mx-auto md:mb-2">
                      <Home className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div className="text-right md:text-center flex-1">
                      <h4 className="font-extrabold text-[#111827] text-xs md:text-sm">تمويل عقاري</h4>
                      <p className="text-[10px] sm:text-xs text-gray-500 mt-1 leading-relaxed hidden sm:block">لحساب التمويل العقاري، مع اختيار عقاري بلس أو عقاري فقط في خطوتك التالية.</p>
                    </div>
                  </div>
                </div>

                <div
                  id="pf-type-card"
                  onClick={() => setMainFinanceType('personal_only')}
                  className={`flex items-center gap-4 text-right p-4 cursor-pointer transition-all border-y border-r border-l-4 rounded-xl shadow-xs md:flex-col md:text-center md:items-center md:p-6 md:rounded-2xl md:border-l ${
                    mainFinanceType === 'personal_only' 
                      ? 'border-l-amber-500 border-y-amber-500/10 border-r-amber-500/10 bg-amber-50/20 md:border-amber-500' 
                      : 'border-l-slate-200 border-y-slate-200 border-r-slate-200 bg-white hover:bg-slate-50 md:border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3 md:flex-col md:items-center w-full">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0 md:mx-auto md:mb-2">
                      <Coins className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div className="text-right md:text-center flex-1">
                      <h4 className="font-extrabold text-[#111827] text-xs md:text-sm">تمويل شخصي فقط</h4>
                      <p className="text-[10px] sm:text-xs text-gray-500 mt-1 leading-relaxed hidden sm:block">لحساب التمويل الشخصي المستقل القصير.</p>
                    </div>
                  </div>
                </div>

                <div
                  id="both-type-card"
                  onClick={() => setMainFinanceType('real_estate_with_existing_personal')}
                  className={`flex items-center gap-4 text-right p-4 cursor-pointer transition-all border-y border-r border-l-4 rounded-xl shadow-xs md:flex-col md:text-center md:items-center md:p-6 md:rounded-2xl md:border-l ${
                    mainFinanceType === 'real_estate_with_existing_personal' 
                      ? 'border-l-teal-500 border-y-teal-500/10 border-r-teal-500/10 bg-teal-50/20 md:border-teal-500' 
                      : 'border-l-slate-200 border-y-slate-200 border-r-slate-200 bg-white hover:bg-slate-50 md:border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3 md:flex-col md:items-center w-full">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-teal-50 text-[#0EA5A4] rounded-xl flex items-center justify-center shrink-0 md:mx-auto md:mb-2">
                      <Scale className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div className="text-right md:text-center flex-1">
                      <h4 className="font-extrabold text-[#111827] text-xs md:text-sm">عقاري مع شخصي قائم</h4>
                      <p className="text-[10px] sm:text-xs text-gray-500 mt-1 leading-relaxed hidden sm:block">تمويل عقاري بوجود أقساط قديمة قائمة تستهلك من الاستقطاع.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP: Customer Status Selection for Personal Only */}
          {activeStepId === 'customer_status' && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center max-w-lg mx-auto mb-8">
                <h3 className="text-xl font-bold text-[#111827]">ما هي حالة العميل الوظيفية؟</h3>
                <p className="text-sm text-[#6B7280] mt-1">يرجى اختيار حالة العميل الوظيفية للبدء في توجيه الاحتساب الرياضي.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                <div
                  id="cs-active-card"
                  onClick={() => {
                    setCustomerStatus('active_employee');
                    if (sectorId === 'retired') {
                      setSectorId('gov_civil');
                    }
                  }}
                  className={`flex items-center gap-4 text-right p-4 cursor-pointer transition-all border-y border-r border-l-4 rounded-xl shadow-xs md:flex-col md:text-center md:items-center md:p-6 md:rounded-2xl md:border-l ${
                    customerStatus === 'active_employee' 
                      ? 'border-l-[#0057B8] border-y-[#0057B8]/10 border-r-[#0057B8]/10 bg-[#0057B8]/5 md:border-[#0057B8]' 
                      : 'border-l-slate-200 border-y-slate-200 border-r-slate-200 bg-white hover:bg-slate-50 md:border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3 md:flex-col md:items-center w-full">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 text-[#0057B8] rounded-xl flex items-center justify-center shrink-0 md:mx-auto md:mb-2">
                      <User className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div className="text-right md:text-center flex-1">
                      <h4 className="font-extrabold text-[#111827] text-xs md:text-sm">موظف نشط</h4>
                      <p className="text-[10px] sm:text-xs text-gray-500 mt-1 leading-relaxed hidden sm:block">موظف على رأس العمل في القطاع العام أو الشركات.</p>
                    </div>
                  </div>
                </div>

                <div
                  id="cs-retired-card"
                  onClick={() => {
                    setCustomerStatus('retired');
                    setSectorId('retired');
                    setSalaryMode('direct');
                  }}
                  className={`flex items-center gap-4 text-right p-4 cursor-pointer transition-all border-y border-r border-l-4 rounded-xl shadow-xs md:flex-col md:text-center md:items-center md:p-6 md:rounded-2xl md:border-l ${
                    customerStatus === 'retired' 
                      ? 'border-l-amber-500 border-y-amber-500/10 border-r-amber-500/10 bg-amber-50/20 md:border-amber-500' 
                      : 'border-l-slate-200 border-y-slate-200 border-r-slate-200 bg-white hover:bg-slate-50 md:border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3 md:flex-col md:items-center w-full">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0 md:mx-auto md:mb-2">
                      <Coins className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div className="text-right md:text-center flex-1">
                      <h4 className="font-extrabold text-[#111827] text-xs md:text-sm">متقاعد</h4>
                      <p className="text-[10px] sm:text-xs text-gray-500 mt-1 leading-relaxed hidden sm:block">يعتمد الحساب على الراتب التقاعدي الشهري الحالي.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 1.5: Real Estate Subtype Selection */}
          {activeStepId === 're_sub_type' && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center max-w-lg mx-auto mb-8">
                <h3 className="text-xl font-bold text-[#111827]">نوع التمويل العقاري</h3>
                <p className="text-sm text-[#6B7280] mt-1">يرجى تحديد نمط التثبيت العقاري (فردي خالص أو متداخل مع برنامج تمويل شخصي استهلاكي إضافي).</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                <div
                  id="re-sub-only-card"
                  onClick={() => setRealEstateSubType('real_estate_only')}
                  className={`flex items-center gap-4 text-right p-4 cursor-pointer transition-all border-y border-r border-l-4 rounded-xl shadow-xs md:flex-col md:text-center md:items-center md:p-6 md:rounded-2xl md:border-l ${
                    realEstateSubType === 'real_estate_only' 
                      ? 'border-l-emerald-500 border-y-emerald-500/10 border-r-emerald-500/10 bg-emerald-50/20 md:border-emerald-500' 
                      : 'border-l-slate-200 border-y-slate-200 border-r-slate-200 bg-white hover:bg-slate-50 md:border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3 md:flex-col md:items-center w-full">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0 md:mx-auto md:mb-2">
                      <Home className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div className="text-right md:text-center flex-1">
                      <h4 className="font-extrabold text-[#111827] text-xs md:text-sm">عقاري فقط</h4>
                      <p className="text-[10px] sm:text-xs text-gray-500 mt-1 leading-relaxed hidden sm:block">حساب التمويل العقاري بدون تمويل شخصي استهلاكي إضافي.</p>
                    </div>
                  </div>
                </div>

                <div
                  id="re-sub-plus-personal-card"
                  onClick={() => setRealEstateSubType('real_estate_with_new_personal')}
                  className={`flex items-center gap-4 text-right p-4 cursor-pointer transition-all border-y border-r border-l-4 rounded-xl shadow-xs md:flex-col md:text-center md:items-center md:p-6 md:rounded-2xl md:border-l ${
                    realEstateSubType === 'real_estate_with_new_personal' 
                      ? 'border-l-[#0057B8] border-y-[#0057B8]/10 border-r-[#0057B8]/10 bg-[#0057B8]/5 md:border-[#0057B8]' 
                      : 'border-l-slate-200 border-y-slate-200 border-r-slate-200 bg-white hover:bg-slate-50 md:border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3 md:flex-col md:items-center w-full">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-50 text-[#0057B8] rounded-xl flex items-center justify-center shrink-0 md:mx-auto md:mb-2">
                      <Scale className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div className="text-right md:text-center flex-1">
                      <h4 className="font-extrabold text-[#111827] text-xs md:text-sm">عقاري + شخصي جديد</h4>
                      <p className="text-[10px] sm:text-xs text-gray-500 mt-1 leading-relaxed hidden sm:block">حساب التمويل العقاري مع تمويل شخصي جديد ضمن الحسبة المشتركة.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Employment Sector & Ranks */}
          {activeStepId === 'sector' && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center max-w-lg mx-auto mb-8">
                <h3 className="text-xl font-bold text-[#111827]">ما هو القطاع المهني لجهة العمل؟</h3>
                <p className="text-sm text-[#6B7280] mt-1">يحدد القطاع قواعد التقاعد والاستقطاع حسب أنظمة البنوك المختلفة.</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { id: 'gov_civil', label: 'حكومي مدني', icon: Briefcase },
                  { id: 'military', label: 'عسكري', icon: User },
                  { id: 'semi_gov', label: 'شبه حكومي', icon: Scale },
                  { id: 'companies', label: 'موظف شركات', icon: Briefcase },
                  { id: 'retired', label: 'متقاعد حالي', icon: Coins }
                ].map((sec) => (
                  <div
                    key={sec.id}
                    id={`sector-card-${sec.id}`}
                    onClick={() => {
                      setSectorId(sec.id as SectorId);
                      setSector(sec.id);
                      
                      if (sec.id === 'retired') {
                        setSalaryMode('direct');
                        setRetirementAge(getSectorRetirementAge('retired', 60));
                        setAhliGroup('');
                        setMilitarySubtype('');
                        setMilitaryRank('');
                        setMilitaryType('');
                      } else if (sec.id === 'gov_civil') {
                        setRetirementAge(getSectorRetirementAge('gov_civil', 60));
                        setAhliGroup('A');
                        setMilitarySubtype('');
                        setMilitaryRank('');
                        setMilitaryType('');
                      } else if (sec.id === 'semi_gov') {
                        setRetirementAge(getSectorRetirementAge('semi_gov', 60));
                        setAhliGroup('A');
                        setMilitarySubtype('');
                        setMilitaryRank('');
                        setMilitaryType('');
                      } else if (sec.id === 'companies') {
                        setRetirementAge(getSectorRetirementAge('companies', 60));
                        setAhliGroup('A');
                        setMilitarySubtype('');
                        setMilitaryRank('');
                        setMilitaryType('');
                      } else if (sec.id === 'military') {
                        setMilitarySubtype('enlisted');
                        setMilitaryType('individual');
                        const enlistedRanks = militaryRanks.filter(r => r.sectorScope === 'enlisted' && r.isActive);
                        const sorted = [...enlistedRanks].sort((a,b) => a.displayOrder - b.displayOrder);
                        const firstEnRank = sorted[0];
                        if (firstEnRank) {
                          setRankId(firstEnRank.id);
                          setMilitaryRank(firstEnRank.nameAr);
                          setRetirementAge(firstEnRank.retirementAge);
                          setAhliGroup(firstEnRank.ahliGroup || 'B');
                        } else {
                          setRankId('jundi');
                          setMilitaryRank('جندي / جندي أول');
                          setRetirementAge(44);
                          setAhliGroup('B');
                        }
                      }
                    }}
                    className={`flex items-center gap-3 text-right p-4 cursor-pointer transition-all border-y border-r border-l-4 rounded-xl shadow-xs md:flex-col md:text-center md:items-center md:justify-center md:p-5 md:rounded-2xl md:border-l ${
                      sectorId === sec.id
                        ? 'border-l-[#0057B8] border-y-[#0057B8]/10 border-r-[#0057B8]/10 bg-[#0057B8]/5 ring-2 ring-[#0057B8]/15 md:border-[#0057B8]'
                        : 'border-l-slate-200 border-y-slate-200 border-r-slate-200 bg-white hover:bg-slate-50 md:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 md:flex-col md:items-center w-full">
                      <sec.icon className={`w-5 h-5 md:w-6 md:h-6 shrink-0 ${sectorId === sec.id ? 'text-[#0057B8]' : 'text-gray-500'}`} />
                      <span className="text-xs font-bold text-[#111827] block text-right md:text-center flex-1">{sec.label}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Dynamic Rank selector shown for military sectors */}
              {(sectorId === 'military') && (
                <div id="military-rank-selector-wrapper" className="bg-gray-50 rounded-2xl p-6 border border-gray-200 mt-6 animate-fade-in text-right space-y-4">
                  {/* Category subclass selector */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-700">تصنيف الخدمة العسكرية:</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'enlisted', type: 'individual', scope: 'enlisted', label: 'عسكري أفراد' },
                        { id: 'officer', type: 'officer', scope: 'officer', label: 'عسكري ضباط' }
                      ].map((sub) => {
                        const isSelected = militarySubtype === sub.id;
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => {
                              setMilitarySubtype(sub.id as 'enlisted' | 'officer');
                              setMilitaryType(sub.type as 'officer' | 'individual');
                              const targetScope = sub.scope;
                              const filteredRanks = militaryRanks.filter(r => r.sectorScope === targetScope && r.isActive);
                              const sorted = [...filteredRanks].sort((a, b) => a.displayOrder - b.displayOrder);
                              const firstRank = sorted[0];
                              if (firstRank) {
                                setRankId(firstRank.id);
                                setMilitaryRank(firstRank.nameAr);
                                setRetirementAge(firstRank.retirementAge);
                                setAhliGroup(firstRank.ahliGroup || (sub.id === 'officer' ? 'A' : 'B'));
                              }
                            }}
                            className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all border text-center ${
                              isSelected
                                ? 'bg-[#0057B8] text-white border-[#0057B8] shadow-xs'
                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            {sub.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2 font-sans">الرتبة العسكرية:</label>
                    <select
                      id="rank-select"
                      value={rankId}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        setRankId(selectedId);
                        
                        const matched = militaryRanks.find(r => r.id === selectedId);
                        if (matched) {
                          setMilitaryRank(matched.nameAr);
                          setRetirementAge(matched.retirementAge);
                          setAhliGroup(matched.ahliGroup || (militarySubtype === 'officer' ? 'A' : 'B'));
                        }
                      }}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8] focus:border-transparent cursor-pointer"
                    >
                      {militaryRanks
                        .filter(rank => rank.sectorScope === (militarySubtype === 'officer' ? 'officer' : 'enlisted') && rank.isActive)
                        .sort((a, b) => a.displayOrder - b.displayOrder)
                        .map((rank) => (
                          <option key={rank.id} value={rank.id}>
                            {rank.nameAr}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-gray-100 text-xs font-semibold text-gray-600 text-center animate-fade-in">
                    <div>
                      <span className="text-gray-400">سن التقاعد للرتبة: </span>
                      <strong className="text-gray-900">{retirementAge} سنة</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Dates and Age Details */}
          {activeStepId === 'personal_info' && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center max-w-lg mx-auto mb-8">
                <h3 className="text-xl font-bold text-[#111827]">تاريخ الميلاد وتاريخ مباشرة العمل</h3>
                <p className="text-sm text-[#6B7280] mt-1">تستخدم تواريخك دقيقة لحساب السن بالشهور وأشهر الخدمة النشطة لتأسيس السقف الائتماني العقاري.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Dob Card */}
                <div className="border border-gray-200 rounded-2xl p-6 bg-white space-y-4">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                    <span className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-[#0057B8]" />
                      <span>تاريخ الميلاد:</span>
                    </span>
                    <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                      <button
                        type="button"
                        onClick={() => setBirthCalendar('gregorian')}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${birthCalendar === 'gregorian' ? 'bg-white text-[#0057B8] shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
                      >
                        ميلادي
                      </button>
                      <button
                        type="button"
                        onClick={() => setBirthCalendar('hijri')}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${birthCalendar === 'hijri' ? 'bg-white text-[#0057B8] shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
                      >
                        هجري
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">الشهر (1 - 12)</label>
                      <NumericInput
                        id="birth-month-input"
                        min={1}
                        max={12}
                        allowDecimals={false}
                        placeholder="05"
                        value={birthMonth}
                        onChange={setBirthMonth}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">السنة</label>
                      <NumericInput
                        id="birth-year-input"
                        min={birthCalendar === 'gregorian' ? 1940 : 1360}
                        max={birthCalendar === 'gregorian' ? 2008 : 1429}
                        allowDecimals={false}
                        placeholder={birthCalendar === 'gregorian' ? '1990' : '1410'}
                        value={birthYear}
                        onChange={setBirthYear}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                      />
                    </div>
                  </div>
                </div>

                {/* Appointment date Card (except retiree) */}
                {sectorId !== 'retired' ? (
                  <div className="border border-gray-200 rounded-2xl p-6 bg-white space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                      <span className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
                        <Briefcase className="w-4 h-4 text-emerald-600" />
                        <span>تاريخ المباشرة / التعيين:</span>
                      </span>
                      <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                        <button
                          type="button"
                          onClick={() => setAppointmentCalendar('gregorian')}
                          className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${appointmentCalendar === 'gregorian' ? 'bg-white text-[#0057B8] shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                          ميلادي
                        </button>
                        <button
                          type="button"
                          onClick={() => setAppointmentCalendar('hijri')}
                          className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${appointmentCalendar === 'hijri' ? 'bg-white text-[#0057B8] shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                          هجري
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">الشهر (1 - 12)</label>
                        <NumericInput
                          id="appointment-month-input"
                          min={1}
                          max={12}
                          allowDecimals={false}
                          placeholder="09"
                          value={appointmentMonth}
                          onChange={setAppointmentMonth}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">السنة</label>
                        <NumericInput
                          id="appointment-year-input"
                          min={appointmentCalendar === 'gregorian' ? 1970 : 1390}
                          max={appointmentCalendar === 'gregorian' ? 2026 : 1447}
                          allowDecimals={false}
                          placeholder={appointmentCalendar === 'gregorian' ? '2015' : '1436'}
                          value={appointmentYear}
                          onChange={setAppointmentYear}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200 flex flex-col justify-center animate-fade-in">
                    <p className="text-xs text-amber-800 leading-relaxed font-sans">
                      بما أن القطاع المهني المختار هو <strong>"متقاعد حالي"</strong>، فلن نطلب تاريخ مباشرة العمل ويتم الاعتماد القياسي المطلق على السن لدورة الحياة التمويلية.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: Salary & Income */}
          {activeStepId === 'salary' && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center max-w-lg mx-auto mb-8">
                <h3 className="text-xl font-bold text-[#111827]">الرواتب والمستحقات والبدلات</h3>
                <p className="text-sm text-[#6B7280] mt-1">يُشترط الإدخال الصحيح للراتب لتقرير عوامل الاستقطاع ونسب الملاءمة ائتمانياً لدى كافة البنوك.</p>
              </div>

              {/* Small Sector Picker for Active Employee in Personal Only Flow */}
              {mainFinanceType === 'personal_only' && customerStatus === 'active_employee' && (
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
                  <span className="block text-xs font-bold text-gray-700 mb-3 text-right">القطاع المهني لجهة العمل التابع لها:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { id: 'gov_civil', label: 'حكومي مدني' },
                      { id: 'military', label: 'عسكري' },
                      { id: 'semi_gov', label: 'شبه حكومي' },
                      { id: 'companies', label: 'موظف شركات' }
                    ].map((sec) => (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => {
                          setSectorId(sec.id as SectorId);
                          setSector(sec.id);
                          if (sec.id === 'gov_civil') {
                            setRetirementAge(getSectorRetirementAge('gov_civil', 60));
                            setAhliGroup('A');
                            setMilitarySubtype('');
                            setMilitaryRank('');
                            setMilitaryType('');
                          } else if (sec.id === 'semi_gov') {
                            setRetirementAge(getSectorRetirementAge('semi_gov', 60));
                            setAhliGroup('A');
                            setMilitarySubtype('');
                            setMilitaryRank('');
                            setMilitaryType('');
                          } else if (sec.id === 'companies') {
                            setRetirementAge(getSectorRetirementAge('companies', 60));
                            setAhliGroup('A');
                            setMilitarySubtype('');
                            setMilitaryRank('');
                            setMilitaryType('');
                          } else if (sec.id === 'military') {
                            setMilitarySubtype('enlisted');
                            setMilitaryType('individual');
                            const enlistedRanks = militaryRanks.filter(r => r.sectorScope === 'enlisted' && r.isActive);
                            const sorted = [...enlistedRanks].sort((a,b) => a.displayOrder - b.displayOrder);
                            const firstEnRank = sorted[0];
                            if (firstEnRank) {
                              setRankId(firstEnRank.id);
                              setMilitaryRank(firstEnRank.nameAr);
                              setRetirementAge(firstEnRank.retirementAge);
                              setAhliGroup(firstEnRank.ahliGroup || 'B');
                            } else {
                              setRankId('jundi');
                              setMilitaryRank('جندي / جندي أول');
                              setRetirementAge(44);
                              setAhliGroup('B');
                            }
                          }
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                          sectorId === sec.id
                            ? 'bg-[#0057B8] text-white border-[#0057B8] shadow-xs'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {sec.label}
                      </button>
                    ))}
                  </div>

                  {/* Optional Rank Select for Military in Personal Only flow */}
                  {(sectorId === 'military') && (
                    <div className="mt-4 animate-fade-in text-right space-y-4">
                      {/* Sub-class buttons */}
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-gray-600">فئة القطاع العسكري:</label>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { id: 'enlisted', type: 'individual', scope: 'enlisted', label: 'عسكري أفراد' },
                            { id: 'officer', type: 'officer', scope: 'officer', label: 'عسكري ضباط' }
                          ].map((sub) => {
                            const isSelected = militarySubtype === sub.id;
                            return (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() => {
                                  setMilitarySubtype(sub.id as 'enlisted' | 'officer');
                                  setMilitaryType(sub.type as 'officer' | 'individual');
                                  const targetScope = sub.scope;
                                  const filteredRanks = militaryRanks.filter(r => r.sectorScope === targetScope && r.isActive);
                                  const sorted = [...filteredRanks].sort((a, b) => a.displayOrder - b.displayOrder);
                                  const firstRank = sorted[0];
                                  if (firstRank) {
                                    setRankId(firstRank.id);
                                    setMilitaryRank(firstRank.nameAr);
                                    setRetirementAge(firstRank.retirementAge);
                                    setAhliGroup(firstRank.ahliGroup || (sub.id === 'officer' ? 'A' : 'B'));
                                  }
                                }}
                                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all border text-center ${
                                  isSelected
                                    ? 'bg-[#0057B8] text-white border-[#0057B8] shadow-xs'
                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                }`}
                              >
                                {sub.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 mb-2 font-sans">الرتبة العسكرية:</label>
                        <select
                          id="rank-select-salary"
                          value={rankId}
                          onChange={(e) => {
                            const selectedId = e.target.value;
                            setRankId(selectedId);
                            
                            const matched = militaryRanks.find(r => r.id === selectedId);
                            if (matched) {
                              setMilitaryRank(matched.nameAr);
                              setRetirementAge(matched.retirementAge);
                              setAhliGroup(matched.ahliGroup || (militarySubtype === 'officer' ? 'A' : 'B'));
                            }
                          }}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8] focus:border-transparent cursor-pointer"
                        >
                          {militaryRanks
                            .filter(rank => rank.sectorScope === (militarySubtype === 'officer' ? 'officer' : 'enlisted') && rank.isActive)
                            .sort((a, b) => a.displayOrder - b.displayOrder)
                            .map((rank) => (
                              <option key={rank.id} value={rank.id}>
                                {rank.nameAr} (سن تقاعد الرتبة: {rank.retirementAge} سنة)
                              </option>
                            ))}
                        </select>
                      </div>

                      <div className="bg-white p-3.5 rounded-xl border border-gray-200/50 text-xs font-semibold text-gray-600 text-center animate-fade-in">
                        <div>
                          <span className="text-gray-400">سن التقاعد للرتبة: </span>
                          <strong className="text-gray-950">{retirementAge} سنة</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sub tabs: manual net vs detailed */}
              {sectorId !== 'retired' && (
                <div className="flex bg-gray-100 p-1.5 rounded-xl mb-6 border border-gray-200 gap-1">
                  <button
                    type="button"
                    id="salary-details-tab"
                    onClick={() => setSalaryMode('details')}
                    className={`flex-1 text-center py-2.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      salaryMode === 'details'
                        ? 'bg-white text-[#0057B8] shadow-xs'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                    }`}
                  >
                    <span>إدخال تفاصيل الراتب (الأساسي والبدلات)</span>
                    <span className="text-[10px] font-normal text-[#0057B8]/80 block sm:inline-block sm:mr-1 mt-0.5 sm:mt-0 font-sans">(الخيار الموصى به والمساعد للحاسبة)</span>
                  </button>
                  <button
                    type="button"
                    id="salary-direct-tab"
                    onClick={() => setSalaryMode('direct')}
                    className={`flex-1 text-center py-2.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      salaryMode === 'direct'
                        ? 'bg-white text-[#0057B8] shadow-xs'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                    }`}
                  >
                    أدخل الراتب الصافي مباشرة
                  </button>
                </div>
              )}

              {/* Form elements */}
              {salaryMode === 'direct' || sectorId === 'retired' ? (
                <div className="space-y-4 animate-fade-in">
                  {sectorId === 'retired' ? (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2">الراتب التقاعدي الصافي المستلم شهريًا:</label>
                      <div className="relative">
                        <NumericInput
                          id="retired-salary-input"
                          min={0}
                          allowDecimals={true}
                          value={directPensionSalary}
                          onChange={setDirectPensionSalary}
                          placeholder="مثال: 8000"
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">ريال سعودي</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2">مبلغ الراتب الصافي الكلي (المحول للبنك):</label>
                      <div className="relative">
                        <NumericInput
                          id="direct-salary-input"
                          min={0}
                          allowDecimals={true}
                          value={directNetSalary}
                          onChange={setDirectNetSalary}
                          placeholder="مثال: 12500"
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">ريال سعودي</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">الراتب الأساسي:</label>
                    <div className="relative">
                      <NumericInput
                        id="basic-salary-input"
                        min={0}
                        allowDecimals={true}
                        value={basicSalary}
                        onChange={setBasicSalary}
                        placeholder="مثال: 9000"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                      />
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-bold">ريال</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">بدل السكن:</label>
                    <div className="relative">
                      <NumericInput
                        id="housing-salary-input"
                        min={0}
                        allowDecimals={true}
                        value={housingAllowance}
                        onChange={setHousingAllowance}
                        placeholder="مثال: 2250"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                      />
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-bold">ريال</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">بدلات أخرى:</label>
                    <div className="relative">
                      <NumericInput
                        id="other-salary-input"
                        min={0}
                        allowDecimals={true}
                        value={otherAllowances}
                        onChange={setOtherAllowances}
                        placeholder="مثال: 1500"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                      />
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-bold">ريال</span>
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-3 bg-emerald-50 rounded-2xl p-4 border border-emerald-100 flex justify-between items-center text-xs">
                    <span className="text-emerald-800 font-bold">صافي الراتب المتوقع بعد خصم المعاشات:</span>
                    <span className="font-extrabold text-emerald-700 text-sm">{(localCalculatedNet).toLocaleString('ar-SA')} ريال سعودي</span>
                  </div>
                </div>
              )}

              {/* تفاصيل التقاعد المحسوبة */}
              {mainFinanceType !== 'personal_only' && (
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50/50 rounded-2xl p-6 border border-indigo-100/80 mt-6 space-y-4 animate-fade-in shadow-xs">
                  <div className="flex border-b border-indigo-100/50 pb-3 items-center justify-between">
                    <h4 className="font-bold text-[#111827] text-xs sm:text-sm flex items-center gap-2">
                      <Coins className="w-5 h-5 text-[#0057B8]" />
                      <span>محاكاة احتساب راتب التقاعد وتفاصيل الخدمة</span>
                    </h4>
                    <span className="text-[10px] bg-indigo-100 text-[#0057B8] font-extrabold px-2.5 py-1 rounded-full font-sans shadow-xs">
                      عملية افتراضية للعميل
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {sectorId !== 'retired' && (
                      <>
                        <div className="bg-white rounded-xl p-3 border border-indigo-50">
                          <span className="block text-[10px] font-bold text-gray-500 mb-1">سن التقاعد النظامي المقدر:</span>
                          <span className="text-sm font-extrabold text-indigo-700">
                            {liveRetirementAge} سنة
                          </span>
                        </div>

                        <div className="bg-white rounded-xl p-3 border border-indigo-50">
                          <span className="block text-[10px] font-bold text-gray-500 mb-1">شهور الخدمة عند التقاعد:</span>
                          <span className="text-sm font-extrabold text-[#111827]">
                            {pensionCalcObj.serviceMonthsAtRetirement} شهر 
                            <span className="text-[10px] text-gray-500 font-semibold block sm:inline-block sm:mr-1 font-sans">
                              (أي {(pensionCalcObj.serviceMonthsAtRetirement / 12).toFixed(1)} سنة)
                            </span>
                          </span>
                        </div>

                        <div className="bg-white rounded-xl p-3 border border-indigo-50">
                          <span className="block text-[10px] font-bold text-gray-500 mb-1">المدة المتبقية للتقاعد:</span>
                          <span className="text-sm font-extrabold text-amber-600">
                            {pensionCalcObj.monthsUntilRetirement} شهر
                            <span className="text-[10px] text-gray-500 font-semibold block sm:inline-block sm:mr-1 font-sans">
                              (أي {(pensionCalcObj.monthsUntilRetirement / 12).toFixed(1)} سنة)
                            </span>
                          </span>
                        </div>
                      </>
                    )}

                    {sectorId === 'retired' && (
                      <div className="col-span-3 bg-white/70 rounded-xl p-3 border border-dashed border-indigo-100 flex items-center">
                        <p className="text-xs text-indigo-800 leading-relaxed font-sans">
                          تم احتساب المعاش بناءً على الراتب التقاعدي الصافي المدخل يدويًا حيث يعتبر العميل في حالة تقاعد حالية قائمة.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: Finance Options & Obligations */}
          {activeStepId === 'finance_options' && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center max-w-lg mx-auto mb-8">
                <h3 className="text-xl font-bold text-[#111827]">تخصيص مدة التمويل والالتزامات</h3>
                <p className="text-sm text-[#6B7280] mt-1">تتحكم مدة السداد وتفصيل الدعم والالتزامات بجدول الفائدة التراكمية وهوامش أرباح البنوك.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Sakani Program (Mortgage support) - HELD FOR MORTGAGES ONLY */}
                {mainFinanceType !== 'personal_only' && (
                  <div className="border border-gray-200 bg-white rounded-2xl p-5">
                    <label className="block text-xs font-bold text-gray-700 mb-3 flex items-center justify-between">
                      <span>برنامج الدعم السكني (سكني):</span>
                      <HelpCircle className="w-4 h-4 text-gray-400 cursor-pointer" />
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'none', label: 'غير مدعوم' },
                        { id: 'monthly', label: 'دعم شهري' },
                        { id: 'downpayment', label: 'دعم دفعة' }
                      ].map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setSupportType(st.id as SupportType)}
                          className={`py-2 px-1 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer ${
                            supportType === st.id
                              ? 'border-[#0057B8] bg-[#0057B8]/5 text-[#0057B8]'
                              : 'border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Term Option Mode - HELD FOR MORTGAGES ONLY */}
                {mainFinanceType !== 'personal_only' && (
                  <div className="border border-[#E5E7EB] bg-white rounded-2xl p-5">
                    <label className="block text-xs font-bold text-gray-700 mb-3">المدة المستهدفة للتمويل العقاري:</label>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {[
                        { id: 'max', label: 'المدة الأقصى' },
                        { id: 'until_retirement', label: 'حتى التقاعد' },
                        { id: 'manual', label: 'اختيار يدوي' }
                      ].map((tm) => (
                        <button
                          key={tm.id}
                          type="button"
                          onClick={() => setTermMode(tm.id as TermMode)}
                          className={`py-2 px-1 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer ${
                            termMode === tm.id
                              ? 'border-[#0057B8] bg-[#0057B8]/5 text-[#0057B8]'
                              : 'border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300'
                          }`}
                        >
                          {tm.label}
                        </button>
                      ))}
                    </div>

                    {termMode === 'manual' && (
                      <div className="mt-3 space-y-2 animate-fade-in">
                        <label className="block text-[10px] font-bold text-gray-400">عدد سنوات التمويل المستهدفة (بحد أقصى 30 سنة):</label>
                        <div className="relative">
                          <NumericInput
                            id="manual-term-years-input"
                            min={1}
                            max={30}
                            allowDecimals={false}
                            placeholder="مثال: 30"
                            value={manualTermYears}
                            onChange={setManualTermYears}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                          />
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">سنة</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Selected Bank Filter */}
                <div className="border border-gray-200 bg-white rounded-2xl p-5">
                  <label className="block text-xs font-bold text-gray-700 mb-2">جهة التمويل المفضلة:</label>
                  <select
                    id="bank-filter-select"
                    value={selectedBankId}
                    onChange={(e) => setSelectedBankId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                  >
                    <option value="all">جميع جهات التمويل النشطة المتاحة (مقارنة العروض)</option>
                    {banks.filter(b => b.isActive).map(bank => (
                      <option key={bank.id} value={bank.id}>{bank.nameAr}</option>
                    ))}
                  </select>
                </div>

                {/* Obligations obligations */}
                {productId !== 'real_estate' && (
                  <div className="border border-gray-200 bg-white rounded-2xl p-5">
                    {mainFinanceType === 'real_estate_with_existing_personal' ? (
                      <div className="space-y-4 animate-fade-in">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">إجمالي الالتزامات الشهرية القائمة:</label>
                          <p className="text-[10px] text-gray-400 mb-2">يشمل قسط التمويل الشخصي القائم وأي أقساط أو التزامات شهرية أخرى.</p>
                          <div className="relative">
                            <NumericInput
                              id="existing-monthly-obligations-input"
                              min={0}
                              allowDecimals={true}
                              value={existingMonthlyObligations}
                              onChange={setExistingMonthlyObligations}
                              placeholder="مثال: 1200"
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                            />
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">ريال سعودي</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">المدة المتبقية للالتزام:</label>
                          <p className="text-[10px] text-gray-400 mb-2">كم شهراً تبقى على انتهاء هذا الالتزام؟</p>
                          <div className="relative">
                            <NumericInput
                              id="obligation-remaining-months-input"
                              min={0}
                              allowDecimals={false}
                              value={obligationRemainingMonths}
                              onChange={setObligationRemainingMonths}
                              placeholder="مثال: 36"
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                            />
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">شهر</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="animate-fade-in">
                        <label className="block text-xs font-bold text-gray-700 mb-2">
                          إجمالي الالتزامات الشهرية القائمة حالياً:
                        </label>
                        <div className="relative">
                          <NumericInput
                            id="obligations-input"
                            min={0}
                            allowDecimals={true}
                            value={existingMonthlyObligations}
                            onChange={setExistingMonthlyObligations}
                            placeholder="مثال: 1500"
                            className="w-full bg-gray-50 border border-[#E5E7EB] rounded-2xl px-4 py-3.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
                          />
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">ريال شهرياً</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          )}

          {/* Stepper Buttons */}
          {currentStep < flow.length && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-8 border-t border-gray-100 mt-8">
              <button
                id="prev-step-btn"
                type="button"
                onClick={handleBack}
                disabled={currentStep === 1}
                className="w-full sm:w-auto min-h-[44px] justify-center px-6 py-3 rounded-xl border border-gray-200 text-gray-500 font-semibold text-xs leading-none hover:bg-gray-50 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5 transition-all"
              >
                <ChevronRight className="w-3.5 h-3.5" />
                <span>رجوع</span>
              </button>

              {currentStep < flow.length - 1 ? (
                <button
                  id="next-step-btn"
                  type="button"
                  onClick={handleNext}
                  className="w-full sm:w-auto min-h-[44px] justify-center px-6 py-3 rounded-xl bg-[#0057B8] text-white font-semibold text-xs leading-none hover:bg-[#004494] cursor-pointer flex items-center gap-1.5 transition-all shadow-md shadow-blue-100"
                >
                  <span>التالي</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  id="calc-submit-btn"
                  type="button"
                  onClick={triggerCalculations}
                  className="w-full sm:w-auto min-h-[44px] justify-center px-8 py-3.5 rounded-xl bg-[#0057B8] text-white font-bold text-sm leading-none hover:bg-[#004494] transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-blue-200"
                >
                  <Calculator className="w-4 h-4" />
                  <span>احسب النتائج ومقارنة العروض</span>
                </button>
              )}
            </div>
          )}

          {/* RESULTS DISPLAY PAGE */}
          {currentStep === flow.length && results && (
            <ResultsGrid
              results={results}
              productId={productId}
              onRestart={restartWizard}
              existingMonthlyObligations={existingMonthlyObligations}
              obligationRemainingMonths={obligationRemainingMonths}
              mainFinanceType={mainFinanceType}
              sectorId={effectiveSectorId || sectorId}
            />
          )}

        </div>
      </div>
    </div>
  );
}
