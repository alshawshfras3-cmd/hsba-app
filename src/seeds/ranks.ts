import { MilitaryRank } from '../types';

export const initialMilitaryRanks: MilitaryRank[] = [
  // --- Enlisted Ranks ---
  { id: 'jundi', nameAr: 'جندي / جندي أول', retirementAge: 44, pensionMultiplier: 420, displayOrder: 1, isActive: true, sectorScope: 'enlisted' },
  { id: 'areef', nameAr: 'عريف', retirementAge: 46, pensionMultiplier: 420, displayOrder: 2, isActive: true, sectorScope: 'enlisted' },
  { id: 'wakeel_raqeeb', nameAr: 'وكيل رقيب', retirementAge: 48, pensionMultiplier: 420, displayOrder: 3, isActive: true, sectorScope: 'enlisted' },
  { id: 'raqeeb', nameAr: 'رقيب / رقيب أول', retirementAge: 50, pensionMultiplier: 420, displayOrder: 4, isActive: true, sectorScope: 'enlisted' },
  { id: 'rayees_ruqaba', nameAr: 'رئيس رقباء', retirementAge: 52, pensionMultiplier: 420, displayOrder: 5, isActive: true, sectorScope: 'enlisted' },

  // --- Officer Ranks ---
  { id: 'mulazim', nameAr: 'ملازم / ملازم أول', retirementAge: 44, pensionMultiplier: 420, displayOrder: 6, isActive: true, sectorScope: 'officer' },
  { id: 'mulazim_pilot', nameAr: 'ملازم طيار', retirementAge: 42, pensionMultiplier: 420, displayOrder: 7, isActive: true, sectorScope: 'officer' },
  { id: 'naqeeb', nameAr: 'نقيب', retirementAge: 48, pensionMultiplier: 420, displayOrder: 8, isActive: true, sectorScope: 'officer' },
  { id: 'naqeeb_pilot', nameAr: 'نقيب طيار', retirementAge: 46, pensionMultiplier: 420, displayOrder: 9, isActive: true, sectorScope: 'officer' },
  { id: 'raid', nameAr: 'رائد', retirementAge: 50, pensionMultiplier: 420, displayOrder: 10, isActive: true, sectorScope: 'officer' },
  { id: 'raid_pilot', nameAr: 'رائد طيار', retirementAge: 48, pensionMultiplier: 420, displayOrder: 11, isActive: true, sectorScope: 'officer' },
  { id: 'muqaddam', nameAr: 'مقدم', retirementAge: 52, pensionMultiplier: 420, displayOrder: 12, isActive: true, sectorScope: 'officer' },
  { id: 'muqaddam_pilot', nameAr: 'مقدم طيار', retirementAge: 50, pensionMultiplier: 420, displayOrder: 13, isActive: true, sectorScope: 'officer' },
  { id: 'aqeed', nameAr: 'عقيد', retirementAge: 54, pensionMultiplier: 420, displayOrder: 14, isActive: true, sectorScope: 'officer' },
  { id: 'aqeed_pilot', nameAr: 'عقيد طيار', retirementAge: 52, pensionMultiplier: 420, displayOrder: 15, isActive: true, sectorScope: 'officer' },
  { id: 'ameed', nameAr: 'عميد', retirementAge: 56, pensionMultiplier: 420, displayOrder: 16, isActive: true, sectorScope: 'officer' },
  { id: 'ameed_pilot', nameAr: 'عميد طيار', retirementAge: 54, pensionMultiplier: 420, displayOrder: 17, isActive: true, sectorScope: 'officer' },
  { id: 'liwa', nameAr: 'لواء', retirementAge: 58, pensionMultiplier: 420, displayOrder: 18, isActive: true, sectorScope: 'officer' },
  { id: 'liwa_pilot', nameAr: 'لواء طيار', retirementAge: 56, pensionMultiplier: 420, displayOrder: 19, isActive: true, sectorScope: 'officer' }
];
