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
  UserSubscription
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
  personalRules: PersonalFinanceRules[];
  advancedRules: AdvancedRule[];
  userSubscriptions?: UserSubscription[];
}

const getInitialSettings = (): AdminSettings => {
  try {
    const saved = localStorage.getItem("hasba_admin_settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        return {
          banks: parsed.banks || initialBanks,
          products: parsed.products || initialProductAcceptance,
          militaryRanks: parsed.militaryRanks || initialMilitaryRanks,
          salaryRules: parsed.salaryRules || initialSalaryRules,
          pensionRules: parsed.pensionRules || initialPensionRules,
          termRules: parsed.termRules || initialTermRules,
          marginRules: parsed.marginRules || initialMarginRules,
          dsrRules: parsed.dsrRules || initialDsrRules,
          supportSettings: parsed.supportSettings || initialSupportSettings,
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

          if (loaded.banks) setBanks(loaded.banks);
          if (loaded.product_acceptance) setProducts(loaded.product_acceptance);
          if (loaded.military_ranks) setMilitaryRanks(loaded.military_ranks);
          if (loaded.salary_rules) setSalaryRules(loaded.salary_rules);
          if (loaded.pension_rules) setPensionRules(loaded.pension_rules);
          if (loaded.term_rules) setTermRules(loaded.term_rules);
          if (loaded.margin_rules) setMarginRules(loaded.margin_rules);
          if (loaded.dsr_rules) setDsrRules(loaded.dsr_rules);
          if (loaded.support_settings) setSupportSettings(loaded.support_settings);
          if (loaded.personal_finance_rules) setPersonalRules(loaded.personal_finance_rules);
          if (loaded.advanced_rules) setAdvancedRules(loaded.advanced_rules);
          if (loaded.user_subscriptions) setUserSubscriptions(loaded.user_subscriptions);

          setSavedSettings({
            banks: loaded.banks || initialBanks,
            products: loaded.product_acceptance || initialProductAcceptance,
            militaryRanks: loaded.military_ranks || initialMilitaryRanks,
            salaryRules: loaded.salary_rules || initialSalaryRules,
            pensionRules: loaded.pension_rules || initialPensionRules,
            termRules: loaded.term_rules || initialTermRules,
            marginRules: loaded.margin_rules || initialMarginRules,
            dsrRules: loaded.dsr_rules || initialDsrRules,
            supportSettings: loaded.support_settings || initialSupportSettings,
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
