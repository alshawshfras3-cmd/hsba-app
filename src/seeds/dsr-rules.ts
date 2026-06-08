import { DsrRule } from '../types';

const banksList = ['rajhi', 'alahli', 'albilad', 'alinma', 'fransi', 'bidaya', 'alarabi'];

const rules: DsrRule[] = [];

// 1. Seed rules for standard 7 banks
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

export const initialDsrRules: DsrRule[] = rules;
