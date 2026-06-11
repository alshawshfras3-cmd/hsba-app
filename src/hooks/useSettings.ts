import { useState, useEffect, useCallback } from 'react';
import { supabase, hasSupabaseKeys } from '../lib/supabase';
import { DsrRule, HousingSupportTier, AdvancePaymentTier } from '../types';
import { normalizeDsrRules } from '../lib/settings/normalizeDsrRules';
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

export function normalizeMemoryProductId(id: string): string {
  if (!id) return id;
  const p = id.trim().toLowerCase();
  if (p === 'real_estate' || p === 'real_estate_only') return 'real_estate_only';
  if (p === 'personal' || p === 'personal_only') return 'personal_only';
  if (p === 'both' || p === 'real_estate_with_new_personal') return 'real_estate_with_new_personal';
  if (p === 'real_estate_with_personal_existing' || p === 'real_estate_with_existing_personal') return 'real_estate_with_existing_personal';
  return id;
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
  const [supabaseLoadStatus, setSupabaseLoadStatus] = useState<'loading' | 'success' | 'failed' | 'empty_db' | 'read_only_protected'>(hasSupabaseKeys ? 'loading' : 'success');
  const [supabaseLoadError, setSupabaseLoadError] = useState<string | null>(null);

  // Fetch all system settings from Supabase
  const fetchSettings = useCallback(async () => {
    if (!hasSupabaseKeys) {
      setSupabaseFetched(true);
      setSupabaseLoadStatus('success');
      return;
    }

    setLoading(true);
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
      if (data) {
        if (data.value && typeof data.value === 'object' && Object.keys(data.value).length > 0) {
          appSettingsObj = data.value;
          console.log('[SETTINGS] key found in Supabase, using Supabase value: app_settings (source of truth)');
          
          const loadedMargins = appSettingsObj.marginRules ?? appSettingsObj.margin_rules ?? [];
          if (!Array.isArray(loadedMargins) || loadedMargins.length === 0) {
            console.warn('[SETTINGS] ⚠️ app_settings loaded from Supabase but marginRules is EMPTY!');
            console.warn('[SETTINGS] This may indicate a previous accidental overwrite. Check Supabase.');
          }
          
          setSupabaseLoadStatus('success');
        } else {
          console.log('[SETTINGS] Key exists in Supabase but is empty (e.g. empty object)');
          setSupabaseLoadStatus('empty_db');
          appSettingsObj = data.value || {};
        }
      } else {
        console.log('[SETTINGS] key missing entirely in Supabase table system_settings. Initializing with seeds...');
        setSupabaseLoadStatus('empty_db');
        
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
          marginRules: oldSettingsData['margin_rules'] || [],
          dsrRules: normalizeDsrRules(oldSettingsData['dsr_rules'] || DEFAULTS['dsr_rules']),
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
          // ⚠️ Guard: لا تكتب في Supabase لو القواعد الأساسية فارغة
          // هذا يمنع محو البيانات بسبب cold start أو timeout
          const hasMinimalData = (
            Array.isArray(appSettingsObj.marginRules) && appSettingsObj.marginRules.length > 0
          ) || (
            Array.isArray(appSettingsObj.margin_rules) && appSettingsObj.margin_rules.length > 0
          );
          
          if (!hasMinimalData) {
            console.warn('[SETTINGS] Migration aborted: marginRules is empty. Refusing to overwrite Supabase with empty seeds.');
            // ⚠️ هذه ليست حالة نجاح — الحفظ ممنوع حتى يُعاد تحميل Supabase بنجاح
            // لا تستخدم 'success' هنا لأن ذلك يسمح بالحفظ لاحقًا رغم أن التحميل غير آمن
            setSupabaseLoadStatus('read_only_protected');
            setSupabaseFetched(true);
            setLoading(false);
            return;
          }

          const { error: insertErr } = await supabase.from('system_settings').insert({
            key: 'app_settings',
            value: appSettingsObj,
            source: 'seed_initial',
            updated_at: new Date().toISOString()
          });
          if (insertErr) {
            throw insertErr;
          }
          console.log('[SUPABASE SAVE] Created consolidated app_settings from migration successfully');
          setSupabaseLoadStatus('success');
        } catch (saveErr) {
          console.error("Migration: failed to save app_settings to system_settings table:", saveErr);
          throw saveErr;
        }
      }

      // Convert appSettingsObj to settings mapping
      // If we loaded successfully from Supabase, use database property or empty list.
      // DONT fallback to seeds/DEFAULTS to avoid merging!
      const settingsMap: Record<string, any> = {
        banks: appSettingsObj.banks ?? [],
        product_acceptance: appSettingsObj.products ?? appSettingsObj.product_acceptance ?? [],
        military_ranks: appSettingsObj.militaryRanks ?? appSettingsObj.military_ranks ?? [],
        salary_rules: appSettingsObj.salaryRules ?? appSettingsObj.salary_rules ?? [],
        pension_rules: appSettingsObj.pensionRules ?? appSettingsObj.pension_rules ?? [],
        term_rules: appSettingsObj.termRules ?? appSettingsObj.term_rules ?? [],
        ...(
          appSettingsObj.marginRules !== undefined || appSettingsObj.margin_rules !== undefined
            ? { margin_rules: appSettingsObj.marginRules ?? appSettingsObj.margin_rules }
            : {}
        ),
        dsrRules: normalizeDsrRules(appSettingsObj.dsrRules ?? appSettingsObj.dsr_rules ?? []),
        dsr_rules: normalizeDsrRules(appSettingsObj.dsrRules ?? appSettingsObj.dsr_rules ?? []),
        support_settings: appSettingsObj.supportSettings ?? appSettingsObj.support_settings ?? {},
        personal_finance_rules: appSettingsObj.personalRules ?? appSettingsObj.personal_finance_rules ?? [],
        advanced_rules: appSettingsObj.advancedRules ?? appSettingsObj.advanced_rules ?? [],
        hasba_custom_sectors: appSettingsObj.customSectors ?? appSettingsObj.hasba_custom_sectors ?? defaultSectorsList,
        bank_sector_pension_rules: appSettingsObj.bankSectorRules ?? appSettingsObj.bank_sector_pension_rules ?? [],
        pension_rules_library: appSettingsObj.pensionRulesLibrary ?? appSettingsObj.pension_rules_library ?? [],
        
        housingSupportTiers: appSettingsObj.housingSupportTiers ?? appSettingsObj.housing_support_tiers ?? [],
        advancePaymentTiers: appSettingsObj.advancePaymentTiers ?? appSettingsObj.advance_payment_tiers ?? [],
        approvedSalaryRules: appSettingsObj.approvedSalaryRules ?? appSettingsObj.approvedSalaryDbRules ?? appSettingsObj.approved_salary_rules ?? appSettingsObj.approved_salary_db_rules ?? [],
        pensionDbRules: appSettingsObj.pensionDbRules ?? appSettingsObj.pension_db_rules ?? [],
        sectorMappings: appSettingsObj.sectorMappings ?? appSettingsObj.sector_mappings ?? [],
      };

      setSettings(settingsMap);
      setSupabaseFetched(true);
      setLoading(false);

    } catch (err: any) {
      const errMsg = err?.message || String(err);
      console.error('[SUPABASE LOAD ERROR] table=system_settings status=failed message=', errMsg);
      setSupabaseLoadStatus('failed');
      setSupabaseLoadError(errMsg);
      // Set to true so loading spinner can close, but AppContext details error state to prevent overriding!
      setSupabaseFetched(true);
      setLoading(false);
    }
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
    supabaseLoadError,
    fetchSettings,
    saveSetting,
    banks: settings.banks !== undefined && settings.banks !== null ? settings.banks : DEFAULTS.banks,
    marginRules: settings.margin_rules !== undefined && settings.margin_rules !== null
      ? (settings.margin_rules as any[]).map((r: any) => ({
          ...r,
          productId: normalizeMemoryProductId(r.productId)
        }))
      : undefined,
    dsrRules: normalizeDsrRules(settings.dsrRules !== undefined && settings.dsrRules !== null ? settings.dsrRules : (settings.dsr_rules !== undefined && settings.dsr_rules !== null ? settings.dsr_rules : DEFAULTS.dsr_rules)).map((r: any) => ({ ...r, productType: normalizeMemoryProductId(r.productType || r.productId) })),
    personalRules: (settings.personal_finance_rules !== undefined && settings.personal_finance_rules !== null ? settings.personal_finance_rules : DEFAULTS.personal_finance_rules).map((r: any) => ({ ...r, productId: normalizeMemoryProductId(r.productId) })),
    products: (settings.product_acceptance !== undefined && settings.product_acceptance !== null ? settings.product_acceptance : DEFAULTS.product_acceptance).map((r: any) => ({ ...r, productId: normalizeMemoryProductId(r.productId) })),
    militaryRanks: (settings.military_ranks !== undefined && settings.military_ranks !== null) ? settings.military_ranks : DEFAULTS.military_ranks,
    pensionRules: settings.pension_rules !== undefined && settings.pension_rules !== null ? settings.pension_rules : DEFAULTS.pension_rules,
    supportSettings: settings.support_settings !== undefined && settings.support_settings !== null ? settings.support_settings : DEFAULTS.support_settings,
    salaryRules: settings.salary_rules !== undefined && settings.salary_rules !== null ? settings.salary_rules : DEFAULTS.salary_rules,
    termRules: (settings.term_rules !== undefined && settings.term_rules !== null ? settings.term_rules : DEFAULTS.term_rules).map((r: any) => ({ ...r, productId: normalizeMemoryProductId(r.productId) })),
    advancedRules: settings.advanced_rules !== undefined && settings.advanced_rules !== null ? settings.advanced_rules : DEFAULTS.advanced_rules,
    userSubscriptions: settings.user_subscriptions !== undefined && settings.user_subscriptions !== null ? settings.user_subscriptions : DEFAULTS.user_subscriptions,
    customSectors: settings.hasba_custom_sectors !== undefined && settings.hasba_custom_sectors !== null ? settings.hasba_custom_sectors : DEFAULTS.hasba_custom_sectors,
    bankSectorRules: settings.bank_sector_pension_rules !== undefined && settings.bank_sector_pension_rules !== null ? settings.bank_sector_pension_rules : DEFAULTS.bank_sector_pension_rules,
    pensionRulesLibrary: settings.pension_rules_library !== undefined && settings.pension_rules_library !== null ? settings.pension_rules_library : DEFAULTS.pension_rules_library,
    housingSupportTiers: settings.housingSupportTiers !== undefined && settings.housingSupportTiers !== null ? settings.housingSupportTiers : [...DEFAULT_HOUSING_SUPPORT_TIERS],
    advancePaymentTiers: settings.advancePaymentTiers !== undefined && settings.advancePaymentTiers !== null ? settings.advancePaymentTiers : [...DEFAULT_ADVANCE_PAYMENT_TIERS],
    approvedSalaryRules: settings.approvedSalaryRules !== undefined && settings.approvedSalaryRules !== null ? settings.approvedSalaryRules : fallbackApprovedSalaryRules,
    pensionDbRules: settings.pensionDbRules !== undefined && settings.pensionDbRules !== null ? settings.pensionDbRules : fallbackPensionRules,
    sectorMappings: settings.sectorMappings !== undefined && settings.sectorMappings !== null ? settings.sectorMappings : fallbackSectorMappings,
  };
}

