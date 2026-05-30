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
  { id: '22', bankId: 'ahli', sectorId: 'military_officer', bankSectorId: 'strong', labelAr: 'عسكري (ضباط) — قوي' },
  { id: '23', bankId: 'ahli', sectorId: 'semi_gov', bankSectorId: 'strong', labelAr: 'شبه حكومي — قوي' },
  { id: '24', bankId: 'ahli', sectorId: 'companies', bankSectorId: 'strong', labelAr: 'شركات كبرى — قوي' },
  { id: '25', bankId: 'ahli', sectorId: 'military_individual', bankSectorId: 'weak', labelAr: 'أفراد عسكريين — ضعيف' },
  { id: '26', bankId: 'ahli', sectorId: 'private', bankSectorId: 'weak', labelAr: 'خاص بدون اتفاقية — ضعيف' }
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
    id: 'r_military_officer',
    bankId: 'rajhi',
    sectorId: 'military_officer',
    approvedSalarySource: 'basic_only',
    approvedSalaryMultiplier: 1.345,
    calculationMethod: 'service_based',
    divisorMonths: 420,
    enabled: true
  },
  {
    id: 'r_military_individual',
    bankId: 'rajhi',
    sectorId: 'military_individual',
    approvedSalarySource: 'basic_only',
    approvedSalaryMultiplier: 1.345,
    calculationMethod: 'service_based',
    divisorMonths: 420,
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
    id: 'r_private',
    bankId: 'rajhi',
    sectorId: 'private',
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
    return fallbackApprovedSalaryRules;
  }
  try {
    const { data, error } = await supabase
      .from('approved_salary_source_rules')
      .select('*');

    if (error) throw error;
    if (!data || data.length === 0) return fallbackApprovedSalaryRules;

    return data.map((r: any) => ({
      id: r.id,
      bankId: r.bank_id,
      sectorId: r.sector_id,
      salarySource: r.salary_source,
      multiplier: Number(r.multiplier),
      descriptionAr: r.description_ar,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  } catch (err) {
    console.error('Failed to fetch approved salary source rules from Supabase. Falling back.', err);
    return fallbackApprovedSalaryRules;
  }
}

export async function saveApprovedSalaryRule(rule: ApprovedSalarySourceRule): Promise<void> {
  if (!hasSupabaseKeys) {
    return;
  }
  const payload: any = {
    bank_id: rule.bankId,
    sector_id: rule.sectorId,
    salary_source: rule.salarySource,
    multiplier: rule.multiplier,
    description_ar: rule.descriptionAr,
    updated_at: new Date().toISOString()
  };
  if (rule.id && !rule.id.startsWith('temp_') && rule.id.length > 5) {
    payload.id = rule.id;
  }
  const { error } = await supabase
    .from('approved_salary_source_rules')
    .upsert(payload, { onConflict: 'bank_id,sector_id' });

  if (error) throw error;
}

export async function fetchPensionCalculationRules(): Promise<PensionCalculationRule[]> {
  if (!hasSupabaseKeys) {
    return fallbackPensionRules;
  }
  try {
    const { data, error } = await supabase
      .from('pension_calculation_rules')
      .select('*');

    if (error) throw error;
    if (!data || data.length === 0) return fallbackPensionRules;

    return data.map((r: any) => ({
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
  } catch (err) {
    console.error('Failed to fetch pension calculation rules map from Supabase. Falling back.', err);
    return fallbackPensionRules;
  }
}

export async function savePensionCalculationRule(rule: PensionCalculationRule): Promise<void> {
  if (!hasSupabaseKeys) {
    return;
  }
  const payload: any = {
    bank_id: rule.bankId,
    sector_id: rule.sectorId,
    calculation_method: rule.calculationMethod,
    divisor_months: rule.divisorMonths,
    salary_source_override: rule.salarySourceOverride,
    rate_below_threshold: rule.rateBelowThreshold,
    rate_above_threshold: rule.rateAboveThreshold,
    years_threshold: rule.yearsThreshold,
    description_ar: rule.descriptionAr,
    updated_at: new Date().toISOString()
  };
  if (rule.id && !rule.id.startsWith('temp_') && rule.id.length > 5) {
    payload.id = rule.id;
  }
  const { error } = await supabase
    .from('pension_calculation_rules')
    .upsert(payload, { onConflict: 'bank_id,sector_id' });

  if (error) throw error;
}

export async function fetchSectorClassificationMappings(): Promise<SectorClassificationMapping[]> {
  if (!hasSupabaseKeys) {
    return fallbackSectorMappings;
  }
  try {
    const { data, error } = await supabase
      .from('sector_classification_mapping')
      .select('*');

    if (error) throw error;
    if (!data || data.length === 0) return fallbackSectorMappings;

    return data.map((r: any) => ({
      id: r.id,
      bankId: r.bank_id,
      sectorId: r.sector_id,
      bankSectorId: r.bank_sector_id,
      labelAr: r.label_ar,
      createdAt: r.created_at
    }));
  } catch (err) {
    console.error('Failed to fetch sector mappings from Supabase. Falling back.', err);
    return fallbackSectorMappings;
  }
}

export async function saveSectorClassificationMapping(mapping: SectorClassificationMapping): Promise<void> {
  if (!hasSupabaseKeys) {
    return;
  }
  const payload: any = {
    bank_id: mapping.bankId,
    sector_id: mapping.sectorId,
    bank_sector_id: mapping.bankSectorId,
    label_ar: mapping.labelAr
  };
  if (mapping.id && !mapping.id.startsWith('temp_') && mapping.id.length > 5) {
    payload.id = mapping.id;
  }
  const { error } = await supabase
    .from('sector_classification_mapping')
    .upsert(payload, { onConflict: 'bank_id,sector_id' });

  if (error) throw error;
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

