import { useState, useEffect, useCallback } from 'react';
import { supabase, hasSupabaseKeys } from '../lib/supabase';

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
      for (const key of Object.keys(DEFAULTS)) {
        try {
          const cached = localStorage.getItem(`hasba_sett_${key}`);
          let parsed = cached ? JSON.parse(cached) : DEFAULTS[key];
          loaded[key] = parsed;
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
    } catch (err) {
      console.warn('Fallback settings on fetch failure:', err);
      // fallback
      const loaded: Record<string, any> = {};
      for (const key of Object.keys(DEFAULTS)) {
        loaded[key] = DEFAULTS[key];
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
    // Save locally to cache first
    try {
      localStorage.setItem(`hasba_sett_${key}`, JSON.stringify(value));
    } catch (_) {}

    // Update state memory
    setSettings(prev => ({ ...prev, [key]: value }));

    if (!hasSupabaseKeys) {
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
