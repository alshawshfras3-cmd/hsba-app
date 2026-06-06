import { supabase, hasSupabaseKeys } from './supabase';
import { 
  ApprovedSalarySourceRule, 
  PensionCalculationRule, 
  SectorClassificationMapping,
  BankRetirementRule,
  SalarySource
} from '../types/pension-rules';

export const fallbackApprovedSalaryRules: ApprovedSalarySourceRule[] = [
  { id: '1', bankId: 'rajhi', sectorId: 'companies', salarySource: 'basic_housing', multiplier: 1.0, descriptionAr: 'أساسي + سكن' },
  { id: '2', bankId: 'rajhi', sectorId: 'gov_civil', salarySource: 'basic_only', multiplier: 1.345, descriptionAr: 'أساسي × 1.345' },
  { id: '3', bankId: 'rajhi', sectorId: 'military', salarySource: 'basic_only', multiplier: 1.345, descriptionAr: 'أساسي × 1.345' },
  { id: '4', bankId: 'rajhi', sectorId: 'semi_gov', salarySource: 'basic_housing', multiplier: 1.0, descriptionAr: 'أساسي + سكن' },
  { id: '5', bankId: 'rajhi', sectorId: 'default', salarySource: 'basic_housing', multiplier: 1.0, descriptionAr: 'أساسي + سكن (افتراضي)' }
];

export const fallbackPensionRules: PensionCalculationRule[] = [
  { id: '11', bankId: 'rajhi', sectorId: 'companies', calculationMethod: 'service_based', divisorMonths: 480, descriptionAr: 'شركات: (أساسي+سكن)×خدمة÷480' },
  { id: '12', bankId: 'rajhi', sectorId: 'gov_civil', calculationMethod: 'service_based', divisorMonths: 480, descriptionAr: 'مدني: أساسي×1.345×خدمة÷480' },
  { id: '13', bankId: 'rajhi', sectorId: 'military', calculationMethod: 'service_based', divisorMonths: 420, descriptionAr: 'عسكري: أساسي×1.345×خدمة÷420' },
  { id: '14', bankId: 'rajhi', sectorId: 'semi_gov', calculationMethod: 'service_based', divisorMonths: 480, descriptionAr: 'شبه حكومي: (أساسي+سكن)×خدمة÷480' },
  { id: '15', bankId: 'rajhi', sectorId: 'default', calculationMethod: 'service_based', divisorMonths: 480, descriptionAr: 'افتراضي' },
  { id: '16', bankId: 'ahli', sectorId: 'strong', calculationMethod: 'fixed_percentage', rateBelowThreshold: 70, rateAboveThreshold: 80, yearsThreshold: 5, descriptionAr: 'حكومي/ضباط/شبه حكومي/شركات' },
  { id: '17', bankId: 'ahli', sectorId: 'weak', calculationMethod: 'fixed_percentage', rateBelowThreshold: 60, rateAboveThreshold: 70, yearsThreshold: 5, descriptionAr: 'أفراد عسكريين/خاص بدون اتفاقية' }
];

export const fallbackSectorMappings: SectorClassificationMapping[] = [
  { id: '21', bankId: 'ahli', sectorId: 'gov_civil', bankSectorId: 'strong', labelAr: 'حكومي — قوي' },
  { id: '22', bankId: 'ahli', sectorId: 'military', bankSectorId: 'strong', labelAr: 'عسكري — قوي' },
  { id: '23', bankId: 'ahli', sectorId: 'semi_gov', bankSectorId: 'strong', labelAr: 'شبه حكومي — قوي' },
  { id: '24', bankId: 'ahli', sectorId: 'companies', bankSectorId: 'strong', labelAr: 'شركات كبرى — قوي' }
];

export const fallbackBankRetirementRules: BankRetirementRule[] = [
  // الراجحي
  {
    id: 'r_civil',
    bankId: 'rajhi',
    sectorId: 'gov_civil',
    approvedSalarySource: 'basic_only',
    approvedSalaryMultiplier: 1.345,
    calculationMethod: 'service_based',
    divisorMonths: 480,
    enabled: true
  },
  {
    id: 'r_military',
    bankId: 'rajhi',
    sectorId: 'military',
    approvedSalarySource: 'basic_only',
    approvedSalaryMultiplier: 1.345,
    calculationMethod: 'service_based',
    divisorMonths: 420,
    enabled: true
  },
  {
    id: 'r_semi_gov',
    bankId: 'rajhi',
    sectorId: 'semi_gov',
    approvedSalarySource: 'basic_housing',
    approvedSalaryMultiplier: 1.0,
    calculationMethod: 'service_based',
    divisorMonths: 480,
    enabled: true
  },
  {
    id: 'r_companies',
    bankId: 'rajhi',
    sectorId: 'companies',
    approvedSalarySource: 'basic_housing',
    approvedSalaryMultiplier: 1.0,
    calculationMethod: 'service_based',
    divisorMonths: 480,
    enabled: true
  },
  {
    id: 'r_retired',
    bankId: 'rajhi',
    sectorId: 'retired',
    approvedSalarySource: 'manual',
    approvedSalaryMultiplier: 1.0,
    calculationMethod: 'direct',
    enabled: true
  },
  {
    id: 'r_default',
    bankId: 'rajhi',
    sectorId: 'default',
    approvedSalarySource: 'basic_housing',
    approvedSalaryMultiplier: 1.0,
    calculationMethod: 'service_based',
    divisorMonths: 480,
    enabled: true
  },

  // الأهلي القطاعات القوية والضعيفة
  {
    id: 'a_strong',
    bankId: 'ahli',
    sectorId: 'strong',
    approvedSalarySource: 'basic_housing',
    approvedSalaryMultiplier: 1.0,
    calculationMethod: 'fixed_percentage',
    yearsThreshold: 5,
    rateBelowThreshold: 70,
    rateAboveThreshold: 80,
    enabled: true
  },
  {
    id: 'a_weak',
    bankId: 'ahli',
    sectorId: 'weak',
    approvedSalarySource: 'basic_housing',
    approvedSalaryMultiplier: 1.0,
    calculationMethod: 'fixed_percentage',
    yearsThreshold: 5,
    rateBelowThreshold: 60,
    rateAboveThreshold: 70,
    enabled: true
  },
  {
    id: 'a_default',
    bankId: 'ahli',
    sectorId: 'default',
    approvedSalarySource: 'basic_housing',
    approvedSalaryMultiplier: 1.0,
    calculationMethod: 'service_based',
    divisorMonths: 480,
    enabled: true
  }
];

export function combineToRetirementRules(
  salRules: ApprovedSalarySourceRule[],
  penRules: PensionCalculationRule[]
): BankRetirementRule[] {
  const rulesMap = new Map<string, Partial<BankRetirementRule>>();

  for (const s of salRules) {
    const key = `${s.bankId}||${s.sectorId}`;
    if (!rulesMap.has(key)) {
      rulesMap.set(key, { bankId: s.bankId, sectorId: s.sectorId });
    }
    const r = rulesMap.get(key)!;
    let source: BankRetirementRule['approvedSalarySource'] = 'basic_housing';
    if (s.salarySource === 'basic_only') source = 'basic_only';
    else if (s.salarySource === 'basic_housing') source = 'basic_housing';
    else if (s.salarySource === 'gross' || s.salarySource === 'basic_housing_allowances') source = 'basic_housing_allowances';
    else if (s.salarySource === 'net_salary') source = 'net_salary';
    else if (s.salarySource === 'manual' || s.salarySource === 'custom_multiplier') source = 'manual';

    r.approvedSalarySource = source;
    r.approvedSalaryMultiplier = s.multiplier ?? 1.0;
    r.id = s.id;
  }

  for (const p of penRules) {
    const key = `${p.bankId}||${p.sectorId}`;
    if (!rulesMap.has(key)) {
      rulesMap.set(key, { bankId: p.bankId, sectorId: p.sectorId });
    }
    const r = rulesMap.get(key)!;
    r.calculationMethod = p.calculationMethod as any || 'service_based';
    r.divisorMonths = p.divisorMonths;
    r.yearsThreshold = p.yearsThreshold;
    r.rateBelowThreshold = p.rateBelowThreshold;
    r.rateAboveThreshold = p.rateAboveThreshold;
    if (!r.id) r.id = p.id;
  }

  const results: BankRetirementRule[] = [];
  rulesMap.forEach((val, key) => {
    results.push({
      id: val.id || `ret_rule_${Date.now()}_${Math.random()}`,
      bankId: val.bankId!,
      sectorId: val.sectorId!,
      approvedSalarySource: val.approvedSalarySource || 'basic_housing',
      approvedSalaryMultiplier: val.approvedSalaryMultiplier ?? 1.0,
      calculationMethod: val.calculationMethod || 'service_based',
      divisorMonths: val.divisorMonths ?? 480,
      yearsThreshold: val.yearsThreshold,
      rateBelowThreshold: val.rateBelowThreshold,
      rateAboveThreshold: val.rateAboveThreshold,
      enabled: true,
      notes: ''
    });
  });

  // Ensure fallback rules are added if missing
  for (const fallback of fallbackBankRetirementRules) {
    const exists = results.some(r => r.bankId === fallback.bankId && r.sectorId === fallback.sectorId);
    if (!exists) {
      results.push(fallback);
    }
  }

  return results;
}

export async function fetchApprovedSalaryRules(): Promise<ApprovedSalarySourceRule[]> {
  if (!hasSupabaseKeys) {
    console.log('[SUPABASE LOAD] table=approved_salary_source_rules status=offline (no keys)');
    return fallbackApprovedSalaryRules;
  }
  try {
    console.log('[PENSION] START fetchApprovedSalaryRules');
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'app_settings')
      .maybeSingle();

    if (error) throw error;
    if (data && data.value) {
      const val = data.value;
      const rules = val.approvedSalaryRules || val.approvedSalaryDbRules || [];
      console.log(`[SUPABASE LOAD] table=approved_salary_source_rules status=success rows=${rules.length}`);
      return rules;
    }
    console.log('[SUPABASE LOAD] table=approved_salary_source_rules status=success key=app_settings empty/not-found');
    return fallbackApprovedSalaryRules;
  } catch (err: any) {
    console.error(`[SUPABASE LOAD] table=approved_salary_source_rules status=error message=${err?.message || err}`);
    return fallbackApprovedSalaryRules;
  }
}

export async function saveApprovedSalaryRule(rule: ApprovedSalarySourceRule): Promise<void> {
  if (!hasSupabaseKeys) {
    return;
  }
  try {
    const { data, error: selectError } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'app_settings')
      .maybeSingle();

    if (selectError) throw selectError;

    let appSettings = data?.value || {};
    let rules: ApprovedSalarySourceRule[] = appSettings.approvedSalaryRules || appSettings.approvedSalaryDbRules || [];

    const index = rules.findIndex((r: any) => r.bankId === rule.bankId && r.sectorId === rule.sectorId);
    if (index >= 0) {
      rules[index] = rule;
    } else {
      rules.push(rule);
    }

    appSettings.approvedSalaryRules = rules;
    appSettings.approvedSalaryDbRules = rules;

    const { error: upsertError } = await supabase
      .from('system_settings')
      .upsert({
        key: 'app_settings',
        value: appSettings,
        source: 'admin',
        updated_at: new Date().toISOString()
      });

    if (upsertError) throw upsertError;
  } catch (err) {
    console.error('saveApprovedSalaryRule failed:', err);
    throw err;
  }
}

export async function fetchPensionCalculationRules(): Promise<PensionCalculationRule[]> {
  if (!hasSupabaseKeys) {
    console.log('[SUPABASE LOAD] table=pension_calculation_rules status=offline (no keys)');
    return fallbackPensionRules;
  }
  try {
    console.log('[PENSION] START fetchPensionCalculationRules');
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'app_settings')
      .maybeSingle();

    if (error) throw error;
    if (data && data.value) {
      const val = data.value;
      const rules = val.pensionDbRules || val.pensionRules || [];
      console.log(`[SUPABASE LOAD] table=pension_calculation_rules status=success rows=${rules.length}`);
      return rules;
    }
    console.log('[SUPABASE LOAD] table=pension_calculation_rules status=success key=app_settings empty/not-found');
    return fallbackPensionRules;
  } catch (err: any) {
    console.error(`[SUPABASE LOAD] table=pension_calculation_rules status=error message=${err?.message || err}`);
    return fallbackPensionRules;
  }
}

export async function savePensionCalculationRule(rule: PensionCalculationRule): Promise<void> {
  if (!hasSupabaseKeys) {
    return;
  }
  try {
    const { data, error: selectError } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'app_settings')
      .maybeSingle();

    if (selectError) throw selectError;

    let appSettings = data?.value || {};
    let rules: PensionCalculationRule[] = appSettings.pensionDbRules || appSettings.pensionRules || [];

    const index = rules.findIndex((r: any) => r.bankId === rule.bankId && r.sectorId === rule.sectorId);
    if (index >= 0) {
      rules[index] = rule;
    } else {
      rules.push(rule);
    }

    appSettings.pensionDbRules = rules;
    appSettings.pensionRules = rules;

    const { error: upsertError } = await supabase
      .from('system_settings')
      .upsert({
        key: 'app_settings',
        value: appSettings,
        source: 'admin',
        updated_at: new Date().toISOString()
      });

    if (upsertError) throw upsertError;
  } catch (err) {
    console.error('savePensionCalculationRule failed:', err);
    throw err;
  }
}

export async function fetchSectorClassificationMappings(): Promise<SectorClassificationMapping[]> {
  if (!hasSupabaseKeys) {
    console.log('[SUPABASE LOAD] table=sector_classification_mapping status=offline (no keys)');
    return fallbackSectorMappings;
  }
  try {
    console.log('[PENSION] START fetchSectorClassificationMappings');
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'app_settings')
      .maybeSingle();

    if (error) throw error;
    if (data && data.value) {
      const val = data.value;
      const mappings = val.sectorMappings || val.sectorClassificationMappings || [];
      console.log(`[SUPABASE LOAD] table=sector_classification_mapping status=success rows=${mappings.length}`);
      return mappings;
    }
    console.log('[SUPABASE LOAD] table=sector_classification_mapping status=success key=app_settings empty/not-found');
    return fallbackSectorMappings;
  } catch (err: any) {
    console.error(`[SUPABASE LOAD] table=sector_classification_mapping status=error message=${err?.message || err}`);
    return fallbackSectorMappings;
  }
}

export async function saveSectorClassificationMapping(mapping: SectorClassificationMapping): Promise<void> {
  if (!hasSupabaseKeys) {
    return;
  }
  try {
    const { data, error: selectError } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'app_settings')
      .maybeSingle();

    if (selectError) throw selectError;

    let appSettings = data?.value || {};
    let mappings: SectorClassificationMapping[] = appSettings.sectorMappings || appSettings.sectorClassificationMappings || [];

    const index = mappings.findIndex((r: any) => r.bankId === mapping.bankId && r.sectorId === mapping.sectorId);
    if (index >= 0) {
      mappings[index] = mapping;
    } else {
      mappings.push(mapping);
    }

    appSettings.sectorMappings = mappings;
    appSettings.sectorClassificationMappings = mappings;

    const { error: upsertError } = await supabase
      .from('system_settings')
      .upsert({
        key: 'app_settings',
        value: appSettings,
        source: 'admin',
        updated_at: new Date().toISOString()
      });

    if (upsertError) throw upsertError;
  } catch (err) {
    console.error('saveSectorClassificationMapping failed:', err);
    throw err;
  }
}

export async function fetchBankRetirementRules(): Promise<BankRetirementRule[]> {
  const [sal, pen] = await Promise.all([
    fetchApprovedSalaryRules(),
    fetchPensionCalculationRules()
  ]);
  return combineToRetirementRules(sal, pen);
}

export async function saveBankRetirementRule(rule: BankRetirementRule): Promise<void> {
  const salSource: SalarySource = 
    rule.approvedSalarySource === 'basic_only' ? 'basic_only' :
    rule.approvedSalarySource === 'basic_housing' ? 'basic_housing' :
    rule.approvedSalarySource === 'basic_housing_allowances' ? 'gross' :
    rule.approvedSalarySource === 'net_salary' ? 'net_salary' :
    'custom_multiplier';

  const salRule: ApprovedSalarySourceRule = {
    id: `${rule.bankId}_${rule.sectorId}_sal`,
    bankId: rule.bankId,
    sectorId: rule.sectorId,
    salarySource: salSource,
    multiplier: rule.approvedSalaryMultiplier,
    descriptionAr: `توليد تلقائي: مصدر الراتب المعتمد ${rule.approvedSalarySource}`
  };

  const penRule: PensionCalculationRule = {
    id: `${rule.bankId}_${rule.sectorId}_pen`,
    bankId: rule.bankId,
    sectorId: rule.sectorId,
    calculationMethod: rule.calculationMethod === 'direct' ? 'service_based' : rule.calculationMethod as any,
    divisorMonths: rule.divisorMonths,
    yearsThreshold: rule.yearsThreshold,
    rateBelowThreshold: rule.rateBelowThreshold,
    rateAboveThreshold: rule.rateAboveThreshold,
    descriptionAr: `توليد تلقائي: طريقة الحساب ${rule.calculationMethod}`
  };

  await Promise.all([
    saveApprovedSalaryRule(salRule),
    savePensionCalculationRule(penRule)
  ]);
}
