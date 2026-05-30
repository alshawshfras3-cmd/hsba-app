import { createClient } from '@supabase/supabase-js';

const metaEnv = (import.meta as any).env || {};
const supabaseUrl = metaEnv.VITE_SUPABASE_URL || '';
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || '';

// If credentials are empty or contain placeholders, use compliant dummy strings to prevent load-time crash
export const hasSupabaseKeys = !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'undefined' && supabaseAnonKey !== 'undefined');

const safeUrl = hasSupabaseKeys ? supabaseUrl : 'https://hasba-placeholder.supabase.co';
const safeKey = hasSupabaseKeys ? supabaseAnonKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInN1YiI6Imhhc2JhIiwicm9sZSI6ImFub24ifQ.placeholder';

export const supabase = createClient(safeUrl, safeKey);

