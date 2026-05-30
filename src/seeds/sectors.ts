import { Sector } from '../types';

export const initialSectors: Sector[] = [
  {
    id: 'government_civilian',
    nameAr: 'حكومي مدني',
    deductionPercentage: 9.0, // 9% GOSI/PPA deduction
    deductionBase: 'basic_housing',
    needsServiceDate: true,
    needsRank: false,
    defaultRetirementAge: 60,
    pensionMultiplier: 480, // years * 12
    isActive: true
  },
  {
    id: 'military',
    nameAr: 'عسكري',
    deductionPercentage: 9.0, // 9% military retirement deduction
    deductionBase: 'basic_housing',
    needsServiceDate: true,
    needsRank: true,
    defaultRetirementAge: 45, // is customized by rank
    pensionMultiplier: 420, // 35 years * 12
    isActive: true
  },
  {
    id: 'private',
    nameAr: 'قطاع خاص',
    deductionPercentage: 9.75, // GOSI deduction (9% + 0.75% Saned)
    deductionBase: 'basic_housing',
    needsServiceDate: true,
    needsRank: false,
    defaultRetirementAge: 60,
    pensionMultiplier: 480,
    isActive: false
  },
  {
    id: 'retired',
    nameAr: 'متقاعد',
    deductionPercentage: 0.0,
    deductionBase: 'total',
    needsServiceDate: false,
    needsRank: false,
    defaultRetirementAge: 99,
    pensionMultiplier: 480,
    isActive: true
  }
];
