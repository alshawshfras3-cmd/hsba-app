import { createClient } from '@supabase/supabase-js';

const metaEnv = (import.meta as any).env || {};
const supabaseUrl = (metaEnv.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (metaEnv.VITE_SUPABASE_ANON_KEY || '').trim();

// 1. Syntactic validation to filter out placeholders or invalid keys
function checkKeysValid() {
  if (!supabaseUrl || !supabaseAnonKey) return false;
  if (supabaseUrl === 'undefined' || supabaseAnonKey === 'undefined') return false;
  if (supabaseUrl === 'null' || supabaseAnonKey === 'null') return false;

  const lowercaseUrl = supabaseUrl.toLowerCase();
  const lowercaseKey = supabaseAnonKey.toLowerCase();

  // If any standard placeholder keywords are found
  const placeholders = [
    'placeholder',
    'your-supabase',
    'your_supabase',
    'example',
    'changeme',
    'change-me',
    'your-project',
    'your-anon-key',
    'undefined',
    'null'
  ];

  if (placeholders.some(p => lowercaseUrl.includes(p) || lowercaseKey.includes(p))) {
    return false;
  }

  // Real Supabase url should start with https://
  if (!lowercaseUrl.startsWith('https://')) {
    return false;
  }

  // Real anon key is a long JWT (typically > 30 chars but keep > 40 to be safe)
  if (supabaseAnonKey.length < 40) {
    return false;
  }

  return true;
}

export let hasSupabaseKeys = checkKeysValid();
export const SUPABASE_TIMEOUT_MS = 5000;

export function markSupabaseUnreachable() {
  // Do not dynamically toggle hasSupabaseKeys to false if keys are syntactically correct,
  // simply log warning and store fallback flag in sessionStorage
  console.warn("Supabase connection issue detected. Saving fallback flag to sessionStorage.");
  try {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('hasba:supabase:fallback', 'true');
    }
  } catch (_) {}
}

const safeUrl = hasSupabaseKeys ? supabaseUrl : 'https://hasba-placeholder.supabase.co';
const safeKey = hasSupabaseKeys ? supabaseAnonKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInN1YiI6Imhhc2JhIiwicm9sZSI6ImFub24ifQ.placeholder';

export const supabase = createClient(safeUrl, safeKey);

// 2. Perform a silent ping on load to verify connectivity and catch connection errors before any other fetches
if (hasSupabaseKeys && typeof window !== 'undefined') {
  Promise.race([
    supabase.auth.getSession(),
    new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), SUPABASE_TIMEOUT_MS))
  ])
    .then(({ error }: any) => {
      if (error) {
        console.warn("Supabase returned an auth error on ping. NOT disabling Supabase.", error);
      }
    })
    .catch((err) => {
      console.warn("Supabase ping failed or timed out. Storing fallback flag.", err);
      markSupabaseUnreachable();
    });
}
