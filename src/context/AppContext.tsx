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

        for (const key of Object.keys(DEFAULTS_MAP)) {
          const existing = presentRecords.get(key);
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

        if (finalSettings.banks) setBanks(finalSettings.banks);
        if (finalSettings.product_acceptance) setProducts(finalSettings.product_acceptance);
        setMilitaryRanks(loadedMilitaryRanks);
        if (finalSettings.salary_rules) setSalaryRules(finalSettings.salary_rules);
        if (finalSettings.pension_rules) setPensionRules(finalSettings.pension_rules);
        if (finalSettings.term_rules) setTermRules(finalSettings.term_rules);
        if (finalSettings.margin_rules) {
          setMarginRules(upgradeMarginRules(finalSettings.margin_rules));
        } else {
          setMarginRules(initialMarginRules);
        }
        if (finalSettings.dsr_rules) setDsrRules(finalSettings.dsr_rules);
        if (finalSettings.support_settings) setSupportSettings(finalSettings.support_settings);
        if (finalSettings.personal_finance_rules) setPersonalRules(finalSettings.personal_finance_rules);
        if (finalSettings.advanced_rules) setAdvancedRules(finalSettings.advanced_rules);
        if (finalSettings.user_subscriptions) setUserSubscriptions(finalSettings.user_subscriptions);

        const hSupport = await fetchHousingSupportTiers();
        const aPayment = await fetchAdvancePaymentTiers();
        setHousingSupportTiers(hSupport);
        setAdvancePaymentTiers(aPayment);

        setSavedSettings({
          banks: finalSettings.banks || initialBanks,
          products: finalSettings.product_acceptance || initialProductAcceptance,
          militaryRanks: loadedMilitaryRanks,
          salaryRules: finalSettings.salary_rules || initialSalaryRules,
          pensionRules: finalSettings.pension_rules || initialPensionRules,
          termRules: finalSettings.term_rules || initialTermRules,
          marginRules: upgradeMarginRules(finalSettings.margin_rules || []),
          dsrRules: finalSettings.dsr_rules || initialDsrRules,
          supportSettings: finalSettings.support_settings || initialSupportSettings,
          housingSupportTiers: hSupport,
          advancePaymentTiers: aPayment,
          personalRules: finalSettings.personal_finance_rules || initialPersonalFinanceRules,
          advancedRules: finalSettings.advanced_rules || initialAdvancedRules,
          userSubscriptions: finalSettings.user_subscriptions || initialUserSubscriptions,
        });

      } catch (err) {
        console.warn("Supabase granular system_settings load failed. Using local storage or seed defaults gracefully.", err);
        setBanks(initialData.banks);
        setProducts(initialData.products);
        setMilitaryRanks(initialData.militaryRanks);
        setSalaryRules(initialData.salaryRules);
        setPensionRules(initialData.pensionRules);
        setTermRules(initialData.termRules);
        setMarginRules(initialData.marginRules);
        setDsrRules(initialData.dsrRules);
        setSupportSettings(initialData.supportSettings);
        setHousingSupportTiers(initialData.housingSupportTiers);
        setAdvancePaymentTiers(initialData.advancePaymentTiers);
        setPersonalRules(initialData.personalRules);
        setAdvancedRules(initialData.advancedRules);
        setUserSubscriptions(initialData.userSubscriptions || initialUserSubscriptions);
        setSavedSettings(initialData);
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
