import { createClient } from '@supabase/supabase-js';

const metaEnv = (import.meta as any).env || {};
const supabaseUrl = (metaEnv.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (metaEnv.VITE_SUPABASE_ANON_KEY || '').trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables');
}

export const hasSupabaseKeys = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'undefined' && 
  supabaseAnonKey !== 'undefined' &&
  !supabaseUrl.includes('placeholder') &&
  !supabaseAnonKey.includes('placeholder')
);

// Fallback safety to check if we can initialize without crashing
const safeUrl = hasSupabaseKeys ? supabaseUrl : 'https://placeholder.supabase.co';
const safeKey = hasSupabaseKeys ? supabaseAnonKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInN1YiI6Imhhc2JhIiwicm9sZSI6ImFub24ifQ.placeholder';

export const supabase = createClient(safeUrl, safeKey);

// Log URL prefix for verification
if (hasSupabaseKeys) {
  const match = supabaseUrl.match(/^https:\/\/(.*?)\.supabase\.(co|net)/);
  const prefix = match ? match[1] : supabaseUrl.substring(0, 25);
  console.log(`[SUPABASE CONNECT] URL prefix confirmed: "${prefix}" (expected: "yeppasileupalanwzxzm")`);
} else {
  console.log('[SUPABASE CONNECT] Running in offline fallback mode (missing/placeholder keys)');
}

export function cleanStaleSupabaseSession() {
  try {
    if (typeof window !== 'undefined') {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.includes('supabase') || key.startsWith('sb-') || key.includes('auth'))) {
          localStorage.removeItem(key);
        }
      }
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key && (key.includes('supabase') || key.startsWith('sb-') || key.includes('auth'))) {
          sessionStorage.removeItem(key);
        }
      }
    }
  } catch (error) {
    console.error("Error clearing stale session:", error);
  }
}

export const SUPABASE_TIMEOUT_MS = 60000;
