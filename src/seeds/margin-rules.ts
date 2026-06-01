import { MarginRule } from '../types';

function generateRajhiRules(): MarginRule[] {
  const years = [5, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30];

  const H = {
    5: 3.80, 10: 3.80, 11: 3.86, 12: 3.92, 13: 3.98, 14: 4.04, 15: 4.11,
    16: 4.17, 17: 4.24, 18: 4.31, 19: 4.37, 20: 4.44, 21: 4.51, 22: 4.58,
    23: 4.64, 24: 4.71, 25: 4.77, 26: 4.83, 27: 4.89, 28: 4.95, 29: 5.00, 30: 5.07
  };
  const I = {
    5: 4.46, 10: 4.46, 11: 4.67, 12: 4.73, 13: 4.79, 14: 4.85, 15: 4.92,
    16: 4.99, 17: 5.06, 18: 5.13, 19: 5.19, 20: 5.26, 21: 5.41, 22: 5.48,
    23: 5.54, 24: 5.61, 25: 5.67, 26: 5.81, 27: 5.87, 28: 5.93, 29: 5.98, 30: 6.05
  };
  const J = {
    5: 3.85, 10: 3.85, 11: 3.91, 12: 3.97, 13: 4.03, 14: 4.10, 15: 4.16,
    16: 4.22, 17: 4.29, 18: 4.36, 19: 4.42, 20: 4.50, 21: 4.57, 22: 4.64,
    23: 4.70, 24: 4.77, 25: 4.83, 26: 4.89, 27: 4.95, 28: 5.02, 29: 5.07, 30: 5.13
  };
  const K = {
    5: 4.51, 10: 4.51, 11: 4.72, 12: 4.78, 13: 4.84, 14: 4.91, 15: 4.97,
    16: 5.04, 17: 5.11, 18: 5.18, 19: 5.24, 20: 5.32, 21: 5.47, 22: 5.54,
    23: 5.60, 24: 5.67, 25: 5.73, 26: 5.87, 27: 5.93, 28: 6.00, 29: 6.05, 30: 6.11
  };
  const L = {
    5: 4.26, 10: 4.26, 11: 4.33, 12: 4.40, 13: 4.46, 14: 4.54, 15: 4.61,
    16: 4.69, 17: 4.76, 18: 4.84, 19: 4.92, 20: 4.99, 21: 5.07, 22: 5.14,
    23: 5.22, 24: 5.30, 25: 5.37, 26: 5.43, 27: 5.50, 28: 5.57, 29: 5.64, 30: 5.70
  };
  const M = {
    5: 4.92, 10: 4.92, 11: 5.14, 12: 5.21, 13: 5.27, 14: 5.35, 15: 5.42,
    16: 5.51, 17: 5.58, 18: 5.66, 19: 5.74, 20: 5.81, 21: 5.97, 22: 6.04,
    23: 6.12, 24: 6.20, 25: 6.27, 26: 6.41, 27: 6.48, 28: 6.55, 29: 6.62, 30: 6.68
  };

  const combos: Array<{
    productId: 'real_estate_only' | 'real_estate_with_new_personal' | 'real_estate_with_existing_personal';
    supportType: 'none' | 'monthly' | 'downpayment';
    salaryTier: 'below_25000' | 'above_or_equal_25000' | 'not_applicable';
    table: Record<number, number>;
  }> = [
    // H
    { productId: 'real_estate_only', supportType: 'monthly', salaryTier: 'below_25000', table: H },
    { productId: 'real_estate_only', supportType: 'downpayment', salaryTier: 'below_25000', table: H },
    // I
    { productId: 'real_estate_with_new_personal', supportType: 'monthly', salaryTier: 'below_25000', table: I },
    { productId: 'real_estate_with_new_personal', supportType: 'downpayment', salaryTier: 'below_25000', table: I },
    { productId: 'real_estate_with_existing_personal', supportType: 'monthly', salaryTier: 'below_25000', table: I },
    { productId: 'real_estate_with_existing_personal', supportType: 'downpayment', salaryTier: 'below_25000', table: I },
    // J
    { productId: 'real_estate_only', supportType: 'monthly', salaryTier: 'above_or_equal_25000', table: J },
    { productId: 'real_estate_only', supportType: 'downpayment', salaryTier: 'above_or_equal_25000', table: J },
    // K
    { productId: 'real_estate_with_new_personal', supportType: 'monthly', salaryTier: 'above_or_equal_25000', table: K },
    { productId: 'real_estate_with_new_personal', supportType: 'downpayment', salaryTier: 'above_or_equal_25000', table: K },
    { productId: 'real_estate_with_existing_personal', supportType: 'monthly', salaryTier: 'above_or_equal_25000', table: K },
    { productId: 'real_estate_with_existing_personal', supportType: 'downpayment', salaryTier: 'above_or_equal_25000', table: K },
    // L
    { productId: 'real_estate_only', supportType: 'none', salaryTier: 'not_applicable', table: L },
    // M
    { productId: 'real_estate_with_new_personal', supportType: 'none', salaryTier: 'not_applicable', table: M },
    { productId: 'real_estate_with_existing_personal', supportType: 'none', salaryTier: 'not_applicable', table: M }
  ];

  const rules: MarginRule[] = [];

  combos.forEach((combo) => {
    const sortedYears = [...years].sort((a, b) => a - b);
    
    sortedYears.forEach((year, idx) => {
      const currentMargin = combo.table[year];
      if (idx === 0) {
        // First year (5 years) -> 0 to 60 months
        rules.push({
          id: `rajhi_gen_${combo.productId}_${combo.supportType}_${combo.salaryTier}_yr${year}`,
          bankId: 'rajhi',
          productId: combo.productId,
          supportType: combo.supportType,
          sectorId: 'all',
          fromTermMonths: 0,
          toTermMonths: year * 12,
          startMargin: currentMargin,
          endMargin: currentMargin,
          calcType: 'fixed',
          isActive: true,
          salaryTier: combo.salaryTier
        });
      } else {
        const prevYear = sortedYears[idx - 1];
        rules.push({
          id: `rajhi_gen_${combo.productId}_${combo.supportType}_${combo.salaryTier}_yr${year}`,
          bankId: 'rajhi',
          productId: combo.productId,
          supportType: combo.supportType,
          sectorId: 'all',
          fromTermMonths: prevYear * 12 + 1,
          toTermMonths: year * 12,
          startMargin: currentMargin,
          endMargin: currentMargin,
          calcType: 'fixed',
          isActive: true,
          salaryTier: combo.salaryTier
        });
      }
    });

    // Final fallback for anything above 30 years
    const lastYear = sortedYears[sortedYears.length - 1];
    const lastMargin = combo.table[lastYear];
    rules.push({
      id: `rajhi_gen_${combo.productId}_${combo.supportType}_${combo.salaryTier}_above30`,
      bankId: 'rajhi',
      productId: combo.productId,
      supportType: combo.supportType,
      sectorId: 'all',
      fromTermMonths: lastYear * 12 + 1,
      toTermMonths: 9999,
      startMargin: lastMargin,
      endMargin: lastMargin,
      calcType: 'fixed',
      isActive: true,
      salaryTier: combo.salaryTier
    });
  });

  return rules;
}

export const initialMarginRules: MarginRule[] = [
  // SNB (alahli) Real Estate Margins
  {
    id: 'snb_re_m1',
    bankId: 'alahli',
    productId: 'real_estate',
    supportType: 'all',
    sectorId: 'all',
    fromTermMonths: 0,
    toTermMonths: 60,
    startMargin: 1.80,
    endMargin: 1.80,
    calcType: 'fixed',
    isActive: true
  },
  {
    id: 'snb_re_m2',
    bankId: 'alahli',
    productId: 'real_estate',
    supportType: 'all',
    sectorId: 'all',
    fromTermMonths: 61,
    toTermMonths: 120,
    startMargin: 1.80,
    endMargin: 2.25,
    calcType: 'linear',
    isActive: true
  },
  {
    id: 'snb_re_m3',
    bankId: 'alahli',
    productId: 'real_estate',
    supportType: 'all',
    sectorId: 'all',
    fromTermMonths: 121,
    toTermMonths: 180,
    startMargin: 2.25,
    endMargin: 2.95,
    calcType: 'linear',
    isActive: true
  },
  {
    id: 'snb_re_m4',
    bankId: 'alahli',
    productId: 'real_estate',
    supportType: 'all',
    sectorId: 'all',
    fromTermMonths: 181,
    toTermMonths: 240,
    startMargin: 2.95,
    endMargin: 3.65,
    calcType: 'linear',
    isActive: true
  },
  {
    id: 'snb_re_m5',
    bankId: 'alahli',
    productId: 'real_estate',
    supportType: 'all',
    sectorId: 'all',
    fromTermMonths: 241,
    toTermMonths: 300,
    startMargin: 3.65,
    endMargin: 4.35,
    calcType: 'linear',
    isActive: true
  },

  // Seeded AlRajhi (rajhi) Tables H, I, J, K, L, M
  ...generateRajhiRules(),

  // Alinma Real Estate Margins
  {
    id: 'alinma_re_m1',
    bankId: 'alinma',
    productId: 'real_estate',
    supportType: 'all',
    sectorId: 'all',
    fromTermMonths: 0,
    toTermMonths: 180,
    startMargin: 2.45,
    endMargin: 2.45,
    calcType: 'fixed',
    isActive: true
  },
  {
    id: 'alinma_re_m2',
    bankId: 'alinma',
    productId: 'real_estate',
    supportType: 'all',
    sectorId: 'all',
    fromTermMonths: 181,
    toTermMonths: 300,
    startMargin: 2.45,
    endMargin: 3.95,
    calcType: 'linear',
    isActive: true
  },

  // Default fallback Margins for other banks
  {
    id: 'default_re_m1',
    bankId: 'all',
    productId: 'real_estate',
    supportType: 'all',
    sectorId: 'all',
    fromTermMonths: 0,
    toTermMonths: 300,
    startMargin: 2.50,
    endMargin: 4.50,
    calcType: 'linear',
    isActive: true
  }
];
