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
          if (key === 'personal_finance_rules' && Array.isArray(parsed)) {
            parsed = parsed.map((rule: any) => {
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
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value');

      if (error && error.code !== 'PGRST116') {
        console.warn('Failed to fetch system_settings from database, code/error info:', error);
      }

      const loaded: Record<string, any> = {};
      const presentKeys = new Set((data || []).map(r => r.key));

      // 1. Map existing table records
      if (data && data.length > 0) {
        for (const row of data) {
          if (
            row.value === null ||
            (Array.isArray(row.value) && row.value.length === 0 && row.key !== 'banks' && row.key !== 'margin_rules' && row.key !== 'dsr_rules') ||
            (typeof row.value === 'object' && Object.keys(row.value).length === 0 && row.key !== 'support_settings')
          ) {
            loaded[row.key] = DEFAULTS[row.key] ?? row.value;
          } else {
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
        }
      }

      // 2. Add missing key defaults
      for (const key of Object.keys(DEFAULTS)) {
        if (!presentKeys.has(key)) {
          loaded[key] = DEFAULTS[key];
          // Try to create the missing row dynamically
          try {
            await supabase.from('system_settings').upsert({ key, value: DEFAULTS[key] });
          } catch (_) {
            // fail-silent
          }
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

    const { error } = await supabase
      .from('system_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() });

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
    militaryRanks: settings.military_ranks ?? DEFAULTS.military_ranks,
    pensionRules: settings.pension_rules ?? DEFAULTS.pension_rules,
    supportSettings: settings.support_settings ?? DEFAULTS.support_settings,
    salaryRules: settings.salary_rules ?? DEFAULTS.salary_rules,
    termRules: settings.term_rules ?? DEFAULTS.term_rules,
    advancedRules: settings.advanced_rules ?? DEFAULTS.advanced_rules,
    userSubscriptions: settings.user_subscriptions ?? DEFAULTS.user_subscriptions,
  };
}
