import { useState, useEffect, useCallback } from 'react';
import { supabase, hasSupabaseKeys } from '../lib/supabase';
import { DsrRule } from '../types';

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
      // Local fallback
      const loaded: Record<string, any> = {};
      let fallbackParsed: any = null;
      try {
        const cachedUnified = localStorage.getItem("hasba_settings_cache") || localStorage.getItem("hasba_admin_settings");
        if (cachedUnified) {
          fallbackParsed = JSON.parse(cachedUnified);
        }
      } catch (_) {}

      for (const key of Object.keys(DEFAULTS)) {
        try {
          const cacheField = DB_TO_CACHE_KEY[key];
          if (fallbackParsed && fallbackParsed[cacheField] !== undefined) {
            loaded[key] = fallbackParsed[cacheField];
          } else {
            const cachedOld = localStorage.getItem(`hasba_sett_${key}`);
            loaded[key] = cachedOld ? JSON.parse(cachedOld) : DEFAULTS[key];
          }
        } catch (_) {
          loaded[key] = DEFAULTS[key];
        }
      }
      setSettings(loaded);
      setInitialized(true);
      setLoading(false);
      return;
    }

    try {
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
        rows = fbResult.data || [];
      } else {
        rows = fetchRes.data || [];
      }

      const loaded: Record<string, any> = {};
      const presentRecords = new Map<string, { value: any, source?: string }>();

      for (const row of rows) {
        presentRecords.set(row.key, { value: row.value, source: row.source });
      }

      // 1. Process all defaults
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
          } catch (_) {
            // fail-silent
          }
        } else {
          // If key exists, utilize its database value, preventing any overwrites with defaults
          loaded[key] = existing.value;
        }
      }

      setSettings(loaded);
      setInitialized(true);

      // Cache the loaded data in unified cache and remove individual old settings
      try {
        localStorage.removeItem("hasba_admin_settings");
        for (const k of Object.keys(DEFAULTS)) {
          localStorage.removeItem(`hasba_sett_${k}`);
        }
        // Save the currently loaded settings to "hasba_settings_cache"
        const cacheToSave: Record<string, any> = {};
        for (const dbKey of Object.keys(DEFAULTS)) {
          const cacheField = DB_TO_CACHE_KEY[dbKey];
          cacheToSave[cacheField] = loaded[dbKey];
        }
        localStorage.setItem("hasba_settings_cache", JSON.stringify(cacheToSave));
      } catch (_) {}

    } catch (err) {
      console.warn('Fallback settings on fetch failure:', err);
      // fallback
      const loaded: Record<string, any> = {};
      let fallbackParsed: any = null;
      try {
        const cachedUnified = localStorage.getItem("hasba_settings_cache") || localStorage.getItem("hasba_admin_settings");
        if (cachedUnified) {
          fallbackParsed = JSON.parse(cachedUnified);
        }
      } catch (_) {}

      for (const key of Object.keys(DEFAULTS)) {
        try {
          const cacheField = DB_TO_CACHE_KEY[key];
          if (fallbackParsed && fallbackParsed[cacheField] !== undefined) {
            loaded[key] = fallbackParsed[cacheField];
          } else {
            const cachedOld = localStorage.getItem(`hasba_sett_${key}`);
            loaded[key] = cachedOld ? JSON.parse(cachedOld) : DEFAULTS[key];
          }
        } catch (_) {
          loaded[key] = DEFAULTS[key];
        }
      }
      setSettings(loaded);
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
        localStorage.removeItem("hasba_admin_settings");
        localStorage.removeItem(`hasba_sett_${key}`);
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

    const { error } = await supabase
      .from('system_settings')
      .upsert(payload);

    if (error) {
      throw error;
    }

    // Update state memory ON SUCCESS
    setSettings(prev => ({ ...prev, [key]: value }));

    // Update unified cache ON SUCCESS
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
      
      localStorage.removeItem("hasba_admin_settings");
      localStorage.removeItem(`hasba_sett_${key}`);
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
  };
}
