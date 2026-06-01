import { DsrRule } from '../types';

const banksList = ['rajhi', 'alahli', 'albilad', 'alinma', 'fransi', 'alarabi'];

const rules: DsrRule[] = [];

// 1. Seed rules for standard 6 banks
banksList.forEach((bankId) => {
  rules.push(
    {
      id: `${bankId}_re_none_active`,
      bankId,
      productType: 'real_estate_only',
      supportType: 'none',
      customerStage: 'active_before_retirement',
      dsrPercent: 55,
      deductExistingObligations: true,
      active: true
    },
    {
      id: `${bankId}_re_none_retired`,
      bankId,
      productType: 'real_estate_only',
      supportType: 'none',
      customerStage: 'retired_after_retirement',
      dsrPercent: 55,
      deductExistingObligations: true,
      active: true
    },
    {
      id: `${bankId}_re_monthly_active`,
      bankId,
      productType: 'real_estate_only',
      supportType: 'monthly',
      customerStage: 'active_before_retirement',
      dsrPercent: 65,
      deductExistingObligations: true,
      active: true
    },
    {
      id: `${bankId}_re_monthly_retired`,
      bankId,
      productType: 'real_estate_only',
      supportType: 'monthly',
      customerStage: 'retired_after_retirement',
      dsrPercent: 65,
      deductExistingObligations: true,
      active: true
    },
    {
      id: `${bankId}_re_down_active`,
      bankId,
      productType: 'real_estate_only',
      supportType: 'down_payment',
      customerStage: 'active_before_retirement',
      dsrPercent: 55,
      deductExistingObligations: true,
      active: true
    },
    {
      id: `${bankId}_re_down_retired`,
      bankId,
      productType: 'real_estate_only',
      supportType: 'down_payment',
      customerStage: 'retired_after_retirement',
      dsrPercent: 55,
      deductExistingObligations: true,
      active: true
    },
    {
      id: `${bankId}_pf_not_app_active`,
      bankId,
      productType: 'personal_only',
      supportType: 'not_applicable',
      customerStage: 'active_before_retirement',
      dsrPercent: 33.33,
      deductExistingObligations: true,
      active: true
    },
    {
      id: `${bankId}_pf_not_app_retired`,
      bankId,
      productType: 'personal_only',
      supportType: 'not_applicable',
      customerStage: 'retired_after_retirement',
      dsrPercent: 25,
      deductExistingObligations: true,
      active: true
    }
  );
});

// 2. Seed rules for 'bidaya' bank (Real Estate Support is always 55% instead of 65%)
rules.push(
  {
    id: `bidaya_re_none_active`,
    bankId: 'bidaya',
    productType: 'real_estate_only',
    supportType: 'none',
    customerStage: 'active_before_retirement',
    dsrPercent: 55,
    deductExistingObligations: true,
    active: true
  },
  {
    id: `bidaya_re_none_retired`,
    bankId: 'bidaya',
    productType: 'real_estate_only',
    supportType: 'none',
    customerStage: 'retired_after_retirement',
    dsrPercent: 55,
    deductExistingObligations: true,
    active: true
  },
  {
    id: `bidaya_re_monthly_active`,
    bankId: 'bidaya',
    productType: 'real_estate_only',
    supportType: 'monthly',
    customerStage: 'active_before_retirement',
    dsrPercent: 55,
    deductExistingObligations: true,
    active: true
  },
  {
    id: `bidaya_re_monthly_retired`,
    bankId: 'bidaya',
    productType: 'real_estate_only',
    supportType: 'monthly',
    customerStage: 'retired_after_retirement',
    dsrPercent: 55,
    deductExistingObligations: true,
    active: true
  },
  {
    id: `bidaya_re_down_active`,
    bankId: 'bidaya',
    productType: 'real_estate_only',
    supportType: 'down_payment',
    customerStage: 'active_before_retirement',
    dsrPercent: 55,
    deductExistingObligations: true,
    active: true
  },
  {
    id: `bidaya_re_down_retired`,
    bankId: 'bidaya',
    productType: 'real_estate_only',
    supportType: 'down_payment',
    customerStage: 'retired_after_retirement',
    dsrPercent: 55,
    deductExistingObligations: true,
    active: true
  },
  {
    id: `bidaya_pf_not_app_active`,
    bankId: 'bidaya',
    productType: 'personal_only',
    supportType: 'not_applicable',
    customerStage: 'active_before_retirement',
    dsrPercent: 33.33,
    deductExistingObligations: true,
    active: true
  },
  {
    id: `bidaya_pf_not_app_retired`,
    bankId: 'bidaya',
    productType: 'personal_only',
    supportType: 'not_applicable',
    customerStage: 'retired_after_retirement',
    dsrPercent: 25,
    deductExistingObligations: true,
    active: true
  }
);

export const initialDsrRules: DsrRule[] = rules;
