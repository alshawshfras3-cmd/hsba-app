import { useState, useEffect, useCallback } from 'react';
import { supabase, hasSupabaseKeys } from '../lib/supabase';
import { DsrRule } from '../types';
import { defaultLibraryRules } from '../lib/finance-engine/pension';

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
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Fetch all system settings from Supabase
  const fetchSettings = useCallback(async () => {
    setLoading(true);

    if (!hasSupabaseKeys) {
      // Local fallback: Stage 3 (cache) then Stage 4 (DEFAULTS)
      const loaded: Record<string, any> = {};
      let fallbackParsed: any = null;
      try {
        const cachedUnified = localStorage.getItem("hasba_settings_cache");
        if (cachedUnified) {
          fallbackParsed = JSON.parse(cachedUnified);
        }
      } catch (_) {}

      for (const key of Object.keys(DEFAULTS)) {
        const cacheField = DB_TO_CACHE_KEY[key];
        if (fallbackParsed && fallbackParsed[cacheField] !== undefined) {
          loaded[key] = fallbackParsed[cacheField];
        } else {
          loaded[key] = DEFAULTS[key];
        }
      }
      setSettings(loaded);
      setInitialized(true);
      setLoading(false);
      return;
    }

    try {
      // Stage 1: Read from Supabase system_settings
      let rows: any[] = [];
      const fetchRes = await supabase
        .from('system_settings')
        .select('key, value, source');

      if (fetchRes.error) {
        if (fetchRes.error.code !== 'PGRST116') {
          console.warn('Failed to fetch system_settings with source column from database, retrying with key, value only...', fetchRes.error);
        }
        const fbResult = await supabase
          .from('system_settings')
          .select('key, value');
        if (fbResult.error) {
          throw fbResult.error;
        }
        rows = fbResult.data || [];
      } else {
        rows = fetchRes.data || [];
      }

      const loaded: Record<string, any> = {};
      const presentRecords = new Map<string, { value: any, source?: string }>();

      for (const row of rows) {
        presentRecords.set(row.key, { value: row.value, source: row.source });
      }

      // Process all defaults
      for (const key of Object.keys(DEFAULTS)) {
        const existing = presentRecords.get(key);
        
        if (key === 'dsr_rules') {
          const supabaseRules = existing?.value as DsrRule[];
          const seedRules = DEFAULTS.dsr_rules as DsrRule[];

          const { mergedRules, addedCount } = mergeDsrRulesWithSeeds(supabaseRules, seedRules);

          loaded[key] = mergedRules;

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
          loaded[key] = DEFAULTS[key];
          // Create the missing row dynamically as native seed
          try {
            await supabase.from('system_settings').upsert({ key, value: DEFAULTS[key], source: 'seed' });
          } catch (_) {}
        } else {
          // If key exists, utilize its database value, preventing any overwrites with defaults
          loaded[key] = existing.value;
        }
      }

      setSettings(loaded);
      setInitialized(true);

      // Stage 2: Success -> save backup in "hasba_settings_cache" and remove other caches
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key) {
            if (
              key === 'hasba_admin_settings' || 
              key === 'hasba_custom_sectors' || 
              key === 'bank_sector_pension_rules' || 
              key === 'pension_rules_library' || 
              key.startsWith('hasba_sett_')
            ) {
              localStorage.removeItem(key);
            }
          }
        }

        const cacheToSave: Record<string, any> = {};
        for (const dbKey of Object.keys(DEFAULTS)) {
          const cacheField = DB_TO_CACHE_KEY[dbKey];
          cacheToSave[cacheField] = loaded[dbKey];
        }
        localStorage.setItem("hasba_settings_cache", JSON.stringify(cacheToSave));
      } catch (_) {}

    } catch (err) {
      console.warn('Fallback settings on fetch failure:', err);
      // Stage 3: failure -> read temporary cache, else Stage 4: DEFAULTS
      const loaded: Record<string, any> = {};
      let fallbackParsed: any = null;
      try {
        const cachedUnified = localStorage.getItem("hasba_settings_cache");
        if (cachedUnified) {
          fallbackParsed = JSON.parse(cachedUnified);
        }
      } catch (_) {}

      for (const key of Object.keys(DEFAULTS)) {
        const cacheField = DB_TO_CACHE_KEY[key];
        if (fallbackParsed && fallbackParsed[cacheField] !== undefined) {
          loaded[key] = fallbackParsed[cacheField];
        } else {
          loaded[key] = DEFAULTS[key];
        }
      }
      setSettings(loaded);
      setInitialized(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Save specific settings to Supabase
  const saveSetting = useCallback(async (key: string, value: any) => {
    if (!hasSupabaseKeys) {
      // Local setup only
      setSettings(prev => ({ ...prev, [key]: value }));
      try {
        const cachedUnified = localStorage.getItem("hasba_settings_cache");
        let fallbackParsed: Record<string, any> = {};
        if (cachedUnified) {
          fallbackParsed = JSON.parse(cachedUnified);
        }
        const cacheField = DB_TO_CACHE_KEY[key];
        if (cacheField) {
          fallbackParsed[cacheField] = value;
        }
        localStorage.setItem("hasba_settings_cache", JSON.stringify(fallbackParsed));
      } catch (_) {}
      return;
    }

    const userEmailOrId = await (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        return user?.email || user?.id || null;
      } catch (_) {
        return null;
      }
    })();

    const payload: any = {
      key,
      value,
      source: 'admin',
      updated_at: new Date().toISOString()
    };
    if (userEmailOrId) {
      payload.updated_by = userEmailOrId;
    }

    // Stage 1: Save in Supabase first
    const { error } = await supabase
      .from('system_settings')
      .upsert(payload);

    if (error) {
      throw error;
    }

    // Stage 2: Success -> update state memory and "hasba_settings_cache"
    setSettings(prev => ({ ...prev, [key]: value }));

    try {
      const cachedUnified = localStorage.getItem("hasba_settings_cache");
      let fallbackParsed: Record<string, any> = {};
      if (cachedUnified) {
        fallbackParsed = JSON.parse(cachedUnified);
      }
      const cacheField = DB_TO_CACHE_KEY[key];
      if (cacheField) {
        fallbackParsed[cacheField] = value;
      }
      localStorage.setItem("hasba_settings_cache", JSON.stringify(fallbackParsed));
    } catch (_) {}
  }, []);

  return {
    settings,
    loading,
    initialized,
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
  };
}
