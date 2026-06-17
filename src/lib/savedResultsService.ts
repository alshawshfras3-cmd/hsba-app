import { supabase, hasSupabaseKeys } from './supabase';
import { BankCalculationResult, SavedResult } from '../types';

/**
 * Saves a new result. Attempts to write to Supabase table `saved_results`.
 */
export async function saveCalculationResult(params: {
  userId: string;
  userEmail: string;
  offer: BankCalculationResult;
  title: string;
  customerName?: string;
  financeType: string;
  sector: string;
}): Promise<{ success: boolean; data?: SavedResult; error?: string }> {
  const { userId, userEmail, offer, title, customerName, financeType, sector } = params;

  if (!hasSupabaseKeys || !userId) {
    return { 
      success: false, 
      error: 'تعذر حفظ النتيجة. الرجاء المحاولة مرة أخرى.' 
    };
  }

  const newResult: SavedResult = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
    user_id: userId,
    created_at: new Date().toISOString(),
    title,
    finance_type: financeType,
    sector,
    bank_name: offer.bankName,
    real_estate_amount: offer.realEstateAmount || 0,
    personal_amount: offer.personalAmount || 0,
    monthly_installment: offer.monthlyInstallmentBeforeRetirement || 0,
    term_months: offer.termMonths || 0,
    support_type: offer.supportType || 'none',
    net_salary: offer.netSalary || 0,
    profit_margin: offer.annualMargin || 0,
    eligibility_status: offer.isEligible ? 'eligible' : 'ineligible',
    payload: offer,
    customer_name: customerName || ''
  };

  try {
    const { data, error } = await supabase
      .from('saved_results')
      .insert({
        id: newResult.id,
        user_id: userId,
        title: newResult.title,
        finance_type: newResult.finance_type,
        sector: newResult.sector,
        bank_name: newResult.bank_name,
        real_estate_amount: newResult.real_estate_amount,
        personal_amount: newResult.personal_amount,
        monthly_installment: newResult.monthly_installment,
        term_months: newResult.term_months,
        support_type: newResult.support_type,
        net_salary: newResult.net_salary,
        profit_margin: newResult.profit_margin,
        eligibility_status: newResult.eligibility_status,
        payload: {
          ...newResult.payload,
          customer_name: customerName || ''
        }
      })
      .select()
      .single();

    if (error) {
      console.warn("Could not save to Supabase saved_results table:", error);
      return { 
        success: false, 
        error: 'تعذر حفظ النتيجة. الرجاء المحاولة مرة أخرى.' 
      };
    }

    return { success: true, data: data as SavedResult };
  } catch (err: any) {
    console.warn("Supabase query crash during saving", err);
    return { 
      success: false, 
      error: 'تعذر حفظ النتيجة. الرجاء المحاولة مرة أخرى.' 
    };
  }
}

/**
 * Fetches all saved results for a specific user ID.
 * Returns only results retrieved from Supabase.
 */
export async function fetchSavedResults(userId: string): Promise<SavedResult[]> {
  if (!hasSupabaseKeys || !userId) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('saved_results')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn("Error loading from Supabase saved_results table:", error.message);
      return [];
    } else if (data) {
      return data as SavedResult[];
    }
  } catch (err) {
    console.warn("Supabase load failed:", err);
  }

  return [];
}

/**
 * Deletes a saved result.
 */
export async function deleteSavedResult(id: string, userId: string): Promise<boolean> {
  if (!hasSupabaseKeys || !userId) {
    return false;
  }

  try {
    const { error } = await supabase
      .from('saved_results')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.warn("Could not delete from Supabase table:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Supabase delete request failed:", err);
    return false;
  }
}
