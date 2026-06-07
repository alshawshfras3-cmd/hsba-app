import { useState, useEffect, useCallback } from 'react';
import { supabase, hasSupabaseKeys } from '../lib/supabase';
import { DsrRule, HousingSupportTier, AdvancePaymentTier } from '../types';
import { defaultLibraryRules } from '../lib/finance-engine/pension';
import {
  fallbackApprovedSalaryRules,
  fallbackPensionRules,
  fallbackSectorMappings
} from '../lib/pensionDb';
import {
  DEFAULT_HOUSING_SUPPORT_TIERS,
  DEFAULT_ADVANCE_PAYMENT_TIERS
} from '../lib/housingSupportService';

// Import all safe initial seed configurations
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
  initialUserSubscriptions
} from '../seeds';

const defaultSectorsList = [
  { id: 'gov_civil', nameAr: 'حكومي مدني', isActive: true, retirementAge: 60, notes: 'لا يحتاج رتبة' },
  { id: 'semi_gov', nameAr: 'شبه حكومي', isActive: true, retirementAge: 60, notes: 'لا يحتاج رتبة' },
  { id: 'companies', nameAr: 'موظف شركات', isActive: true, retirementAge: 60, notes: 'لا يحتاج رتبة' },
  { id: 'military', nameAr: 'عسكري', isActive: true, retirementAge: 0, notes: 'يحتاج اختيار رتبة (السن يأتي من الرتبة)' },
  { id: 'retired', nameAr: 'متقاعد', isActive: true, retirementAge: 0, notes: 'لا ينطبق (متقاعد حالي)' }
];

const DEFAULTS: Record<string, any> = {
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
  hasba_custom_sectors: defaultSectorsList,
  bank_sector_pension_rules: [],
  pension_rules_library: defaultLibraryRules,
};

const DB_TO_CACHE_KEY: Record<string, string> = {
  banks: 'banks',
  margin_rules: 'marginRules',
  dsr_rules: 'dsrRules',
  personal_finance_rules: 'personalRules',
  product_acceptance: 'products',
  military_ranks: 'militaryRanks',
  pension_rules: 'pensionRules',
  support_settings: 'supportSettings',
  salary_rules: 'salaryRules',
  term_rules: 'termRules',
  advanced_rules: 'advancedRules',
  user_subscriptions: 'userSubscriptions',
  hasba_custom_sectors: 'customSectors',
  bank_sector_pension_rules: 'bankSectorRules',
  pension_rules_library: 'pensionRulesLibrary',
};

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

export function useSettings() {
  const getLocalStorageOrSeedDefaults = (): Record<string, any> => {
    const loaded: Record<string, any> = {};
    for (const key of Object.keys(DEFAULTS)) {
      loaded[key] = DEFAULTS[key];
    }
    loaded['housingSupportTiers'] = [...DEFAULT_HOUSING_SUPPORT_TIERS];
    loaded['advancePaymentTiers'] = [...DEFAULT_ADVANCE_PAYMENT_TIERS];
    loaded['approvedSalaryRules'] = fallbackApprovedSalaryRules;
    loaded['pensionDbRules'] = fallbackPensionRules;
    loaded['sectorMappings'] = fallbackSectorMappings;

    return loaded;
  };

  const [settings, setSettings] = useState<Record<string, any>>(getLocalStorageOrSeedDefaults);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(true);
  const [supabaseFetched, setSupabaseFetched] = useState(!hasSupabaseKeys);

  // Fetch all system settings from Supabase
  const fetchSettings = useCallback(async () => {
    if (!hasSupabaseKeys) {
      setSupabaseFetched(true);
      return;
    }

    try {
      console.log('[SUPABASE LOAD] Fetching app_settings');
      // Fetch key = 'app_settings'
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', 'app_settings')
        .maybeSingle();

      if (error) {
        throw error;
      }

      let appSettingsObj: any = null;
      if (data && data.value) {
        appSettingsObj = data.value;
        console.log('[SETTINGS] key found in Supabase, using Supabase value: app_settings');
        if (appSettingsObj && appSettingsObj.banks && Array.isArray(appSettingsObj.banks)) {
          appSettingsObj.banks = appSettingsObj.banks.map((b: any) => {
            const seedBank = initialBanks.find(sb => sb.id === b.id);
            return {
              ...b,
              realEstateFinanceEnabled: b.realEstateFinanceEnabled !== undefined ? b.realEstateFinanceEnabled : (seedBank?.realEstateFinanceEnabled !== undefined ? seedBank.realEstateFinanceEnabled : true),
              personalFinanceEnabled: b.personalFinanceEnabled !== undefined ? b.personalFinanceEnabled : (seedBank?.personalFinanceEnabled !== undefined ? seedBank.personalFinanceEnabled : (b.id !== 'bidaya')),
              combinedFinanceEnabled: b.combinedFinanceEnabled !== undefined ? b.combinedFinanceEnabled : (seedBank?.combinedFinanceEnabled !== undefined ? seedBank.combinedFinanceEnabled : (b.id !== 'bidaya')),
              existingPersonalFinanceEnabled: b.existingPersonalFinanceEnabled !== undefined ? b.existingPersonalFinanceEnabled : (seedBank?.existingPersonalFinanceEnabled !== undefined ? seedBank.existingPersonalFinanceEnabled : true),
              minRealEstateAmount: b.minRealEstateAmount !== undefined ? b.minRealEstateAmount : (seedBank?.minRealEstateAmount !== undefined ? seedBank.minRealEstateAmount : 100000),
              maxRealEstateAmount: b.maxRealEstateAmount !== undefined ? b.maxRealEstateAmount : (seedBank?.maxRealEstateAmount !== undefined ? seedBank.maxRealEstateAmount : 10000000),
              minPersonalAmount: b.minPersonalAmount !== undefined ? b.minPersonalAmount : (seedBank?.minPersonalAmount !== undefined ? seedBank.minPersonalAmount : 10000),
              maxPersonalAmount: b.maxPersonalAmount !== undefined ? b.maxPersonalAmount : (seedBank?.maxPersonalAmount !== undefined ? seedBank.maxPersonalAmount : 2000000),
            };
          });
        }
        console.log('[SETTINGS] Supabase value preserved, no overwrite');
      } else {
        console.log('[SETTINGS] key missing, inserting seed_initial: app_settings');
        
        // 1. Read values from old database tables with separate try-catches
        let oldTiers: any[] = [];
        try {
          const { data: tiersData } = await supabase.from('housing_support_tiers').select('*').order('sort_order', { ascending: true });
          if (tiersData && tiersData.length > 0) {
            oldTiers = tiersData.map(item => ({
              id: item.id,
              min_salary: Number(item.min_salary),
              max_salary: Number(item.max_salary),
              amount_at_min: Number(item.amount_at_min),
              amount_at_max: Number(item.amount_at_max),
              sort_order: Number(item.sort_order)
            }));
          }
        } catch (e) {
          console.error("Migration: failed to fetch housing_support_tiers:", e);
        }

        let oldAdvance: any[] = [];
        try {
          const { data: advanceData } = await supabase.from('advance_payment_tiers').select('*').order('salary_threshold', { ascending: true });
          if (advanceData && advanceData.length > 0) {
            oldAdvance = advanceData.map(item => ({
              id: item.id,
              salary_threshold: Number(item.salary_threshold),
              amount: Number(item.amount)
            }));
          }
        } catch (e) {
          console.error("Migration: failed to fetch advance_payment_tiers:", e);
        }

        let oldSalaryRules: any[] = [];
        try {
          const { data: salaryRulesData } = await supabase.from('approved_salary_source_rules').select('*');
          if (salaryRulesData && salaryRulesData.length > 0) {
            oldSalaryRules = salaryRulesData.map((r: any) => ({
              id: r.id,
              bankId: r.bank_id,
              sectorId: r.sector_id,
              salarySource: r.salary_source,
              multiplier: Number(r.multiplier),
              descriptionAr: r.description_ar,
              createdAt: r.created_at,
              updatedAt: r.updated_at
            }));
          }
        } catch (e) {
          console.error("Migration: failed to fetch approved_salary_source_rules:", e);
        }

        let oldPensionCalculationRules: any[] = [];
        try {
          const { data: pensionCalcRulesData } = await supabase.from('pension_calculation_rules').select('*');
          if (pensionCalcRulesData && pensionCalcRulesData.length > 0) {
            oldPensionCalculationRules = pensionCalcRulesData.map((r: any) => ({
              id: r.id,
              bankId: r.bank_id,
              sectorId: r.sector_id,
              calculationMethod: r.calculation_method,
              divisorMonths: r.divisor_months,
              salarySourceOverride: r.salary_source_override,
              rateBelowThreshold: r.rate_below_threshold ? Number(r.rate_below_threshold) : undefined,
              rateAboveThreshold: r.rate_above_threshold ? Number(r.rate_above_threshold) : undefined,
              yearsThreshold: r.years_threshold,
              descriptionAr: r.description_ar,
              createdAt: r.created_at,
              updatedAt: r.updated_at
            }));
          }
        } catch (e) {
          console.error("Migration: failed to fetch pension_calculation_rules:", e);
        }

        let oldSectorMappings: any[] = [];
        try {
          const { data: sectorMappingsData } = await supabase.from('sector_classification_mapping').select('*');
          if (sectorMappingsData && sectorMappingsData.length > 0) {
            oldSectorMappings = sectorMappingsData.map((r: any) => ({
              id: r.id,
              bankId: r.bank_id,
              sectorId: r.sector_id,
              bankSectorId: r.bank_sector_id,
              labelAr: r.label_ar,
              createdAt: r.created_at
            }));
          }
        } catch (e) {
          console.error("Migration: failed to fetch sector_classification_mapping:", e);
        }

        // 2. Read older system_settings individual keys
        const oldSettingsData: Record<string, any> = {};
        try {
          const { data: systemSettingsRows } = await supabase.from('system_settings').select('*');
          if (systemSettingsRows) {
            for (const r of systemSettingsRows) {
              if (r.key !== 'app_settings') {
                oldSettingsData[r.key] = r.value;
              }
            }
          }
        } catch (e) {
          console.error("Migration: failed to fetch older granular system_settings keys:", e);
        }

        // 3. Build currentSettingsObject combining any database values with seeds
        appSettingsObj = {
          banks: oldSettingsData['banks'] || DEFAULTS['banks'],
          products: oldSettingsData['product_acceptance'] || DEFAULTS['product_acceptance'],
          militaryRanks: (oldSettingsData['military_ranks'] && Array.isArray(oldSettingsData['military_ranks']) && oldSettingsData['military_ranks'].length > 0) ? oldSettingsData['military_ranks'] : DEFAULTS['military_ranks'],
          salaryRules: oldSettingsData['salary_rules'] || DEFAULTS['salary_rules'],
          pensionRules: oldSettingsData['pension_rules'] || DEFAULTS['pension_rules'],
          termRules: oldSettingsData['term_rules'] || DEFAULTS['term_rules'],
          marginRules: oldSettingsData['margin_rules'] || DEFAULTS['margin_rules'],
          dsrRules: oldSettingsData['dsr_rules'] || DEFAULTS['dsr_rules'],
          supportSettings: oldSettingsData['support_settings'] || DEFAULTS['support_settings'],
          housingSupportTiers: oldTiers.length > 0 ? oldTiers : [...DEFAULT_HOUSING_SUPPORT_TIERS],
          advancePaymentTiers: oldAdvance.length > 0 ? oldAdvance : [...DEFAULT_ADVANCE_PAYMENT_TIERS],
          personalRules: oldSettingsData['personal_finance_rules'] || DEFAULTS['personal_finance_rules'],
          advancedRules: oldSettingsData['advanced_rules'] || DEFAULTS['advanced_rules'],
          customSectors: oldSettingsData['hasba_custom_sectors'] || DEFAULTS['hasba_custom_sectors'],
          bankSectorRules: oldSettingsData['bank_sector_pension_rules'] || DEFAULTS['bank_sector_pension_rules'],
          pensionRulesLibrary: oldSettingsData['pension_rules_library'] || DEFAULTS['pension_rules_library'],
          
          approvedSalaryRules: oldSalaryRules.length > 0 ? oldSalaryRules : fallbackApprovedSalaryRules,
          pensionDbRules: oldPensionCalculationRules.length > 0 ? oldPensionCalculationRules : fallbackPensionRules,
          sectorMappings: oldSectorMappings.length > 0 ? oldSectorMappings : fallbackSectorMappings
        };

        // 4. Save key = 'app_settings' to make it available for future loads
        try {
          await supabase.from('system_settings').insert({
            key: 'app_settings',
            value: appSettingsObj,
            source: 'seed_initial',
            updated_at: new Date().toISOString()
          });
          console.log('[SUPABASE SAVE] Created consolidated app_settings from migration successfully');
        } catch (saveErr) {
          console.error("Migration: failed to save app_settings to system_settings table:", saveErr);
        }
      }

      // Convert appSettingsObj to settings mapping
      const settingsMap: Record<string, any> = {
        banks: appSettingsObj.banks,
        product_acceptance: appSettingsObj.products,
        military_ranks: appSettingsObj.militaryRanks,
        salary_rules: appSettingsObj.salaryRules,
        pension_rules: appSettingsObj.pensionRules,
        term_rules: appSettingsObj.termRules,
        margin_rules: appSettingsObj.marginRules,
        dsr_rules: appSettingsObj.dsrRules,
        support_settings: appSettingsObj.supportSettings,
        personal_finance_rules: appSettingsObj.personalRules,
        advanced_rules: appSettingsObj.advancedRules,
        hasba_custom_sectors: appSettingsObj.customSectors,
        bank_sector_pension_rules: appSettingsObj.bankSectorRules,
        pension_rules_library: appSettingsObj.pensionRulesLibrary,
        
        housingSupportTiers: appSettingsObj.housingSupportTiers,
        advancePaymentTiers: appSettingsObj.advancePaymentTiers,
        approvedSalaryRules: appSettingsObj.approvedSalaryRules || appSettingsObj.approvedSalaryDbRules,
        pensionDbRules: appSettingsObj.pensionDbRules,
        sectorMappings: appSettingsObj.sectorMappings,
      };

      setSettings(settingsMap);
      setSupabaseFetched(true);

    } catch (err: any) {
      console.error(`[SUPABASE LOAD] table=system_settings status=error message=${err?.message || err}`);
      console.warn('Fallback settings on fetch failure in background:', err);
      setSupabaseFetched(true);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Save specific settings to Supabase (backward compatibility fallback)
  const saveSetting = useCallback(async (key: string, value: any) => {
    // Redirect granular saves to write inside 'app_settings' key directly!
    try {
      const { data, error: selectError } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'app_settings')
        .maybeSingle();

      if (selectError) throw selectError;

      let appSettings = data?.value || {};
      const cacheField = DB_TO_CACHE_KEY[key];
      if (cacheField) {
        appSettings[cacheField] = value;
      } else {
        appSettings[key] = value;
      }

      setSettings(prev => ({ ...prev, [key]: value }));

      if (hasSupabaseKeys) {
        await supabase.from('system_settings').upsert({
          key: 'app_settings',
          value: appSettings,
          source: 'admin',
          updated_at: new Date().toISOString()
        });
        console.log('[SETTINGS] admin saved key successfully: app_settings');
      }
    } catch (err) {
      console.error('saveSetting failed to update centralized app_settings:', err);
    }
  }, []);

  return {
    settings,
    loading,
    initialized,
    supabaseFetched,
    fetchSettings,
    saveSetting,
    banks: settings.banks ?? DEFAULTS.banks,
    marginRules: settings.margin_rules ?? DEFAULTS.margin_rules,
    dsrRules: settings.dsr_rules ?? DEFAULTS.dsr_rules,
    personalRules: settings.personal_finance_rules ?? DEFAULTS.personal_finance_rules,
    products: settings.product_acceptance ?? DEFAULTS.product_acceptance,
    militaryRanks: (settings.military_ranks && Array.isArray(settings.military_ranks) && settings.military_ranks.length > 0 && settings.military_ranks.every((r: any) => r.hasOwnProperty('sectorScope') && r.sectorScope)) ? settings.military_ranks : DEFAULTS.military_ranks,
    pensionRules: settings.pension_rules ?? DEFAULTS.pension_rules,
    supportSettings: settings.support_settings ?? DEFAULTS.support_settings,
    salaryRules: settings.salary_rules ?? DEFAULTS.salary_rules,
    termRules: settings.term_rules ?? DEFAULTS.term_rules,
    advancedRules: settings.advanced_rules ?? DEFAULTS.advanced_rules,
    userSubscriptions: settings.user_subscriptions ?? DEFAULTS.user_subscriptions,
    customSectors: settings.hasba_custom_sectors ?? DEFAULTS.hasba_custom_sectors,
    bankSectorRules: settings.bank_sector_pension_rules ?? DEFAULTS.bank_sector_pension_rules,
    pensionRulesLibrary: settings.pension_rules_library ?? DEFAULTS.pension_rules_library,
    housingSupportTiers: settings.housingSupportTiers ?? [...DEFAULT_HOUSING_SUPPORT_TIERS],
    advancePaymentTiers: settings.advancePaymentTiers ?? [...DEFAULT_ADVANCE_PAYMENT_TIERS],
    approvedSalaryRules: settings.approvedSalaryRules ?? fallbackApprovedSalaryRules,
    pensionDbRules: settings.pensionDbRules ?? fallbackPensionRules,
    sectorMappings: settings.sectorMappings ?? fallbackSectorMappings,
  };
}

