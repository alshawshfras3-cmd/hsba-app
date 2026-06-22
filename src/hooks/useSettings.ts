import { useState, useEffect, useCallback } from 'react';
import { supabase, hasSupabaseKeys, fetchAppSettingsShared, getCachedAppSettingsSync } from '../lib/supabase';
import { DsrRule } from '../types';
import { normalizeDsrRules } from '../lib/settings/normalizeDsrRules';

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

export function normalizeMemoryProductId(id: string): string {
  if (!id) return id;
  const p = id.trim().toLowerCase();
  if (p === 'real_estate' || p === 'real_estate_only') return 'real_estate_only';
  if (p === 'personal' || p === 'personal_only') return 'personal_only';
  if (p === 'both' || p === 'real_estate_with_new_personal') return 'real_estate_with_new_personal';
  if (p === 'real_estate_with_personal_existing' || p === 'real_estate_with_existing_personal') return 'real_estate_with_existing_personal';
  return id;
}

export function useSettings() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(true);
  const [supabaseFetched, setSupabaseFetched] = useState(!hasSupabaseKeys);
  const [supabaseLoadStatus, setSupabaseLoadStatus] = useState<'loading' | 'success' | 'failed' | 'empty_db' | 'read_only_protected' | 'slow_connection'>(hasSupabaseKeys ? 'loading' : 'success');
  const [supabaseLoadError, setSupabaseLoadError] = useState<string | null>(null);
  const [isTemporaryFallback, setIsTemporaryFallback] = useState(hasSupabaseKeys ? true : false);

  // Fetch all system settings from Supabase
  const fetchSettings = useCallback(async (options?: { forceFresh?: boolean; background?: boolean }) => {
    if (!hasSupabaseKeys) {
      setSupabaseFetched(true);
      setSupabaseLoadStatus('success');
      setIsTemporaryFallback(false);
      return;
    }

    if (!options?.background) {
      setLoading(true);
    }
    let appSettingsObj: any = null;
    let didTimeoutOrSlow = false;

    // Check if we are in admin dashboard URL to force-fresh!
    const isAdminDashboard = typeof window !== 'undefined' && window.location.pathname === '/admin/dashboard';
    const forceFresh = options?.forceFresh === true || isAdminDashboard;

    try {
      console.log('[SUPABASE LOAD] Fetching app_settings (forceFresh:', forceFresh, ')');
      
      // Call with 10s timeout
      appSettingsObj = await fetchAppSettingsShared(10000, { forceFresh });
      if (appSettingsObj) {
        setSupabaseLoadStatus('success');
        setIsTemporaryFallback(false);
      } else {
        setSupabaseLoadStatus('empty_db');
        setIsTemporaryFallback(true);
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const isTimeout = err?.isTimeout || errMsg.includes('timeout') || errMsg.includes('مهلة') || errMsg.includes('delay') || errMsg.includes('slow');
      
      console.warn('[SUPABASE LOAD WARNING] Could not fetch settings directly:', errMsg);
      
      // Attempt to salvage from sync cache (sessionStorage/memory)
      if (!forceFresh) {
        const cached = getCachedAppSettingsSync();
        if (cached) {
          console.log('[SUPABASE LOAD] Salvaged app_settings from local cache. Setting status to slow_connection.');
          appSettingsObj = cached;
          setSupabaseLoadStatus('slow_connection');
          setIsTemporaryFallback(true);
          didTimeoutOrSlow = true;
        } else {
          // Absolutely no cache and no database response
          if (isTimeout) {
            didTimeoutOrSlow = true;
            console.warn('[SUPABASE LOAD TIME-OUT] Slow database response and no local cache either. Setting slow_connection.');
            setSupabaseLoadStatus('slow_connection');
            setIsTemporaryFallback(true);
          } else {
            setSupabaseLoadStatus('failed');
            setSupabaseLoadError(errMsg);
            setIsTemporaryFallback(true);
          }
        }
      } else {
        // If forceFresh failed in admin, try cached anyway as read-only safeguard
        const cached = getCachedAppSettingsSync();
        if (cached) {
          appSettingsObj = cached;
          setSupabaseLoadStatus('slow_connection');
          setIsTemporaryFallback(true);
        } else {
          setSupabaseLoadStatus('failed');
          setSupabaseLoadError(errMsg);
          setIsTemporaryFallback(true);
        }
      }
    }

    // If we have some appSettingsObj (either fetched or cached)
    if (appSettingsObj) {
      try {
        const settingsMap: Record<string, any> = {
          banks: appSettingsObj.banks ?? [],
          product_acceptance: appSettingsObj.products ?? appSettingsObj.product_acceptance ?? [],
          military_ranks: appSettingsObj.militaryRanks ?? appSettingsObj.military_ranks ?? [],
          salary_rules: appSettingsObj.salaryRules ?? appSettingsObj.salary_rules ?? [],
          pension_rules: appSettingsObj.pensionRules ?? appSettingsObj.pension_rules ?? [],
          term_rules: appSettingsObj.termRules ?? appSettingsObj.term_rules ?? [],
          margin_rules: appSettingsObj.marginRules ?? appSettingsObj.margin_rules ?? [],
          dsrRules: normalizeDsrRules(appSettingsObj.dsrRules ?? appSettingsObj.dsr_rules ?? []),
          dsr_rules: normalizeDsrRules(appSettingsObj.dsrRules ?? appSettingsObj.dsr_rules ?? []),
          support_settings: appSettingsObj.supportSettings ?? appSettingsObj.support_settings ?? {},
          personal_finance_rules: appSettingsObj.personalRules ?? appSettingsObj.personal_finance_rules ?? [],
          advanced_rules: appSettingsObj.advancedRules ?? appSettingsObj.advanced_rules ?? [],
          hasba_custom_sectors: appSettingsObj.customSectors ?? appSettingsObj.hasba_custom_sectors ?? [],
          bank_sector_pension_rules: appSettingsObj.bankSectorRules ?? appSettingsObj.bank_sector_pension_rules ?? [],
          pension_rules_library: appSettingsObj.pensionRulesLibrary ?? appSettingsObj.pension_rules_library ?? [],
          
          housingSupportTiers: appSettingsObj.housingSupportTiers ?? appSettingsObj.housing_support_tiers ?? [],
          advancePaymentTiers: appSettingsObj.advancePaymentTiers ?? appSettingsObj.advance_payment_tiers ?? [],
          approvedSalaryRules: appSettingsObj.approvedSalaryRules ?? appSettingsObj.approvedSalaryDbRules ?? appSettingsObj.approved_salary_rules ?? appSettingsObj.approved_salary_db_rules ?? [],
          pensionDbRules: appSettingsObj.pensionDbRules ?? appSettingsObj.pension_db_rules ?? [],
          sectorMappings: appSettingsObj.sectorMappings ?? appSettingsObj.sector_mappings ?? [],
        };
        setSettings(settingsMap);
      } catch (err) {
        console.error('[SETTINGS ERROR] Could not parse loaded appSettingsObj:', err);
      }
    }

    if (didTimeoutOrSlow && !forceFresh) {
      // If we timed out or have a slow connection status, start an asynchronous quiet retry loop in the background!
      console.log('[SUPABASE LOAD RETRY] Starting silent background retries...');
      setTimeout(async () => {
        try {
          const value = await fetchAppSettingsShared(15000); // retry again with 15s timeout
          if (value) {
            console.log('[SUPABASE LOAD RETRY SUCCESS] Successfully loaded app_settings in background. Upgrading status to success!');
            setSupabaseLoadStatus('success');
            setIsTemporaryFallback(false);
            const settingsMap: Record<string, any> = {
              banks: value.banks ?? [],
              product_acceptance: value.products ?? value.product_acceptance ?? [],
              military_ranks: value.militaryRanks ?? value.military_ranks ?? [],
              salary_rules: value.salaryRules ?? value.salary_rules ?? [],
              pension_rules: value.pensionRules ?? value.pension_rules ?? [],
              term_rules: value.termRules ?? value.term_rules ?? [],
              margin_rules: value.marginRules ?? value.margin_rules ?? [],
              dsrRules: normalizeDsrRules(value.dsrRules ?? value.dsr_rules ?? []),
              dsr_rules: normalizeDsrRules(value.dsrRules ?? value.dsr_rules ?? []),
              support_settings: value.supportSettings ?? value.support_settings ?? {},
              personal_finance_rules: value.personalRules ?? value.personal_finance_rules ?? [],
              advanced_rules: value.advancedRules ?? value.advanced_rules ?? [],
              hasba_custom_sectors: value.customSectors ?? value.hasba_custom_sectors ?? [],
              bank_sector_pension_rules: value.bankSectorRules ?? value.bank_sector_pension_rules ?? [],
              pension_rules_library: value.pensionRulesLibrary ?? value.pension_rules_library ?? [],
              
              housingSupportTiers: value.housingSupportTiers ?? value.housing_support_tiers ?? [],
              advancePaymentTiers: value.advancePaymentTiers ?? value.advance_payment_tiers ?? [],
              approvedSalaryRules: value.approvedSalaryRules ?? value.approvedSalaryDbRules ?? value.approved_salary_rules ?? value.approved_salary_db_rules ?? [],
              pensionDbRules: value.pensionDbRules ?? value.pension_db_rules ?? [],
              sectorMappings: value.sectorMappings ?? value.sector_mappings ?? [],
            };
            setSettings(settingsMap);
          }
        } catch (retryErr) {
          console.warn('[SUPABASE LOAD RETRY FAILED] Background retry failed, keeping slow_connection status:', retryErr);
        }
      }, 7000);
    }

    setSupabaseFetched(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Save specific settings to Supabase (backward compatibility fallback)
  const saveSetting = useCallback(async (key: string, value: any) => {
    if (supabaseLoadStatus === 'failed' || supabaseLoadStatus === 'read_only_protected') {
      throw new Error('تعذر الحفظ لأن تحميل الإعدادات من قاعدة البيانات فشل في وقت سابق أو أن النظام قيد حماية القراءة فقط.');
    }
    // Redirect granular saves to write inside 'app_settings' key directly!
    try {
      const { data, error: selectError } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'app_settings')
        .maybeSingle();

      if (selectError) throw selectError;

      if (!data?.value || typeof data.value !== 'object' || Object.keys(data.value).length === 0) {
        throw new Error('🚫 تم منع الحفظ: فشل قراءة app_settings من Supabase');
      }

      let appSettings = data.value;
      const cacheField = DB_TO_CACHE_KEY[key] || key;
      appSettings[cacheField] = value;
      
      // Delete any snake_case version of the updated key inside app_settings
      for (const snakeKey of Object.keys(DB_TO_CACHE_KEY)) {
        if (DB_TO_CACHE_KEY[snakeKey] === cacheField && snakeKey !== cacheField) {
          delete appSettings[snakeKey];
        }
      }

      setSettings(prev => ({ ...prev, [key]: value }));

      const currentMarginRulesInPayload = appSettings.marginRules ?? appSettings.margin_rules ?? [];
      if (Array.isArray(currentMarginRulesInPayload) && currentMarginRulesInPayload.length === 0) {
        // تحقق من Supabase قبل الكتابة
        const { data: currentDb } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'app_settings')
          .maybeSingle();
        
        const dbMargins = currentDb?.value?.marginRules ?? currentDb?.value?.margin_rules ?? [];
        if (Array.isArray(dbMargins) && dbMargins.length > 5) {
          console.error('[SETTINGS] saveSetting blocked: payload has empty marginRules but DB has', dbMargins.length, 'margins');
          throw new Error('تم منع الحفظ: الهوامش في الـ payload فارغة بينما Supabase يحتوي بيانات حقيقية.');
        }
      }

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
  }, [supabaseLoadStatus]);

  return {
    settings,
    loading,
    initialized,
    supabaseFetched,
    supabaseLoadStatus,
    setSupabaseLoadStatus,
    supabaseLoadError,
    isTemporaryFallback,
    fetchSettings,
    saveSetting,
    banks: settings.banks ?? [],
    marginRules: settings.margin_rules !== undefined && settings.margin_rules !== null
      ? (settings.margin_rules as any[]).map((r: any) => ({
          ...r,
          productId: normalizeMemoryProductId(r.productId)
        }))
      : [],
    dsrRules: normalizeDsrRules(settings.dsrRules ?? settings.dsr_rules ?? []).map((r: any) => ({ ...r, productType: normalizeMemoryProductId(r.productType || r.productId) })),
    personalRules: (settings.personal_finance_rules ?? []).map((r: any) => ({ ...r, productId: normalizeMemoryProductId(r.productId) })),
    products: (settings.product_acceptance ?? []).map((r: any) => ({ ...r, productId: normalizeMemoryProductId(r.productId) })),
    militaryRanks: settings.military_ranks ?? [],
    pensionRules: settings.pension_rules ?? [],
    supportSettings: settings.support_settings ?? {},
    salaryRules: settings.salary_rules ?? [],
    termRules: (settings.term_rules ?? []).map((r: any) => ({ ...r, productId: normalizeMemoryProductId(r.productId) })),
    advancedRules: settings.advanced_rules ?? [],
    userSubscriptions: settings.user_subscriptions ?? [],
    customSectors: settings.hasba_custom_sectors ?? [],
    bankSectorRules: settings.bank_sector_pension_rules ?? [],
    pensionRulesLibrary: settings.pension_rules_library ?? [],
    housingSupportTiers: settings.housingSupportTiers ?? [],
    advancePaymentTiers: settings.advancePaymentTiers ?? [],
    approvedSalaryRules: settings.approvedSalaryRules ?? [],
    pensionDbRules: settings.pensionDbRules ?? [],
    sectorMappings: settings.sectorMappings ?? [],
  };
}
