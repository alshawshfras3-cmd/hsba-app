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

let cachedAppSettings: any = null;
let inFlightAppSettingsPromise: Promise<any> | null = null;

export function getCachedAppSettingsSync(): any {
  if (cachedAppSettings) return cachedAppSettings;
  try {
    const stored = sessionStorage.getItem('hesba_cached_app_settings');
    if (stored) {
      cachedAppSettings = JSON.parse(stored);
      return cachedAppSettings;
    }
  } catch {}
  return null;
}

export function clearAppSettingsCache() {
  cachedAppSettings = null;
  inFlightAppSettingsPromise = null;
  try {
    sessionStorage.removeItem('hesba_cached_app_settings');
  } catch {}
}

export async function fetchAppSettingsShared(timeoutMs: number = 10000): Promise<any> {
  if (cachedAppSettings) {
    return cachedAppSettings;
  }
  if (inFlightAppSettingsPromise) {
    return inFlightAppSettingsPromise;
  }

  inFlightAppSettingsPromise = (async () => {
    if (!hasSupabaseKeys) {
      return null;
    }
    try {
      console.log('[SUPABASE LOAD SHARED] Fetching app_settings from Supabase with timeout:', timeoutMs);
      const { data, error } = await Promise.race([
        supabase
          .from('system_settings')
          .select('*')
          .eq('key', 'app_settings')
          .maybeSingle(),
        new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), timeoutMs)
        )
      ]);

      if (error) {
        throw error;
      }

      if (data && data.value) {
        cachedAppSettings = data.value;
        try {
          sessionStorage.setItem('hesba_cached_app_settings', JSON.stringify(data.value));
        } catch {}
        return data.value;
      }
      return null;
    } catch (err: any) {
      const isTimeout = err?.message === 'timeout' || String(err).includes('مهلة') || String(err).includes('timeout');
      console.warn('[SUPABASE LOAD SHARED] Error fetching app_settings:', err?.message || err);
      
      // Try to recover from sessionStorage
      try {
        const stored = sessionStorage.getItem('hesba_cached_app_settings');
        if (stored) {
          console.log('[SUPABASE LOAD SHARED] Recovered from secondary sessionStorage cache');
          cachedAppSettings = JSON.parse(stored);
          return cachedAppSettings;
        }
      } catch {}

      // If it's a timeout, we throw a specific error so the caller knows it is a timeout
      if (isTimeout) {
        const tErr = new Error('timeout');
        (tErr as any).isTimeout = true;
        throw tErr;
      }
      throw err;
    } finally {
      inFlightAppSettingsPromise = null;
    }
  })();

  return inFlightAppSettingsPromise;
}
