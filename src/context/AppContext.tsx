import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
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

  // Supabase Auth and Roles state
  user: any;
  setUser: React.Dispatch<React.SetStateAction<any>>;
  userRole: 'owner' | 'manager' | 'employee' | 'user' | null;
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
}

function upgradeMarginRules(rules: MarginRule[]): MarginRule[] {
  if (!rules || rules.length === 0) return initialMarginRules;
  let currentRules = rules;
  const hasNewRajhiRules = rules.some(r => r.bankId === 'rajhi' && r.id && r.id.startsWith('rajhi_gen_'));
  if (!hasNewRajhiRules) {
    const nonRajhiRules = rules.filter(r => r.bankId !== 'rajhi');
    const rajhiInitialRules = initialMarginRules.filter(r => r.bankId === 'rajhi');
    currentRules = [...nonRajhiRules, ...rajhiInitialRules];
  }

  const seenKeys = new Set<string>();
  const finalRules: MarginRule[] = [];

  for (const r of currentRules) {
    const rCopy = { ...r };
    if ('offerProfile' in rCopy) {
      delete (rCopy as any).offerProfile;
    }

    const key = `${rCopy.bankId}_${rCopy.productId}_${rCopy.supportType}_${rCopy.salaryTier || 'none'}_${rCopy.fromTermMonths}_${rCopy.toTermMonths}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      finalRules.push(rCopy);
    }
  }

  return finalRules;
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

  const [calculationLogs, setCalculationLogs] = useState<CalculationLog[]>(initialCalculationLogs);
  const [userSubscriptions, setUserSubscriptions] = useState<UserSubscription[]>(initialData.userSubscriptions || initialUserSubscriptions);

  const [activeNav, setActiveNav] = useState<'calculator' | 'admin'>('calculator');
  const [adminSubPage, setAdminSubPage] = useState<string>('banks');
  const [activeStepLabel, setActiveStepLabel] = useState<string>('نوع الحسبة');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [results, setResults] = useState<any[] | null>(null);
  const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState<boolean>(false);

  const [savedSettings, setSavedSettings] = useState<AdminSettings>(initialData);

  // Helper helper to correctly apply partial or full settings update to state and savedSettings
  const applySettingsState = (data: Partial<AdminSettings>) => {
    if (data.banks) setBanks(data.banks);
    if (data.products) setProducts(data.products);
    if (data.militaryRanks) setMilitaryRanks(data.militaryRanks);
    if (data.salaryRules) setSalaryRules(data.salaryRules);
    if (data.pensionRules) setPensionRules(data.pensionRules);
    if (data.termRules) setTermRules(data.termRules);
    if (data.marginRules) {
      setMarginRules(upgradeMarginRules(data.marginRules));
    }
    if (data.dsrRules) setDsrRules(data.dsrRules);
    if (data.supportSettings) setSupportSettings(data.supportSettings);
    if (data.housingSupportTiers) setHousingSupportTiers(data.housingSupportTiers);
    if (data.advancePaymentTiers) setAdvancePaymentTiers(data.advancePaymentTiers);
    if (data.personalRules) setPersonalRules(data.personalRules);
    if (data.advancedRules) setAdvancedRules(data.advancedRules);
    if (data.userSubscriptions) setUserSubscriptions(data.userSubscriptions);

    const merged: AdminSettings = {
      banks: data.banks || initialData.banks,
      products: data.products || initialData.products,
      militaryRanks: data.militaryRanks || initialData.militaryRanks,
      salaryRules: data.salaryRules || initialData.salaryRules,
      pensionRules: data.pensionRules || initialData.pensionRules,
      termRules: data.termRules || initialData.termRules,
      marginRules: data.marginRules ? upgradeMarginRules(data.marginRules) : initialData.marginRules,
      dsrRules: data.dsrRules || initialData.dsrRules,
      supportSettings: data.supportSettings || initialData.supportSettings,
      housingSupportTiers: data.housingSupportTiers || initialData.housingSupportTiers,
      advancePaymentTiers: data.advancePaymentTiers || initialData.advancePaymentTiers,
      personalRules: data.personalRules || initialData.personalRules,
      advancedRules: data.advancedRules || initialData.advancedRules,
      userSubscriptions: data.userSubscriptions || initialData.userSubscriptions,
    };
    setSavedSettings(merged);
  };

  // Consume from custom AuthProvider
  const { user, setUser, profile, isOwner, isAdmin, isStaff, canAccessDashboard, signOut, loading: authLoading } = useAuth();
  
  const getNormalizedRole = () => {
    let r = profile?.role || (isOwner ? 'owner' : (isAdmin ? 'manager' : (isStaff ? 'employee' : 'user')));
    if (r === 'admin') return 'owner';
    if (r === 'staff') return 'employee';
    if (r === 'customer') return 'user';
    return r;
  };
  const userRole = getNormalizedRole();

  const [isSettingsLoading, setIsSettingsLoading] = useState(true);

  // 1. Fetch from Supabase system_settings and initialize / sync on mount
  useEffect(() => {
    async function loadConfig() {
      if (!hasSupabaseKeys) {
        console.warn("Supabase configuration keys missing. Running with local browser persistent cache.");
        let fallbackLoaded = false;
        try {
          const cachedJson = localStorage.getItem("hasba_settings_cache") || localStorage.getItem("hasba_admin_settings");
          if (cachedJson) {
            const parsed = JSON.parse(cachedJson);
            applySettingsState(parsed);
            fallbackLoaded = true;
          }
        } catch (e) {
          console.error("Failed to parse cached settings:", e);
        }
        if (!fallbackLoaded) {
          applySettingsState(initialData);
        }
        setIsSettingsLoading(false);
        return;
      }
      setIsSettingsLoading(true);
      try {
        let rows: any[] = [];
        const fetchRes = await supabase
          .from('system_settings')
          .select('key, value, source');

        if (fetchRes.error) {
          const fbResult = await supabase
            .from('system_settings')
            .select('key, value');
          if (fbResult.error) {
            console.error("Error reading from system_settings table:", fbResult.error);
            throw fbResult.error;
          }
          rows = fbResult.data || [];
        } else {
          rows = fetchRes.data || [];
        }

        const presentRecords = new Map<string, { value: any, source?: string }>();
        for (const row of rows) {
          presentRecords.set(row.key, { value: row.value, source: row.source });
        }

        const DEFAULTS_MAP: Record<string, any> = {
          banks: initialBanks,
          margin_rules: initialMarginRules,
          dsr_rules: initialDsrRules,
          personal_finance_rules: initialPersonalFinanceRules,
          product_acceptance: initialProductAcceptance,
          military_ranks: initialMilitaryRanks,
          pension_rules: initialPensionRules,
          support_settings: initialSupportSettings,
          salary_rules: initialSalaryRules,
          term_rules: initialTermRules,
          advanced_rules: initialAdvancedRules,
          user_subscriptions: initialUserSubscriptions,
        };

        const finalSettings: Record<string, any> = {};
        const DSR_RULES_VERSION = 2;

        for (const key of Object.keys(DEFAULTS_MAP)) {
          const existing = presentRecords.get(key);
          
          if (key === 'dsr_rules') {
            const supabaseRules = existing?.value as DsrRule[];
            const seedRules = DEFAULTS_MAP.dsr_rules as DsrRule[];

            const { mergedRules, addedCount } = mergeDsrRulesWithSeeds(supabaseRules, seedRules);

            finalSettings[key] = mergedRules;

            if (addedCount > 0) {
              try {
                await supabase.from('system_settings').upsert({
                  key: 'dsr_rules',
                  value: mergedRules,
                  source: existing?.source || 'seed',
                  updated_at: new Date().toISOString()
                } as any);
              } catch (_) {}
            }
            continue;
          }

          if (!existing) {
            finalSettings[key] = DEFAULTS_MAP[key];
            try {
              await supabase.from('system_settings').upsert({ key: key, value: DEFAULTS_MAP[key], source: 'seed' });
            } catch (_) {}
          } else {
            // If the key already exists in system_settings, always use the existing value regardless of source
            finalSettings[key] = existing.value;
          }
        }

        let loadedMilitaryRanks = finalSettings.military_ranks || [];
        const needsRanksUpgrade = loadedMilitaryRanks.length === 0 || 
          loadedMilitaryRanks.some((r: any) => !r.hasOwnProperty('sectorScope') || !r.sectorScope || r.sectorScope === 'military_officer' || r.sectorScope === 'military_enlisted');
        if (needsRanksUpgrade) {
          loadedMilitaryRanks = initialMilitaryRanks;
        }

        const hSupport = await fetchHousingSupportTiers();
        const aPayment = await fetchAdvancePaymentTiers();

        const loadedSettings: AdminSettings = {
          banks: finalSettings.banks || initialData.banks,
          products: finalSettings.product_acceptance || initialData.products,
          militaryRanks: loadedMilitaryRanks,
          salaryRules: finalSettings.salary_rules || initialData.salaryRules,
          pensionRules: finalSettings.pension_rules || initialData.pensionRules,
          termRules: finalSettings.term_rules || initialData.termRules,
          marginRules: upgradeMarginRules(finalSettings.margin_rules || []),
          dsrRules: finalSettings.dsr_rules || initialData.dsrRules,
          supportSettings: finalSettings.support_settings || initialData.supportSettings,
          housingSupportTiers: hSupport,
          advancePaymentTiers: aPayment,
          personalRules: finalSettings.personal_finance_rules || initialData.personalRules,
          advancedRules: finalSettings.advanced_rules || initialData.advancedRules,
          userSubscriptions: finalSettings.user_subscriptions || initialData.userSubscriptions,
        };

        applySettingsState(loadedSettings);

        // Success loads from Supabase delete old cache forms and populate consolidated cache
        try {
          localStorage.removeItem("hasba_admin_settings");
          for (const key of Object.keys(DEFAULTS_MAP)) {
            localStorage.removeItem(`hasba_sett_${key}`);
          }
          localStorage.setItem("hasba_settings_cache", JSON.stringify(loadedSettings));
        } catch (_) {}

      } catch (err) {
        console.warn("Supabase granular system_settings load failed. Gracefully loading cache fallback.", err);
        let fallbackLoaded = false;
        try {
          const cachedJson = localStorage.getItem("hasba_settings_cache") || localStorage.getItem("hasba_admin_settings");
          if (cachedJson) {
            const parsed = JSON.parse(cachedJson);
            applySettingsState(parsed);
            fallbackLoaded = true;
          }
        } catch (e) {
          console.error("Failed to parse cached settings on load error:", e);
        }
        if (!fallbackLoaded) {
          applySettingsState(initialData);
        }
      } finally {
        setIsSettingsLoading(false);
      }
    }

    loadConfig();
  }, []);

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
  };

  const hasUnsavedChanges = JSON.stringify(currentSettings) !== JSON.stringify(savedSettings);

  const saveChanges = async () => {
    // Save dynamically to granular Supabase keys in system_settings table
    if (hasSupabaseKeys) {
      try {
        await saveHousingSupportTiers(housingSupportTiers);
        await saveAdvancePaymentTiers(advancePaymentTiers);

        const itemsToSave = [
          { key: 'banks', value: banks },
          { key: 'product_acceptance', value: products },
          { key: 'military_ranks', value: militaryRanks },
          { key: 'salary_rules', value: salaryRules },
          { key: 'pension_rules', value: pensionRules },
          { key: 'term_rules', value: termRules },
          { key: 'margin_rules', value: marginRules },
          { key: 'dsr_rules', value: dsrRules },
          { key: 'support_settings', value: supportSettings },
          { key: 'personal_finance_rules', value: personalRules },
          { key: 'advanced_rules', value: advancedRules },
          { key: 'user_subscriptions', value: userSubscriptions }
        ];

        const updated_by_user = user?.email || user?.id || null;
        for (const item of itemsToSave) {
          const payload: any = {
            key: item.key,
            value: item.value,
            source: 'admin',
            updated_at: new Date().toISOString()
          };
          if (updated_by_user) {
            payload.updated_by = updated_by_user;
          }
          await supabase.from('system_settings').upsert(payload);
        }
        console.log("All settings successfully synced to granular keys in system_settings database");

        // ONLY save to unified cache on SUCCESSFUL Supabase write
        setSavedSettings(currentSettings);
        try {
          localStorage.setItem("hasba_settings_cache", JSON.stringify(currentSettings));
          localStorage.removeItem("hasba_admin_settings");
          const DEFAULTS_MAP: Record<string, any> = {
            banks: initialBanks,
            margin_rules: initialMarginRules,
            dsr_rules: initialDsrRules,
            personal_finance_rules: initialPersonalFinanceRules,
            product_acceptance: initialProductAcceptance,
            military_ranks: initialMilitaryRanks,
            pension_rules: initialPensionRules,
            support_settings: initialSupportSettings,
            salary_rules: initialSalaryRules,
            term_rules: initialTermRules,
            advanced_rules: initialAdvancedRules,
            user_subscriptions: initialUserSubscriptions,
          };
          for (const key of Object.keys(DEFAULTS_MAP)) {
            localStorage.removeItem(`hasba_sett_${key}`);
          }
        } catch (e) {
          console.error("Error saving cached settings:", e);
        }
      } catch (err) {
        console.error("Failed to save granular settings to Supabase:", err);
        // Throw the error and DO NOT save locally as official settings truth
        throw err;
      }
    } else {
      // Local fallbacks
      setSavedSettings(currentSettings);
      try {
        localStorage.setItem("hasba_settings_cache", JSON.stringify(currentSettings));
        localStorage.removeItem("hasba_admin_settings");
      } catch (e) {
        console.error("Error saving local settings:", e);
      }
    }
  };

  const cancelChanges = () => {
    applySettingsState(savedSettings);
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
