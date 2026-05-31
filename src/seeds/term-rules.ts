import { TermRule } from '../types';

export const initialTermRules: TermRule[] = [
  // ==================== AL RAJHI BANK ====================
  // rajhi | gov_civil | real_estate
  {
    bankId: 'rajhi',
    sectorId: 'gov_civil',
    rankId: 'all',
    productId: 'real_estate',
    supportType: 'all',
    maxTermMonths: 360, // 30 years
    allowedMonthsAfterRetirement: 204, // 17 years (hijri)
    maxAgeAtEnd: 77,
    allowAfterRetirement: true,
    calendarType: 'hijri',
    minTermMonths: 60,
    defaultTermMode: 'max',
    isActive: true
  },
  // rajhi | semi_gov | real_estate
  {
    bankId: 'rajhi',
    sectorId: 'semi_gov',
    rankId: 'all',
    productId: 'real_estate',
    supportType: 'all',
    maxTermMonths: 360,
    allowedMonthsAfterRetirement: 204,
    maxAgeAtEnd: 77,
    allowAfterRetirement: true,
    calendarType: 'hijri',
    minTermMonths: 60,
    defaultTermMode: 'max',
    isActive: true
  },
  // rajhi | companies | real_estate
  {
    bankId: 'rajhi',
    sectorId: 'companies',
    rankId: 'all',
    productId: 'real_estate',
    supportType: 'all',
    maxTermMonths: 360,
    allowedMonthsAfterRetirement: 204,
    maxAgeAtEnd: 77,
    allowAfterRetirement: true,
    calendarType: 'hijri',
    minTermMonths: 60,
    defaultTermMode: 'max',
    isActive: true
  },
  // rajhi | military officer | real_estate
  {
    bankId: 'rajhi',
    sectorId: 'military',
    rankId: 'officer',
    productId: 'real_estate',
    supportType: 'all',
    maxTermMonths: 360,
    allowedMonthsAfterRetirement: 204,
    maxAgeAtEnd: 77,
    allowAfterRetirement: true,
    calendarType: 'hijri',
    minTermMonths: 60,
    defaultTermMode: 'max',
    isActive: true
  },
  // rajhi | military enlisted | real_estate
  {
    bankId: 'rajhi',
    sectorId: 'military',
    rankId: 'enlisted',
    productId: 'real_estate',
    supportType: 'all',
    maxTermMonths: 360,
    allowedMonthsAfterRetirement: 120, // 10 years (hijri)
    maxAgeAtEnd: 70,
    allowAfterRetirement: true,
    calendarType: 'hijri',
    minTermMonths: 60,
    defaultTermMode: 'max',
    isActive: true
  },
  // rajhi | retired | real_estate
  {
    bankId: 'rajhi',
    sectorId: 'retired',
    rankId: 'all',
    productId: 'real_estate',
    supportType: 'all',
    maxTermMonths: 300, // 25 years
    allowedMonthsAfterRetirement: 300,
    maxAgeAtEnd: 77,
    allowAfterRetirement: true,
    calendarType: 'hijri',
    minTermMonths: 60,
    defaultTermMode: 'max',
    isActive: true
  },

  // ==================== AL AHLI (SNB) ====================
  // SNB gov_civil Defaults
  {
    bankId: 'alahli',
    sectorId: 'gov_civil',
    rankId: 'all',
    productId: 'real_estate',
    supportType: 'all',
    maxTermMonths: 300,
    allowedMonthsAfterRetirement: 120,
    maxAgeAtEnd: 75,
    allowAfterRetirement: true,
    calendarType: 'gregorian',
    minTermMonths: 60,
    defaultTermMode: 'max',
    isActive: true
  },
  // SNB semi_gov Defaults
  {
    bankId: 'alahli',
    sectorId: 'semi_gov',
    rankId: 'all',
    productId: 'real_estate',
    supportType: 'all',
    maxTermMonths: 300,
    allowedMonthsAfterRetirement: 120,
    maxAgeAtEnd: 75,
    allowAfterRetirement: true,
    calendarType: 'gregorian',
    minTermMonths: 60,
    defaultTermMode: 'max',
    isActive: true
  },
  // SNB companies Defaults
  {
    bankId: 'alahli',
    sectorId: 'companies',
    rankId: 'all',
    productId: 'real_estate',
    supportType: 'all',
    maxTermMonths: 300,
    allowedMonthsAfterRetirement: 120,
    maxAgeAtEnd: 75,
    allowAfterRetirement: true,
    calendarType: 'gregorian',
    minTermMonths: 60,
    defaultTermMode: 'max',
    isActive: true
  },
  // SNB military Defaults
  {
    bankId: 'alahli',
    sectorId: 'military',
    rankId: 'all',
    productId: 'real_estate',
    supportType: 'all',
    maxTermMonths: 300,
    allowedMonthsAfterRetirement: 120,
    maxAgeAtEnd: 75,
    allowAfterRetirement: true,
    calendarType: 'gregorian',
    minTermMonths: 60,
    defaultTermMode: 'max',
    isActive: true
  },
  // SNB retired Defaults
  {
    bankId: 'alahli',
    sectorId: 'retired',
    rankId: 'all',
    productId: 'real_estate',
    supportType: 'all',
    maxTermMonths: 300,
    allowedMonthsAfterRetirement: 300,
    maxAgeAtEnd: 75,
    allowAfterRetirement: true,
    calendarType: 'gregorian',
    minTermMonths: 60,
    defaultTermMode: 'max',
    isActive: true
  },

  // ==================== FALLBACK DEFAULT RULES ====================
  {
    bankId: 'all',
    sectorId: 'gov_civil',
    rankId: 'all',
    productId: 'real_estate',
    supportType: 'all',
    maxTermMonths: 300,
    allowedMonthsAfterRetirement: 60,
    maxAgeAtEnd: 70,
    allowAfterRetirement: true,
    calendarType: 'gregorian',
    minTermMonths: 60,
    defaultTermMode: 'max',
    isActive: true
  },
  {
    bankId: 'all',
    sectorId: 'semi_gov',
    rankId: 'all',
    productId: 'real_estate',
    supportType: 'all',
    maxTermMonths: 300,
    allowedMonthsAfterRetirement: 60,
    maxAgeAtEnd: 70,
    allowAfterRetirement: true,
    calendarType: 'gregorian',
    minTermMonths: 60,
    defaultTermMode: 'max',
    isActive: true
  },
  {
    bankId: 'all',
    sectorId: 'companies',
    rankId: 'all',
    productId: 'real_estate',
    supportType: 'all',
    maxTermMonths: 300,
    allowedMonthsAfterRetirement: 60,
    maxAgeAtEnd: 70,
    allowAfterRetirement: true,
    calendarType: 'gregorian',
    minTermMonths: 60,
    defaultTermMode: 'max',
    isActive: true
  },
  {
    bankId: 'all',
    sectorId: 'military',
    rankId: 'all',
    productId: 'real_estate',
    supportType: 'all',
    maxTermMonths: 300,
    allowedMonthsAfterRetirement: 60,
    maxAgeAtEnd: 70,
    allowAfterRetirement: true,
    calendarType: 'gregorian',
    minTermMonths: 60,
    defaultTermMode: 'max',
    isActive: true
  },
  {
    bankId: 'all',
    sectorId: 'retired',
    rankId: 'all',
    productId: 'real_estate',
    supportType: 'all',
    maxTermMonths: 300,
    allowedMonthsAfterRetirement: 300,
    maxAgeAtEnd: 70,
    allowAfterRetirement: true,
    calendarType: 'gregorian',
    minTermMonths: 60,
    defaultTermMode: 'max',
    isActive: true
  }
];
