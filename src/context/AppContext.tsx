import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import {
  Bank,
  ProductAcceptance,
  SectorId,
  MilitaryRank,
  NetSalaryRule,
  PensionRule,
  TermRule,
  MarginRule,
  DsrRule,
  SupportSettings,
  PersonalFinanceRules,
  AdvancedRule,
  CalculationLog,
  UserSubscription,
  HousingSupportTier,
  AdvancePaymentTier
} from '../types';

import {
  initialBanks,
  initialProductAcceptance,
  initialMilitaryRanks,
  initialSalaryRules,
  initialPensionRules,
  initialTermRules,
  initialMarginRules,
  initialDsrRules,
  initialSupportSettings,
  initialPersonalFinanceRules,
  initialAdvancedRules,
  initialCalculationLogs,
  initialUserSubscriptions
} from '../seeds';

import {
  fetchHousingSupportTiers,
  fetchAdvancePaymentTiers,
  saveHousingSupportTiers,
  saveAdvancePaymentTiers,
  DEFAULT_HOUSING_SUPPORT_TIERS,
  DEFAULT_ADVANCE_PAYMENT_TIERS
} from '../lib/housingSupportService';

import { supabase, hasSupabaseKeys } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BankSectorPensionRule, PensionLibraryRule } from '../types/pension-rules';
import { defaultLibraryRules } from '../lib/finance-engine/pension';
import { useSettings } from '../hooks/useSettings';
import { normalizeDsrRules } from '../lib/settings/normalizeDsrRules';
import {
  fallbackApprovedSalaryRules,
  fallbackPensionRules,
  fallbackSectorMappings
} from '../lib/pensionDb';

interface AppContextType {
  banks: Bank[];
  setBanks: React.Dispatch<React.SetStateAction<Bank[]>>;
  products: ProductAcceptance[];
  setProducts: React.Dispatch<React.SetStateAction<ProductAcceptance[]>>;
  militaryRanks: MilitaryRank[];
  setMilitaryRanks: React.Dispatch<React.SetStateAction<MilitaryRank[]>>;
  salaryRules: NetSalaryRule[];
  setSalaryRules: React.Dispatch<React.SetStateAction<NetSalaryRule[]>>;
  pensionRules: PensionRule[];
  setPensionRules: React.Dispatch<React.SetStateAction<PensionRule[]>>;
  termRules: TermRule[];
  setTermRules: React.Dispatch<React.SetStateAction<TermRule[]>>;
  marginRules: MarginRule[];
  setMarginRules: React.Dispatch<React.SetStateAction<MarginRule[]>>;
  dsrRules: DsrRule[];
  setDsrRules: React.Dispatch<React.SetStateAction<DsrRule[]>>;
  supportSettings: SupportSettings;
  setSupportSettings: React.Dispatch<React.SetStateAction<SupportSettings>>;

  approvedSalaryRules: any[];
  setApprovedSalaryRules: React.Dispatch<React.SetStateAction<any[]>>;
  pensionDbRules: any[];
  setPensionDbRules: React.Dispatch<React.SetStateAction<any[]>>;
  sectorMappings: any[];
  setSectorMappings: React.Dispatch<React.SetStateAction<any[]>>;
  housingSupportTiers: HousingSupportTier[];
  setHousingSupportTiers: React.Dispatch<React.SetStateAction<HousingSupportTier[]>>;
  advancePaymentTiers: AdvancePaymentTier[];
  setAdvancePaymentTiers: React.Dispatch<React.SetStateAction<AdvancePaymentTier[]>>;
  personalRules: PersonalFinanceRules[];
  setPersonalRules: React.Dispatch<React.SetStateAction<PersonalFinanceRules[]>>;
  advancedRules: AdvancedRule[];
  setAdvancedRules: React.Dispatch<React.SetStateAction<AdvancedRule[]>>;
  calculationLogs: CalculationLog[];
  setCalculationLogs: React.Dispatch<React.SetStateAction<CalculationLog[]>>;
  userSubscriptions: UserSubscription[];
  setUserSubscriptions: React.Dispatch<React.SetStateAction<UserSubscription[]>>;

  customSectors: any[];
  setCustomSectors: React.Dispatch<React.SetStateAction<any[]>>;
  pensionRulesLibrary: PensionLibraryRule[];
  setPensionRulesLibrary: React.Dispatch<React.SetStateAction<PensionLibraryRule[]>>;
  bankSectorRules: BankSectorPensionRule[];
  setBankSectorRules: React.Dispatch<React.SetStateAction<BankSectorPensionRule[]>>;

  activeNav: 'calculator' | 'admin';
  setActiveNav: (val: 'calculator' | 'admin') => void;
  adminSubPage: string;
  setAdminSubPage: (val: string) => void;
  activeStepLabel: string;
  setActiveStepLabel: (val: string) => void;
  currentStep: number;
  setCurrentStep: (val: number | ((prev: number) => number)) => void;
  results: any[] | null;
  setResults: (val: any[] | null) => void;
  isMobileSettingsOpen: boolean;
  setIsMobileSettingsOpen: (val: boolean) => void;

  hasUnsavedChanges: boolean;
  saveChanges: () => void;
  cancelChanges: () => void;
  reinitializeAllSettings: () => Promise<void>;

  // Supabase Auth and Roles state
  user: any;
  setUser: React.Dispatch<React.SetStateAction<any>>;
  userRole: 'admin' | 'user' | null;
  authLoading: boolean;
  isSettingsLoading: boolean;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AdminSettings {
  banks: Bank[];
  products: ProductAcceptance[];
  militaryRanks: MilitaryRank[];
  salaryRules: NetSalaryRule[];
  pensionRules: PensionRule[];
  termRules: TermRule[];
  marginRules: MarginRule[];
  dsrRules: DsrRule[];
  supportSettings: SupportSettings;
  housingSupportTiers: HousingSupportTier[];
  advancePaymentTiers: AdvancePaymentTier[];
  personalRules: PersonalFinanceRules[];
  advancedRules: AdvancedRule[];
  userSubscriptions?: UserSubscription[];
  customSectors?: any[];
  bankSectorRules?: BankSectorPensionRule[];
  pensionRulesLibrary?: PensionLibraryRule[];
  approvedSalaryRules?: any[];
  approvedSalaryDbRules?: any[];
  pensionDbRules?: any[];
  sectorMappings?: any[];
}

function upgradeMarginRules(rules: MarginRule[]): MarginRule[] {
  return (rules || []).map(rule => {
    const sourceMargin =
      rule.annualMargin ??
      rule.endMargin ??
      rule.baseMargin;

    const normalizedBaseMargin =
      rule.baseMargin ??
      (
        sourceMargin === undefined
          ? undefined
          : sourceMargin > 1
            ? sourceMargin / 100
            : sourceMargin
      );

    return {
      ...rule,
      exceptionBps: rule.exceptionBps ?? 0,
      baseMargin: normalizedBaseMargin
    };
  });
}

function getDsrRuleKey(rule: DsrRule): string {
  return [
    rule.bankId,
    rule.productType,
    rule.supportType,
    rule.customerStage
  ].join('|');
}

function mergeDsrRulesWithSeeds(existingRules: DsrRule[], seedRules: DsrRule[]) {
  const existingArray = Array.isArray(existingRules) ? existingRules : [];
  const seedArray = Array.isArray(seedRules) ? seedRules : [];

  const existingKeys = new Set(existingArray.map(getDsrRuleKey));
  const missingSeedRules = seedArray.filter(rule => !existingKeys.has(getDsrRuleKey(rule)));

  return {
    mergedRules: [...existingArray, ...missingSeedRules],
    addedCount: missingSeedRules.length
  };
}

function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    if (Array.isArray(a)) {
      if (!Array.isArray(b) || a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
    }
    const keysA = Object.keys(a).filter(k => a[k] !== undefined && a[k] !== null);
    const keysB = Object.keys(b).filter(k => b[k] !== undefined && b[k] !== null);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }
  return false;
}

function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  return JSON.parse(JSON.stringify(obj));
}

function normalizeBeforeCompare(val: any): any {
  if (val === null || val === undefined) return null;
  if (Array.isArray(val)) {
    const normalizedArr = val.map(normalizeBeforeCompare);
    const firstItem = normalizedArr[0];
    if (firstItem && typeof firstItem === 'object') {
      const sortKey = ('id' in firstItem) ? 'id' : (('key' in firstItem) ? 'key' : null);
      if (sortKey) {
        normalizedArr.sort((x, y) => {
          const valX = String(x[sortKey] || '');
          const valY = String(y[sortKey] || '');
          return valX.localeCompare(valY);
        });
      }
    }
    return normalizedArr;
  }
  if (typeof val === 'object') {
    const res: any = {};
    const keys = Object.keys(val).sort();
    for (const key of keys) {
      if ([
        'updated_at',
        'updated_by',
        'source',
        '_temp',
        'isDirty',
        'uiState'
      ].includes(key)) {
        continue;
      }
      const v = val[key];
      if (v !== undefined && v !== null) {
        res[key] = normalizeBeforeCompare(v);
      }
    }
    return res;
  }
  return val;
}

const defaultSectorsList = [
  { id: 'gov_civil', nameAr: 'حكومي مدني', isActive: true, retirementAge: 60, notes: 'لا يحتاج رتبة' },
  { id: 'semi_gov', nameAr: 'شبه حكومي', isActive: true, retirementAge: 60, notes: 'لا يحتاج رتبة' },
  { id: 'companies', nameAr: 'موظف شركات', isActive: true, retirementAge: 60, notes: 'لا يحتاج رتبة' },
  { id: 'military', nameAr: 'عسكري', isActive: true, retirementAge: 0, notes: 'يحتاج اختيار رتبة (السن يأتي من الرتبة)' },
  { id: 'retired', nameAr: 'متقاعد', isActive: true, retirementAge: 0, notes: 'لا ينطبق (متقاعد حالي)' }
];

export const ensureBankSectorPensionRules = (allBanks: Bank[], currentRules: BankSectorPensionRule[], forceGenerate: boolean = false): BankSectorPensionRule[] => {
  const allowedSectors = ['gov_civil', 'military', 'semi_gov', 'companies', 'retired'];
  const sectorMigrationMap: Record<string, string> = {
    [['government', 'civilian'].join('_')]: 'gov_civil',
    military_officer: 'military',
    military_individual: 'military',
    retiree: 'retired'
  };

  let processed = (currentRules || []).map(rule => {
    let updatedSectorId = rule.sectorId || '';
    if (sectorMigrationMap[updatedSectorId]) {
      updatedSectorId = sectorMigrationMap[updatedSectorId];
    }
    return {
      ...rule,
      id: `${rule.bankId}_${updatedSectorId}`,
      sectorId: updatedSectorId
    };
  });

  processed = processed.filter(r => allowedSectors.includes(r.sectorId));

  const deduped: BankSectorPensionRule[] = [];
  const seen = new Set<string>();
  processed.forEach(rule => {
    const key = `${rule.bankId}_${rule.sectorId}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(rule);
    }
  });

  const finalRules = [...deduped];

  if (forceGenerate) {
    allBanks.forEach(bank => {
      allowedSectors.forEach(sectorId => {
        const alreadyExists = finalRules.some(r => r.bankId === bank.id && r.sectorId === sectorId);
        
        if (!alreadyExists) {
          let salarySource: 'basic_only' | 'basic_housing' | 'net_salary' | 'manual' = 'basic_only';
          let calcMethod: 'service_growth' | 'fixed_percentage' | 'direct' = 'service_growth';
          let divisorYears = 40;
          let growthRate = 0;
          let growthMinYears = 0;
          let growthMaxYears = 0;
          let noGrowthAboveYears = 0;
          let thresholdYears = 5;
          let rateBelow = 70;
          let rateAbove = 80;
          let capAtApprovedSalary = true;

          if (sectorId === 'gov_civil') {
            salarySource = 'basic_only';
            calcMethod = 'service_growth';
            divisorYears = 40;
            growthRate = 2.5;
            growthMinYears = 5;
            growthMaxYears = 12;
            noGrowthAboveYears = 25;
            capAtApprovedSalary = true;
          } else if (sectorId === 'military') {
            salarySource = 'basic_only';
            calcMethod = 'service_growth';
            divisorYears = 35;
            growthRate = 2.5;
            growthMinYears = 5;
            growthMaxYears = 12;
            noGrowthAboveYears = 25;
            capAtApprovedSalary = true;
          } else if (sectorId === 'semi_gov') {
            salarySource = 'basic_only';
            calcMethod = 'service_growth';
            divisorYears = 40;
            growthRate = 1.25;
            growthMinYears = 5;
            growthMaxYears = 12;
            noGrowthAboveYears = 25;
            capAtApprovedSalary = true;
          } else if (sectorId === 'companies') {
            salarySource = 'basic_only';
            calcMethod = 'service_growth';
            divisorYears = 40;
            growthRate = 0;
            growthMinYears = 0;
            growthMaxYears = 0;
            noGrowthAboveYears = 0;
            capAtApprovedSalary = true;
          } else if (sectorId === 'retired') {
            salarySource = 'manual';
            calcMethod = 'direct';
            capAtApprovedSalary = false;
          }

          finalRules.push({
            id: `${bank.id}_${sectorId}`,
            bankId: bank.id,
            sectorId: sectorId,
            isActive: true,
            notes: '',
            salarySource,
            calcMethod,
            divisorYears,
            growthRate,
            growthMinYears,
            growthMaxYears,
            noGrowthAboveYears,
            thresholdYears,
            rateBelow,
            rateAbove,
            capAtApprovedSalary
          });
        }
      });
    });
  }

  return finalRules;
};

const getInitialSettings = (): AdminSettings => {
  return {
    banks: initialBanks,
    products: initialProductAcceptance,
    militaryRanks: initialMilitaryRanks,
    salaryRules: initialSalaryRules,
    pensionRules: initialPensionRules,
    termRules: initialTermRules,
    marginRules: initialMarginRules,
    dsrRules: initialDsrRules,
    supportSettings: initialSupportSettings,
    housingSupportTiers: [...DEFAULT_HOUSING_SUPPORT_TIERS],
    advancePaymentTiers: [...DEFAULT_ADVANCE_PAYMENT_TIERS],
    personalRules: initialPersonalFinanceRules,
    advancedRules: initialAdvancedRules,
    userSubscriptions: initialUserSubscriptions,
    customSectors: defaultSectorsList,
    bankSectorRules: [],
    pensionRulesLibrary: defaultLibraryRules,
  };
};

export function AppStateProvider({ children }: { children: ReactNode }) {
  const initialData = getInitialSettings();

  const [banks, setBanks] = useState<Bank[]>(initialData.banks);
  const [products, setProducts] = useState<ProductAcceptance[]>(initialData.products);
  const [militaryRanks, setMilitaryRanks] = useState<MilitaryRank[]>(initialData.militaryRanks);
  const [salaryRules, setSalaryRules] = useState<NetSalaryRule[]>(initialData.salaryRules);
  const [pensionRules, setPensionRules] = useState<PensionRule[]>(initialData.pensionRules);
  const [termRules, setTermRules] = useState<TermRule[]>(initialData.termRules);
  const [marginRules, setMarginRules] = useState<MarginRule[]>(initialData.marginRules);
  const [dsrRules, setDsrRules] = useState<DsrRule[]>(initialData.dsrRules);
  const [supportSettings, setSupportSettings] = useState<SupportSettings>(initialData.supportSettings);
  const [housingSupportTiers, setHousingSupportTiers] = useState<HousingSupportTier[]>(initialData.housingSupportTiers);
  const [advancePaymentTiers, setAdvancePaymentTiers] = useState<AdvancePaymentTier[]>(initialData.advancePaymentTiers);
  const [personalRules, setPersonalRules] = useState<PersonalFinanceRules[]>(initialData.personalRules);
  const [advancedRules, setAdvancedRules] = useState<AdvancedRule[]>(initialData.advancedRules);

  const [approvedSalaryRules, setApprovedSalaryRules] = useState<any[]>(fallbackApprovedSalaryRules);
  const [pensionDbRules, setPensionDbRules] = useState<any[]>(fallbackPensionRules);
  const [sectorMappings, setSectorMappings] = useState<any[]>(fallbackSectorMappings);

  const [calculationLogs, setCalculationLogs] = useState<CalculationLog[]>(initialCalculationLogs);
  const [userSubscriptions, setUserSubscriptions] = useState<UserSubscription[]>(initialData.userSubscriptions || initialUserSubscriptions);

  const [customSectors, setCustomSectors] = useState<any[]>(initialData.customSectors || defaultSectorsList);
  const [bankSectorRules, setBankSectorRules] = useState<BankSectorPensionRule[]>(initialData.bankSectorRules || []);
  const [pensionRulesLibrary, setPensionRulesLibrary] = useState<PensionLibraryRule[]>(initialData.pensionRulesLibrary || defaultLibraryRules);

  const [activeNav, setActiveNav] = useState<'calculator' | 'admin'>('calculator');
  const [adminSubPage, setAdminSubPage] = useState<string>('banks');
  const [activeStepLabel, setActiveStepLabel] = useState<string>('نوع الحسبة');
  const [currentStep, setCurrentStep] = useState<number>(() => {
    try {
      const raw = localStorage.getItem('hesba_calculator_draft');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.currentStep === 'number') {
          return parsed.currentStep;
        }
      }
    } catch (e) {
      console.error("Error setting initial step from draft in AppContext:", e);
    }
    return 1;
  });
  const [results, setResults] = useState<any[] | null>(null);
  const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState<boolean>(false);

  const [savedSettings, setSavedSettings] = useState<AdminSettings>(initialData);

  // Helper helper to correctly apply partial or full settings update to state and savedSettings
  const applySettingsState = (data: Partial<AdminSettings>) => {
    const clonedData = deepClone(data);

    if (clonedData.banks) setBanks(clonedData.banks);
    if (clonedData.products) setProducts(clonedData.products);
    if (clonedData.militaryRanks) setMilitaryRanks(clonedData.militaryRanks);
    if (clonedData.salaryRules) setSalaryRules(clonedData.salaryRules);
    if (clonedData.pensionRules) setPensionRules(clonedData.pensionRules);
    if (clonedData.termRules) setTermRules(clonedData.termRules);
    if (clonedData.marginRules) {
      setMarginRules(upgradeMarginRules(clonedData.marginRules));
    }
    if (clonedData.dsrRules) setDsrRules(clonedData.dsrRules);
    if (clonedData.supportSettings) setSupportSettings(clonedData.supportSettings);
    if (clonedData.housingSupportTiers) setHousingSupportTiers(clonedData.housingSupportTiers);
    if (clonedData.advancePaymentTiers) setAdvancePaymentTiers(clonedData.advancePaymentTiers);
    if (clonedData.personalRules) setPersonalRules(clonedData.personalRules);
    if (clonedData.advancedRules) setAdvancedRules(clonedData.advancedRules);
    if (clonedData.userSubscriptions) setUserSubscriptions(clonedData.userSubscriptions);
    if (clonedData.customSectors) setCustomSectors(clonedData.customSectors);
    if (clonedData.bankSectorRules) setBankSectorRules(clonedData.bankSectorRules);
    if (clonedData.pensionRulesLibrary) setPensionRulesLibrary(clonedData.pensionRulesLibrary);
    if (clonedData.approvedSalaryRules) setApprovedSalaryRules(clonedData.approvedSalaryRules);
    if (clonedData.approvedSalaryDbRules) setApprovedSalaryRules(clonedData.approvedSalaryDbRules);
    if (clonedData.pensionDbRules) setPensionDbRules(clonedData.pensionDbRules);
    if (clonedData.sectorMappings) setSectorMappings(clonedData.sectorMappings);
 
    const merged: AdminSettings = {
      banks: clonedData.banks || deepClone(initialData.banks),
      products: clonedData.products || deepClone(initialData.products),
      militaryRanks: clonedData.militaryRanks || deepClone(initialData.militaryRanks),
      salaryRules: clonedData.salaryRules || deepClone(initialData.salaryRules),
      pensionRules: clonedData.pensionRules || deepClone(initialData.pensionRules),
      termRules: clonedData.termRules || deepClone(initialData.termRules),
      marginRules: clonedData.marginRules ? upgradeMarginRules(clonedData.marginRules) : deepClone(initialData.marginRules),
      dsrRules: clonedData.dsrRules || deepClone(initialData.dsrRules),
      supportSettings: clonedData.supportSettings || deepClone(initialData.supportSettings),
      housingSupportTiers: clonedData.housingSupportTiers || deepClone(initialData.housingSupportTiers),
      advancePaymentTiers: clonedData.advancePaymentTiers || deepClone(initialData.advancePaymentTiers),
      personalRules: clonedData.personalRules || deepClone(initialData.personalRules),
      advancedRules: clonedData.advancedRules || deepClone(initialData.advancedRules),
      userSubscriptions: clonedData.userSubscriptions || deepClone(initialData.userSubscriptions),
      customSectors: clonedData.customSectors || deepClone(initialData.customSectors),
      bankSectorRules: clonedData.bankSectorRules || deepClone(initialData.bankSectorRules),
      pensionRulesLibrary: clonedData.pensionRulesLibrary || deepClone(initialData.pensionRulesLibrary),
      approvedSalaryRules: clonedData.approvedSalaryRules || clonedData.approvedSalaryDbRules || deepClone(fallbackApprovedSalaryRules),
      pensionDbRules: clonedData.pensionDbRules || deepClone(fallbackPensionRules),
      sectorMappings: clonedData.sectorMappings || deepClone(fallbackSectorMappings),
    };
    setSavedSettings(merged);
  };

  // Consume from custom AuthProvider
  const { user, setUser, profile, isOwner, isAdmin, isStaff, canAccessDashboard, signOut, loading: authLoading } = useAuth();
  
  const getNormalizedRole = () => {
    if (profile?.email === 'admin@hesba.com' || user?.email === 'admin@hesba.com') return 'admin';
    return 'user';
  };
  const userRole = getNormalizedRole();

  const {
    settings,
    loading: settingsLoading,
    initialized: settingsInitialized,
    supabaseFetched,
  } = useSettings();

  const [tiersLoaded, setTiersLoaded] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);
  const isSettingsLoading = settingsLoading || !supabaseFetched || !tiersLoaded || !hasSynced;

  // Load housing support tiers and advance payment tiers once on mount
  useEffect(() => {
    let active = true;
    async function loadTiers() {
      let hSupport = [];
      let aPayment = [];

      try {
        hSupport = await fetchHousingSupportTiers();
      } catch (err) {
        console.error("Failed to fetch housing support tiers:", err);
      }

      try {
        aPayment = await fetchAdvancePaymentTiers();
      } catch (err) {
        console.error("Failed to fetch advance payment tiers:", err);
      }

      if (active) {
        if (hSupport && hSupport.length > 0) {
          setHousingSupportTiers(hSupport);
        }
        if (aPayment && aPayment.length > 0) {
          setAdvancePaymentTiers(aPayment);
        }
        setTiersLoaded(true);
      }
    }
    loadTiers();
    return () => { active = false; };
  }, []);

  // Sync settings when loaded from the useSettings hook
  useEffect(() => {
    if (settingsInitialized && supabaseFetched && tiersLoaded && !hasSynced) {
      const merged: AdminSettings = {
        banks: settings.banks || initialData.banks,
        products: settings.product_acceptance || initialData.products,
        militaryRanks: (settings.military_ranks && Array.isArray(settings.military_ranks) && settings.military_ranks.length > 0) ? settings.military_ranks : initialData.militaryRanks,
        salaryRules: settings.salary_rules || initialData.salaryRules,
        pensionRules: settings.pension_rules || initialData.pensionRules,
        termRules: settings.term_rules || initialData.termRules,
        marginRules: upgradeMarginRules(settings.margin_rules || []),
        dsrRules: normalizeDsrRules(
          (settings.dsrRules !== undefined && settings.dsrRules !== null)
            ? settings.dsrRules
            : ((settings.dsr_rules !== undefined && settings.dsr_rules !== null)
              ? settings.dsr_rules
              : initialData.dsrRules)
        ),
        supportSettings: settings.support_settings || initialData.supportSettings,
        housingSupportTiers: housingSupportTiers.length > 0 ? housingSupportTiers : initialData.housingSupportTiers,
        advancePaymentTiers: advancePaymentTiers.length > 0 ? advancePaymentTiers : initialData.advancePaymentTiers,
        personalRules: settings.personal_finance_rules || initialData.personalRules,
        advancedRules: settings.advanced_rules || initialData.advancedRules,
        userSubscriptions: settings.user_subscriptions || initialData.userSubscriptions,
        customSectors: settings.hasba_custom_sectors || defaultSectorsList,
        bankSectorRules: ensureBankSectorPensionRules(settings.banks || initialData.banks, settings.bank_sector_pension_rules || []),
        pensionRulesLibrary: settings.pension_rules_library || defaultLibraryRules,
        approvedSalaryRules: settings.approvedSalaryRules || fallbackApprovedSalaryRules,
        pensionDbRules: settings.pensionDbRules || fallbackPensionRules,
        sectorMappings: settings.sectorMappings || fallbackSectorMappings,
      };

      applySettingsState(merged);
      setHasSynced(true);
    }
  }, [settingsInitialized, supabaseFetched, tiersLoaded, settings, hasSynced, housingSupportTiers, advancePaymentTiers]);

  useEffect(() => {
    if (!isSettingsLoading) {
      console.log('[APP BOOT] settingsReady=true usersReady=true diagnosticsReady=true');
    }
  }, [isSettingsLoading]);

  // Synchronise path for diagnostics direct link route
  useEffect(() => {
    const isDiagnostics = window.location.pathname === '/admin/diagnostics' || window.location.hash === '#/admin/diagnostics';
    if (isDiagnostics) {
      setActiveNav('admin');
      setAdminSubPage('diagnostics');
    }
  }, []);

  const currentSettings: AdminSettings = {
    banks,
    products,
    militaryRanks,
    salaryRules,
    pensionRules,
    termRules,
    marginRules,
    dsrRules,
    supportSettings,
    housingSupportTiers,
    advancePaymentTiers,
    personalRules,
    advancedRules,
    userSubscriptions,
    customSectors,
    bankSectorRules,
    pensionRulesLibrary,
    approvedSalaryRules,
    pensionDbRules,
    sectorMappings,
  };

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const baselineSettingsRef = useRef<string | null>(null);

  useEffect(() => {
    if (isSettingsLoading) {
      setHasUnsavedChanges(false);
      baselineSettingsRef.current = null;
      return;
    }
    const currentStr = JSON.stringify(normalizeBeforeCompare(currentSettings));
    const savedStr = JSON.stringify(normalizeBeforeCompare(savedSettings));

    if (!baselineSettingsRef.current || baselineSettingsRef.current !== savedStr) {
      baselineSettingsRef.current = savedStr;
    }

    if (currentStr !== baselineSettingsRef.current) {
      setHasUnsavedChanges(true);
    } else {
      setHasUnsavedChanges(false);
    }
  }, [currentSettings, savedSettings, isSettingsLoading]);

  const saveChanges = async () => {
    const clonedCurrent = deepClone(currentSettings);
    // Save dynamically to centralized 'app_settings' in system_settings table
    if (hasSupabaseKeys) {
      try {
        const currentSettingsObject = {
          // camelCase properties ONLY
          banks,
          products,
          militaryRanks,
          salaryRules,
          pensionRules,
          termRules,
          marginRules,
          dsrRules,
          supportSettings,
          housingSupportTiers,
          advancePaymentTiers,
          personalRules,
          advancedRules,
          customSectors,
          bankSectorRules,
          pensionRulesLibrary,
          approvedSalaryRules: currentSettings.approvedSalaryRules || currentSettings.approvedSalaryDbRules || [],
          pensionDbRules: currentSettings.pensionDbRules || [],
          sectorMappings: currentSettings.sectorMappings || [],
        };

        const updated_by_user = user?.email || user?.id || null;
        const payload: any = {
          key: 'app_settings',
          value: currentSettingsObject,
          source: 'admin',
          updated_at: new Date().toISOString()
        };
        if (updated_by_user) {
          payload.updated_by = updated_by_user;
        }

        const { error } = await supabase.from('system_settings').upsert(payload);
        if (error) {
          throw error;
        }
        
        console.log("All settings successfully synced to centralized app_settings in system_settings database");
        console.log('[SETTINGS] admin saved key successfully: app_settings');

        // ONLY save snapshot state on SUCCESSFUL Supabase write
        setSavedSettings(clonedCurrent);
      } catch (err: any) {
        console.error("Failed to save app_settings to Supabase:", err);
        throw err;
      }
    } else {
      // Local setup fallback
      setSavedSettings(clonedCurrent);
    }
  };

  const cancelChanges = () => {
    applySettingsState(deepClone(savedSettings));
  };

  const reinitializeAllSettings = async () => {
    throw new Error('إعادة تهيئة الإعدادات معطلة لحماية بيانات Supabase');
  };

  return (
    <AppContext.Provider
      value={{
        banks,
        setBanks,
        products,
        setProducts,
        militaryRanks,
        setMilitaryRanks,
        salaryRules,
        setSalaryRules,
        pensionRules,
        setPensionRules,
        termRules,
        setTermRules,
        marginRules,
        setMarginRules,
        dsrRules,
        setDsrRules,
        supportSettings,
        setSupportSettings,
        approvedSalaryRules,
        setApprovedSalaryRules,
        pensionDbRules,
        setPensionDbRules,
        sectorMappings,
        setSectorMappings,
        housingSupportTiers,
        setHousingSupportTiers,
        advancePaymentTiers,
        setAdvancePaymentTiers,
        personalRules,
        setPersonalRules,
        advancedRules,
        setAdvancedRules,
        calculationLogs,
        setCalculationLogs,
        userSubscriptions,
        setUserSubscriptions,
        customSectors,
        setCustomSectors,
        bankSectorRules,
        setBankSectorRules,
        pensionRulesLibrary,
        setPensionRulesLibrary,
        activeNav,
        setActiveNav,
        adminSubPage,
        setAdminSubPage,
        activeStepLabel,
        setActiveStepLabel,
        currentStep,
        setCurrentStep,
        results,
        setResults,
        isMobileSettingsOpen,
        setIsMobileSettingsOpen,
        hasUnsavedChanges,
        saveChanges,
        cancelChanges,
        reinitializeAllSettings,

        // Auth
        user,
        setUser,
        userRole,
        authLoading,
        isSettingsLoading,
        signOut
      }}
    >
      <div dir="rtl" className="min-h-screen bg-[#F5F7FA] font-sans antialiased text-[#111827]">
        {children}
      </div>
    </AppContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}
