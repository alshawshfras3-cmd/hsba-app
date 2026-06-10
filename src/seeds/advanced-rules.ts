import { AdvancedRule } from '../types';

export const initialAdvancedRules: AdvancedRule[] = [
  {
    id: 'rule_gosi_min_age',
    name: 'الحد الأدنى للسن القانوني للتمويل',
    bankId: 'all',
    productId: 'all',
    sectorId: 'all',
    conditionFormula: 'age < 18',
    actionType: 'reject',
    actionValue: 'عمر العميل أقل من الحد الأدنى القانوني (18 عامًا).',
    priority: 1,
    isActive: true
  },
  {
    id: 'rule_bidaya_retiree_rejection',
    name: 'شركة بداية: عدم تمويل فئة المتقاعدين',
    bankId: 'bidaya',
    productId: 'all',
    sectorId: 'retired',
    conditionFormula: 'sectorId === "retired"',
    actionType: 'reject',
    actionValue: 'شركة بداية لا تقدم حلول تمويلية للعملاء المتقاعدين.',
    priority: 2,
    isActive: true
  },
  {
    id: 'rule_snb_downpayment_bonus',
    name: 'الأهلي: حافز دعم الدفعة لتقليص الهامش',
    bankId: 'alahli',
    productId: 'all',
    sectorId: 'all',
    conditionFormula: 'supportType === "downpayment"',
    actionType: 'apply_modifier',
    actionValue: 'margin = margin - 0.25', // discount 0.25% margin
    priority: 3,
    isActive: true
  }
];
