import { supabase, hasSupabaseKeys } from './supabase';

export interface AdminCredentials {
  admin_username: string;
  admin_email: string;
  admin_password: string;
}

const DEFAULT_ADMIN: AdminCredentials = {
  admin_username: 'admin',
  admin_email: 'admin@hesba.com',
  admin_password: 'hesba989'
};

// Local storage key for fallback in offline/preview environments
const ADMIN_LOCAL_STORAGE_KEY = 'hesba_admin_settings_fallback_v2';

/**
 * Gets the current administrative settings either from the public.admin_settings table in Supabase
 * or from localStorage cache/defaults when offline.
 */
export async function getAdminCredentials(): Promise<AdminCredentials> {
  const getCached = (): AdminCredentials => {
    try {
      const cached = localStorage.getItem(ADMIN_LOCAL_STORAGE_KEY);
      if (cached) {
        return { ...DEFAULT_ADMIN, ...JSON.parse(cached) };
      }
    } catch (_) {}
    return { ...DEFAULT_ADMIN };
  };

  if (!hasSupabaseKeys) {
    return getCached();
  }

  try {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('admin_username, admin_email, admin_password')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("Could not load from admin_settings table, falling back to local storage:", error.message);
      return getCached();
    }

    if (data) {
      const creds: AdminCredentials = {
        admin_username: data.admin_username || DEFAULT_ADMIN.admin_username,
        admin_email: data.admin_email || DEFAULT_ADMIN.admin_email,
        admin_password: data.admin_password || DEFAULT_ADMIN.admin_password
      };
      // Keep local sync in case of network issues later
      try {
        localStorage.setItem(ADMIN_LOCAL_STORAGE_KEY, JSON.stringify(creds));
      } catch (_) {}
      return creds;
    }
  } catch (err) {
    console.warn("Exception while loading admin settings, using local fallback:", err);
  }

  return getCached();
}

/**
 * Updates the administrative settings table in Supabase (upsert)
 * and keeps localStorage mirror updated.
 */
export async function updateAdminCredentials(updates: Partial<AdminCredentials>): Promise<AdminCredentials> {
  const current = await getAdminCredentials();
  const merged: AdminCredentials = {
    ...current,
    ...updates,
    admin_email: (updates.admin_email || current.admin_email).trim().toLowerCase(),
    admin_username: (updates.admin_username || current.admin_username).trim()
  };

  // 1. Sync locally
  try {
    localStorage.setItem(ADMIN_LOCAL_STORAGE_KEY, JSON.stringify(merged));
  } catch (_) {}

  // 2. Sync to Supabase
  if (hasSupabaseKeys) {
    try {
      // Find the existing row ID or create one
      const { data: existingRows } = await supabase
        .from('admin_settings')
        .select('id')
        .limit(1);

      const targetId = existingRows && existingRows.length > 0 ? existingRows[0].id : undefined;

      const payload = {
        ...(targetId ? { id: targetId } : {}),
        admin_username: merged.admin_username,
        admin_email: merged.admin_email,
        admin_password: merged.admin_password,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('admin_settings')
        .upsert(payload);

      if (error) {
        throw new Error("فشل الحفظ في قاعدة البيانات: " + error.message);
      }
    } catch (e: any) {
      console.error("Failed to sync updated admin credentials to Supabase:", e);
      throw e;
    }
  }

  return merged;
}
