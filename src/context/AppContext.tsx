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
  AdvancePaymentTier,
  SubscriptionSettings
} from '../types';

import {
  initialBanks,
  initialProductAcceptance,
  initialMilitaryRanks,
  initialSalaryRules,
  initialPensionRules,
  initialTermRules,
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

import { supabase, hasSupabaseKeys, clearAppSettingsCache } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BankSectorPensionRule, PensionLibraryRule } from '../types/pension-rules';
import { defaultLibraryRules } from '../lib/finance-engine/pension';
import { useSettings } from '../hooks/useSettings';
import { normalizeDsrRules } from '../lib/settings/normalizeDsrRules';

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
  subscriptionSettings: SubscriptionSettings;
  setSubscriptionSettings: React.Dispatch<React.SetStateAction<SubscriptionSettings>>;

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
  saveChanges: (
    overrideMarginRules?: MarginRule[],
    overrideBankSectorRules?: BankSectorPensionRule[],
    overridePensionDbRules?: any[],
    overrideApprovedSalaryRules?: any[]
  ) => Promise<void>;
  cancelChanges: () => void;
  reinitializeAllSettings: () => Promise<void>;
  restoreLastBackup: () => Promise<void>;

  supabaseLoadStatus: 'loading' | 'success' | 'failed' | 'empty_db' | 'read_only_protected' | 'slow_connection';
  supabaseLoadError: string | null;
  isTemporaryFallback: boolean;

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
  subscriptionSettings?: SubscriptionSettings;
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

function sanitizeBanksForPersistence(banks: Bank[]): Bank[] {
  return banks.map(bank => {
    const {
      realEstateFinanceEnabled,
      personalFinanceEnabled,
      combinedFinanceEnabled,
      existingPersonalFinanceEnabled,
      etizazSupportEnabled,
      minRealEstateAmount,
      maxRealEstateAmount,
      minPersonalAmount,
      maxPersonalAmount,
      maxTermMonths,
      maxAgeAtEnd,
      allowAfterRetirement,
      monthsAfterRetirement,
      ...identityBank
    } = bank as any;

    return identityBank as Bank;
  });
}

function normalizeSettingsForDirtyCompare(settings: AdminSettings): AdminSettings {
  if (!settings) return settings;
  const cloned = deepClone(settings) as any;
  
  const normalized: AdminSettings = {
    banks: sanitizeBanksForPersistence(cloned.banks || []),
    products: cloned.products ?? cloned.product_acceptance ?? [],
    militaryRanks: cloned.militaryRanks ?? cloned.military_ranks ?? [],
    salaryRules: cloned.salaryRules ?? cloned.salary_rules ?? [],
    pensionRules: cloned.pensionRules ?? cloned.pension_rules ?? [],
    termRules: cloned.termRules ?? cloned.term_rules ?? [],
    marginRules: cloned.marginRules ?? cloned.margin_rules ?? [],
    dsrRules: cloned.dsrRules ?? cloned.dsr_rules ?? [],
    supportSettings: cloned.supportSettings ?? cloned.support_settings ?? {},
    subscriptionSettings: cloned.subscriptionSettings ?? cloned.subscription_settings,
    housingSupportTiers: cloned.housingSupportTiers ?? cloned.housing_support_tiers ?? [],
    advancePaymentTiers: cloned.advancePaymentTiers ?? cloned.advance_payment_tiers ?? [],
    personalRules: cloned.personalRules ?? cloned.personal_finance_rules ?? [],
    advancedRules: cloned.advancedRules ?? cloned.advanced_rules ?? [],
    userSubscriptions: cloned.userSubscriptions ?? cloned.user_subscriptions ?? [],
    customSectors: cloned.customSectors ?? cloned.hasba_custom_sectors ?? [],
    bankSectorRules: cloned.bankSectorRules ?? cloned.bank_sector_pension_rules ?? [],
    pensionRulesLibrary: cloned.pensionRulesLibrary ?? cloned.pension_rules_library ?? [],
    approvedSalaryRules: cloned.approvedSalaryRules ?? cloned.approvedSalaryDbRules ?? cloned.approved_salary_rules ?? cloned.approved_salary_db_rules ?? [],
    pensionDbRules: cloned.pensionDbRules ?? cloned.pension_db_rules ?? [],
    sectorMappings: cloned.sectorMappings ?? cloned.sector_mappings ?? [],
  };

  return normalized;
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
    
    // Check if this object is a MarginRule or MarginException to apply specific filters
    const isMarginRule = ('bankId' in val) && (('productId' in val) || ('isExceptionOnly' in val)) && !('minSalary' in val || 'allowedSectors' in val || 'defaultRejectionMessage' in val);

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
      
      // For MarginRules, ignore purely UI metadata/transient keys and generated/arbitrary IDs
      if (isMarginRule && [
        'id',
        'productType',
        'marginInputMode',
        'calculationMethod',
        'year',
        'termMonths',
        'annualMargin',
        'fromMonth',
        'toMonth',
        'marginRate',
        'notes',
        'active',
        'isActive',
        'yearPoint'
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

const defaultSubscriptionSettings: SubscriptionSettings = {
  activationWhatsappNumber: '966551234567',
  activationWhatsappMessage: 'مرحبًا، أريد تفعيل اشتراك حسبة.'
};

const getInitialSettings = (): AdminSettings => {
  return {
    banks: initialBanks,
    products: initialProductAcceptance,
    militaryRanks: initialMilitaryRanks,
    salaryRules: initialSalaryRules,
    pensionRules: initialPensionRules,
    termRules: initialTermRules,
    marginRules: [],
    dsrRules: initialDsrRules,
    supportSettings: initialSupportSettings,
    subscriptionSettings: defaultSubscriptionSettings,
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

function isEqual(a: any, b: any) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function calculateMarginsHash(rules: MarginRule[]): string {
  const normalized = normalizeBeforeCompare(rules || []);
  const str = JSON.stringify(normalized);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return String(hash);
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const initialData = getInitialSettings();

  const [banks, setBanksState] = useState<Bank[]>(initialData.banks);
  const setBanks = React.useCallback((val: Bank[] | ((prev: Bank[]) => Bank[])) => {
    setBanksState(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      if (isEqual(prev, next)) return prev;
      return next;
    });
  }, []);

  const [products, setProductsState] = useState<ProductAcceptance[]>(initialData.products);
  const setProducts = React.useCallback((val: ProductAcceptance[] | ((prev: ProductAcceptance[]) => ProductAcceptance[])) => {
    setProductsState(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      if (isEqual(prev, next)) return prev;
      return next;
    });
  }, []);

  useEffect(() => {
    setBanksState(prevBanks => {
      let changed = false;
      const nextBanks = prevBanks.map(bk => {
        const realEstateOnlyRule = products.find(p => p.bankId === bk.id && p.productId === 'real_estate_only');
        const personalOnlyRule = products.find(p => p.bankId === bk.id && p.productId === 'personal_only');
        const combinedRule = products.find(p => p.bankId === bk.id && p.productId === 'real_estate_with_new_personal');
        const existingCombinedRule = products.find(p => p.bankId === bk.id && p.productId === 'real_estate_with_existing_personal');

        const reEnabled = realEstateOnlyRule ? realEstateOnlyRule.isActive !== false : bk.realEstateFinanceEnabled;
        const peEnabled = personalOnlyRule ? personalOnlyRule.isActive !== false : bk.personalFinanceEnabled;
        const combEnabled = combinedRule ? combinedRule.isActive !== false : bk.combinedFinanceEnabled;
        const existCombEnabled = existingCombinedRule ? existingCombinedRule.isActive !== false : bk.existingPersonalFinanceEnabled;

        const activeBkRules = products.filter(p => p.bankId === bk.id && p.isActive !== false);
        const supportsEtizaz = activeBkRules.some(r => {
          if (Array.isArray(r.allowedSupportTypes)) {
            return r.allowedSupportTypes.includes('etizaz');
          }
          return false;
        });

        const minRE = realEstateOnlyRule?.minRealEstateAmount !== undefined ? realEstateOnlyRule.minRealEstateAmount : bk.minRealEstateAmount;
        const maxRE = realEstateOnlyRule?.maxRealEstateAmount !== undefined ? realEstateOnlyRule.maxRealEstateAmount : bk.maxRealEstateAmount;
        const minPE = personalOnlyRule?.minPersonalAmount !== undefined ? personalOnlyRule.minPersonalAmount : bk.minPersonalAmount;
        const maxPE = personalOnlyRule?.maxPersonalAmount !== undefined ? personalOnlyRule.maxPersonalAmount : bk.maxPersonalAmount;

        const isDifferent = 
          bk.realEstateFinanceEnabled !== reEnabled ||
          bk.personalFinanceEnabled !== peEnabled ||
          bk.combinedFinanceEnabled !== combEnabled ||
          bk.existingPersonalFinanceEnabled !== existCombEnabled ||
          bk.etizazSupportEnabled !== supportsEtizaz ||
          bk.minRealEstateAmount !== minRE ||
          bk.maxRealEstateAmount !== maxRE ||
          bk.minPersonalAmount !== minPE ||
          bk.maxPersonalAmount !== maxPE;

        if (isDifferent) {
          changed = true;
          return {
            ...bk,
            realEstateFinanceEnabled: reEnabled,
            personalFinanceEnabled: peEnabled,
            combinedFinanceEnabled: combEnabled,
            existingPersonalFinanceEnabled: existCombEnabled,
            etizazSupportEnabled: supportsEtizaz,
            minRealEstateAmount: minRE,
            maxRealEstateAmount: maxRE,
            minPersonalAmount: minPE,
            maxPersonalAmount: maxPE
          };
        }
        return bk;
      });

      if (changed) {
        return nextBanks;
      }
      return prevBanks;
    });
  }, [products]);

  const [militaryRanks, setMilitaryRanksState] = useState<MilitaryRank[]>(initialData.militaryRanks);
  const setMilitaryRanks = React.useCallback((val: MilitaryRank[] | ((prev: MilitaryRank[]) => MilitaryRank[])) => {
    setMilitaryRanksState(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      if (isEqual(prev, next)) return prev;
      return next;
    });
  }, []);

  const [salaryRules, setSalaryRulesState] = useState<NetSalaryRule[]>(initialData.salaryRules);
  const setSalaryRules = React.useCallback((val: NetSalaryRule[] | ((prev: NetSalaryRule[]) => NetSalaryRule[])) => {
    setSalaryRulesState(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      if (isEqual(prev, next)) return prev;
      return next;
    });
  }, []);

  const [pensionRules, setPensionRulesState] = useState<PensionRule[]>(initialData.pensionRules);
  const setPensionRules = React.useCallback((val: PensionRule[] | ((prev: PensionRule[]) => PensionRule[])) => {
    setPensionRulesState(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      if (isEqual(prev, next)) return prev;
      return next;
    });
  }, []);

  const [termRules, setTermRulesState] = useState<TermRule[]>(initialData.termRules);
  const setTermRules = React.useCallback((val: TermRule[] | ((prev: TermRule[]) => TermRule[])) => {
    setTermRulesState(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      if (isEqual(prev, next)) return prev;
      return next;
    });
  }, []);

  const [marginRules, setMarginRulesState] = useState<MarginRule[]>(initialData.marginRules);
  const setMarginRules = React.useCallback((val: MarginRule[] | ((prev: MarginRule[]) => MarginRule[])) => {
    setMarginRulesState(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      if (isEqual(prev, next)) return prev;
      return next;
    });
  }, []);

  const [dsrRules, setDsrRulesState] = useState<DsrRule[]>(initialData.dsrRules);
  const setDsrRules = React.useCallback((val: DsrRule[] | ((prev: DsrRule[]) => DsrRule[])) => {
    setDsrRulesState(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      if (isEqual(prev, next)) return prev;
      return next;
    });
  }, []);

  const [supportSettings, setSupportSettingsState] = useState<SupportSettings>(initialData.supportSettings);
  const setSupportSettings = React.useCallback((val: SupportSettings | ((prev: SupportSettings) => SupportSettings)) => {
    setSupportSettingsState(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      if (isEqual(prev, next)) return prev;
      return next;
    });
  }, []);

  const [subscriptionSettings, setSubscriptionSettingsState] = useState<SubscriptionSettings>(initialData.subscriptionSettings || defaultSubscriptionSettings);
  const setSubscriptionSettings = React.useCallback((val: SubscriptionSettings | ((prev: SubscriptionSettings) => SubscriptionSettings)) => {
    setSubscriptionSettingsState(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      if (isEqual(prev, next)) return prev;
      return next;
    });
  }, []);

  const [housingSupportTiers, setHousingSupportTiersState] = useState<HousingSupportTier[]>(initialData.housingSupportTiers);
  const setHousingSupportTiers = React.useCallback((val: HousingSupportTier[] | ((prev: HousingSupportTier[]) => HousingSupportTier[])) => {
    setHousingSupportTiersState(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      if (isEqual(prev, next)) return prev;
      return next;
    });
  }, []);

  const [advancePaymentTiers, setAdvancePaymentTiersState] = useState<AdvancePaymentTier[]>(initialData.advancePaymentTiers);
  const setAdvancePaymentTiers = React.useCallback((val: AdvancePaymentTier[] | ((prev: AdvancePaymentTier[]) => AdvancePaymentTier[])) => {
    setAdvancePaymentTiersState(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      if (isEqual(prev, next)) return prev;
      return next;
    });
  }, []);

  const [personalRules, setPersonalRulesState] = useState<PersonalFinanceRules[]>(initialData.personalRules);
  const setPersonalRules = React.useCallback((val: PersonalFinanceRules[] | ((prev: PersonalFinanceRules[]) => PersonalFinanceRules[])) => {
    setPersonalRulesState(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      if (isEqual(prev, next)) return prev;
      return next;
    });
  }, []);

  const [advancedRules, setAdvancedRulesState] = useState<AdvancedRule[]>(initialData.advancedRules);
  const setAdvancedRules = React.useCallback((val: AdvancedRule[] | ((prev: AdvancedRule[]) => AdvancedRule[])) => {
    setAdvancedRulesState(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      if (isEqual(prev, next)) return prev;
      return next;
    });
  }, []);

  const [approvedSalaryRules, setApprovedSalaryRulesState] = useState<any[]>([]);
  const setApprovedSalaryRules = React.useCallback((val: any[] | ((prev: any[]) => any[])) => {
    setApprovedSalaryRulesState(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      if (isEqual(prev, next)) return prev;
      return next;
    });
  }, []);

  const [pensionDbRules, setPensionDbRulesState] = useState<any[]>([]);
  const setPensionDbRules = React.useCallback((val: any[] | ((prev: any[]) => any[])) => {
    setPensionDbRulesState(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      if (isEqual(prev, next)) return prev;
      return next;
    });
  }, []);

  const [sectorMappings, setSectorMappingsState] = useState<any[]>([]);
  const setSectorMappings = React.useCallback((val: any[] | ((prev: any[]) => any[])) => {
    setSectorMappingsState(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      if (isEqual(prev, next)) return prev;
      return next;
    });
  }, []);

  const [calculationLogs, setCalculationLogs] = useState<CalculationLog[]>(initialCalculationLogs);
  const [userSubscriptions, setUserSubscriptions] = useState<UserSubscription[]>(initialData.userSubscriptions || initialUserSubscriptions);

  const [customSectors, setCustomSectorsState] = useState<any[]>(initialData.customSectors || defaultSectorsList);
  const setCustomSectors = React.useCallback((val: any[] | ((prev: any[]) => any[])) => {
    setCustomSectorsState(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      if (isEqual(prev, next)) return prev;
      return next;
    });
  }, []);

  const [bankSectorRules, setBankSectorRulesState] = useState<BankSectorPensionRule[]>(initialData.bankSectorRules || []);
  const setBankSectorRules = React.useCallback((val: BankSectorPensionRule[] | ((prev: BankSectorPensionRule[]) => BankSectorPensionRule[])) => {
    setBankSectorRulesState(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      if (isEqual(prev, next)) return prev;
      return next;
    });
  }, []);

  const [pensionRulesLibrary, setPensionRulesLibraryState] = useState<PensionLibraryRule[]>(initialData.pensionRulesLibrary || defaultLibraryRules);
  const setPensionRulesLibrary = React.useCallback((val: PensionLibraryRule[] | ((prev: PensionLibraryRule[]) => PensionLibraryRule[])) => {
    setPensionRulesLibraryState(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      if (isEqual(prev, next)) return prev;
      return next;
    });
  }, []);

  const [activeNav, setActiveNav] = useState<'calculator' | 'admin'>('calculator');
  const [adminSubPage, setAdminSubPage] = useState<string>('banks');
  const [activeStepLabel, setActiveStepLabel] = useState<string>('نوع الحسبة');
  const [currentStep, setCurrentStep] = useState<number>(() => {
    try {
      const raw = sessionStorage.getItem('hesba_calculator_draft');
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

  const [savedSettings, setSavedSettingsState] = useState<AdminSettings>(initialData);
  const setSavedSettings = React.useCallback((val: AdminSettings | ((prev: AdminSettings) => AdminSettings)) => {
    setSavedSettingsState(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      if (isEqual(prev, next)) return prev;
      return next;
    });
  }, []);

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
    if (clonedData.subscriptionSettings) setSubscriptionSettings(clonedData.subscriptionSettings);
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
      banks: clonedData.banks ?? deepClone(initialData.banks),
      products: clonedData.products ?? deepClone(initialData.products),
      militaryRanks: clonedData.militaryRanks ?? deepClone(initialData.militaryRanks),
      salaryRules: clonedData.salaryRules ?? deepClone(initialData.salaryRules),
      pensionRules: clonedData.pensionRules ?? deepClone(initialData.pensionRules),
      termRules: clonedData.termRules ?? deepClone(initialData.termRules),
      marginRules: (() => {
        if (clonedData.marginRules !== undefined) {
          return upgradeMarginRules(clonedData.marginRules);
        }
        return marginRules;
      })(),
      dsrRules: clonedData.dsrRules ?? deepClone(initialData.dsrRules),
      supportSettings: clonedData.supportSettings ?? deepClone(initialData.supportSettings),
      subscriptionSettings: clonedData.subscriptionSettings ?? deepClone(initialData.subscriptionSettings),
      housingSupportTiers: clonedData.housingSupportTiers ?? deepClone(initialData.housingSupportTiers),
      advancePaymentTiers: clonedData.advancePaymentTiers ?? deepClone(initialData.advancePaymentTiers),
      personalRules: clonedData.personalRules ?? deepClone(initialData.personalRules),
      advancedRules: clonedData.advancedRules ?? deepClone(initialData.advancedRules),
      userSubscriptions: clonedData.userSubscriptions ?? deepClone(initialData.userSubscriptions),
      customSectors: clonedData.customSectors ?? deepClone(initialData.customSectors),
      bankSectorRules: clonedData.bankSectorRules ?? deepClone(initialData.bankSectorRules),
      pensionRulesLibrary: clonedData.pensionRulesLibrary ?? deepClone(initialData.pensionRulesLibrary),
      approvedSalaryRules: clonedData.approvedSalaryRules ?? clonedData.approvedSalaryDbRules ?? approvedSalaryRules,
      pensionDbRules: clonedData.pensionDbRules ?? pensionDbRules,
      sectorMappings: clonedData.sectorMappings ?? sectorMappings,
    };
    setSavedSettings(merged);
  };

  // Consume from custom AuthProvider
  const { user, setUser, profile, isOwner, isAdmin, isStaff, canAccessDashboard, signOut: rawSignOut, loading: authLoading } = useAuth();
  
  const signOut = React.useCallback(async () => {
    setResults(null);
    setCurrentStep(1);
    try {
      sessionStorage.removeItem('hesba_calculator_draft');
      localStorage.removeItem('hesba_calculator_draft');
      localStorage.removeItem('hasba_saved_results_local');
      localStorage.removeItem('hasba_saved_results_local_backup');
      sessionStorage.removeItem('hasba_saved_results_local');
      sessionStorage.removeItem('hasba_saved_results_local_backup');
    } catch (e) {}
    await rawSignOut();
  }, [rawSignOut]);
  
  const userRole: 'admin' | 'user' = isAdmin ? 'admin' : 'user';

  const {
    settings,
    loading: settingsLoading,
    initialized: settingsInitialized,
    supabaseFetched,
    supabaseLoadStatus,
    setSupabaseLoadStatus,
    supabaseLoadError,
    isTemporaryFallback,
    fetchSettings,
  } = useSettings();

  const [loadedMarginsHash, setLoadedMarginsHash] = useState<string | null>(null);

  const [tiersLoaded, setTiersLoaded] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);
  const [forceReady, setForceReady] = useState(false);
  const [supabaseValuesSynced, setSupabaseValuesSynced] = useState(false);
  const syncedForStatusRef = useRef<string>('');
  
  const isSettingsLoading = !forceReady && (settingsLoading || !supabaseFetched || !tiersLoaded || !hasSynced) && supabaseLoadStatus !== 'failed';

  // Master safety timeout to guarantee the control panel loading screen closed within 2.2 seconds.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (settingsLoading || !supabaseFetched || !tiersLoaded || !hasSynced) {
        console.warn('[MASTER TIMER] Dashboard settings took too long to load (>2.2s). Activating forceReady override.');
        setTiersLoaded(true);
        setHasSynced(true);
        setForceReady(true);
      }
    }, 2200);
    return () => clearTimeout(timer);
  }, [settingsLoading, supabaseFetched, tiersLoaded, hasSynced]);

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
    const meritsSync = !supabaseValuesSynced || (supabaseLoadStatus === 'success' && syncedForStatusRef.current !== 'success');

    if (settingsInitialized && supabaseFetched && tiersLoaded && meritsSync) {
      const merged: AdminSettings = {
        banks: (settings.banks !== undefined && settings.banks !== null) ? settings.banks : initialData.banks,
        products: (settings.product_acceptance !== undefined && settings.product_acceptance !== null) ? settings.product_acceptance : initialData.products,
        militaryRanks: (settings.military_ranks !== undefined && settings.military_ranks !== null) ? settings.military_ranks : initialData.militaryRanks,
        salaryRules: (settings.salary_rules !== undefined && settings.salary_rules !== null) ? settings.salary_rules : initialData.salaryRules,
        pensionRules: (settings.pension_rules !== undefined && settings.pension_rules !== null) ? settings.pension_rules : initialData.pensionRules,
        termRules: (settings.term_rules !== undefined && settings.term_rules !== null) ? settings.term_rules : initialData.termRules,
        marginRules: (() => {
          const raw = settings.margin_rules ?? settings.marginRules ?? null;
          if (raw === null || raw === undefined) {
            console.warn('[SYNC] margin_rules missing from settings — keeping existing state');
            return marginRules; // ← ابقَ على الـ state الحالي
          }
          return upgradeMarginRules(raw);
        })(),
        dsrRules: normalizeDsrRules(
          (settings.dsrRules !== undefined && settings.dsrRules !== null)
            ? settings.dsrRules
            : ((settings.dsr_rules !== undefined && settings.dsr_rules !== null)
              ? settings.dsr_rules
              : initialData.dsrRules)
        ),
        supportSettings: (() => {
          const loadedSupport = settings.support_settings ?? settings.supportSettings ?? null;
          if (loadedSupport === null || loadedSupport === undefined) {
            return initialData.supportSettings;
          }
          if (!loadedSupport.etizaz) {
            return {
              ...loadedSupport,
              etizaz: initialData.supportSettings.etizaz
            };
          }
          return loadedSupport;
        })(),
        housingSupportTiers: (housingSupportTiers !== undefined && housingSupportTiers !== null && housingSupportTiers.length > 0) ? housingSupportTiers : initialData.housingSupportTiers,
        advancePaymentTiers: (advancePaymentTiers !== undefined && advancePaymentTiers !== null && advancePaymentTiers.length > 0) ? advancePaymentTiers : initialData.advancePaymentTiers,
        personalRules: (settings.personal_finance_rules !== undefined && settings.personal_finance_rules !== null) ? settings.personal_finance_rules : initialData.personalRules,
        advancedRules: (settings.advanced_rules !== undefined && settings.advanced_rules !== null) ? settings.advanced_rules : initialData.advancedRules,
        userSubscriptions: (settings.user_subscriptions !== undefined && settings.user_subscriptions !== null) ? settings.user_subscriptions : initialData.userSubscriptions,
        subscriptionSettings: settings.subscription_settings ?? settings.subscriptionSettings ?? initialData.subscriptionSettings,
        customSectors: (settings.hasba_custom_sectors !== undefined && settings.hasba_custom_sectors !== null) ? settings.hasba_custom_sectors : defaultSectorsList,
        bankSectorRules: ensureBankSectorPensionRules(
          (settings.banks !== undefined && settings.banks !== null) ? settings.banks : initialData.banks,
          (settings.bank_sector_pension_rules !== undefined && settings.bank_sector_pension_rules !== null) ? settings.bank_sector_pension_rules : []
        ),
        pensionRulesLibrary: (settings.pension_rules_library !== undefined && settings.pension_rules_library !== null) ? settings.pension_rules_library : defaultLibraryRules,
        approvedSalaryRules: (settings.approvedSalaryRules !== undefined && settings.approvedSalaryRules !== null) ? settings.approvedSalaryRules : [],
        pensionDbRules: (settings.pensionDbRules !== undefined && settings.pensionDbRules !== null) ? settings.pensionDbRules : [],
        sectorMappings: (settings.sectorMappings !== undefined && settings.sectorMappings !== null) ? settings.sectorMappings : [],
      };

      // Guard: لو marginRules فارغ لكن Supabase load نجح → ابقَ على الـ state القديم
      if (
        supabaseLoadStatus === 'success' &&
        Array.isArray(merged.marginRules) &&
        merged.marginRules.length === 0 &&
        Array.isArray(marginRules) &&
        marginRules.length > 0
      ) {
        console.warn('[SYNC GUARD] marginRules arrived empty from settings but state has', marginRules.length, 'rules. Keeping existing state.');
        merged.marginRules = marginRules; // ابقَ على الـ state الحالي
      }

      const computedHash = calculateMarginsHash(merged.marginRules || []);
      setLoadedMarginsHash(computedHash);

      applySettingsState(merged);
      setHasSynced(true);
      setSupabaseValuesSynced(true);
      syncedForStatusRef.current = supabaseLoadStatus || '';
    }
  }, [settingsInitialized, supabaseFetched, tiersLoaded, settings, supabaseValuesSynced, housingSupportTiers, advancePaymentTiers, supabaseLoadStatus]);

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
    subscriptionSettings,
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
    const currentStr = JSON.stringify(
      normalizeBeforeCompare(normalizeSettingsForDirtyCompare(currentSettings))
    );
    const savedStr = JSON.stringify(
      normalizeBeforeCompare(normalizeSettingsForDirtyCompare(savedSettings))
    );

    if (!baselineSettingsRef.current || baselineSettingsRef.current !== savedStr) {
      baselineSettingsRef.current = savedStr;
    }

    if (currentStr !== baselineSettingsRef.current) {
      setHasUnsavedChanges(true);
    } else {
      setHasUnsavedChanges(false);
    }
  }, [currentSettings, savedSettings, isSettingsLoading]);

  const saveChanges = async (
    overrideMarginRules?: MarginRule[],
    overrideBankSectorRules?: BankSectorPensionRule[],
    overridePensionDbRules?: any[],
    overrideApprovedSalaryRules?: any[]
  ) => {
    // Stage 3 Protection: Disable saving on failed/loading/stale connections or falls
    if (supabaseLoadStatus !== 'success' || isTemporaryFallback) {
      throw new Error('🚫 تم تعطيل الحفظ: لم يتم التحقق وتعميد الاتصال بقاعدة بيانات Supabase بنجاح، أو أنك تعمل على نسخة احتياطية مؤقتة. يرجى إعادة الاتصال وحفظ التعديلات مجدداً.');
    }

    const clonedCurrent = deepClone(currentSettings);
    if (overrideMarginRules) clonedCurrent.marginRules = overrideMarginRules;
    if (overrideBankSectorRules) clonedCurrent.bankSectorRules = overrideBankSectorRules;
    if (overridePensionDbRules) clonedCurrent.pensionDbRules = overridePensionDbRules;
    if (overrideApprovedSalaryRules) {
      clonedCurrent.approvedSalaryRules = overrideApprovedSalaryRules;
      clonedCurrent.approvedSalaryDbRules = overrideApprovedSalaryRules;
    }

    if (hasSupabaseKeys) {
      try {
        let latestSettings: any = {};
        let dbMarginCount = 0;
        let dbFetchSucceeded = false;
        try {
          const fetchPromise = supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'app_settings')
            .maybeSingle();

          const response = await Promise.race([
            fetchPromise,
            new Promise<any>((_, reject) =>
              setTimeout(() => reject(new Error('timeout')), supabaseLoadStatus === 'slow_connection' ? 8000 : 25000)
            )
          ]);

          const { data: dbData, error } = response;
          if (error) throw error;

          if (dbData) {
            if (dbData.value) {
              latestSettings = dbData.value;
              const dbRules = latestSettings.marginRules ?? latestSettings.margin_rules ?? [];
              dbMarginCount = Array.isArray(dbRules) ? dbRules.length : 0;
            }
            dbFetchSucceeded = true;
          } else {
            // New empty DB setup
            dbFetchSucceeded = true;
          }
        } catch (fetchErr: any) {
          console.error("Safeguard: failed to pre-fetch database settings:", fetchErr);
          throw new Error('تعذر جلب وفحص آخر نسخة من الإعدادات في السيرفر. تأكد من جودة الاتصال ثم أعد المحاولة.');
        }

        if (!dbFetchSucceeded) {
          throw new Error('🚫 تم منع الحفظ: فشل تأكيد الاتصال الآمن بـ Supabase');
        }

        const currentMarginCount = Array.isArray(overrideMarginRules || marginRules) ? (overrideMarginRules || marginRules).length : 0;

        // DB safeguards validation - only when editing the margins page
        if (adminSubPage === 'margins') {
          if (dbMarginCount > 10 && currentMarginCount < dbMarginCount * 0.7) {
            throw new Error(`حماية سلامة البيانات: تم منع الحفظ بسبب تفاوت كبير في عدد الهوامش! يحتوي السيرفر على (${dbMarginCount}) هامش بينما تحتوي النسخة الحالية على (${currentMarginCount}) هوامش فقط (أقل من 70%). لمنع تصفير القواعد بالخطأ، يرجى إعادة تحميل الصفحة واستعادتها.`);
          }
          if (currentMarginCount === 0 && dbMarginCount > 0) {
            throw new Error('🚫 تم منع الحفظ: القواعد الجديدة فارغة ويخشى تصفير هوامش السيرفر.');
          }

          // Stage 5: Hash protection check for concurrent modifications
          const dbMarginRules = latestSettings.marginRules ?? latestSettings.margin_rules ?? [];
          const currentDbHash = calculateMarginsHash(dbMarginRules);
          
          if (loadedMarginsHash && currentDbHash !== loadedMarginsHash) {
            throw new Error('عذراً، تم تعديل قيم الهوامش من جلسة إدارة أخرى أو جهاز آخر متصل بقاعدة البيانات. لتجنب تضارب وحذف التعديلات، يرجى إعادة تحميل الصفحة قبل حفظ تعديلاتك.');
          }
        }

        // Stage 4: Construct payload base strictly from Latest Settings in DB, modifying only active sub-page keys
        const initialData = getInitialSettings();
        const mergedSettingsObject = latestSettings && typeof latestSettings === 'object' && Object.keys(latestSettings).length > 0
          ? deepClone(latestSettings)
          : {
              banks: deepClone(initialData.banks),
              products: deepClone(initialData.products),
              militaryRanks: deepClone(initialData.militaryRanks),
              salaryRules: deepClone(initialData.salaryRules),
              pensionRules: deepClone(initialData.pensionRules),
              termRules: deepClone(initialData.termRules),
              marginRules: [],
              dsrRules: deepClone(initialData.dsrRules),
              supportSettings: deepClone(initialData.supportSettings),
              subscriptionSettings: deepClone(initialData.subscriptionSettings),
              housingSupportTiers: deepClone(initialData.housingSupportTiers),
              advancePaymentTiers: deepClone(initialData.advancePaymentTiers),
              personalRules: deepClone(initialData.personalRules),
              advancedRules: deepClone(initialData.advancedRules),
              customSectors: deepClone(initialData.customSectors),
              bankSectorRules: [],
              pensionRulesLibrary: deepClone(initialData.pensionRulesLibrary),
              approvedSalaryRules: [],
              pensionDbRules: [],
              sectorMappings: [],
            };

        // Inject only active subpage sections
        switch (adminSubPage) {
          case 'banks':
            mergedSettingsObject.banks = sanitizeBanksForPersistence(deepClone(banks));
            break;
          case 'products':
            mergedSettingsObject.products = deepClone(products);
            break;
          case 'margins':
            mergedSettingsObject.marginRules = upgradeMarginRules(deepClone(overrideMarginRules || marginRules));
            if ('margin_rules' in mergedSettingsObject) {
              mergedSettingsObject.margin_rules = upgradeMarginRules(deepClone(overrideMarginRules || marginRules));
            }
            break;
          case 'dsr':
            mergedSettingsObject.dsrRules = deepClone(dsrRules);
            if ('dsr_rules' in mergedSettingsObject) {
              mergedSettingsObject.dsr_rules = deepClone(dsrRules);
            }
            break;
          case 'terms':
            mergedSettingsObject.termRules = deepClone(termRules);
            if ('term_rules' in mergedSettingsObject) {
              mergedSettingsObject.term_rules = deepClone(termRules);
            }
            break;
          case 'support':
            mergedSettingsObject.supportSettings = deepClone(supportSettings);
            if ('support_settings' in mergedSettingsObject) {
              mergedSettingsObject.support_settings = deepClone(supportSettings);
            }
            break;
          case 'personal':
            mergedSettingsObject.personalRules = deepClone(personalRules);
            if ('personal_finance_rules' in mergedSettingsObject) {
              mergedSettingsObject.personal_finance_rules = deepClone(personalRules);
            }
            break;
          case 'advanced':
            mergedSettingsObject.advancedRules = deepClone(advancedRules);
            if ('advanced_rules' in mergedSettingsObject) {
              mergedSettingsObject.advanced_rules = deepClone(advancedRules);
            }
            break;
          case 'subscriptions':
            mergedSettingsObject.subscriptionSettings = deepClone(subscriptionSettings);
            mergedSettingsObject.userSubscriptions = deepClone(userSubscriptions);
            if ('subscription_settings' in mergedSettingsObject) {
              mergedSettingsObject.subscription_settings = deepClone(subscriptionSettings);
            }
            if ('user_subscriptions' in mergedSettingsObject) {
              mergedSettingsObject.user_subscriptions = deepClone(userSubscriptions);
            }
            break;
          case 'salary':
            mergedSettingsObject.salaryRules = deepClone(salaryRules);
            mergedSettingsObject.approvedSalaryRules = deepClone(overrideApprovedSalaryRules || approvedSalaryRules);
            if ('salary_rules' in mergedSettingsObject) {
              mergedSettingsObject.salary_rules = deepClone(salaryRules);
            }
            if ('approved_salary_rules' in mergedSettingsObject) {
              mergedSettingsObject.approved_salary_rules = deepClone(overrideApprovedSalaryRules || approvedSalaryRules);
            }
            break;
          case 'pension':
            mergedSettingsObject.pensionRules = deepClone(pensionRules);
            mergedSettingsObject.bankSectorRules = deepClone(overrideBankSectorRules || bankSectorRules);
            mergedSettingsObject.pensionRulesLibrary = deepClone(pensionRulesLibrary);
            mergedSettingsObject.pensionDbRules = deepClone(overridePensionDbRules || pensionDbRules);
            mergedSettingsObject.customSectors = deepClone(customSectors);
            mergedSettingsObject.sectorMappings = deepClone(sectorMappings);
            if ('pension_rules' in mergedSettingsObject) {
              mergedSettingsObject.pension_rules = deepClone(pensionRules);
            }
            if ('bank_sector_pension_rules' in mergedSettingsObject) {
              mergedSettingsObject.bank_sector_pension_rules = deepClone(overrideBankSectorRules || bankSectorRules);
            }
            if ('pension_rules_library' in mergedSettingsObject) {
              mergedSettingsObject.pension_rules_library = deepClone(pensionRulesLibrary);
            }
            if ('hasba_custom_sectors' in mergedSettingsObject) {
              mergedSettingsObject.hasba_custom_sectors = deepClone(customSectors);
            }
            break;
          default:
            mergedSettingsObject.banks = sanitizeBanksForPersistence(deepClone(banks));
            mergedSettingsObject.products = deepClone(products);
            mergedSettingsObject.dsrRules = deepClone(dsrRules);
            mergedSettingsObject.supportSettings = deepClone(supportSettings);
            mergedSettingsObject.subscriptionSettings = deepClone(subscriptionSettings);
            mergedSettingsObject.personalRules = deepClone(personalRules);
            mergedSettingsObject.advancedRules = deepClone(advancedRules);
            mergedSettingsObject.userSubscriptions = deepClone(userSubscriptions);
            mergedSettingsObject.salaryRules = deepClone(salaryRules);
            mergedSettingsObject.approvedSalaryRules = deepClone(overrideApprovedSalaryRules || approvedSalaryRules);
            mergedSettingsObject.pensionRules = deepClone(pensionRules);
            mergedSettingsObject.bankSectorRules = deepClone(overrideBankSectorRules || bankSectorRules);
            mergedSettingsObject.pensionRulesLibrary = deepClone(pensionRulesLibrary);
            mergedSettingsObject.pensionDbRules = deepClone(overridePensionDbRules || pensionDbRules);
            mergedSettingsObject.customSectors = deepClone(customSectors);
            mergedSettingsObject.sectorMappings = deepClone(sectorMappings);
            break;
        }

        // Stage 4 Overwrite Protection: If active page is NOT margins, guarantee marginRules are NOT overwritten
        if (adminSubPage !== 'margins') {
          mergedSettingsObject.marginRules = latestSettings.marginRules ?? latestSettings.margin_rules ?? [];
          if ('margin_rules' in mergedSettingsObject) {
            mergedSettingsObject.margin_rules = latestSettings.marginRules ?? latestSettings.margin_rules ?? [];
          }
        }

        const updated_by_user = user?.email || user?.id || null;
        const payload: any = {
          key: 'app_settings',
          value: mergedSettingsObject,
          source: 'admin',
          updated_at: new Date().toISOString()
        };
        if (updated_by_user) {
          payload.updated_by = updated_by_user;
        }

        // Backup snapshot (Stage 2)
        try {
          const { data: currentSettingsSnapshot } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'app_settings')
            .maybeSingle();

          if (currentSettingsSnapshot?.value) {
            await supabase.from('app_settings_history').insert({
              snapshot: currentSettingsSnapshot.value
            });
            console.log('[BACKUP] Snapshot saved before update');
          }
        } catch (backupErr) {
          console.error('[BACKUP ERROR]', backupErr);
        }

        const { error } = await supabase.from('system_settings').upsert(payload);
        if (error) throw error;
        
        console.log("All settings successfully synced to centralized app_settings in system_settings database");
        console.log('[SETTINGS] admin saved key successfully: app_settings');

        // Stage 6 Cache cleanup: delete memory, sessionStorage and localStorage cache
        clearAppSettingsCache();
        try {
          localStorage.removeItem("hasba_settings_cache");
        } catch (e) {}

        // Fresh retrieve from Supabase to replace all client states safely
        await fetchSettings({ forceFresh: true });

        // Update local saved state snapshot
        setSavedSettings(mergedSettingsObject);
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

  const restoreLastBackup = async () => {
    alert('عملية استعادة النسخة الاحتياطية معطلة حالياً بشكل مباشر لضمان بقاء مصدر البيانات الفريد والآمن (system_settings -> app_settings). يمكن لمدير قاعدة البيانات استرجاعها يدوياً.');
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
        subscriptionSettings,
        setSubscriptionSettings,
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
        restoreLastBackup,
        reinitializeAllSettings,

        supabaseLoadStatus,
        supabaseLoadError,
        isTemporaryFallback,

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
