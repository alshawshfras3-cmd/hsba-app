import { supabase, hasSupabaseKeys } from './supabase';
import { MarginRule, DsrRule, PersonalFinanceRules } from '../types';
import { ApprovedSalarySourceRule, PensionCalculationRule, SectorClassificationMapping } from '../types/pension-rules';

// Helper to convert any string to a unique deterministic RFC4122-compliant UUID
export function toUUID(str: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!str) {
    return '00000000-0000-0000-0000-000000000000';
  }
  if (uuidRegex.test(str)) {
    return str;
  }
  
  // Quick FNV-1a like hashing to 32 hex chars
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  
  let hex = Math.abs(h).toString(16).padStart(8, '0');
  // Fill the rest of the 32 hex chars deterministically using string characters
  for (let i = 0; i < str.length && hex.length < 32; i++) {
    hex += str.charCodeAt(i).toString(16);
  }
  hex = hex.padEnd(32, '0').substring(0, 32).toLowerCase();
  
  return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-4${hex.substring(13, 16)}-a${hex.substring(17, 20)}-${hex.substring(20, 32)}`;
}

// Map any section properties to the correct target block
export function remapBankId(sections: any, targetBankId: string) {
  const remapped: any = {
    marginRules: [],
    dsrRules: [],
    personalFinanceRules: [],
    approvedSalaryRules: [],
    pensionRules: []
  };

  if (sections.marginRules && Array.isArray(sections.marginRules)) {
    remapped.marginRules = sections.marginRules.map((rule: any) => ({
      ...rule,
      id: `margin_${targetBankId}_${Math.random().toString(36).substr(2, 9)}`,
      bankId: targetBankId
    }));
  }

  if (sections.dsrRules && Array.isArray(sections.dsrRules)) {
    remapped.dsrRules = sections.dsrRules.map((rule: any) => ({
      ...rule,
      id: `dsr_${targetBankId}_${Math.random().toString(36).substr(2, 9)}`,
      bankId: targetBankId
    }));
  }

  if (sections.personalFinanceRules && Array.isArray(sections.personalFinanceRules)) {
    remapped.personalFinanceRules = sections.personalFinanceRules.map((rule: any) => ({
      ...rule,
      id: `personal_${targetBankId}_${Math.random().toString(36).substr(2, 9)}`,
      bankId: targetBankId
    }));
  }

  if (sections.approvedSalaryRules && Array.isArray(sections.approvedSalaryRules)) {
    remapped.approvedSalaryRules = sections.approvedSalaryRules.map((rule: any) => ({
      ...rule,
      id: toUUID(`salary_${targetBankId}_${rule.sectorId || Math.random().toString()}`),
      bankId: targetBankId
    }));
  }

  if (sections.pensionRules && Array.isArray(sections.pensionRules)) {
    remapped.pensionRules = sections.pensionRules.map((rule: any) => ({
      ...rule,
      id: toUUID(`pension_${targetBankId}_${rule.sectorId || Math.random().toString()}`),
      bankId: targetBankId
    }));
  }

  return remapped;
}

// Log a rule version into the database
export async function logVersion(
  tableName: string,
  bankId: string,
  recordId: string | null,
  oldData: any,
  newData: any,
  changeNote: string,
  changedBy: string = 'alshawshfras3@gmail.com'
) {
  if (!hasSupabaseKeys) {
    console.log(`[Local Version Log] Table: ${tableName}, Bank: ${bankId}, Note: ${changeNote}`);
    return;
  }
  try {
    const finalRecordId = recordId ? toUUID(recordId) : toUUID(`${tableName}_${bankId}_general`);
    await supabase.from('rule_versions').insert({
      table_name: tableName,
      record_id: finalRecordId,
      bank_id: bankId,
      changed_by: changedBy,
      old_data: oldData,
      new_data: newData,
      change_note: changeNote,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Failed to write entry to rule_versions table:', err);
  }
}

// Save with versioning automatic wrapper for single record
export async function saveWithVersioning<T extends { id?: any; bankId?: string; bank_id?: string }>(
  tableName: string,
  bankId: string,
  newData: T,
  oldData: T | null,
  changeNote?: string,
  changedBy: string = 'alshawshfras3@gmail.com'
) {
  const recordId = newData.id || `${tableName}_${bankId}_single`;
  
  // 1. Log version first to record previous and current
  await logVersion(
    tableName,
    bankId,
    recordId,
    oldData,
    newData,
    changeNote ?? 'تعديل يدوي من لوحة التحكم',
    changedBy
  );
}

// Copy selective folders from one bank to another
export async function copyBankSettings(
  params: {
    fromBankId: string,
    toBankId: string,
    sections: ('margins' | 'dsr' | 'personal' | 'salary_source' | 'pension')[],
    currentUserEmail?: string,
    // current local states
    marginRules: MarginRule[],
    dsrRules: DsrRule[],
    personalRules: PersonalFinanceRules[],
    approvedSalaryDbRules: ApprovedSalarySourceRule[],
    pensionDbRules: PensionCalculationRule[]
  }
) {
  const {
    fromBankId,
    toBankId,
    sections,
    currentUserEmail,
    marginRules,
    dsrRules,
    personalRules,
    approvedSalaryDbRules,
    pensionDbRules
  } = params;

  let nextMarginRules = [...marginRules];
  let nextDsrRules = [...dsrRules];
  let nextPersonalRules = [...personalRules];
  let nextApprovedSalaryDbRules = [...approvedSalaryDbRules];
  let nextPensionDbRules = [...pensionDbRules];

  const changedBy = currentUserEmail || 'alshawshfras3@gmail.com';

  for (const section of sections) {
    if (section === 'margins') {
      const oldRules = marginRules.filter(r => r.bankId === toBankId);
      const sourceRules = marginRules.filter(r => r.bankId === fromBankId);
      const remapped = sourceRules.map(r => ({
        ...r,
        id: `margin_${toBankId}_${Math.random().toString(36).substr(2, 9)}`,
        bankId: toBankId
      }));
      nextMarginRules = [...marginRules.filter(r => r.bankId !== toBankId), ...remapped];
      await logVersion('margin_rules', toBankId, null, oldRules, remapped, `نسخ من ${fromBankId}`, changedBy);
    }

    if (section === 'dsr') {
      const oldRules = dsrRules.filter(r => r.bankId === toBankId);
      const sourceRules = dsrRules.filter(r => r.bankId === fromBankId);
      const remapped = sourceRules.map(r => ({
        ...r,
        id: `dsr_${toBankId}_${Math.random().toString(36).substr(2, 9)}`,
        bankId: toBankId
      }));
      nextDsrRules = [...dsrRules.filter(r => r.bankId !== toBankId), ...remapped];
      await logVersion('dsr_rules', toBankId, null, oldRules, remapped, `نسخ من ${fromBankId}`, changedBy);
    }

    if (section === 'personal') {
      const oldRules = personalRules.filter(r => r.bankId === toBankId);
      const sourceRules = personalRules.filter(r => r.bankId === fromBankId);
      const remapped = sourceRules.map(r => ({
        ...r,
        id: `personal_${toBankId}_${Math.random().toString(36).substr(2, 9)}`,
        bankId: toBankId
      }));
      nextPersonalRules = [...personalRules.filter(r => r.bankId !== toBankId), ...remapped];
      await logVersion('personal_finance_rules', toBankId, null, oldRules, remapped, `نسخ من ${fromBankId}`, changedBy);
    }

    if (section === 'salary_source') {
      const oldRules = approvedSalaryDbRules.filter(r => r.bankId === toBankId);
      const sourceRules = approvedSalaryDbRules.filter(r => r.bankId === fromBankId);
      const remapped = sourceRules.map(r => ({
        id: toUUID(`salary_${toBankId}_${r.sectorId}`),
        bankId: toBankId,
        sectorId: r.sectorId,
        salarySource: r.salarySource,
        multiplier: r.multiplier,
        descriptionAr: r.descriptionAr
      }));

      // In database if Supabase is connected
      if (hasSupabaseKeys) {
        // Delete old
        await supabase.from('approved_salary_source_rules').delete().eq('bank_id', toBankId);
        // Insert new
        for (const item of remapped) {
          await supabase.from('approved_salary_source_rules').insert({
            id: item.id,
            bank_id: item.bankId,
            sector_id: item.sectorId,
            salary_source: item.salarySource,
            multiplier: item.multiplier,
            description_ar: item.descriptionAr
          });
        }
      }

      nextApprovedSalaryDbRules = [...approvedSalaryDbRules.filter(r => r.bankId !== toBankId), ...remapped];
      await logVersion('approved_salary_source_rules', toBankId, null, oldRules, remapped, `نسخ من ${fromBankId}`, changedBy);
    }

    if (section === 'pension') {
      const oldRules = pensionDbRules.filter(r => r.bankId === toBankId);
      const sourceRules = pensionDbRules.filter(r => r.bankId === fromBankId);
      const remapped = sourceRules.map(r => ({
        id: toUUID(`pension_${toBankId}_${r.sectorId}`),
        bankId: toBankId,
        sectorId: r.sectorId,
        calculationMethod: r.calculationMethod,
        divisorMonths: r.divisorMonths,
        salarySourceOverride: r.salarySourceOverride,
        rateBelowThreshold: r.rateBelowThreshold,
        rateAboveThreshold: r.rateAboveThreshold,
        yearsThreshold: r.yearsThreshold,
        descriptionAr: r.descriptionAr
      }));

      // DB synchronization
      if (hasSupabaseKeys) {
        await supabase.from('pension_calculation_rules').delete().eq('bank_id', toBankId);
        for (const item of remapped) {
          await supabase.from('pension_calculation_rules').insert({
            id: item.id,
            bank_id: item.bankId,
            sector_id: item.sectorId,
            calculation_method: item.calculationMethod,
            divisor_months: item.divisorMonths,
            salary_source_override: item.salarySourceOverride,
            rate_below_threshold: item.rateBelowThreshold,
            rate_above_threshold: item.rateAboveThreshold,
            years_threshold: item.yearsThreshold,
            description_ar: item.descriptionAr
          });
        }
      }

      nextPensionDbRules = [...pensionDbRules.filter(r => r.bankId !== toBankId), ...remapped];
      await logVersion('pension_calculation_rules', toBankId, null, oldRules, remapped, `نسخ من ${fromBankId}`, changedBy);
    }
  }

  return {
    nextMarginRules,
    nextDsrRules,
    nextPersonalRules,
    nextApprovedSalaryDbRules,
    nextPensionDbRules
  };
}

// Fetch all rules from current state representing a single bank settings
export async function exportBankSettings(
  bankId: string,
  params: {
    marginRules: MarginRule[],
    dsrRules: DsrRule[],
    personalRules: PersonalFinanceRules[],
    approvedSalaryDbRules: ApprovedSalarySourceRule[],
    pensionRules: PensionCalculationRule[],
    currentUserEmail?: string,
    bankNameAr: string
  }
) {
  const {
    marginRules,
    dsrRules,
    personalRules,
    approvedSalaryDbRules,
    pensionRules,
    currentUserEmail,
    bankNameAr
  } = params;

  const margins = marginRules.filter(r => r.bankId === bankId);
  const dsr = dsrRules.filter(r => r.bankId === bankId);
  const personal = personalRules.filter(r => r.bankId === bankId);
  const salary = approvedSalaryDbRules.filter(r => r.bankId === bankId);
  const pension = pensionRules.filter(r => r.bankId === bankId);

  return {
    exportVersion: '1.0',
    exportedAt: new Date().toISOString(),
    exportedBy: currentUserEmail || 'alshawshfras3@gmail.com',
    institution: { bankId, bankName: bankNameAr },
    sections: {
      marginRules: margins,
      dsrRules: dsr,
      personalFinanceRules: personal,
      approvedSalaryRules: salary,
      pensionRules: pension
    }
  };
}

// Validate imported data format
export function validateExportFile(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') {
    errors.push('الملف غير صالح');
    return { valid: false, errors };
  }
  if (data.exportVersion !== '1.0') {
    errors.push('إصدار الملف غير مدعوم');
  }
  if (!data.sections) {
    errors.push('لا توجد بيانات في الملف');
  }
  return { valid: errors.length === 0, errors };
}

// Apply import file and return new states
export async function importBankSettings(
  exportData: any,
  targetBankId: string,
  params: {
    marginRules: MarginRule[],
    dsrRules: DsrRule[],
    personalRules: PersonalFinanceRules[],
    approvedSalaryDbRules: ApprovedSalarySourceRule[],
    pensionDbRules: PensionCalculationRule[],
    currentUserEmail?: string
  }
) {
  const {
    marginRules,
    dsrRules,
    personalRules,
    approvedSalaryDbRules,
    pensionDbRules,
    currentUserEmail
  } = params;

  const remapped = remapBankId(exportData.sections, targetBankId);
  const changedBy = currentUserEmail || 'alshawshfras3@gmail.com';
  const sourceBankId = exportData.institution?.bankId || 'unknown';

  let nextMarginRules = [...marginRules];
  let nextDsrRules = [...dsrRules];
  let nextPersonalRules = [...personalRules];
  let nextApprovedSalaryDbRules = [...approvedSalaryDbRules];
  let nextPensionDbRules = [...pensionDbRules];

  if (remapped.marginRules && remapped.marginRules.length > 0) {
    const oldRules = marginRules.filter(r => r.bankId === targetBankId);
    nextMarginRules = [...marginRules.filter(r => r.bankId !== targetBankId), ...remapped.marginRules];
    await logVersion('margin_rules', targetBankId, null, oldRules, remapped.marginRules, `استيراد من ${sourceBankId}`, changedBy);
  }

  if (remapped.dsrRules && remapped.dsrRules.length > 0) {
    const oldRules = dsrRules.filter(r => r.bankId === targetBankId);
    nextDsrRules = [...dsrRules.filter(r => r.bankId !== targetBankId), ...remapped.dsrRules];
    await logVersion('dsr_rules', targetBankId, null, oldRules, remapped.dsrRules, `استيراد من ${sourceBankId}`, changedBy);
  }

  if (remapped.personalFinanceRules && remapped.personalFinanceRules.length > 0) {
    const oldRules = personalRules.filter(r => r.bankId === targetBankId);
    nextPersonalRules = [...personalRules.filter(r => r.bankId !== targetBankId), ...remapped.personalFinanceRules];
    await logVersion('personal_finance_rules', targetBankId, null, oldRules, remapped.personalFinanceRules, `استيراد من ${sourceBankId}`, changedBy);
  }

  if (remapped.approvedSalaryRules && remapped.approvedSalaryRules.length > 0) {
    const oldRules = approvedSalaryDbRules.filter(r => r.bankId === targetBankId);
    if (hasSupabaseKeys) {
      await supabase.from('approved_salary_source_rules').delete().eq('bank_id', targetBankId);
      for (const item of remapped.approvedSalaryRules) {
        await supabase.from('approved_salary_source_rules').insert({
          id: item.id,
          bank_id: item.bankId,
          sector_id: item.sectorId,
          salary_source: item.salarySource,
          multiplier: item.multiplier,
          description_ar: item.descriptionAr
        });
      }
    }
    nextApprovedSalaryDbRules = [...approvedSalaryDbRules.filter(r => r.bankId !== targetBankId), ...remapped.approvedSalaryRules];
    await logVersion('approved_salary_source_rules', targetBankId, null, oldRules, remapped.approvedSalaryRules, `استيراد من ${sourceBankId}`, changedBy);
  }

  if (remapped.pensionRules && remapped.pensionRules.length > 0) {
    const oldRules = pensionDbRules.filter(r => r.bankId === targetBankId);
    if (hasSupabaseKeys) {
      await supabase.from('pension_calculation_rules').delete().eq('bank_id', targetBankId);
      for (const item of remapped.pensionRules) {
        await supabase.from('pension_calculation_rules').insert({
          id: item.id,
          bank_id: item.bankId,
          sector_id: item.sectorId,
          calculation_method: item.calculationMethod,
          divisor_months: item.divisorMonths,
          salary_source_override: item.salarySourceOverride,
          rate_below_threshold: item.rateBelowThreshold,
          rate_above_threshold: item.rateAboveThreshold,
          years_threshold: item.yearsThreshold,
          description_ar: item.descriptionAr
        });
      }
    }
    nextPensionDbRules = [...pensionDbRules.filter(r => r.bankId !== targetBankId), ...remapped.pensionRules];
    await logVersion('pension_calculation_rules', targetBankId, null, oldRules, remapped.pensionRules, `استيراد من ${sourceBankId}`, changedBy);
  }

  return {
    nextMarginRules,
    nextDsrRules,
    nextPersonalRules,
    nextApprovedSalaryDbRules,
    nextPensionDbRules
  };
}

// Fetch all changes score for a table / bank
export async function fetchVersions(tableName: string, bankId: string): Promise<any[]> {
  if (!hasSupabaseKeys) {
    return [];
  }
  try {
    const { data, error } = await supabase
      .from('rule_versions')
      .select('*')
      .eq('table_name', tableName)
      .eq('bank_id', bankId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error(`Failed to fetch versions for table ${tableName} and bank ${bankId}:`, err);
    return [];
  }
}

// Revert back and restore database + local state helper
export async function restoreVersion(
  version: any,
  params: {
    marginRules: MarginRule[],
    dsrRules: DsrRule[],
    personalRules: PersonalFinanceRules[],
    approvedSalaryDbRules: ApprovedSalarySourceRule[],
    pensionDbRules: PensionCalculationRule[],
    currentUserEmail?: string
  }
) {
  const {
    marginRules,
    dsrRules,
    personalRules,
    approvedSalaryDbRules,
    pensionDbRules,
    currentUserEmail
  } = params;

  const changedBy = currentUserEmail || 'alshawshfras3@gmail.com';
  const tableName = version.table_name;
  const targetBankId = version.bank_id;
  
  // What is the old data we want to restore to?
  // Important: sometimes it's an array of items (copied folders) or a single row object.
  const restoredData = version.old_data;

  let nextMarginRules = [...marginRules];
  let nextDsrRules = [...dsrRules];
  let nextPersonalRules = [...personalRules];
  let nextApprovedSalaryDbRules = [...approvedSalaryDbRules];
  let nextPensionDbRules = [...pensionDbRules];

  if (tableName === 'margin_rules') {
    const currentRules = marginRules.filter(r => r.bankId === targetBankId);
    nextMarginRules = [...marginRules.filter(r => r.bankId !== targetBankId), ...restoredData];
    await logVersion('margin_rules', targetBankId, version.record_id, currentRules, restoredData, 'استعادة إصدار سابق', changedBy);
  }

  else if (tableName === 'dsr_rules') {
    const currentRules = dsrRules.filter(r => r.bankId === targetBankId);
    nextDsrRules = [...dsrRules.filter(r => r.bankId !== targetBankId), ...restoredData];
    await logVersion('dsr_rules', targetBankId, version.record_id, currentRules, restoredData, 'استعادة إصدار سابق', changedBy);
  }

  else if (tableName === 'personal_finance_rules') {
    const currentRules = personalRules.filter(r => r.bankId === targetBankId);
    nextPersonalRules = [...personalRules.filter(r => r.bankId !== targetBankId), ...restoredData];
    await logVersion('personal_finance_rules', targetBankId, version.record_id, currentRules, restoredData, 'استعادة إصدار سابق', changedBy);
  }

  else if (tableName === 'approved_salary_source_rules') {
    const currentRules = approvedSalaryDbRules.filter(r => r.bankId === targetBankId);
    if (hasSupabaseKeys) {
      await supabase.from('approved_salary_source_rules').delete().eq('bank_id', targetBankId);
      for (const item of restoredData) {
        await supabase.from('approved_salary_source_rules').insert({
          id: item.id,
          bank_id: item.bankId,
          sector_id: item.sectorId,
          salary_source: item.salarySource,
          multiplier: item.multiplier,
          description_ar: item.descriptionAr
        });
      }
    }
    nextApprovedSalaryDbRules = [...approvedSalaryDbRules.filter(r => r.bankId !== targetBankId), ...restoredData];
    await logVersion('approved_salary_source_rules', targetBankId, version.record_id, currentRules, restoredData, 'استعادة إصدار سابق', changedBy);
  }

  else if (tableName === 'pension_calculation_rules') {
    const currentRules = pensionDbRules.filter(r => r.bankId === targetBankId);
    if (hasSupabaseKeys) {
      await supabase.from('pension_calculation_rules').delete().eq('bank_id', targetBankId);
      for (const item of restoredData) {
        await supabase.from('pension_calculation_rules').insert({
          id: item.id,
          bank_id: item.bankId,
          sector_id: item.sectorId,
          calculation_method: item.calculationMethod,
          divisor_months: item.divisorMonths,
          salary_source_override: item.salarySourceOverride,
          rate_below_threshold: item.rateBelowThreshold,
          rate_above_threshold: item.rateAboveThreshold,
          years_threshold: item.yearsThreshold,
          description_ar: item.descriptionAr
        });
      }
    }
    nextPensionDbRules = [...pensionDbRules.filter(r => r.bankId !== targetBankId), ...restoredData];
    await logVersion('pension_calculation_rules', targetBankId, version.record_id, currentRules, restoredData, 'استعادة إصدار سابق', changedBy);
  }

  return {
    nextMarginRules,
    nextDsrRules,
    nextPersonalRules,
    nextApprovedSalaryDbRules,
    nextPensionDbRules
  };
}
