import { PensionRule } from '../types';

export const initialPensionRules: PensionRule[] = [
  {
    sectorId: 'gov_civil',
    retirementAge: 60,
    pensionMultiplier: 480, // service months divided by 480 (40 years of service max)
    ageCalcCalendar: 'hijri',
    serviceCalcCalendar: 'gregorian',
    roundServiceMonths: true,
    isActive: true
  },
  {
    sectorId: 'semi_gov',
    retirementAge: 60,
    pensionMultiplier: 480,
    ageCalcCalendar: 'gregorian',
    serviceCalcCalendar: 'gregorian',
    roundServiceMonths: true,
    isActive: true
  },
  {
    sectorId: 'companies',
    retirementAge: 60,
    pensionMultiplier: 480,
    ageCalcCalendar: 'gregorian',
    serviceCalcCalendar: 'gregorian',
    roundServiceMonths: true,
    isActive: true
  },
  {
    sectorId: 'military',
    retirementAge: 45, // ranks override this
    pensionMultiplier: 420, // service months divided by 420 (35 years of service max)
    ageCalcCalendar: 'hijri',
    serviceCalcCalendar: 'hijri',
    roundServiceMonths: true,
    isActive: true
  }
];
