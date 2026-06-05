import { supabase, hasSupabaseKeys } from './supabase';
import { HousingSupportTier, AdvancePaymentTier } from '../types';

// Default static lists based on confirmed Al-Rajhi guidelines
export const DEFAULT_HOUSING_SUPPORT_TIERS: HousingSupportTier[] = [
  { id: '1', min_salary: 0, max_salary: 3000, amount_at_min: 0, amount_at_max: 0, sort_order: 1 },
  { id: '2', min_salary: 3000, max_salary: 4000, amount_at_min: 1350, amount_at_max: 1206, sort_order: 2 },
  { id: '3', min_salary: 4000, max_salary: 5000, amount_at_min: 1206, amount_at_max: 1073, sort_order: 3 },
  { id: '4', min_salary: 5000, max_salary: 6000, amount_at_min: 1073, amount_at_max: 955, sort_order: 4 },
  { id: '5', min_salary: 6000, max_salary: 7000, amount_at_min: 955, amount_at_max: 850, sort_order: 5 },
  { id: '6', min_salary: 7000, max_salary: 8000, amount_at_min: 850, amount_at_max: 757, sort_order: 6 },
  { id: '7', min_salary: 8000, max_salary: 9000, amount_at_min: 757, amount_at_max: 673, sort_order: 7 },
  { id: '8', min_salary: 9000, max_salary: 10000, amount_at_min: 673, amount_at_max: 599, sort_order: 8 }
];

export const DEFAULT_ADVANCE_PAYMENT_TIERS: AdvancePaymentTier[] = [
  { id: '1', salary_threshold: 10000, amount: 150000 },
  { id: '2', salary_threshold: 9999999, amount: 100000 }
];

/**
 * دالة الحساب المركزية للـ الدعم السكني - مصدر الحقيقة الوحيد
 * الترتيب مهم جداً: الحالات الخاصة قبل البحث في الشرائح.
 */
export function getHousingSupport(S: number, tiers: HousingSupportTier[] = DEFAULT_HOUSING_SUPPORT_TIERS): number {
  // 1. فحص S < 3000 قبل كل شيء
  if (S < 3000) return 0;
  
  // 2. فحص S > 10000 قبل فحص S === 10000
  if (S > 10000) {
    return 100000 / 240; // = 416.6667 (ثابت)
  }
  
  // 3. فحص الراتب 10000 كقيمة انكسار منفردة
  if (S === 10000) return 599;

  // 4. البحث في الشرائح
  // نحدد الشريحة التي يقع الراتب في نطاقها: السعر >= الحد الأدنى وأقل من الحد الأعلى
  const tier = tiers.find(t => S >= t.min_salary && S < t.max_salary);
  if (!tier) return 0;

  // معادلة الاستيفاء الخطي المعتمدة:
  const numerator = (tier.max_salary - S) * (tier.amount_at_min - tier.amount_at_max);
  const denominator = tier.max_salary - tier.min_salary;
  
  if (denominator === 0) return tier.amount_at_max;
  
  return (numerator / denominator) + tier.amount_at_max;
}

/**
 * دالة الدفعة المقدمة غير المستردة بناءً على عتبة الراتب
 */
export function getAdvancePayment(S: number, tiers: AdvancePaymentTier[] = DEFAULT_ADVANCE_PAYMENT_TIERS): number {
  if (!tiers || tiers.length === 0) {
    return S < 10000 ? 150000 : 100000;
  }
  
  // فرز العتبات تصاعدياً
  const sorted = [...tiers].sort((a, b) => a.salary_threshold - b.salary_threshold);
  
  // نجد أول شريحة يكون الراتب فيها أقل من العتبة
  const tier = sorted.find(t => S < t.salary_threshold);
  if (tier) return tier.amount;
  
  // إذا لم يطابق أي شريحة (الراتب أعلى من كل العتبات)، نرجع شريحة العتبة الأخيرة
  return sorted[sorted.length - 1].amount;
}

/**
 * تحميل كافة شرائح الدعم السكني (housing_support_tiers)
 */
export async function fetchHousingSupportTiers(): Promise<HousingSupportTier[]> {
  if (hasSupabaseKeys) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Housing support tiers request timed out after 3 seconds')), 3000);
      });

      const fetchPromise = (async () => {
        const { data, error } = await supabase
          .from('housing_support_tiers')
          .select('*')
          .order('sort_order', { ascending: true });

        if (error) throw error;
        return data;
      })();

      const data = await Promise.race([fetchPromise, timeoutPromise]);

      if (data && data.length > 0) {
        return data.map(item => ({
          id: item.id,
          min_salary: Number(item.min_salary),
          max_salary: Number(item.max_salary),
          amount_at_min: Number(item.amount_at_min),
          amount_at_max: Number(item.amount_at_max),
          sort_order: Number(item.sort_order)
        }));
      }
    } catch (e) {
      console.warn("Could not load housing_support_tiers from database. Defaulting to state seeds.", e);
    }
  }
  return [...DEFAULT_HOUSING_SUPPORT_TIERS];
}

/**
 * تحميل عتبات الدفعة المقدمة (advance_payment_tiers)
 */
export async function fetchAdvancePaymentTiers(): Promise<AdvancePaymentTier[]> {
  if (hasSupabaseKeys) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Advance payment tiers request timed out after 3 seconds')), 3000);
      });

      const fetchPromise = (async () => {
        const { data, error } = await supabase
          .from('advance_payment_tiers')
          .select('*')
          .order('salary_threshold', { ascending: true });

        if (error) throw error;
        return data;
      })();

      const data = await Promise.race([fetchPromise, timeoutPromise]);

      if (data && data.length > 0) {
        return data.map(item => ({
          id: item.id,
          salary_threshold: Number(item.salary_threshold),
          amount: Number(item.amount)
        }));
      }
    } catch (e) {
      console.warn("Could not load advance_payment_tiers from database. Defaulting to state seeds.", e);
    }
  }
  return [...DEFAULT_ADVANCE_PAYMENT_TIERS];
}

/**
 * حفظ كافة شرائح الدعم السكني دفعة واحدة (مسح وإعادة كتابة أو تعديل جماعي)
 */
export async function saveHousingSupportTiers(tiers: HousingSupportTier[]): Promise<boolean> {
  if (hasSupabaseKeys) {
    try {
      // 1. حذف الشرائح القديمة
      const { error: deleteError } = await supabase
        .from('housing_support_tiers')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // مسح شامل آمن

      if (deleteError) throw deleteError;

      // 2. إدخال الشرائح الجديدة مع جعل معرفاتها uuid جديدة
      const rowsToInsert = tiers.map((t, index) => {
        const row: any = {
          min_salary: t.min_salary,
          max_salary: t.max_salary,
          amount_at_min: t.amount_at_min,
          amount_at_max: t.amount_at_max,
          sort_order: t.sort_order || (index + 1)
        };
        // لا نمرر معرفات قصيرة مثل '1', '2' لقاعدة البيانات، نتركها تنشئ uuid تلقائي
        if (t.id && t.id.length > 5) {
          row.id = t.id;
        }
        return row;
      });

      const { error: insertError } = await supabase
        .from('housing_support_tiers')
        .insert(rowsToInsert);

      if (insertError) throw insertError;
      return true;
    } catch (err: any) {
      console.error("Failing to save housing support tiers to Supabase:", err);
      throw err;
    }
  }
  return false;
}

/**
 * حفظ عتبات الدفعة المقدمة دفعة واحدة
 */
export async function saveAdvancePaymentTiers(tiers: AdvancePaymentTier[]): Promise<boolean> {
  if (hasSupabaseKeys) {
    try {
      // 1. حذف التسهيلات السابقة للدفعة المقدمة
      const { error: deleteError } = await supabase
        .from('advance_payment_tiers')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (deleteError) throw deleteError;

      // 2. إدخال القيم المعدلة
      const rowsToInsert = tiers.map(t => {
        const row: any = {
          salary_threshold: t.salary_threshold,
          amount: t.amount
        };
        if (t.id && t.id.length > 5) {
          row.id = t.id;
        }
        return row;
      });

      const { error: insertError } = await supabase
        .from('advance_payment_tiers')
        .insert(rowsToInsert);

      if (insertError) throw insertError;
      return true;
    } catch (err: any) {
      console.error("Failing to save advance payment tiers to Supabase:", err);
      throw err;
    }
  }
  return false;
}
