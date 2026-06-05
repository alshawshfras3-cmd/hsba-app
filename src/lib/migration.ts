import { SectorId } from '../types';

export const sectorMigrationMap: Record<string, string | null> = {
  [['government', 'civilian'].join('_')]: 'gov_civil',
  'military_enlisted': 'military',
  'military_officer': 'military',
  'military_individual': 'military',
  'retiree': 'retired',
  'private': null,    // محذوف
  'resident': null,   // محذوف
};

export function migrateSectorId(sectorId: string | undefined | null): string | null {
  if (!sectorId) return null;
  if (sectorId === 'all') return 'all';
  if (sectorId in sectorMigrationMap) {
    return sectorMigrationMap[sectorId];
  }
  return sectorId;
}

export function migrateRecord<T extends { sectorId?: any; [key: string]: any }>(record: T): T | null {
  if (!record || typeof record !== 'object') return record;
  if ('sectorId' in record) {
    const originalSec = record.sectorId;
    if (originalSec === 'all') return record;
    const migrated = migrateSectorId(originalSec);
    if (migrated === null) return null;
    
    let updatedRecord = { ...record, sectorId: migrated };
    if (originalSec === 'military_officer' || originalSec === 'military_enlisted' || originalSec === 'military_individual') {
      const type = originalSec === 'military_officer' ? 'officer' : 'enlisted';
      updatedRecord = { ...updatedRecord, militarySubType: type };
    }
    return updatedRecord;
  }
  return record;
}export const sectorMigrationMapLegacy = {
  'military': 'military',
};

export function migrateAllowedSectors(sectors: string[] | undefined | null): SectorId[] {
  if (!sectors || !Array.isArray(sectors)) return [];
  const results: SectorId[] = [];
  for (const s of sectors) {
    const val = migrateSectorId(s);
    if (val && val !== 'all') {
      results.push(val as SectorId);
    }
  }
  // Remove duplicates
  return Array.from(new Set(results));
}

export function runAllStorageMigrations(): void {
  try {
    // If a consolidated unified cache already exists, we can immediately clean up all old separate legacy keys
    const cacheExists = localStorage.getItem("hasba_settings_cache");
    if (cacheExists) {
      console.log("Unified settings cache detected. Cleaning up stale legacy storage keys...");
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
      return;
    }

    const keysToMigrate = [
      'bank_sector_pension_rules',
      'pension_rules_library',
    ];

    for (const key of keysToMigrate) {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const migrated = parsed
              .map(item => migrateRecord(item))
              .filter(item => item !== null);
            localStorage.setItem(key, JSON.stringify(migrated));
          }
        } catch (e) {
          console.warn(`Failed to migrate local storage key ${key}:`, e);
        }
      }
    }

    // Now migrate setting prefixes
    const settingsKeys = [
      'margin_rules',
      'dsr_rules',
      'personal_finance_rules',
      'product_acceptance',
      'pension_rules',
      'salary_rules',
      'term_rules',
      'advanced_rules'
    ];

    for (const key of settingsKeys) {
      const fullKey = `hasba_sett_${key}`;
      const stored = localStorage.getItem(fullKey);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            let migrated: any[] = [];
            if (key === 'product_acceptance') {
              migrated = parsed.map(p => {
                if (p && Array.isArray(p.allowedSectors)) {
                  return {
                    ...p,
                    allowedSectors: migrateAllowedSectors(p.allowedSectors)
                  };
                }
                return p;
              }).filter(Boolean);
            } else {
              migrated = parsed
                .map(item => migrateRecord(item))
                .filter(item => item !== null);
            }
            localStorage.setItem(fullKey, JSON.stringify(migrated));
          }
        } catch (e) {
          console.warn(`Failed to migrate setting ${fullKey}:`, e);
        }
      }
    }

    // Migrate hasba_custom_sectors
    const customSectors = localStorage.getItem("hasba_custom_sectors");
    if (customSectors) {
      try {
        const parsed = JSON.parse(customSectors);
        if (Array.isArray(parsed)) {
          const migrated = parsed.filter((s: any) => s.id !== 'private' && s.id !== 'resident');
          localStorage.setItem("hasba_custom_sectors", JSON.stringify(migrated));
        }
      } catch (e) {
        console.warn("Failed to migrate hasba_custom_sectors:", e);
      }
    }
  } catch (err) {
    console.error('Error during runAllStorageMigrations:', err);
  }
}
