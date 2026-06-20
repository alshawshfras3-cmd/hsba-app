import { supabase, hasSupabaseKeys } from './supabase';

export interface ConfirmedBankCase {
  id?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
  case_code?: string | null;
  customer_label?: string | null;
  bank_id: string;
  bank_name?: string | null;
  product_type: string;
  support_type?: string | null;
  employment_sector?: string | null;
  employer_name?: string | null;
  salary_bank_id?: string | null;
  salary_bank_name?: string | null;
  is_salary_transferred_to_same_bank?: boolean | null;
  salary_amount?: number | null;
  obligations_amount?: number | null;
  system_result_amount?: number | null;
  system_installment_amount?: number | null;
  actual_bank_amount?: number | null;
  actual_installment_amount?: number | null;
  actual_status: 'approved' | 'rejected' | 'conditional' | 'needs_review';
  decision_reason?: string | null;
  conditions: string[];
  notes?: string | null;
  confidence_level: 'low' | 'medium' | 'high';
  is_verified: boolean;
}

export interface ConfirmedCasesFilter {
  bank_id?: string;
  actual_status?: string;
  employment_sector?: string;
  salary_bank_id?: string;
  employer_name?: string;
}

// Memory fallback for offline usage / development flow
let memoryConfirmedCases: ConfirmedBankCase[] = [];

// Saved results service uses localStorage if offline. Let's do the same for confirmed cases!
const LOCAL_STORAGE_KEY = 'hesba_confirmed_bank_cases_fallback';

function getLocalFallback(): ConfirmedBankCase[] {
  if (typeof window === 'undefined') return memoryConfirmedCases;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading offline confirmed cases:', e);
  }
  return memoryConfirmedCases;
}

function saveLocalFallback(cases: ConfirmedBankCase[]) {
  memoryConfirmedCases = cases;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cases));
  } catch (e) {
    console.error('Error saving offline confirmed cases:', e);
  }
}

export async function listConfirmedCases(filters?: ConfirmedCasesFilter): Promise<ConfirmedBankCase[]> {
  if (!hasSupabaseKeys) {
    let list = getLocalFallback();
    if (filters) {
      if (filters.bank_id) {
        list = list.filter(c => c.bank_id === filters.bank_id);
      }
      if (filters.actual_status) {
        list = list.filter(c => c.actual_status === filters.actual_status);
      }
      if (filters.employment_sector) {
        list = list.filter(c => c.employment_sector === filters.employment_sector);
      }
      if (filters.salary_bank_id) {
        list = list.filter(c => c.salary_bank_id === filters.salary_bank_id);
      }
      if (filters.employer_name) {
        list = list.filter(c => c.employer_name?.includes(filters.employer_name || ''));
      }
    }
    return list;
  }

  try {
    let query = supabase
      .from('confirmed_bank_cases')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters) {
      if (filters.bank_id) {
        query = query.eq('bank_id', filters.bank_id);
      }
      if (filters.actual_status) {
        query = query.eq('actual_status', filters.actual_status);
      }
      if (filters.employment_sector) {
        query = query.eq('employment_sector', filters.employment_sector);
      }
      if (filters.salary_bank_id) {
        query = query.eq('salary_bank_id', filters.salary_bank_id);
      }
      if (filters.employer_name) {
        query = query.ilike('employer_name', `%${filters.employer_name}%`);
      }
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error listing confirmed cases from Supabase:', error);
      throw error;
    }
    return data || [];
  } catch (err) {
    console.warn('Supabase query failed, falling back to offline storage');
    return getLocalFallback();
  }
}

export async function createConfirmedCase(payload: ConfirmedBankCase): Promise<ConfirmedBankCase> {
  // Auto compute is_salary_transferred_to_same_bank if applicable
  const enriched: ConfirmedBankCase = {
    ...payload,
    is_salary_transferred_to_same_bank: payload.is_salary_transferred_to_same_bank !== null 
      ? payload.is_salary_transferred_to_same_bank 
      : (payload.salary_bank_id && payload.bank_id ? payload.salary_bank_id === payload.bank_id : null)
  };

  if (!hasSupabaseKeys) {
    const list = getLocalFallback();
    const newCase: ConfirmedBankCase = {
      ...enriched,
      id: Math.random().toString(36).substring(2, 15),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    list.unshift(newCase);
    saveLocalFallback(list);
    return newCase;
  }

  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || null;

    const { data, error } = await supabase
      .from('confirmed_bank_cases')
      .insert({
        ...enriched,
        created_by: userId
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }
    return data;
  } catch (err) {
    console.error('Error creating confirmed case in Supabase:', err);
    // Fallback
    const list = getLocalFallback();
    const newCase: ConfirmedBankCase = {
      ...enriched,
      id: Math.random().toString(36).substring(2, 15),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    list.unshift(newCase);
    saveLocalFallback(list);
    return newCase;
  }
}

export async function updateConfirmedCase(id: string, payload: Partial<ConfirmedBankCase>): Promise<ConfirmedBankCase> {
  if (!hasSupabaseKeys || id.length < 15) { // Offline UUID helper indicator
    const list = getLocalFallback();
    const idx = list.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Case not found');
    
    let isSameBank = payload.is_salary_transferred_to_same_bank;
    if (isSameBank === undefined || isSameBank === null) {
      const bankId = payload.bank_id !== undefined ? payload.bank_id : list[idx].bank_id;
      const salaryBankId = payload.salary_bank_id !== undefined ? payload.salary_bank_id : list[idx].salary_bank_id;
      isSameBank = (bankId && salaryBankId) ? bankId === salaryBankId : list[idx].is_salary_transferred_to_same_bank;
    }

    const updated = {
      ...list[idx],
      ...payload,
      is_salary_transferred_to_same_bank: isSameBank,
      updated_at: new Date().toISOString()
    };
    list[idx] = updated;
    saveLocalFallback(list);
    return updated;
  }

  try {
    const { data, error } = await supabase
      .from('confirmed_bank_cases')
      .update({
        ...payload,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error updating confirmed case in Supabase:', err);
    // Try local
    const list = getLocalFallback();
    const idx = list.findIndex(c => c.id === id);
    if (idx !== -1) {
      const updated = {
        ...list[idx],
        ...payload,
        updated_at: new Date().toISOString()
      };
      list[idx] = updated;
      saveLocalFallback(list);
      return updated;
    }
    throw err;
  }
}

export async function deleteConfirmedCase(id: string): Promise<boolean> {
  if (!hasSupabaseKeys || id.length < 15) {
    const list = getLocalFallback();
    const filtered = list.filter(c => c.id !== id);
    saveLocalFallback(filtered);
    return true;
  }

  try {
    const { error } = await supabase
      .from('confirmed_bank_cases')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error deleting confirmed case from Supabase:', err);
    const list = getLocalFallback();
    const filtered = list.filter(c => c.id !== id);
    saveLocalFallback(filtered);
    return true;
  }
}

export async function getConfirmedCasesStats() {
  const list = await listConfirmedCases();
  
  const total = list.length;
  const approved = list.filter(c => c.actual_status === 'approved').length;
  const rejected = list.filter(c => c.actual_status === 'rejected').length;
  const conditional = list.filter(c => c.actual_status === 'conditional').length;
  const needs_review = list.filter(c => c.actual_status === 'needs_review').length;

  return {
    total,
    approved,
    rejected,
    conditional,
    needs_review
  };
}
