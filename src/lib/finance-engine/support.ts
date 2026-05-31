import { HousingSupportOutput, SupportType, SupportSettings, HousingSupportTier, AdvancePaymentTier } from '../../types';
import { getHousingSupport, getAdvancePayment } from '../housingSupportService';

/**
 * دالة تبحث عن الشريحة الصحيحة للدعم السكني الشهري بناءً على صافي الراتب بقيمة استيفاء خطي
 */
export function getMonthlyHousingSupport(
  netSalary: number, 
  tiers?: HousingSupportTier[]
): number {
  return getHousingSupport(netSalary, tiers);
}

/**
 * دالة تبحث عن الشريحة الصحيحة لدعم الدفعة بناءً على صافي الراتب
 */
export function getDownPaymentSupport(
  netSalary: number, 
  tiers?: AdvancePaymentTier[]
): number {
  return getAdvancePayment(netSalary, tiers);
}

export function calculateHousingSupport(params: {
  netSalary: number;
  supportType: SupportType | 'down_payment';
  settings: SupportSettings;
  housingSupportTiers?: HousingSupportTier[];
  advancePaymentTiers?: AdvancePaymentTier[];
}): HousingSupportOutput {
  const { netSalary, supportType, housingSupportTiers, advancePaymentTiers } = params;

  // توحيد نوع الدعم لدعم كلتا الحالتين
  const normalizedSupportType = (supportType === 'down_payment' || supportType === 'downpayment') ? 'downpayment' : supportType;

  if (normalizedSupportType === 'none') {
    return {
      monthlySupport: 0,
      downPaymentSupport: 0,
      supportType: 'none',
      appliedRule: 'بدون دعم سكني'
    };
  }

  if (normalizedSupportType === 'monthly') {
    const amount = getHousingSupport(netSalary, housingSupportTiers);
    
    return {
      monthlySupport: amount,
      downPaymentSupport: 0,
      supportType: 'monthly',
      appliedRule: `قيمة الدعم السكني الشهري المتواصل المحسوب: ${Math.round(amount)} ريال (طريقة الاستيفاء الخطي للراجحي).`
    };
  }

  if (normalizedSupportType === 'downpayment') {
    const amount = getAdvancePayment(netSalary, advancePaymentTiers);

    return {
      monthlySupport: 0,
      downPaymentSupport: amount,
      supportType: 'downpayment',
      appliedRule: `قيمة دعم الدفعة المقدمة غير المستردة المحسوبة: ${amount.toLocaleString('ar-SA')} ريال.`
    };
  }

  return {
    monthlySupport: 0,
    downPaymentSupport: 0,
    supportType: 'none',
    appliedRule: 'فشلت المطابقة مع شروط الدعم.'
  };
}
