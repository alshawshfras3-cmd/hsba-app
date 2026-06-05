/**
 * Removes legacy and old storage keys to ensure the application 
 * relies solely on the unified database settings cache.
 */
export function clearLegacyStorage(): void {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key) {
        if (
          key === 'hasba_admin_settings' ||
          key === 'hasba_custom_sectors' ||
          key === 'bank_sector_pension_rules' ||
          key === 'pension_rules_library' ||
          key.startsWith('hasba_sett_')
        ) {
          localStorage.removeItem(key);
        }
      }
    }
    console.log("Successfully cleared legacy hasba localStorage settings keys via clearLegacyStorage utility.");
  } catch (error) {
    console.error("Failed to clear legacy storage:", error);
  }
}
