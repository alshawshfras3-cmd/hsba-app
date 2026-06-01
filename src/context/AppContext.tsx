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
  userRole: 'admin' | 'manager' | 'user' | null;
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
  const hasNewRajhiRules = rules.some(r => r.bankId === 'rajhi' && r.id && r.id.startsWith('rajhi_gen_'));
  if (!hasNewRajhiRules) {
    const nonRajhiRules = rules.filter(r => r.bankId !== 'rajhi');
    const rajhiInitialRules = initialMarginRules.filter(r => r.bankId === 'rajhi');
    return [...nonRajhiRules, ...rajhiInitialRules];
  }
  return rules;
}

const getInitialSettings = (): AdminSettings => {
  try {
    const saved = localStorage.getItem("hasba_admin_settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        const savedMilitaryRanks = parsed.militaryRanks || [];
        const needsRanksUpgrade = savedMilitaryRanks.length === 0 || 
          savedMilitaryRanks.some((r: any) => !r.hasOwnProperty('sectorScope') || !r.sectorScope || r.sectorScope === 'military_officer' || r.sectorScope === 'military_enlisted');

        const savedTermRules = parsed.termRules || [];
        const needsTermRulesUpgrade = savedTermRules.length === 0 || 
          savedTermRules.length < 5 || 
          savedTermRules.some((r: any) => r.bankId === 'rajhi' && r.sectorId === 'gov_civil' && r.maxTermMonths === 300);

        const savedDsrRules = parsed.dsrRules || [];
        const needsDsrRulesUpgrade = savedDsrRules.length === 0 ||
          savedDsrRules.length < 20 ||
          savedDsrRules.some((r: any) => r.bankId === 'default');

        return {
          banks: parsed.banks || initialBanks,
          products: parsed.products || initialProductAcceptance,
          militaryRanks: needsRanksUpgrade ? initialMilitaryRanks : savedMilitaryRanks,
          salaryRules: parsed.salaryRules || initialSalaryRules,
          pensionRules: parsed.pensionRules || initialPensionRules,
          termRules: needsTermRulesUpgrade ? initialTermRules : savedTermRules,
          marginRules: upgradeMarginRules(parsed.marginRules || []),
          dsrRules: needsDsrRulesUpgrade ? initialDsrRules : savedDsrRules,
          supportSettings: parsed.supportSettings || initialSupportSettings,
          housingSupportTiers: parsed.housingSupportTiers || DEFAULT_HOUSING_SUPPORT_TIERS,
          advancePaymentTiers: parsed.advancePaymentTiers || DEFAULT_ADVANCE_PAYMENT_TIERS,
          personalRules: parsed.personalRules || initialPersonalFinanceRules,
          advancedRules: parsed.advancedRules || initialAdvancedRules,
          userSubscriptions: parsed.userSubscriptions || initialUserSubscriptions,
        };
      }
    }
  } catch (e) {
    console.error("Error reading hasba_admin_settings from localStorage:", e);
  }
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

  // Consume from custom AuthProvider
  const { user, setUser, profile, isAdmin, isManager, canAccessDashboard, signOut, loading: authLoading } = useAuth();
  const userRole = isAdmin ? 'admin' : (isManager ? 'manager' : 'user');

  const [isSettingsLoading, setIsSettingsLoading] = useState(true);

  // 1. Fetch from Supabase system_settings and initialize / sync on mount
  useEffect(() => {
    async function loadConfig() {
      if (!hasSupabaseKeys) {
        console.warn("Supabase configuration keys missing. Running with local browser persistent cache.");
        setIsSettingsLoading(false);
        return;
      }
      setIsSettingsLoading(true);
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('key, value');

        if (error) {
          console.error("Error reading from system_settings table:", error);
          throw error;
        }

        if (data && data.length > 0) {
          const loaded: Record<string, any> = {};
          for (const row of data) {
            let val = row.value;
            if (row.key === 'personal_finance_rules' && Array.isArray(val)) {
              val = val.map((rule: any) => {
                const bankId = rule.bankId || 'all';
                const margin = bankId === 'rajhi' ? 4.59 : (bankId === 'alahli' ? 5.00 : 4.80);
                if (rule.calculationMethod === 'multiplier' || rule.financeCoefficient > 0 || rule.annualMargin === 2.50) {
                  return {
                    ...rule,
                    calculationMethod: 'flat_rate',
                    financeCoefficient: 0,
                    annualMargin: rule.annualMargin || margin
                  };
                }
                return rule;
              });
            }
            loaded[row.key] = val;
          }

          let loadedMilitaryRanks = loaded.military_ranks || [];
          const needsRanksUpgrade = loadedMilitaryRanks.length === 0 || 
            loadedMilitaryRanks.some((r: any) => !r.hasOwnProperty('sectorScope') || !r.sectorScope || r.sectorScope === 'military_officer' || r.sectorScope === 'military_enlisted');
          if (needsRanksUpgrade) {
            loadedMilitaryRanks = initialMilitaryRanks;
          }

          if (loaded.banks) setBanks(loaded.banks);
          if (loaded.product_acceptance) setProducts(loaded.product_acceptance);
          setMilitaryRanks(loadedMilitaryRanks);
          if (loaded.salary_rules) setSalaryRules(loaded.salary_rules);
          if (loaded.pension_rules) setPensionRules(loaded.pension_rules);
          if (loaded.term_rules) setTermRules(loaded.term_rules);
          if (loaded.margin_rules) {
            setMarginRules(upgradeMarginRules(loaded.margin_rules));
          } else {
            setMarginRules(initialMarginRules);
          }
          if (loaded.dsr_rules) setDsrRules(loaded.dsr_rules);
          if (loaded.support_settings) setSupportSettings(loaded.support_settings);
          if (loaded.personal_finance_rules) setPersonalRules(loaded.personal_finance_rules);
          if (loaded.advanced_rules) setAdvancedRules(loaded.advanced_rules);
          if (loaded.user_subscriptions) setUserSubscriptions(loaded.user_subscriptions);

          const hSupport = await fetchHousingSupportTiers();
          const aPayment = await fetchAdvancePaymentTiers();
          setHousingSupportTiers(hSupport);
          setAdvancePaymentTiers(aPayment);

          setSavedSettings({
            banks: loaded.banks || initialBanks,
            products: loaded.product_acceptance || initialProductAcceptance,
            militaryRanks: loadedMilitaryRanks,
            salaryRules: loaded.salary_rules || initialSalaryRules,
            pensionRules: loaded.pension_rules || initialPensionRules,
            termRules: loaded.term_rules || initialTermRules,
            marginRules: upgradeMarginRules(loaded.margin_rules || []),
            dsrRules: loaded.dsr_rules || initialDsrRules,
            supportSettings: loaded.support_settings || initialSupportSettings,
            housingSupportTiers: hSupport,
            advancePaymentTiers: aPayment,
            personalRules: loaded.personal_finance_rules || initialPersonalFinanceRules,
            advancedRules: loaded.advanced_rules || initialAdvancedRules,
            userSubscriptions: loaded.user_subscriptions || initialUserSubscriptions,
          });
        } else {
          // Table exists but is completely empty? Warm up the system_settings table
          console.log("No dynamic system_settings keys found in Supabase. Creating default configuration roles...");
          const defaultsToSeed = [
            { key: 'banks', value: initialBanks },
            { key: 'product_acceptance', value: initialProductAcceptance },
            { key: 'military_ranks', value: initialMilitaryRanks },
            { key: 'salary_rules', value: initialSalaryRules },
            { key: 'pension_rules', value: initialPensionRules },
            { key: 'term_rules', value: initialTermRules },
            { key: 'margin_rules', value: initialMarginRules },
            { key: 'dsr_rules', value: initialDsrRules },
            { key: 'support_settings', value: initialSupportSettings },
            { key: 'personal_finance_rules', value: initialPersonalFinanceRules },
            { key: 'advanced_rules', value: initialAdvancedRules },
            { key: 'user_subscriptions', value: initialUserSubscriptions }
          ];

          for (const item of defaultsToSeed) {
            await supabase.from('system_settings').upsert({ key: item.key, value: item.value });
          }
        }
      } catch (err) {
        console.warn("Supabase granular system_settings load failed. Using local storage or seed defaults gracefully.", err);
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
    setSavedSettings(currentSettings);
    // Save locally
    try {
      localStorage.setItem("hasba_admin_settings", JSON.stringify(currentSettings));
    } catch (e) {
      console.error("Error saving hasba_admin_settings to localStorage:", e);
    }

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

        for (const item of itemsToSave) {
          await supabase.from('system_settings').upsert({
            key: item.key,
            value: item.value,
            updated_at: new Date().toISOString()
          });
        }
        console.log("All settings successfully synced to granular keys in system_settings database");
      } catch (err) {
        console.error("Failed to save granular settings to Supabase:", err);
      }
    }
  };

  const cancelChanges = () => {
    setBanks(savedSettings.banks);
    setProducts(savedSettings.products);
    setMilitaryRanks(savedSettings.militaryRanks);
    setSalaryRules(savedSettings.salaryRules);
    setPensionRules(savedSettings.pensionRules);
    setTermRules(savedSettings.termRules);
    setMarginRules(savedSettings.marginRules);
    setDsrRules(savedSettings.dsrRules);
    setSupportSettings(savedSettings.supportSettings);
    setHousingSupportTiers(savedSettings.housingSupportTiers);
    setAdvancePaymentTiers(savedSettings.advancePaymentTiers);
    setPersonalRules(savedSettings.personalRules);
    setAdvancedRules(savedSettings.advancedRules);
    if (savedSettings.userSubscriptions) {
      setUserSubscriptions(savedSettings.userSubscriptions);
    }
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
