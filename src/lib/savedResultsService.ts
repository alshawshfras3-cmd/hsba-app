import { supabase, hasSupabaseKeys } from './supabase';
import { BankCalculationResult, SavedResult } from '../types';

// Standard local storage fallback key
const LOCAL_STORAGE_KEY = 'hasba_saved_results_local';

/**
 * Saves a new result. First attempts to write to Supabase table `saved_results`.
 * Regardless of the outcome (or if offline), it also mirrors the result in user-specific LocalStorage
 * to ensure robust operation under all scenarios.
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

  // 1. Mirrored Local Storage (user-specific for security and compartmentalisation)
  try {
    const localSavesStr = localStorage.getItem(LOCAL_STORAGE_KEY);
    const localSaves: SavedResult[] = localSavesStr ? JSON.parse(localSavesStr) : [];
    
    // Add new result to beginning
    localSaves.unshift(newResult);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localSaves));
  } catch (e) {
    console.error("Local storage sync error:", e);
  }

  // 2. Supabase Integration
  if (hasSupabaseKeys && userId) {
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
        console.warn("Could not save to Supabase saved_results table. It may need to be created via SQL command. Falling back to local storage.", error);
        return { success: true, data: newResult }; // Treat as successful via localStorage fallback
      }

      return { success: true, data: data as SavedResult };
    } catch (err: any) {
      console.warn("Supabase query crash, falling back to offline mode", err);
      return { success: true, data: newResult };
    }
  }

  return { success: true, data: newResult };
}

/**
 * Fetches all saved results for a specific user ID.
 * Returns both results retrieved from Supabase and those stored locally as backup.
 */
export async function fetchSavedResults(userId: string): Promise<SavedResult[]> {
  let dbResults: SavedResult[] = [];

  // Try to load from Supabase first
  if (hasSupabaseKeys && userId) {
    try {
      const { data, error } = await supabase
        .from('saved_results')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn("Error loading from Supabase saved_results table:", error.message);
      } else if (data) {
        dbResults = data as SavedResult[];
      }
    } catch (err) {
      console.warn("Supabase load failed, falling back to local storage only.", err);
    }
  }

  // Now merge with Local Storage so the user sees everything
  try {
    const localSavesStr = localStorage.getItem(LOCAL_STORAGE_KEY);
    let localSaves: SavedResult[] = localSavesStr ? JSON.parse(localSavesStr) : [];
    
    // Filter to make sure we only load local saves belonging to the current logged-in user
    localSaves = localSaves.filter(item => item.user_id === userId);

    // Merge both, matching by ID to prevent duplicates
    const mergedMap = new Map<string, SavedResult>();
    
    // Add local ones first (since they are fresh and instant)
    localSaves.forEach(item => mergedMap.set(item.id, item));
    
    // Overwrite/add database ones (as source-of-truth)
    dbResults.forEach(item => mergedMap.set(item.id, item));

    // Convert back to sorted array (by created_at date descending)
    const mergedList = Array.from(mergedMap.values());
    mergedList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return mergedList;
  } catch (e) {
    console.error("Local storage merge error:", e);
    return dbResults;
  }
}

/**
 * Deletes a saved result.
 */
export async function deleteSavedResult(id: string, userId: string): Promise<boolean> {
  // 1. Delete from Local Storage
  try {
    const localSavesStr = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (localSavesStr) {
      let localSaves: SavedResult[] = JSON.parse(localSavesStr);
      localSaves = localSaves.filter(item => item.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localSaves));
    }
  } catch (e) {
    console.error("Local storage delete error:", e);
  }

  // 2. Delete from Supabase
  if (hasSupabaseKeys && userId) {
    try {
      const { error } = await supabase
        .from('saved_results')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        console.warn("Could not delete from Supabase table:", error.message);
      }
    } catch (err) {
      console.error("Supabase delete request failed:", err);
    }
  }

  return true;
}
