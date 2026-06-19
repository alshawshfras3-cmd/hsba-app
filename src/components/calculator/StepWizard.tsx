import React, { useState, useEffect } from 'react';
import { useAppState } from '../../context/AppContext';
import { useLocation } from '../../hooks/useLocation';
import { calculateBanksFinancing } from '../../lib/finance-engine';
import { calculatePensionSalary } from '../../lib/finance-engine/pension';
import { convertHijriToGregorian } from '../../lib/date-utils';
import { SectorId, ProductId, SupportType, TermMode, BankCalculationResult } from '../../types';
import { 
  Home, User, Coins, Briefcase, Calendar, Scale,
  ChevronLeft, ChevronRight, HelpCircle, AlertCircle, Info, Calculator, Trash2
} from 'lucide-react';
import ResultsGrid from '../results/ResultsGrid';
import NumericInput from './NumericInput';
import { 
  fetchApprovedSalaryRules, 
  fetchPensionCalculationRules, 
  fetchSectorClassificationMappings
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

const getSectorRetirementAge = (sectorId: string, defaultValue = 60, customSectors?: any[]): number => {
  if (customSectors && Array.isArray(customSectors)) {
    let idToLookup = sectorId;
    if (sectorId === 'gov_civil') idToLookup = 'gov_civil';
    const matched = customSectors.find((s: any) => s.id === sectorId || s.id === idToLookup);
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
        if (sectorId === 'gov_civil') idToLookup = 'gov_civil';
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

const getDraftValue = <T,>(key: string, defaultValue: T): T => {
  try {
    const raw = sessionStorage.getItem('hesba_calculator_draft');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed[key] !== undefined) {
        return parsed[key];
      }
    }
  } catch (e) {
    console.error("Error loading draft key:", key, e);
  }
  return defaultValue;
};

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
    setResults,
    bankSectorRules,
    customSectors,
    approvedSalaryRules: contextApprovedSalaryRules,
    pensionDbRules: contextPensionDbRules,
    sectorMappings: contextSectorMappings
  } = useAppState();

  const { navigate } = useLocation();

  const bankOrder = ['alahli', 'rajhi', 'alinma', 'fransi', 'bidaya', 'albilad', 'alarabi'];
  const sortedActiveBanks = [...banks.filter(b => b.isActive)].sort((a, b) => {
    const indexA = bankOrder.indexOf(a.id);
    const indexB = bankOrder.indexOf(b.id);
    const priorityA = indexA === -1 ? 999 : indexA;
    const priorityB = indexB === -1 ? 999 : indexB;
    return priorityA - priorityB;
  });

  // --- Step Form Values State ---
  const [mainFinanceType, setMainFinanceType] = useState<'real_estate' | 'personal_only' | 'real_estate_with_existing_personal' | ''>(() => getDraftValue('mainFinanceType', ''));
  const [realEstateSubType, setRealEstateSubType] = useState<'real_estate_only' | 'real_estate_with_new_personal' | ''>(() => getDraftValue('realEstateSubType', 'real_estate_only'));
  const [customerStatus, setCustomerStatus] = useState<'active_employee' | 'retired' | ''>(() => getDraftValue('customerStatus', 'active_employee'));

  const [productId, setProductId] = useState<ProductId | ''>(() => getDraftValue('productId', ''));
  const [sectorId, setSectorId] = useState<SectorId | ''>(() => getDraftValue('sectorId', ''));
  const [militaryType, setMilitaryType] = useState<'officer' | 'individual' | ''>(() => getDraftValue('militaryType', ''));
  const [rankId, setRankId] = useState<string>(() => getDraftValue('rankId', ''));

  // New prompt requirements states
  const [sector, setSector] = useState<string>(() => getDraftValue('sector', ''));
  const [salaryBankId, setSalaryBankId] = useState<string>(() => getDraftValue('salaryBankId', ''));
  const [militarySubtype, setMilitarySubtype] = useState<'officer' | 'enlisted' | ''>(() => getDraftValue('militarySubtype', ''));
  const [militaryRank, setMilitaryRank] = useState<string>(() => getDraftValue('militaryRank', ''));
  const [retirementAge, setRetirementAge] = useState<number | ''>(() => getDraftValue<number | ''>('retirementAge', ''));
  const [ahliGroup, setAhliGroup] = useState<'A' | 'B' | ''>(() => getDraftValue('ahliGroup', ''));

  const effectiveSectorId = (sectorId as string) === 'gov_civil'
    ? 'gov_civil' as SectorId
    : ((sectorId as string) === 'military'
        ? 'military' as SectorId
        : sectorId);

  // Dates
  const [birthYear, setBirthYear] = useState<number | ''>(() => getDraftValue<number | ''>('birthYear', ''));
  const [birthMonth, setBirthMonth] = useState<number | ''>(() => getDraftValue<number | ''>('birthMonth', ''));
  const [birthDay, setBirthDay] = useState<number | ''>(() => getDraftValue<number | ''>('birthDay', ''));
  const [birthCalendar, setBirthCalendar] = useState<'gregorian' | 'hijri'>(() => getDraftValue<'gregorian' | 'hijri'>('birthCalendar', 'gregorian'));

  const [appointmentYear, setAppointmentYear] = useState<number | ''>(() => getDraftValue<number | ''>('appointmentYear', ''));
  const [appointmentMonth, setAppointmentMonth] = useState<number | ''>(() => getDraftValue<number | ''>('appointmentMonth', ''));
  const [appointmentDay, setAppointmentDay] = useState<number | ''>(() => getDraftValue<number | ''>('appointmentDay', ''));
  const [appointmentCalendar, setAppointmentCalendar] = useState<'gregorian' | 'hijri'>(() => getDraftValue<'gregorian' | 'hijri'>('appointmentCalendar', 'gregorian'));

  // Salary
  const [salaryMode, setSalaryMode] = useState<'direct' | 'details'>(() => getDraftValue<'direct' | 'details'>('salaryMode', 'details'));
  const [directNetSalary, setDirectNetSalary] = useState<number | ''>(() => getDraftValue<number | ''>('directNetSalary', ''));
  const [directPensionSalary, setDirectPensionSalary] = useState<number | ''>(() => getDraftValue<number | ''>('directPensionSalary', ''));
  const [basicSalary, setBasicSalary] = useState<number | ''>(() => getDraftValue<number | ''>('basicSalary', ''));
  const [housingAllowance, setHousingAllowance] = useState<number | ''>(() => getDraftValue<number | ''>('housingAllowance', ''));
  const [otherAllowances, setOtherAllowances] = useState<number | ''>(() => getDraftValue<number | ''>('otherAllowances', ''));

  // Finance details
  const [supportType, setSupportType] = useState<SupportType | ''>(() => getDraftValue<SupportType | ''>('supportType', ''));
  const [selectedBankId, setSelectedBankId] = useState<string>(() => {
    const val = getDraftValue<string>('selectedBankId', 'all');
    return val || 'all';
  });
  const [termMode, setTermMode] = useState<TermMode>(() => getDraftValue<TermMode>('termMode', 'max'));
  const [manualTermYears, setManualTermYears] = useState<number | ''>(() => getDraftValue<number | ''>('manualTermYears', ''));

  const [isEtizazEligible, setIsEtizazEligible] = useState<'yes' | 'no'>(() => getDraftValue<'yes' | 'no'>('isEtizazEligible', 'no'));

  const [existingMonthlyObligations, setExistingMonthlyObligations] = useState<number | ''>(() => getDraftValue<number | ''>('existingMonthlyObligations', ''));
  const [obligationRemainingMonths, setObligationRemainingMonths] = useState<number | ''>(() => getDraftValue<number | ''>('obligationRemainingMonths', ''));

  // Personal finance manual custom selection states
  const [personalTenorSelectionMode, setPersonalTenorSelectionMode] = useState<'auto' | 'custom'>(() => getDraftValue<'auto' | 'custom'>('personalTenorSelectionMode', 'auto'));
  const [requestedPersonalTenorMonths, setRequestedPersonalTenorMonths] = useState<number | ''>(() => getDraftValue<number | ''>('requestedPersonalTenorMonths', ''));

  // Validation errors
  const [errors, setErrors] = useState<string[]>([]);

  // Compute live local calculated Net salary to aid real-time UI display
  const [localCalculatedNet, setLocalCalculatedNet] = useState(0);

  // Desktop landscape/laptop breakpoint state (>= 1024px)
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Synchronize currentStep when isDesktop flips
    setCurrentStep((prev) => {
      if (isDesktop) {
        // transitioning to desktop
        if (prev === 2 || prev === 3) return 2; // both personal_info and salary map to combined step 2
        if (prev === 4) return 3; // finance_options maps to 3
      } else {
        // transitioning to mobile
        if (prev === 2) return 2; // combined step 2 maps to personal_info
        if (prev === 3) {
          if (mainFinanceType === 'personal_only') {
            return 3; // salary is index 3
          } else {
            return 4; // finance_options is index 4
          }
        }
      }
      return prev;
    });
  }, [isDesktop]);

  // Load draft values into AppContext's currentStep or results if they exist on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('hesba_calculator_draft');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed) {
          if (parsed.currentStep !== undefined) {
            setCurrentStep(parsed.currentStep);
          }
          if (parsed.results !== undefined && parsed.results !== null) {
            setResults(parsed.results);
          }
        }
      }
    } catch (e) {
      console.error("Error setting initial step from draft:", e);
    }
  }, []);

  // Save Draft to sessionStorage on state changes
  useEffect(() => {
    const draft = {
      mainFinanceType,
      realEstateSubType,
      customerStatus,
      productId,
      sectorId,
      militaryType,
      rankId,
      sector,
      salaryBankId,
      militarySubtype,
      militaryRank,
      retirementAge,
      ahliGroup,
      birthYear,
      birthMonth,
      birthDay,
      birthCalendar,
      appointmentYear,
      appointmentMonth,
      appointmentDay,
      appointmentCalendar,
      salaryMode,
      directNetSalary,
      directPensionSalary,
      basicSalary,
      housingAllowance,
      otherAllowances,
      supportType,
      selectedBankId,
      termMode,
      manualTermYears,
      isEtizazEligible,
      existingMonthlyObligations,
      obligationRemainingMonths,
      personalTenorSelectionMode,
      requestedPersonalTenorMonths,
      currentStep,
      results
    };
    try {
      sessionStorage.setItem('hesba_calculator_draft', JSON.stringify(draft));
    } catch (e) {
      console.error("Error writing draft to sessionStorage:", e);
    }
  }, [
    mainFinanceType,
    realEstateSubType,
    customerStatus,
    productId,
    sectorId,
    militaryType,
    rankId,
    sector,
    salaryBankId,
    militarySubtype,
    militaryRank,
    retirementAge,
    ahliGroup,
    birthYear,
    birthMonth,
    birthDay,
    birthCalendar,
    appointmentYear,
    appointmentMonth,
    appointmentDay,
    appointmentCalendar,
    salaryMode,
    directNetSalary,
    directPensionSalary,
    basicSalary,
    housingAllowance,
    otherAllowances,
    supportType,
    selectedBankId,
    termMode,
    manualTermYears,
    isEtizazEligible,
    existingMonthlyObligations,
    obligationRemainingMonths,
    personalTenorSelectionMode,
    requestedPersonalTenorMonths,
    currentStep,
    results
  ]);

  const clearAndResetCalculator = () => {
    // 1. Clear state
    setMainFinanceType('');
    setRealEstateSubType('real_estate_only');
    setCustomerStatus('active_employee');
    setProductId('');
    setSectorId('');
    setMilitaryType('');
    setRankId('');
    setSector('');
    setMilitarySubtype('');
    setMilitaryRank('');
    setRetirementAge(60);
    setAhliGroup('');
    
    setBirthYear(0);
    setBirthMonth(0);
    setBirthDay(1);
    setBirthCalendar('gregorian');
    
    setAppointmentYear(0);
    setAppointmentMonth(0);
    setAppointmentDay(1);
    setAppointmentCalendar('gregorian');
    
    setSalaryMode('details');
    setDirectNetSalary(0);
    setDirectPensionSalary(0);
    setBasicSalary(0);
    setHousingAllowance(0);
    setOtherAllowances(0);
    
    setSupportType('');
    setSelectedBankId('');
    setSalaryBankId('');
    setTermMode('max');
    setManualTermYears(25);
    setIsEtizazEligible('no');
    
    setExistingMonthlyObligations(0);
    setObligationRemainingMonths(0);
    setPersonalTenorSelectionMode('auto');
    setRequestedPersonalTenorMonths('');
    
    setErrors([]);
    setResults(null);
    setCurrentStep(1);
    
    // 2. Clear draft
    try {
      sessionStorage.removeItem('hesba_calculator_draft');
      localStorage.removeItem('hesba_calculator_draft');
    } catch (e) {
      console.error("Error removing draft:", e);
    }
  };

  // Dynamic step structure definition
  type StepId = 
    | 'main_type'
    | 'personal_info'
    | 'salary'
    | 'personal_info_and_salary'
    | 'finance_options';

  const flow: StepId[] = isDesktop
    ? (mainFinanceType === 'personal_only'
        ? ['main_type', 'personal_info_and_salary']
        : ['main_type', 'personal_info_and_salary', 'finance_options'])
    : (mainFinanceType === 'personal_only'
        ? ['main_type', 'personal_info', 'salary']
        : ['main_type', 'personal_info', 'salary', 'finance_options']);

  const activeStepId = flow[currentStep - 1] || 'main_type';

  // Synchronize state with mobile header central text
  React.useEffect(() => {
    if (setActiveStepLabel) {
      if (results) {
        setActiveStepLabel('النتائج والتقرير');
      } else {
        const stepId = flow[currentStep - 1] || 'main_type';
        let stepLabel = '';
        if (stepId === 'main_type') stepLabel = 'نوع الحسبة';
        else if (stepId === 'personal_info') stepLabel = 'بيانات العميل';
        else if (stepId === 'salary') stepLabel = 'الراتب والدخل';
        else if (stepId === 'personal_info_and_salary') stepLabel = 'بيانات العميل والدخل';
        else if (stepId === 'finance_options') stepLabel = 'خيارات الحسبة';
        else stepLabel = 'الحاسبة الذكية';
        setActiveStepLabel(stepLabel);
      }
    }
  }, [currentStep, flow, setActiveStepLabel, results]);

  // Pension DB Rules States
  const approvedSalaryDbRules = contextApprovedSalaryRules || [];
  const pensionDbRules = contextPensionDbRules || [];
  const sectorMappings = contextSectorMappings || [];

  // Dynamic Pension Calculation
  const pensionCalcObj = calculatePensionSalary({
    sectorId: effectiveSectorId || 'gov_civil',
    basicSalary: effectiveSectorId === 'retired' ? 0 : (salaryMode === 'details' ? (Number(basicSalary) || 0) : (Number(directNetSalary) || 0)),
    birthYear: Number(birthYear) || 1990,
    birthMonth: Number(birthMonth) || 1,
    birthDay: 1,
    birthCalendar,
    appointmentYear: (effectiveSectorId === 'retired' || !appointmentYear) ? undefined : Number(appointmentYear),
    appointmentMonth: (effectiveSectorId === 'retired' || !appointmentMonth) ? undefined : Number(appointmentMonth),
    appointmentDay: 1,
    appointmentCalendar: effectiveSectorId === 'retired' ? undefined : appointmentCalendar,
    directPensionSalary: effectiveSectorId === 'retired' ? (Number(directPensionSalary) || 0) : undefined
  });

  // حساب تقدير الراتب التقاعدي الحقيقي المتوافق مع البنك والقطاع والخرائط والقوانين
  const targetBankIdForPensionEstimate = selectedBankId && selectedBankId !== 'all' ? selectedBankId : 'rajhi';
  const liveApprovedSalaryRule = getApprovedSalaryRule(targetBankIdForPensionEstimate, effectiveSectorId || 'gov_civil', approvedSalaryDbRules);
  const liveApprovedSalary = effectiveSectorId === 'retired'
    ? (Number(directPensionSalary) || 0)
    : (salaryMode === 'details'
        ? getApprovedSalary({
            basicSalary: Number(basicSalary) || 0,
            housingAllowance: Number(housingAllowance) || 0,
            otherAllowances: Number(otherAllowances) || 0,
            rule: liveApprovedSalaryRule
          })
        : (Number(directNetSalary) || 0)
      );

  const liveRetirementAgeRule = pensionRules.find(r => r.sectorId === (effectiveSectorId || 'gov_civil')) || pensionRules.find(r => r.sectorId === (sectorId || 'gov_civil'));
  const isMilitary = effectiveSectorId === 'military' || sector === 'military' || (sectorId as string) === 'military';
  const liveRetirementAge = isMilitary
    ? (militaryRanks.find(r => r.id === rankId)?.retirementAge || Number(retirementAge) || 44)
    : (liveRetirementAgeRule?.retirementAge || 60);

  const liveYearsToRetirement = Math.max(0, liveRetirementAge - (pensionCalcObj.currentAgeMonths / 12));
  const livePensionRule = getPensionRule(targetBankIdForPensionEstimate, effectiveSectorId || 'gov_civil', pensionDbRules, sectorMappings);

  const liveCalculatedPensionObj = effectiveSectorId === 'retired'
    ? { pension: Number(directPensionSalary) || 0 }
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
      setExistingMonthlyObligations(0);
      setObligationRemainingMonths(0);
    } else if (mainFinanceType === 'real_estate_with_existing_personal') {
      setProductId('real_estate_with_existing_personal');
    } else {
      setExistingMonthlyObligations(0);
      setObligationRemainingMonths(0);
      if (realEstateSubType === 'real_estate_only') {
        setProductId('real_estate_only');
      } else if (realEstateSubType === 'real_estate_with_new_personal') {
        setProductId('real_estate_with_new_personal');
      }
    }
  }, [mainFinanceType, realEstateSubType]);

  useEffect(() => {
    if (effectiveSectorId === 'retired') {
      setLocalCalculatedNet(Number(directPensionSalary || 0));
      return;
    }

    if (salaryMode === 'direct') {
      setLocalCalculatedNet(Number(directNetSalary || 0));
    } else {
      if (effectiveSectorId === 'military') {
        const numBasic = Number(basicSalary || 0);
        const numTrans = Number(housingAllowance || 0);
        const numOther = Number(otherAllowances || 0);
        const pensionDeduction = numBasic * 0.09;
        const gross = numBasic + numTrans + numOther;
        const netSalary = gross - pensionDeduction;
        setLocalCalculatedNet(netSalary < 0 ? 0 : Number(netSalary.toFixed(2)));
      } else {
        const rule = salaryRules.find(r => r.sectorId === effectiveSectorId && r.isActive) || {
          deductionPercentage: 9.0,
          deductionBase: 'basic_housing' as const
        };
        const numBasic = Number(basicSalary || 0);
        const numHousing = Number(housingAllowance || 0);
        const numOther = Number(otherAllowances || 0);
        const gross = numBasic + numHousing + numOther;
        let dBase = numBasic + numHousing;
        if (rule.deductionBase === 'basic_only') dBase = numBasic;
        else if (rule.deductionBase === 'total') dBase = gross;

        const deduction = (dBase * rule.deductionPercentage) / 100;
        setLocalCalculatedNet(Math.round(gross - deduction));
      }
    }
  }, [salaryMode, directNetSalary, basicSalary, housingAllowance, otherAllowances, effectiveSectorId, salaryRules, directPensionSalary]);

  useEffect(() => {
    if (effectiveSectorId === 'military' && salaryMode !== 'details') {
      setSalaryMode('details');
    }
  }, [effectiveSectorId, salaryMode]);

  const getSelectedBankPersonalMaxTenor = () => {
    let absoluteMax = 60;
    if (selectedBankId && selectedBankId !== 'all') {
      const matchingRules = (personalRules || []).filter(r => r.bankId === selectedBankId && r.isActive);
      if (matchingRules.length > 0) {
        const terms = matchingRules.map(r => r.termMonths || 60);
        absoluteMax = Math.max(...terms);
      }
    }
    return absoluteMax;
  };

  useEffect(() => {
    if (mainFinanceType === 'personal_only' && personalTenorSelectionMode === 'custom' && requestedPersonalTenorMonths !== '') {
      const maxTenor = getSelectedBankPersonalMaxTenor();
      if (Number(requestedPersonalTenorMonths) > maxTenor) {
        setRequestedPersonalTenorMonths(maxTenor);
      }
    }
  }, [selectedBankId, personalTenorSelectionMode, personalRules]);

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
    const stepId = flow[stepNumber - 1];

    if (stepId === 'main_type') {
      if (!mainFinanceType) {
        stepErrors.push('يرجى تحديد نوع الحسبة المطلوبة للمتابعة.');
      }
    }

    if (stepId === 'personal_info' || stepId === 'personal_info_and_salary') {
      if (!sectorId) {
        stepErrors.push('يرجى اختيار القطاع المهني لجهة العمل.');
      } else if (sectorId === 'military' && !militaryType) {
        stepErrors.push('حدد نوع العسكري لأن بعض البنوك تختلف بين الضباط والأفراد.');
      }

      if (sectorId && sectorId !== 'retired' && !salaryBankId) {
        stepErrors.push('يرجى تحديد البنك المحول عليه راتبك للمتابعة.');
      }

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

      if (mainFinanceType !== 'personal_only' && effectiveSectorId !== 'retired') {
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

    if (stepId === 'salary' || stepId === 'personal_info_and_salary') {
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

      if (mainFinanceType === 'personal_only') {
        if (!selectedBankId) {
          stepErrors.push('يرجى اختيار جهة التمويل المفضلة أو مقارنة جميع الجهات.');
        }
        if (personalTenorSelectionMode === 'custom') {
          if (!requestedPersonalTenorMonths || Number(requestedPersonalTenorMonths) < 1) {
            stepErrors.push('يرجى إدخال عدد أشهر التمويل الشخصي المطلوبة (صحيح أكبر من الصفر).');
          } else {
            const requestedVal = Number(requestedPersonalTenorMonths);
            const absoluteMax = getSelectedBankPersonalMaxTenor();
            if (requestedVal > absoluteMax) {
              stepErrors.push(`المدة المطلوبة للتمويل الشخصي (${requestedVal} شهرًا) تتجاوز الحد الأقصى المسموح به للجهة المختارة البالغ ${absoluteMax} شهرًا.`);
            }
          }
        }
      }
    }

    if (stepId === 'finance_options') {
      if (!selectedBankId) {
        stepErrors.push('يرجى اختيار جهة التمويل المفضلة أو مقارنة جميع الجهات.');
      }
      if (mainFinanceType !== 'personal_only') {
        if (!productId) {
          stepErrors.push('يرجى تحديد نوع منتج التمويل العقاري المطلوب.');
        }
        if (!supportType) {
          stepErrors.push('يرجى تحديد نوع الدعم السكني المطلوب (مستحق أو غير مدعوم).');
        }
      }
      if (termMode === 'manual') {
        if (!manualTermYears || manualTermYears < 1 || manualTermYears > 30) {
          stepErrors.push('يرجى إدخال مدة تمويل مستهدفة صحيحة بين 1 و 30 سنة.');
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
      etizazAmount: (((supportSettings.etizaz?.eligibleSectors || ['military']).includes(effectiveSectorId)) && isEtizazEligible === 'yes' && supportSettings.etizaz?.enabled !== false) ? (supportSettings.etizaz?.amount ?? 160000) : 0,
      productId,
      birthYear: Number(birthYear) || 1990,
      birthMonth: Number(birthMonth) || 1,
      birthDay: Number(birthDay) || 1,
      birthCalendar,
      appointmentYear: (effectiveSectorId === 'retired' || !appointmentYear) ? undefined : Number(appointmentYear),
      appointmentMonth: (effectiveSectorId === 'retired' || !appointmentMonth) ? undefined : Number(appointmentMonth),
      appointmentDay: (effectiveSectorId === 'retired' || !appointmentDay) ? undefined : Number(appointmentDay),
      appointmentCalendar: effectiveSectorId === 'retired' ? undefined : appointmentCalendar,
      rankId: (effectiveSectorId === 'military' || sectorId === 'military') ? rankId : undefined,
      salaryMode,
      basicSalary: Number(basicSalary) || 0,
      housingAllowance: Number(housingAllowance) || 0,
      otherAllowances: Number(otherAllowances) || 0,
      directNetSalary: Number(directNetSalary) || 0,
      directPensionSalary: Number(directPensionSalary) || 0,
      obligations: Number(existingMonthlyObligations) || 0,
      existingMonthlyObligations: Number(existingMonthlyObligations) || 0,
      obligationRemainingMonths: Number(obligationRemainingMonths) || 0,
      supportType,
      selectedBankId,
      salaryBankId,
      termMode,
      manualTermMonths: (termMode === 'manual' && manualTermYears) ? (Number(manualTermYears) * 12) : undefined,
      personalTenorSelectionMode: mainFinanceType === 'personal_only' ? personalTenorSelectionMode : 'auto',
      requestedPersonalTenorMonths: (mainFinanceType === 'personal_only' && personalTenorSelectionMode === 'custom' && requestedPersonalTenorMonths) ? Number(requestedPersonalTenorMonths) : undefined,

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
      bankSectorRules,
      customSectors
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

  const renderPersonalInfoFields = () => {
    return (
      <div className="space-y-6">
        {/* 1. Sector Picker */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">ما هو القطاع المهني لجهة العمل؟</label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
                    setRetirementAge(getSectorRetirementAge('retired', 60, customSectors));
                    setAhliGroup('');
                    setMilitarySubtype('');
                    setMilitaryRank('');
                    setMilitaryType('');
                  } else if (sec.id === 'gov_civil') {
                    setRetirementAge(getSectorRetirementAge('gov_civil', 60, customSectors));
                    setAhliGroup('A');
                    setMilitarySubtype('');
                    setMilitaryRank('');
                    setMilitaryType('');
                  } else if (sec.id === 'semi_gov') {
                    setRetirementAge(getSectorRetirementAge('semi_gov', 60, customSectors));
                    setAhliGroup('A');
                    setMilitarySubtype('');
                    setMilitaryRank('');
                    setMilitaryType('');
                  } else if (sec.id === 'companies') {
                    setRetirementAge(getSectorRetirementAge('companies', 60, customSectors));
                    setAhliGroup('A');
                    setMilitarySubtype('');
                    setMilitaryRank('');
                    setMilitaryType('');
                  } else if (sec.id === 'military') {
                    setSalaryMode('details');
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
                className={`flex flex-col items-center justify-center p-4 cursor-pointer transition-all border rounded-2xl text-center ${
                  sectorId === sec.id
                    ? 'border-[#0057B8] dark:border-[#0ea5a4] bg-[#0057B8]/5 dark:bg-[#0ea5a4]/5 ring-2 ring-[#0057B8]/15 dark:ring-[#0ea5a4]/15 font-bold text-[#0057B8] dark:text-[#0ea5a4]'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <sec.icon className={`w-5 h-5 mb-2 shrink-0 ${sectorId === sec.id ? 'text-[#0057B8] dark:text-[#0ea5a4]' : 'text-gray-500 dark:text-slate-500'}`} />
                <span className="text-xs">{sec.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Salary Bank Input */}
        {sectorId && sectorId !== 'retired' && (
          <div id="salary-bank-selector-wrapper" className="space-y-2 animate-fade-in">
            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">راتبك على أي بنك؟ <span className="text-rose-500">*</span></label>
            <select
              id="salary-bank-select"
              value={salaryBankId}
              onChange={(e) => setSalaryBankId(e.target.value)}
              className="w-full bg-white dark:bg-[#111827] border border-gray-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8] dark:focus:ring-[#0ea5a4] focus:border-transparent cursor-pointer"
            >
              <option value="">-- اختر البنك المحول عليه راتبك --</option>
              {sortedActiveBanks
                .filter(b => b.institutionType === 'bank' || !b.institutionType)
                .map((bank) => (
                  <option key={bank.id} id={`opt-${bank.id}`} value={bank.id}>
                    {bank.nameAr}
                  </option>
                ))}
              <option id="opt-other_bank" value="other_bank">بنك آخر</option>
            </select>
          </div>
        )}

        {/* 2. Military Selector details (only if Sector is Military) */}
        {sectorId === 'military' && (
          <div id="military-rank-selector-wrapper" className="bg-gray-50 dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-slate-800 animate-fade-in text-right space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category subclass selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">تصنيف الخدمة العسكرية:</label>
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
                        className={`py-2 px-4 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                          isSelected
                            ? 'bg-[#0057B8] dark:bg-[#0ea5a4] text-white border-[#0057B8] dark:border-[#0ea5a4] shadow-xs'
                            : 'bg-white dark:bg-[#111827] text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {sub.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Rank dropdown */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">الرتبة العسكرية للعميل:</label>
                <select
                  id="rank-select-step2"
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
                  className="w-full bg-white dark:bg-[#111827] border border-gray-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8] dark:focus:ring-[#0ea5a4] focus:border-transparent cursor-pointer"
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
            </div>

            {/* هل العميل مؤهل لدعم اعتزاز؟ */}
            {supportSettings.etizaz?.enabled !== false && (
              <div className="border-t border-gray-150 dark:border-slate-800 pt-4 space-y-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">هل العميل مؤهل لدعم اعتزاز؟</label>
                <div className="flex gap-3 max-w-xs">
                  {[
                    { id: 'no', label: 'لا' },
                    { id: 'yes', label: 'نعم' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      id={`etizaz-opt-${opt.id}`}
                      onClick={() => setIsEtizazEligible(opt.id as 'yes' | 'no')}
                      className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                        isEtizazEligible === opt.id
                          ? 'bg-[#0057B8] dark:bg-[#0ea5a4] text-white border-[#0057B8] dark:border-[#0ea5a4] shadow-xs'
                          : 'bg-white dark:bg-[#111827] text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-[#111827] p-3 rounded-xl border border-gray-100 dark:border-slate-800 text-xs font-bold text-gray-600 dark:text-slate-400 text-center animate-fade-in max-w-xs mx-auto">
              <span>سن التقاعد للرتبة: </span>
              <strong className="text-[#0057B8] dark:text-[#0ea5a4]">{retirementAge} سنة</strong>
            </div>
          </div>
        )}

        {/* Standalone Etizaz Selector for non-military eligible sectors */}
        {sectorId !== 'military' && sectorId && (supportSettings.etizaz?.eligibleSectors || ['military']).includes(sectorId) && supportSettings.etizaz?.enabled !== false && (
          <div id="etizaz-non-military-selector-wrapper" className="bg-gray-50 dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-slate-800 animate-fade-in text-right space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">هل العميل مؤهل لدعم اعتزاز؟</label>
              <div className="flex gap-3 max-w-xs">
                {[
                  { id: 'no', label: 'لا' },
                  { id: 'yes', label: 'نعم' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    id={`etizaz-opt-non-military-${opt.id}`}
                    onClick={() => setIsEtizazEligible(opt.id as 'yes' | 'no')}
                    className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                      isEtizazEligible === opt.id
                        ? 'bg-[#0057B8] dark:bg-[#0ea5a4] text-white border-[#0057B8] dark:border-[#0ea5a4] shadow-xs'
                        : 'bg-white dark:bg-[#111827] text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. Dates Selector Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* DOB Card */}
          <div className="border border-gray-200 dark:border-slate-800 rounded-2xl p-6 bg-white dark:bg-[#111827] space-y-4 font-sans">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-3">
              <span className="text-xs font-bold text-[#111827] dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#0057B8] dark:text-[#0ea5a4]" />
                <span>تاريخ الميلاد:</span>
              </span>
              <div className="flex bg-gray-100 dark:bg-slate-800 p-0.5 rounded-lg border border-gray-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setBirthCalendar('gregorian')}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${birthCalendar === 'gregorian' ? 'bg-white dark:bg-[#111827] text-[#0057B8] dark:text-[#0ea5a4] shadow-xs' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'}`}
                >
                  ميلادي
                </button>
                <button
                  type="button"
                  onClick={() => setBirthCalendar('hijri')}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${birthCalendar === 'hijri' ? 'bg-white dark:bg-[#111827] text-[#0057B8] dark:text-[#0ea5a4] shadow-xs' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'}`}
                >
                  هجري
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">الشهر (1 - 12)</label>
                <NumericInput
                  id="birth-month-input-fields"
                  min={1}
                  max={12}
                  allowDecimals={false}
                  placeholder="05"
                  value={birthMonth}
                  onChange={setBirthMonth}
                  className="w-full bg-gray-50 dark:bg-[#0F172A] border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8] dark:text-white dark:focus:ring-[#0ea5a4]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">السنة</label>
                <NumericInput
                  id="birth-year-input-fields"
                  min={birthCalendar === 'gregorian' ? 1940 : 1360}
                  max={birthCalendar === 'gregorian' ? 2008 : 1429}
                  allowDecimals={false}
                  placeholder={birthCalendar === 'gregorian' ? '1990' : '1410'}
                  value={birthYear}
                  onChange={setBirthYear}
                  className="w-full bg-gray-50 dark:bg-[#0F172A] border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8] dark:text-white dark:focus:ring-[#0ea5a4]"
                />
              </div>
            </div>
          </div>

          {/* Appointment date Card (only for Real Estate AND not retired!) */}
          {mainFinanceType !== 'personal_only' && sectorId !== 'retired' ? (
            <div className="border border-gray-200 dark:border-slate-800 rounded-2xl p-6 bg-white dark:bg-[#111827] space-y-4 animate-fade-in shadow-xs font-sans">
              <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-3">
                <span className="text-xs font-bold text-[#111827] dark:text-slate-300 flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-emerald-600" />
                  <span>تاريخ المباشرة / التعيين:</span>
                </span>
                <div className="flex bg-gray-100 dark:bg-slate-800 p-0.5 rounded-lg border border-gray-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setAppointmentCalendar('gregorian')}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${appointmentCalendar === 'gregorian' ? 'bg-white dark:bg-[#111827] text-[#0057B8] dark:text-[#0ea5a4] shadow-xs' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'}`}
                  >
                    ميلادي
                  </button>
                  <button
                    type="button"
                    onClick={() => setAppointmentCalendar('hijri')}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${appointmentCalendar === 'hijri' ? 'bg-white dark:bg-[#111827] text-[#0057B8] dark:text-[#0ea5a4] shadow-xs' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'}`}
                  >
                    هجري
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">الشهر (1 - 12)</label>
                  <NumericInput
                    id="appointment-month-input-fields"
                    min={1}
                    max={12}
                    allowDecimals={false}
                    placeholder="09"
                    value={appointmentMonth}
                    onChange={setAppointmentMonth}
                    className="w-full bg-gray-50 dark:bg-[#0F172A] border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8] dark:text-white dark:focus:ring-[#0ea5a4]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">السنة</label>
                  <NumericInput
                    id="appointment-year-input-fields"
                    min={appointmentCalendar === 'gregorian' ? 1970 : 1390}
                    max={appointmentCalendar === 'gregorian' ? 2026 : 1447}
                    allowDecimals={false}
                    placeholder={appointmentCalendar === 'gregorian' ? '2015' : '1436'}
                    value={appointmentYear}
                    onChange={setAppointmentYear}
                    className="w-full bg-gray-50 dark:bg-[#0F172A] border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8] dark:text-white dark:focus:ring-[#0ea5a4]"
                  />
                </div>
              </div>
            </div>
          ) : mainFinanceType !== 'personal_only' && sectorId === 'retired' ? (
            <div className="bg-amber-50 dark:bg-amber-950/20 rounded-2xl p-6 border border-amber-200 dark:border-amber-900/30 flex flex-col justify-center animate-fade-in shadow-xs">
              <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed font-sans font-medium">
                بما أن القطاع المهني المختار هو <strong>"متقاعد حالي"</strong>، فلن نطلب تاريخ مباشرة العمل ويتم الاعتماد القياسي المطلق على السن لدورة الحياة التمويلية.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  const renderSalaryFields = () => {
    return (
      <div className="space-y-6">
        {/* Sub tabs: manual net vs detailed (only if sector is NOT retired and NOT military) */}
        {sectorId !== 'retired' && effectiveSectorId !== 'military' && (
          <div className="flex bg-gray-100 dark:bg-slate-800 p-1.5 rounded-xl border border-gray-200 dark:border-slate-750 gap-1 font-semibold font-sans">
            <button
              type="button"
              id="salary-details-tab-field"
              onClick={() => setSalaryMode('details')}
              className={`flex-1 text-center py-2.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                salaryMode === 'details'
                  ? 'bg-white dark:bg-[#111827] text-[#0057B8] dark:text-[#0ea5a4] shadow-xs'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800'
              }`}
            >
              <span>إدخال تفاصيل الراتب (الأساسي والبدلات)</span>
              <span className="text-[10px] font-normal text-[#0057B8]/80 dark:text-[#0ea5a4]/80 block sm:inline-block sm:mr-1 mt-0.5 sm:mt-0 font-sans">(الخيار الموصى به والمساعد للحاسبة)</span>
            </button>
            <button
              type="button"
              id="salary-direct-tab-field"
              onClick={() => setSalaryMode('direct')}
              className={`flex-1 text-center py-2.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                salaryMode === 'direct'
                  ? 'bg-white dark:bg-[#111827] text-[#0057B8] dark:text-[#0ea5a4] shadow-xs'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800'
              }`}
            >
              أدخل الراتب الصافي مباشرة
            </button>
          </div>
        )}

        {/* Form elements */}
        {effectiveSectorId === 'military' ? (
          <div className="space-y-6 animate-fade-in text-right">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 font-sans">الراتب الأساسي <span className="text-rose-500">*</span>:</label>
                <div className="relative">
                  <NumericInput
                    id="basic-salary-input-fields"
                    min={0}
                    allowDecimals={true}
                    value={basicSalary}
                    onChange={setBasicSalary}
                    placeholder="مثال: 4555"
                    className="w-full bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8] dark:text-white dark:focus:ring-[#0ea5a4]"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 dark:text-slate-500">ريال</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 font-sans">بدل النقل:</label>
                <div className="relative">
                  <NumericInput
                    id="housing-salary-input-fields"
                    min={0}
                    allowDecimals={true}
                    value={housingAllowance}
                    onChange={setHousingAllowance}
                    placeholder="مثال: 500"
                    className="w-full bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8] dark:text-white dark:focus:ring-[#0ea5a4]"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 dark:text-slate-500">ريال</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 font-sans">البدلات / العلاوات الأخرى:</label>
                <div className="relative">
                  <NumericInput
                    id="other-salary-input-fields"
                    min={0}
                    allowDecimals={true}
                    value={otherAllowances}
                    onChange={setOtherAllowances}
                    placeholder="مثال: 4337.5"
                    className="w-full bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8] dark:text-white dark:focus:ring-[#0ea5a4]"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 dark:text-slate-500">ريال</span>
                </div>
              </div>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl p-4 border border-emerald-100 dark:border-emerald-900/30 flex justify-between items-center text-xs">
              <span className="text-emerald-800 dark:text-emerald-400 font-bold">صافي الراتب المحسوب تلقائيًا:</span>
              <span className="font-extrabold text-emerald-700 dark:text-emerald-300 text-sm">{(localCalculatedNet).toLocaleString('ar-SA')} ريال سعودي</span>
            </div>
          </div>
        ) : salaryMode === 'direct' || sectorId === 'retired' ? (
          <div className="space-y-6 animate-fade-in text-right font-sans">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sectorId === 'retired' ? (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 font-sans">الراتب التقاعدي الصافي المستلم شهريًا:</label>
                  <div className="relative font-sans">
                    <NumericInput
                      id="retired-salary-input-fields"
                      min={0}
                      allowDecimals={true}
                      value={directPensionSalary}
                      onChange={setDirectPensionSalary}
                      placeholder="مثال: 8000"
                      className="w-full bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8] dark:text-white dark:focus:ring-[#0ea5a4]"
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 dark:text-slate-500">ريال سعودي</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">مبلغ الراتب الصافي الكلي (المحول للبنك):</label>
                    <div className="relative">
                      <NumericInput
                        id="direct-salary-input-fields"
                        min={0}
                        allowDecimals={true}
                        value={directNetSalary}
                        onChange={setDirectNetSalary}
                        placeholder="مثال: 12500"
                        className="w-full bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8] dark:text-white dark:focus:ring-[#0ea5a4]"
                      />
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 dark:text-slate-500">ريال سعودي</span>
                    </div>
                  </div>

                  {/* If chosen Direct Net Salary AND real_estate path, ask for Basic Salary (for pension selection) */}
                  {mainFinanceType !== 'personal_only' && (
                    <div className="space-y-2 animate-fade-in">
                      <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 font-sans">الراتب الأساسي (لأغراض احتساب التقاعد فقط):</label>
                      <div className="relative">
                        <NumericInput
                          id="basic-pension-salary-input-fields"
                          min={0}
                          allowDecimals={true}
                          value={basicSalary}
                          onChange={setBasicSalary}
                          placeholder="مثال: 9000"
                          className="w-full bg-slate-50 dark:bg-[#0f172a] border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8] dark:text-white dark:focus:ring-[#0ea5a4]"
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 dark:text-slate-500">ريال سعودي</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in text-right font-sans">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">الراتب الأساسي:</label>
                <div className="relative">
                  <NumericInput
                    id="basic-salary-input-fields"
                    min={0}
                    allowDecimals={true}
                    value={basicSalary}
                    onChange={setBasicSalary}
                    placeholder="مثال: 9000"
                    className="w-full bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8] dark:text-white dark:focus:ring-[#0ea5a4]"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 dark:text-slate-500">ريال</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">بدل السكن:</label>
                <div className="relative">
                  <NumericInput
                    id="housing-salary-input-fields"
                    min={0}
                    allowDecimals={true}
                    value={housingAllowance}
                    onChange={setHousingAllowance}
                    placeholder="مثال: 2250"
                    className="w-full bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8] dark:text-white dark:focus:ring-[#0ea5a4]"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 dark:text-slate-500">ريال</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">بدلات أخرى:</label>
                <div className="relative">
                  <NumericInput
                    id="other-salary-input-fields"
                    min={0}
                    allowDecimals={true}
                    value={otherAllowances}
                    onChange={setOtherAllowances}
                    placeholder="مثال: 1500"
                    className="w-full bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8] dark:text-white dark:focus:ring-[#0ea5a4]"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 dark:text-slate-500">ريال</span>
                </div>
              </div>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl p-4 border border-emerald-100 dark:border-emerald-900/30 flex justify-between items-center text-xs">
              <span className="text-emerald-800 dark:text-emerald-400 font-bold">صافي الراتب المتوقع بعد خصم المعاشات:</span>
              <span className="font-extrabold text-emerald-700 dark:text-emerald-300 text-sm">{(localCalculatedNet).toLocaleString('ar-SA')} ريال سعودي</span>
            </div>
          </div>
        )}

        {mainFinanceType === 'personal_only' && (
          <div className="mt-8 pt-6 border-t border-dashed border-gray-200 dark:border-slate-800 space-y-6 font-sans">
            <div className="flex items-center gap-2 pb-2 text-slate-800 dark:text-slate-200">
              <Coins className="w-5 h-5 text-amber-500 dark:text-amber-400" />
              <h4 className="text-sm font-bold font-sans">خيارات الحسبة والجهات المفضلة</h4>
            </div>
            
            {/* 1. مدة التمويل الشخصي */}
            <div className="border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#151F32] rounded-2xl p-5 text-right space-y-4">
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1.5 pb-1">
                <Calendar className="w-4 h-4 text-[#0057B8] dark:text-[#0ea5a4]" />
                <span>مدة التمويل الشخصي:</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* تلقائي */}
                <button
                  type="button"
                  onClick={() => {
                    setPersonalTenorSelectionMode('auto');
                    setRequestedPersonalTenorMonths('');
                  }}
                  className={`p-4 rounded-xl border text-right transition-all cursor-pointer font-sans duration-200 flex flex-col gap-1.5 ${
                    personalTenorSelectionMode === 'auto'
                      ? 'border-[#0057B8] dark:border-[#0ea5a4] bg-[#0057B8]/5 dark:bg-[#0ea5a4]/5 text-[#0057B8] dark:text-[#0ea5a4] font-bold'
                      : 'border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-400 bg-white dark:bg-[#111827] hover:bg-slate-50 dark:hover:bg-slate-800/80'
                  }`}
                >
                  <span className="text-xs font-extrabold">تلقائي</span>
                  <span className={`text-[10px] leading-relaxed ${
                    personalTenorSelectionMode === 'auto' ? 'text-blue-700/80 dark:text-[#0ea5a4]/80' : 'text-gray-400 dark:text-slate-500'
                  }`}>
                    يحدد النظام المدة المناسبة حسب قاعدة البنك والمدة المتبقية قبل التقاعد.
                  </span>
                </button>

                {/* اختيار يدوي */}
                <button
                  type="button"
                  onClick={() => {
                    setPersonalTenorSelectionMode('custom');
                    const maxT = selectedBankId === 'all' ? 60 : getSelectedBankPersonalMaxTenor();
                    setRequestedPersonalTenorMonths(maxT);
                  }}
                  className={`p-4 rounded-xl border text-right transition-all cursor-pointer font-sans duration-200 flex flex-col gap-1.5 ${
                    personalTenorSelectionMode === 'custom'
                      ? 'border-[#0057B8] dark:border-[#0ea5a4] bg-[#0057B8]/5 dark:bg-[#0ea5a4]/5 text-[#0057B8] dark:text-[#0ea5a4] font-bold'
                      : 'border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-400 bg-white dark:bg-[#111827] hover:bg-slate-50 dark:hover:bg-slate-800/80'
                  }`}
                >
                  <span className="text-xs font-extrabold font-sans">اختيار يدوي</span>
                  <span className={`text-[10px] leading-relaxed ${
                    personalTenorSelectionMode === 'custom' ? 'text-blue-700/80 dark:text-[#0ea5a4]/80' : 'text-gray-400 dark:text-slate-500'
                  }`}>
                    تحديد مدة مخصصة للتمويل الشخصي (بالأشهر) تناسب رغبتك.
                  </span>
                </button>
              </div>

              {personalTenorSelectionMode === 'custom' && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 space-y-3 animate-fade-in font-sans">
                  <span className="block text-[11px] font-bold text-gray-500 dark:text-slate-400">اختر مدة التمويل الشخصي المفضلة (بالأشهر):</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {(() => {
                      const activeMax = selectedBankId === 'all' ? 60 : getSelectedBankPersonalMaxTenor();
                      const personalTenorOptions = [
                        { value: 12, label: 'سنة واحدة — 12 شهرًا' },
                        { value: 24, label: 'سنتان — 24 شهرًا' },
                        { value: 36, label: '3 سنوات — 36 شهرًا' },
                        { value: 48, label: '4 سنوات — 48 شهرًا' },
                        { value: 60, label: '5 سنوات — 60 شهرًا' }
                      ];
                      const filtered = personalTenorOptions.filter(opt => opt.value <= activeMax);
                      
                      return filtered.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setRequestedPersonalTenorMonths(opt.value)}
                          className={`py-3 px-2 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                            requestedPersonalTenorMonths === opt.value
                              ? 'border-[#0057B8] dark:border-[#0ea5a4] bg-[#0057B8] dark:bg-[#0ea5a4] text-white font-extrabold shadow-sm'
                              : 'border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 bg-white dark:bg-[#111827]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* 2. جهة التمويل المفضلة للتمويل الشخصي */}
            <div className="border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#151F32] rounded-2xl p-5 text-right space-y-3">
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">جهة التمويل المفضلة للتمويل الشخصي:</label>
              <select
                id="personal-bank-filter-select"
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="w-full bg-[#FAFAFA] dark:bg-[#0F172A] border border-gray-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl px-4 py-3.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8] dark:focus:ring-[#0ea5a4] focus:border-transparent cursor-pointer font-sans"
              >
                <option value="all" className="dark:bg-[#0f172a]">جميع جهات التمويل النشطة المتاحة (مقارنة العروض)</option>
                {sortedActiveBanks.map(bank => (
                  <option key={bank.id} value={bank.id} className="dark:bg-[#0f172a]">{bank.nameAr}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    );
  };

  const logicalStepId = activeStepId === 'main_type' ? 1 : (activeStepId === 'finance_options' ? 3 : 2);

  return (
    <div className="w-full bg-[#F8FAFC] dark:bg-[#0B0F19] min-h-[calc(100vh-64px)] flex flex-col">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col w-full">
        
        {/* Step Wizard visual Progress stepper indicators */}
        <div className="mb-8 md:mb-10 select-none">
          {/* Unified responsive 3-circle stepper */}
          <div className="relative w-full max-w-xl mx-auto flex items-center justify-between px-2 sm:px-6 py-2" dir="rtl">
            {/* Background line segment 1 */}
            <div className={`absolute top-7 right-[18%] left-[50%] h-[1.5px] -z-10 transition-all duration-300 ${logicalStepId >= 2 ? 'bg-[#0057B8] dark:bg-[#0ea5a4]' : 'bg-slate-200 dark:bg-slate-800'}`} />
            {/* Background line segment 2 */}
            <div className={`absolute top-7 right-[50%] left-[18%] h-[1.5px] -z-10 transition-all duration-300 ${logicalStepId >= 3 ? 'bg-[#0057B8] dark:bg-[#0ea5a4]' : 'bg-slate-200 dark:bg-slate-800'}`} />

            {/* Step 1 */}
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all duration-300 z-10 ${
                logicalStepId === 1 
                  ? 'bg-[#0057B8] dark:bg-[#0ea5a4] text-white border-2 border-[#0057B8] dark:border-[#0ea5a4] shadow-md shadow-blue-100 dark:shadow-none ring-4 ring-blue-500/10 scale-102' 
                  : logicalStepId > 1 
                  ? 'bg-[#0057B8] dark:bg-[#0ea5a4] text-white border-2 border-[#0057B8] dark:border-[#0ea5a4]' 
                  : 'bg-white dark:bg-[#111827] text-slate-400 border border-slate-200 dark:border-slate-800'
              }`}>
                {logicalStepId > 1 ? '✓' : '1'}
              </div>
              <span className={`text-[10px] sm:text-xs font-sans font-extrabold mt-2 transition-all ${logicalStepId === 1 ? 'text-[#0057B8] dark:text-[#0ea5a4]' : 'text-slate-400 dark:text-slate-500 font-medium'}`}>نوع الحسبة</span>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all duration-300 z-10 ${
                logicalStepId === 2 
                  ? 'bg-[#0057B8] dark:bg-[#0ea5a4] text-white border-2 border-[#0057B8] dark:border-[#0ea5a4] shadow-md shadow-blue-100 dark:shadow-none ring-4 ring-blue-500/10 scale-102' 
                  : logicalStepId > 2 
                  ? 'bg-[#0057B8] dark:bg-[#0ea5a4] text-white border-2 border-[#0057B8] dark:border-[#0ea5a4]' 
                  : 'bg-white dark:bg-[#111827] text-slate-400 border border-slate-200 dark:border-slate-800'
              }`}>
                {logicalStepId > 2 ? '✓' : '2'}
              </div>
              <span className={`text-[10px] sm:text-xs font-sans font-extrabold mt-2 transition-all ${logicalStepId === 2 ? 'text-[#0057B8] dark:text-[#0ea5a4]' : 'text-slate-400 dark:text-slate-500 font-medium'}`}>بيانات العميل والدخل</span>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all duration-300 z-10 ${
                logicalStepId === 3 
                  ? 'bg-[#0057B8] dark:bg-[#0ea5a4] text-white border-2 border-[#0057B8] dark:border-[#0ea5a4] shadow-md shadow-blue-100 dark:shadow-none ring-4 ring-blue-500/10 scale-102' 
                  : 'bg-white dark:bg-[#111827] text-slate-400 border border-slate-200 dark:border-slate-800'
              }`}>
                3
              </div>
              <span className={`text-[10px] sm:text-xs font-sans font-extrabold mt-2 transition-all ${logicalStepId === 3 ? 'text-[#0057B8] dark:text-[#0ea5a4]' : 'text-slate-400 dark:text-slate-500 font-medium'}`}>خيارات الحسبة</span>
            </div>
          </div>
        </div>

        {/* Validation Alert */}
        {errors.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-955/20 border border-red-200 dark:border-red-900/30 rounded-2xl text-xs text-red-700 dark:text-red-300 space-y-1">
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
        <div className="bg-white dark:bg-[#111827] rounded-2xl md:rounded-3xl border border-[#E5E7EB] dark:border-slate-800 p-4 sm:p-8 md:p-10 shadow-xs">
          
          {/* STEP 1: Main Type Selection */}
          {activeStepId === 'main_type' && (
            <div className="space-y-8 animate-fade-in text-right">
              <div className="text-center max-w-xl mx-auto mb-10">
                <h3 className="text-2xl font-black text-[#1E293B] dark:text-white font-sans tracking-tight leading-snug">ما الذي تريد حسابه أولاً؟</h3>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1.5 font-sans leading-relaxed">اختر مسار الحسبة المناسب للبدء في توجيه التمويل بدقة.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
                {/* Option 1: Real Estate */}
                <div
                  id="re-type-card"
                  onClick={() => {
                    setMainFinanceType('real_estate');
                  }}
                  className={`relative flex flex-col items-center justify-between text-center p-8 cursor-pointer transition-all duration-300 border rounded-2xl ${
                    mainFinanceType === 'real_estate' && productId !== 'personal_only'
                      ? 'border-2 border-[#0057B8] dark:border-[#0ea5a4] bg-blue-50/25 dark:bg-[#0ea5a4]/5 shadow-md shadow-blue-50/50 dark:shadow-none scale-[1.01]' 
                      : 'border-slate-200/95 dark:border-slate-850 bg-white dark:bg-[#151F32] hover:bg-slate-50/40 dark:hover:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                  }`}
                >
                  <div className="flex flex-col items-center w-full">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 mb-5 transition-colors duration-300 ${
                      mainFinanceType === 'real_estate' && productId !== 'personal_only'
                        ? 'bg-blue-100/80 dark:bg-[#0ea5a4]/10 text-[#0057B8] dark:text-[#0ea5a4] border border-blue-200/50 dark:border-[#0ea5a4]/25'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                      <Home className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="text-center">
                      <h4 className="font-extrabold text-[#0F172A] dark:text-white text-base leading-none">تمويل عقاري</h4>
                      <p className="text-xs text-slate-400 dark:text-slate-400 mt-3 leading-relaxed font-sans font-medium">
                        لحساب الحلول العقارية المتكاملة (عقاري فقط، عقاري بلس مع شخصي جديد، أو عقاري مع شخصي قائم).
                      </p>
                    </div>
                  </div>
                </div>

                {/* Option 2: Personal Only */}
                <div
                  id="pf-type-card"
                  onClick={() => {
                    setMainFinanceType('personal_only');
                  }}
                  className={`relative flex flex-col items-center justify-between text-center p-8 cursor-pointer transition-all duration-300 border rounded-2xl ${
                    mainFinanceType === 'personal_only' 
                      ? 'border-2 border-[#0057B8] dark:border-[#0ea5a4] bg-blue-50/25 dark:bg-[#0ea5a4]/5 shadow-md shadow-blue-50/50 dark:shadow-none scale-[1.01]' 
                      : 'border-slate-200/95 dark:border-slate-850 bg-white dark:bg-[#151F32] hover:bg-slate-50/40 dark:hover:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                  }`}
                >
                  <div className="flex flex-col items-center w-full">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 mb-5 transition-colors duration-300 ${
                      mainFinanceType === 'personal_only'
                        ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-200/50 dark:border-amber-500/25'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                      <Coins className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <h4 className="font-extrabold text-[#0F172A] dark:text-white text-base leading-none">تمويل شخصي فقط</h4>
                      <p className="text-xs text-slate-400 dark:text-slate-400 mt-3 leading-relaxed font-sans font-medium">
                        لحساب التمويل الشخصي الاستهلاكي القصير المستقل بنسب استقطاع مخصصة.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP: Combined Customer Data & Income (بيانات العميل والدخل) for Desktop/Laptop */}
          {activeStepId === 'personal_info_and_salary' && (
            <div className="space-y-8 animate-fade-in text-right">
              <div className="text-center max-w-lg mx-auto mb-8">
                <h3 className="text-xl font-bold text-[#111827] dark:text-white">أدخل بيانات العميل والدخل</h3>
                <p className="text-sm text-[#6B7280] dark:text-slate-400 mt-1 font-sans">يرجى إدخال تفاصيل جهة العمل والدخل الشهري لتقرير نسب الملاءمة وتحديد العروض المناسبة بدقة.</p>
              </div>

              <div className="space-y-8">
                {/* Section 1: Personal Info */}
                <div className="space-y-6 bg-slate-50/10 dark:bg-slate-900/10 p-6 md:p-8 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                  <h4 className="text-sm md:text-base font-bold text-[#0057B8] dark:text-[#0ea5a4] flex items-center gap-2 border-b border-gray-200/60 dark:border-slate-800 pb-3 mb-4">
                    <User className="w-5 h-5 text-[#0057B8] dark:text-[#0ea5a4]" />
                    <span>القسم الأول: بيانات العميل المهنية والشخصية</span>
                  </h4>
                  {renderPersonalInfoFields()}
                </div>

                {/* Section 2: Salary Info */}
                <div className="space-y-6 bg-slate-50/10 dark:bg-slate-900/10 p-6 md:p-8 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                  <h4 className="text-sm md:text-base font-bold text-[#0057B8] dark:text-[#0ea5a4] flex items-center gap-2 border-b border-gray-200/60 dark:border-slate-800 pb-3 mb-4 font-sans">
                    <Coins className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                    <span>القسم الثاني: الرواتب والمستحقات والبدلات</span>
                  </h4>
                  {renderSalaryFields()}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Customer Data (بيانات العميل) */}
          {activeStepId === 'personal_info' && (
            <div className="space-y-8 animate-fade-in text-right">
              <div className="text-center max-w-lg mx-auto mb-8">
                <h3 className="text-xl font-bold text-[#111827] dark:text-white">أدخل بيانات العميل المهنية والشخصية</h3>
                <p className="text-sm text-[#6B7280] dark:text-slate-400 mt-1 font-sans">تساعد جهة العمل وتفاصيل السن والخدمة في ترجيح معايير الاستحقاق وهوامش التسعير.</p>
              </div>
              {renderPersonalInfoFields()}
            </div>
          )}

          {/* STEP 3: Salary & Income */}
          {activeStepId === 'salary' && (
            <div className="space-y-6 animate-fade-in text-right">
              <div className="text-center max-w-lg mx-auto mb-8">
                <h3 className="text-xl font-bold text-[#111827] dark:text-white">الرواتب والمستحقات والبدلات</h3>
                <p className="text-sm text-[#6B7280] dark:text-slate-400 mt-1 font-sans">يُشترط الإدخال الصحيح للراتب لتقرير عوامل الاستقطاع ونسب الملاءمة ائتمانياً لدى كافة البنوك.</p>
              </div>
              {renderSalaryFields()}
            </div>
          )}
                      {/* STEP 4: Finance Options & Obligations */}
          {activeStepId === 'finance_options' && (
            <div className="space-y-6 animate-fade-in text-right">
              <div className="text-center max-w-lg mx-auto mb-8">
                <h3 className="text-xl font-bold text-[#111827] dark:text-white">تخصيص منتج التمويل والالتزامات</h3>
                <p className="text-sm text-[#6B7280] dark:text-slate-400 mt-1 font-sans">تتحكم مدة السداد وتفصيل الدعم والالتزامات بجدول الفائدة التراكمية وهوامش أرباح البنوك.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. Real Estate Product Options Cards (Mortgage Flow Only) */}
                {mainFinanceType !== 'personal_only' && (
                  <div className="col-span-1 md:col-span-2 space-y-3">
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">نوع منتج التمويل العقاري المطلوب:</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {[
                        { id: 'real_estate_only', label: 'عقاري فقط', desc: 'للحصول على تمويل شراء المسكن أو العقار السكني المستقل.' },
                        { id: 'real_estate_with_new_personal', label: 'عقاري + شخصي جديد', desc: 'لدمج تمويل شخصي جديد مع العقاري لتكبير قوة الملاءمة والشراء.' },
                        { id: 'real_estate_with_existing_personal', label: 'عقاري + شخصي قائم', desc: 'إذا كان لديك تمويل شخصي مستمر حالياً وتريد قياسه كالتزام قائم.' }
                      ].map((prod) => {
                        const isSelected = productId === prod.id;
                        return (
                          <button
                            key={prod.id}
                            type="button"
                            onClick={() => {
                              setProductId(prod.id as ProductId);
                              if (prod.id === 'real_estate_with_existing_personal') {
                                setMainFinanceType('real_estate_with_existing_personal');
                              } else {
                                setMainFinanceType('real_estate');
                                if (prod.id === 'real_estate_only') {
                                  setRealEstateSubType('real_estate_only');
                                } else if (prod.id === 'real_estate_with_new_personal') {
                                  setRealEstateSubType('real_estate_with_new_personal');
                                }
                              }
                            }}
                            className={`p-4 rounded-xl border-2 text-right transition-all flex flex-col justify-between cursor-pointer min-h-[110px] ${
                              isSelected
                                ? 'border-[#0057B8] dark:border-[#0ea5a4] bg-[#0057B8]/5 dark:bg-[#0ea5a4]/5 text-[#111827] dark:text-white font-extrabold'
                                : 'border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-750 text-gray-600 dark:text-slate-400 bg-white dark:bg-[#111827] dark:hover:bg-slate-800'
                            }`}
                          >
                            <span className="font-extrabold text-xs">{prod.label}</span>
                            <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-1.5 leading-relaxed font-sans">{prod.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Direct Obligations Fields (Shown Inline if Real Estate + Existing Personal is chosen) */}
                {productId === 'real_estate_with_existing_personal' && (
                  <div className="col-span-1 md:col-span-2 border border-blue-100 dark:border-slate-800 bg-blue-50/20 dark:bg-slate-900/20 rounded-2xl p-5 space-y-4 animate-fade-in shadow-xs">
                    <h4 className="text-xs font-bold text-blue-900 dark:text-[#0ea5a4] flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-[#0057B8] dark:text-[#0ea5a4]" />
                      <span>تفاصيل الالتزام المالي القائم:</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">القسط الشهري الحالي للالتزام الشخصي:</label>
                        <div className="relative">
                          <NumericInput
                            id="existing-monthly-obligations-input-direct"
                            min={0}
                            allowDecimals={true}
                            value={existingMonthlyObligations}
                            onChange={setExistingMonthlyObligations}
                            placeholder="مثال: 1500"
                            className="w-full bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8] dark:focus:ring-[#0ea5a4]"
                          />
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 dark:text-slate-500">ريال/شهرياً</span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 font-sans">الشهور المتبقية للالتزام الحالي:</label>
                        <div className="relative">
                          <NumericInput
                            id="obligation-remaining-months-input-direct"
                            min={0}
                            allowDecimals={false}
                            value={obligationRemainingMonths}
                            onChange={setObligationRemainingMonths}
                            placeholder="مثال: 36"
                            className="w-full bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8] dark:focus:ring-[#0ea5a4]"
                          />
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 dark:text-slate-500">شهر متبقي</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sakani Program (Mortgage support) - ONLY FOR MORTGAGES */}
                {mainFinanceType !== 'personal_only' && (
                  <div className="border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#151F32] rounded-2xl p-5 text-right space-y-3">
                    <label className="block text-xs font-bold text-gray-750 dark:text-slate-300 flex items-center justify-between font-sans">
                      <span>برنامج الدعم السكني (سكني):</span>
                      <HelpCircle className="w-4.5 h-4.5 text-gray-400 font-sans" />
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
                              ? 'border-[#0057B8] dark:border-[#0ea5a4] bg-[#0057B8]/5 dark:bg-[#0ea5a4]/5 text-[#0057B8] dark:text-[#0ea5a4]'
                              : 'border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-705'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Requested Finance Duration (Always Visible in finance_options step) */}
                <div className="border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#151F32] rounded-2xl p-5 text-right space-y-3">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between font-sans">
                    <span>مدة التمويل المطلوبة:</span>
                    <Calendar className="w-4 h-4 text-[#0057B8] dark:text-[#0ea5a4]" />
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'until_retirement', label: 'حتى التقاعد' },
                      { id: 'manual', label: 'اختيار يدوي' },
                      { id: 'max', label: 'الحد الأقصى' }
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => {
                          setTermMode(mode.id as TermMode);
                          if (mode.id === 'manual' && !manualTermYears) {
                            setManualTermYears(25);
                          }
                        }}
                        className={`py-2 px-1 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer ${
                          termMode === mode.id
                            ? 'border-[#0057B8] dark:border-[#0ea5a4] bg-[#0057B8]/5 dark:bg-[#0ea5a4]/5 text-[#0057B8] dark:text-[#0ea5a4]'
                            : 'border-gray-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>

                  {termMode === 'manual' && (
                    <div className="pt-2 space-y-1.5 animate-fade-in">
                      <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 font-sans">مدة التمويل المستهدفة (سنوات):</label>
                      <div className="relative">
                        <NumericInput
                          id="manual-term-years-input-desktop"
                          min={1}
                          max={30}
                          allowDecimals={false}
                          value={manualTermYears}
                          onChange={(val) => {
                            if (val === '' || (Number(val) >= 1 && Number(val) <= 30)) {
                              setManualTermYears(val);
                            }
                          }}
                          placeholder="مثال: 25"
                          className="w-full bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0057B8] dark:focus:ring-[#0ea5a4]"
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 dark:text-slate-500 font-sans">سنة (1 إلى 30)</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Preferred Bank Filter - FOR BOTH PATHS */}
                <div className="border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#151F32] rounded-2xl p-5 text-right space-y-3 col-span-1 md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">جهة التمويل المفضلة:</label>
                  <select
                    id="bank-filter-select"
                    value={selectedBankId}
                    onChange={(e) => setSelectedBankId(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-[#0F172A] border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0057B8] dark:focus:ring-[#0ea5a4] focus:border-transparent cursor-pointer font-sans dark:text-white"
                  >
                    <option value="all" className="dark:bg-[#0f172a]">جميع جهات التمويل النشطة المتاحة (مقارنة العروض)</option>
                    {sortedActiveBanks.map(bank => (
                      <option key={bank.id} value={bank.id} className="dark:bg-[#0f172a]">{bank.nameAr}</option>
                    ))}
                  </select>
                </div>

              </div>
            </div>
          )}

          {/* Stepper Buttons */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-8 border-t border-gray-150 dark:border-slate-850 mt-8 font-sans">
            <button
              id="prev-step-btn"
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="w-full sm:w-auto min-h-[44px] justify-center px-6 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 font-semibold text-xs leading-none hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5 transition-all"
            >
              <ChevronRight className="w-3.5 h-3.5" />
              <span>رجوع</span>
            </button>

            {currentStep < flow.length ? (
              <button
                id="next-step-btn"
                type="button"
                onClick={handleNext}
                className="w-full sm:w-auto min-h-[44px] justify-center px-6 py-2.5 rounded-xl bg-[#0057B8] dark:bg-[#0ea5a4] text-white font-semibold text-xs leading-none hover:bg-[#004494] dark:hover:bg-[#0c8e8d] cursor-pointer flex items-center gap-1.5 transition-all shadow-sm active:scale-98"
              >
                <span>التالي</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                id="calc-submit-btn"
                type="button"
                onClick={triggerCalculations}
                className="w-full sm:w-auto min-h-[44px] justify-center px-8 py-3.5 rounded-xl bg-[#0057B8] dark:bg-[#0ea5a4] text-white font-bold text-sm leading-none hover:bg-[#004494] dark:hover:bg-[#0c8e8d] transition-all cursor-pointer flex items-center gap-2 shadow-sm"
              >
                <Calculator className="w-4 h-4" />
                <span>{results ? 'تحديث وإعادة الحساب' : 'احسب النتائج ومقارنة العروض'}</span>
              </button>
            )}
          </div>

          {/* RESULTS DISPLAY PAGE */}
          {currentStep === flow.length && (
            results ? (
              <ResultsGrid
                results={results}
                productId={productId}
                onRestart={restartWizard}
                existingMonthlyObligations={existingMonthlyObligations}
                obligationRemainingMonths={obligationRemainingMonths}
                mainFinanceType={mainFinanceType}
                sectorId={effectiveSectorId || sectorId}
              />
            ) : (
              <div className="max-w-md mx-auto my-16 px-4 text-center select-none animate-fade-in" dir="rtl">
                <div className="bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-slate-800 rounded-3xl p-8 shadow-xl space-y-6">
                  <div className="w-16 h-16 bg-blue-50 dark:bg-slate-800 text-[#0057B8] dark:text-[#0ea5a4] rounded-full flex items-center justify-center mx-auto border border-blue-100/50 dark:border-slate-700/50">
                    <Calculator className="w-7 h-7 text-[#0057B8] dark:text-[#0ea5a4]" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-sans font-black text-xl text-gray-950 dark:text-white">لا توجد نتيجة حالية</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                      الرجاء إدخال بياناتك بالكامل في الخطوات والضغط على الزر أدناه لحساب مبالغ التمويل ومقارنة العروض تلقائياً.
                    </p>
                  </div>
                  <button
                    onClick={restartWizard}
                    className="w-full py-3.5 bg-[#0057B8] dark:bg-[#0ea5a4] hover:bg-[#004bb0] dark:hover:bg-[#0c8e8d] text-white text-xs font-extrabold rounded-2xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>إجراء حسبة جديدة</span>
                  </button>
                </div>
              </div>
            )
          )}

        </div>

        {/* 5. Trust Banner (شريط الثقة أسفل البطاقة) */}
        {currentStep === 1 && (
          <div className="mt-8 bg-blue-50/20 dark:bg-slate-900/20 border border-blue-100/60 dark:border-slate-800/60 rounded-2xl p-6 sm:p-8 space-y-6 text-right font-sans">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Column 1 */}
              <div className="flex gap-3.5 items-start">
                <div className="w-10 h-10 rounded-xl bg-blue-100/60 dark:bg-slate-800/60 flex items-center justify-center shrink-0 border border-blue-200/40 dark:border-slate-700/40 text-[#0057B8] dark:text-[#0ea5a4]">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-[#0057B8] dark:text-[#0ea5a4] text-sm leading-tight mb-1.5 font-sans">ذكي ومفيد</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">يقارن نتائج التمويل وفق بيانات العميل وقواعد البنوك المتاحة.</p>
                </div>
              </div>

              {/* Column 2 */}
              <div className="flex gap-3.5 items-start">
                <div className="w-10 h-10 rounded-xl bg-blue-100/60 dark:bg-slate-800/60 flex items-center justify-center shrink-0 border border-blue-200/40 dark:border-slate-700/40 text-[#0057B8] dark:text-[#0ea5a4]">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-[#0057B8] dark:text-[#0ea5a4] text-sm leading-tight mb-1.5 font-sans">آمن وموثوق</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">تُستخدم بياناتك لإجراء الحسبة ولا تظهر ضمن النتائج المشاركة.</p>
                </div>
              </div>

              {/* Column 3 */}
              <div className="flex gap-3.5 items-start">
                <div className="w-10 h-10 rounded-xl bg-blue-100/60 dark:bg-slate-800/60 flex items-center justify-center shrink-0 border border-blue-200/40 dark:border-slate-700/40 text-[#0057B8] dark:text-[#0ea5a4]">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-[#0057B8] dark:text-[#0ea5a4] text-sm leading-tight mb-1.5 font-sans">بسيط وسهل</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">خطوات مختصرة ونتائج واضحة تساعدك على مقارنة الخيارات.</p>
                </div>
              </div>

            </div>

            {/* Disclaimer disclaimer line below columns */}
            <div className="border-t border-blue-100/40 dark:border-slate-800/40 pt-4 flex gap-2 items-center justify-center text-center text-[10px] text-slate-400 leading-relaxed">
              <Info className="w-3.5 h-3.5 text-blue-500/70 dark:text-[#0ea5a4]/75 inline-block shrink-0" />
              <span>النتائج تقديرية ولا تمثل موافقة نهائية أو عرضًا ملزمًا من أي بنك أو جهة تمويلية.</span>
            </div>
          </div>
        )}

        {/* 6. Minimalist Footer (الفوتر الصغير) */}
        {currentStep === 1 && (
          <div className="border-t border-slate-200/40 dark:border-slate-800/40 mt-12 py-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-sans max-w-6xl mx-auto" dir="rtl">
            <div className="text-slate-400 font-medium">
              <span>© 2026 حسبة</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 font-bold text-slate-500 dark:text-slate-400 selection:bg-blue-100">
              <button onClick={() => navigate('/terms')} className="hover:text-[#0057B8] dark:hover:text-[#0ea5a4] transition-colors cursor-pointer">شروط الاستخدام</button>
              <span className="text-slate-200 dark:text-slate-800">|</span>
              <button onClick={() => navigate('/privacy')} className="hover:text-[#0057B8] dark:hover:text-[#0ea5a4] transition-colors cursor-pointer">سياسة الخصوصية</button>
              <span className="text-slate-200 dark:text-slate-800">|</span>
              <button onClick={() => navigate('/disclaimer')} className="hover:text-[#0057B8] dark:hover:text-[#0ea5a4] transition-colors cursor-pointer">إخلاء المسؤولية</button>
              <span className="text-slate-200 dark:text-slate-800">|</span>
              <button onClick={() => {
                window.dispatchEvent(new CustomEvent('open-customer-assistant'));
              }} className="hover:text-[#0057B8] dark:hover:text-[#0ea5a4] transition-colors cursor-pointer">تواصل معنا</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
