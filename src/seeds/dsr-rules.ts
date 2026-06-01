import { DsrRule } from '../types';

export const initialDsrRules: DsrRule[] = [
  // 1. عقاري فقط + غير مدعوم + قبل التقاعد
  {
    id: 'default_re_only_none_before',
    bankId: 'default',
    productType: 'real_estate_only',
    supportType: 'none',
    customerStage: 'active_before_retirement',
    dsrPercent: 55,
    deductExistingObligations: true,
    active: true
  },
  // 2. عقاري فقط + دعم شهري + قبل التقاعد
  {
    id: 'default_re_only_monthly_before',
    bankId: 'default',
    productType: 'real_estate_only',
    supportType: 'monthly',
    customerStage: 'active_before_retirement',
    dsrPercent: 65,
    deductExistingObligations: true,
    active: true
  },
  // 3. عقاري فقط + دعم دفعة + قبل التقاعد
  {
    id: 'default_re_only_down_before',
    bankId: 'default',
    productType: 'real_estate_only',
    supportType: 'down_payment',
    customerStage: 'active_before_retirement',
    dsrPercent: 55,
    deductExistingObligations: true,
    active: true
  },
  // 4. عقاري فقط + غير مدعوم + بعد التقاعد
  {
    id: 'default_re_only_none_after',
    bankId: 'default',
    productType: 'real_estate_only',
    supportType: 'none',
    customerStage: 'retired_after_retirement',
    dsrPercent: 55,
    deductExistingObligations: true,
    active: true
  },
  // 5. عقاري فقط + دعم شهري + بعد التقاعد
  {
    id: 'default_re_only_monthly_after',
    bankId: 'default',
    productType: 'real_estate_only',
    supportType: 'monthly',
    customerStage: 'retired_after_retirement',
    dsrPercent: 65,
    deductExistingObligations: true,
    active: true
  },
  // 6. عقاري فقط + دعم دفعة + بعد التقاعد
  {
    id: 'default_re_only_down_after',
    bankId: 'default',
    productType: 'real_estate_only',
    supportType: 'down_payment',
    customerStage: 'retired_after_retirement',
    dsrPercent: 55,
    deductExistingObligations: true,
    active: true
  },
  // 7. عقاري + شخصي جديد + غير مدعوم + قبل التقاعد
  {
    id: 'default_re_new_pf_none_before',
    bankId: 'default',
    productType: 'real_estate_with_new_personal',
    supportType: 'none',
    customerStage: 'active_before_retirement',
    dsrPercent: 55,
    deductExistingObligations: true,
    active: true
  },
  // 8. عقاري + شخصي جديد + دعم شهري + قبل التقاعد
  {
    id: 'default_re_new_pf_monthly_before',
    bankId: 'default',
    productType: 'real_estate_with_new_personal',
    supportType: 'monthly',
    customerStage: 'active_before_retirement',
    dsrPercent: 65,
    deductExistingObligations: true,
    active: true
  },
  // 9. عقاري + شخصي جديد + دعم دفعة + قبل التقاعد
  {
    id: 'default_re_new_pf_down_before',
    bankId: 'default',
    productType: 'real_estate_with_new_personal',
    supportType: 'down_payment',
    customerStage: 'active_before_retirement',
    dsrPercent: 55,
    deductExistingObligations: true,
    active: true
  },
  // 10. عقاري مع شخصي قائم + غير مدعوم + قبل التقاعد
  {
    id: 'default_re_exist_pf_none_before',
    bankId: 'default',
    productType: 'real_estate_with_existing_personal',
    supportType: 'none',
    customerStage: 'active_before_retirement',
    dsrPercent: 55,
    deductExistingObligations: true,
    active: true
  },
  // 11. عقاري مع شخصي قائم + دعم شهري + قبل التقاعد
  {
    id: 'default_re_exist_pf_monthly_before',
    bankId: 'default',
    productType: 'real_estate_with_existing_personal',
    supportType: 'monthly',
    customerStage: 'active_before_retirement',
    dsrPercent: 65,
    deductExistingObligations: true,
    active: true
  },
  // 12. عقاري مع شخصي قائم + دعم دفعة + قبل التقاعد
  {
    id: 'default_re_exist_pf_down_before',
    bankId: 'default',
    productType: 'real_estate_with_existing_personal',
    supportType: 'down_payment',
    customerStage: 'active_before_retirement',
    dsrPercent: 55,
    deductExistingObligations: true,
    active: true
  },
  // 13. شخصي فقط + غير مدعوم + موظف نشط
  {
    id: 'default_pf_only_none_before',
    bankId: 'default',
    productType: 'personal_only',
    supportType: 'none',
    customerStage: 'active_before_retirement',
    dsrPercent: 33,
    deductExistingObligations: true,
    active: true
  },
  // 14. شخصي فقط + غير مدعوم + متقاعد
  {
    id: 'default_pf_only_none_after',
    bankId: 'default',
    productType: 'personal_only',
    supportType: 'none',
    customerStage: 'retired_after_retirement',
    dsrPercent: 25,
    deductExistingObligations: true,
    active: true
  },

  // overrides for National Commercial Bank (alahli)
  {
    id: 'alahli_re_only_monthly_before',
    bankId: 'alahli',
    productType: 'real_estate_only',
    supportType: 'monthly',
    customerStage: 'active_before_retirement',
    dsrPercent: 65,
    deductExistingObligations: true,
    active: true
  },
  {
    id: 'alahli_pf_only_none_before',
    bankId: 'alahli',
    productType: 'personal_only',
    supportType: 'none',
    customerStage: 'active_before_retirement',
    dsrPercent: 33,
    deductExistingObligations: true,
    active: true
  }
];
