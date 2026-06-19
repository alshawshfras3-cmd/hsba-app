import { getSupabaseAdmin } from './supabaseAdmin.ts';

export async function loadAppSettings() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'app_settings')
    .maybeSingle();

  if (error) {
    console.error('[loadAppSettings] Error reading app_settings from system_settings:', error);
    throw new Error('FAILED_TO_LOAD_APP_SETTINGS');
  }

  if (!data || !data.value) {
    console.warn('[loadAppSettings] No app_settings found in system_settings table.');
    return null;
  }

  return data.value;
}
