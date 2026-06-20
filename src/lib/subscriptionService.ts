import { supabase, hasSupabaseKeys } from './supabase';

export function normalizePhone(rawPhone: string): string {
  if (!rawPhone) return '';
  let cleaned = rawPhone.trim().replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+966')) {
    let rest = cleaned.substring(4);
    if (rest.startsWith('0')) rest = rest.substring(1);
    return `+966${rest}`;
  }
  if (cleaned.startsWith('00966')) {
    let rest = cleaned.substring(5);
    if (rest.startsWith('0')) rest = rest.substring(1);
    return `+966${rest}`;
  }
  if (cleaned.startsWith('966')) {
    let rest = cleaned.substring(3);
    if (rest.startsWith('0')) rest = rest.substring(1);
    return `+966${rest}`;
  }
  if (cleaned.startsWith('05')) {
    return `+966${cleaned.substring(1)}`;
  }
  if (cleaned.startsWith('5')) {
    return `+966${cleaned}`;
  }
  return cleaned;
}

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price_sar: number;
  duration_days: number;
  daily_calculation_limit: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at?: string;
  features?: string[];
  badge_text?: string | null;
  badge_color?: string | null;
  card_color?: string | null;
  is_free_plan?: boolean;
}

export interface DbSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'trialing' | 'active' | 'expired' | 'cancelled' | 'past_due';
  started_at: string;
  ends_at: string;
  cancelled_at: string | null;
  source: string;
  notes: string | null;
  custom_daily_limit: number | null;
  plan?: SubscriptionPlan;
}

export interface UserBillingProfile {
  id: string;
  user_id: string;
  phone_number: string | null;
  normalized_phone?: string | null;
  phone_verified_at?: string | null;
  phone_locked: boolean;
  full_name: string | null;
  email: string | null;
}

export interface UserUsage {
  id: string;
  user_id: string;
  usage_date: string;
  calculation_count: number;
}

export interface PaymentTransaction {
  id: string;
  user_id: string;
  subscription_id: string | null;
  plan_id: string | null;
  provider: string | null;
  provider_payment_id: string | null;
  amount_sar: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';
  metadata: any | null;
  created_at: string;
}

// 1. Get Current Subscription for a specific user
export async function getCurrentSubscription(userId: string): Promise<DbSubscription | null> {
  if (!hasSupabaseKeys) {
    // Simulator fallback
    return {
      id: 'mock-sub-id',
      user_id: userId,
      plan_id: 'mock-plan-trial',
      status: 'trialing',
      started_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      ends_at: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      cancelled_at: null,
      source: 'system',
      notes: 'محاكاة الباقة المجانية',
      custom_daily_limit: null,
      plan: {
        id: 'mock-plan-trial',
        code: 'trial',
        name: 'باقة مجانية',
        description: 'باقة مجانية افتراضية 30 يوماً',
        price_sar: 0,
        duration_days: 30,
        daily_calculation_limit: null,
        is_active: true,
        sort_order: 0,
        created_at: new Date().toISOString()
      }
    };
  }

  try {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*, plan:subscription_plans(*)')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching subscription:', error);
      return null;
    }

    if (!data || data.length === 0) return null;

    const now = new Date();

    // 1. active subscription where ends_at >= now()
    const activeSubs = data.filter(s => s.status === 'active' && new Date(s.ends_at) >= now);
    if (activeSubs.length > 0) {
      return activeSubs.sort((a, b) => new Date(b.ends_at).getTime() - new Date(a.ends_at).getTime())[0] as DbSubscription;
    }

    // 2. trialing subscription where ends_at >= now()
    const trialingSubs = data.filter(s => s.status === 'trialing' && new Date(s.ends_at) >= now);
    if (trialingSubs.length > 0) {
      return trialingSubs.sort((a, b) => new Date(b.ends_at).getTime() - new Date(a.ends_at).getTime())[0] as DbSubscription;
    }

    // 3. expired/cancelled subscription (or any other status)
    const otherSubs = [...data].sort((a, b) => new Date(b.created_at || b.ends_at).getTime() - new Date(a.created_at || a.ends_at).getTime());
    const latestSub = otherSubs[0];

    // Check if subscription has naturally expired
    const isExpired = new Date(latestSub.ends_at) < now;
    if (isExpired && (latestSub.status === 'trialing' || latestSub.status === 'active')) {
      const updatedStatus = 'expired';
      await supabase
        .from('user_subscriptions')
        .update({ status: updatedStatus, updated_at: now.toISOString() })
        .eq('id', latestSub.id);
      
      latestSub.status = updatedStatus;
    }

    return latestSub as DbSubscription;
  } catch (err) {
    console.error('Failed to get user subscription:', err);
    return null;
  }
}

export const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: 'mock-plan-trial',
    code: 'trial',
    name: 'باقة مجانية',
    description: 'باقة مجانية - صلاحية 30 يوماً مع سقف حسابات يومي مرن',
    price_sar: 0,
    duration_days: 30,
    daily_calculation_limit: null,
    is_active: true,
    sort_order: 0,
    created_at: new Date().toISOString(),
    features: [
      'ولوج كامل إلى حاسبة حسبة المتقدمة',
      'مقارنة 5 جهات تمويلية أساسية',
      'تتبع مؤشر الدعم السكني للمستفيدين',
      'حسبة نسبة الاستقطاع الدقيقة DSR'
    ],
    badge_text: 'بداية فورية',
    badge_color: 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-350',
    card_color: 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900',
    is_free_plan: true
  },
  {
    id: 'mock-plan-monthly',
    code: 'monthly',
    name: 'الباقة العقارية الشهرية',
    description: 'اشتراك شهري - ليس هناك حدود حسابية وصلاحيات وصول متكاملة وممتدة للعملاء',
    price_sar: 24.99,
    duration_days: 30,
    daily_calculation_limit: null,
    is_active: true,
    sort_order: 1,
    created_at: new Date().toISOString(),
    features: [
      'عدد لا نهائي من العمليات الحسابية',
      'فتح كافة جهات التمويل والبنوك المعتمدة',
      'حسابات الدعم السكني الفوري والمؤجل',
      'صلاحيات الوصول إلى حاسبة التقاعد العسكري والمدني',
      'دعم فني خاص وإصدار تقارير مخصصة للعملاء'
    ],
    badge_text: 'الأكثر طلبًا',
    badge_color: 'bg-sky-500 text-white',
    card_color: 'border-sky-500 shadow-md ring-2 ring-sky-500/20 bg-white dark:bg-[#0f172a]',
    is_free_plan: false
  },
  {
    id: 'mock-plan-6months',
    code: 'six_months',
    name: 'باقة 6 أشهر الاحترافية',
    description: 'اشتراك نصف سنوي - أفضل توفير مع عمليات لا نهائية وتقارير حصرية مهيأة للمشاركة',
    price_sar: 140.00,
    duration_days: 180,
    daily_calculation_limit: null,
    is_active: true,
    sort_order: 2,
    created_at: new Date().toISOString(),
    features: [
      'وفر ما يقارب 10٪ مقارنة بالاشتراك الشهري',
      'عدد غير محدود من العمليات والاستعلامات اليومية',
      'دعم كامل لخيارات الجمع بين التمويل العقاري والشخصي',
      'خيارات الربط البرمجي السحابي والـ API API Sandbox',
      'تقارير تحليل ذكي مهيأة للطباعة والمشاركة المباشرة'
    ],
    badge_text: 'التوفير الأقصى',
    badge_color: 'bg-emerald-500 text-white',
    card_color: 'border-emerald-500 bg-white dark:bg-slate-900',
    is_free_plan: false
  }
];

// Helper to seed localStorage if empty
function loadLocalPlans(): SubscriptionPlan[] {
  try {
    const stored = localStorage.getItem('dynamic_subscription_plans');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Error parsing local plans:', e);
  }
  try {
    localStorage.setItem('dynamic_subscription_plans', JSON.stringify(DEFAULT_PLANS));
  } catch (e) {
    console.error('Error saving local plans:', e);
  }
  return DEFAULT_PLANS;
}

// 2. Fetch active plans
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  if (!hasSupabaseKeys) {
    return loadLocalPlans();
  }

  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching subscription plans:', error);
      return [];
    }

    return (data || []).map((item: any) => {
      const defaultMatch = DEFAULT_PLANS.find(p => p.code === item.code);
      return {
        id: item.id,
        code: item.code || `plan_${Math.random().toString(36).substr(2, 5)}`,
        name: item.name,
        description: item.description,
        price_sar: Number(item.price_sar),
        duration_days: Number(item.duration_days),
        daily_calculation_limit: item.daily_calculation_limit === undefined ? null : item.daily_calculation_limit,
        is_active: item.is_active !== false,
        sort_order: Number(item.sort_order || 0),
        created_at: item.created_at || new Date().toISOString(),
        features: Array.isArray(item.features) && item.features.length > 0 
          ? item.features 
          : (defaultMatch?.features || []),
        badge_text: item.badge_text !== undefined ? item.badge_text : (defaultMatch?.badge_text || null),
        badge_color: item.badge_color !== undefined ? item.badge_color : (defaultMatch?.badge_color || null),
        card_color: item.card_color !== undefined ? item.card_color : (defaultMatch?.card_color || null),
        is_free_plan: item.is_free_plan !== undefined ? !!item.is_free_plan : !!(defaultMatch?.is_free_plan)
      } as SubscriptionPlan;
    });
  } catch (err) {
    console.error('Failed to get plans:', err);
    return [];
  }
}

// 3. Create Trial Subscription for new user
export async function createTrialSubscription(userId: string): Promise<DbSubscription | null> {
  if (!hasSupabaseKeys) {
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + 30); // 30 days trial
    return {
      id: 'mock-sub-trial-created',
      user_id: userId,
      plan_id: 'mock-plan-trial',
      status: 'trialing',
      started_at: new Date().toISOString(),
      ends_at: endsAt.toISOString(),
      cancelled_at: null,
      source: 'trial',
      notes: 'بداية تجربة مجانية جديدة',
      custom_daily_limit: null,
      plan: {
        id: 'mock-plan-trial',
        code: 'trial',
        name: 'تجربة مجانية',
        description: 'تجربة مجانية',
        price_sar: 0,
        duration_days: 30,
        daily_calculation_limit: null,
        is_active: true,
        sort_order: 0,
        created_at: new Date().toISOString()
      }
    };
  }

  // Get active trial plan
  const { data: planData, error: planErr } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('code', 'trial')
    .eq('is_active', true)
    .maybeSingle();

  if (planErr) {
    console.error('Error fetching trial plan:', planErr);
  }

  if (!planData) {
    console.warn('Active trial plan not found. User created without trial subscription.');
    return null;
  }

  const endsAt = new Date();
  endsAt.setDate(endsAt.getDate() + planData.duration_days);

  const newSub = {
    user_id: userId,
    plan_id: planData.id,
    status: 'trialing' as const,
    started_at: new Date().toISOString(),
    ends_at: endsAt.toISOString(),
    source: 'trial',
    notes: 'تفعيل تجريبي تلقائي عقيب التسجيل',
    custom_daily_limit: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('user_subscriptions')
    .insert(newSub)
    .select()
    .single();

  if (error || !data) {
    console.error('Error creating trial subscription:', error);
    throw new Error('فشل تفعيل الاشتراك التجريبي للمستخدم.');
  }

  return data as DbSubscription;
}

// 4. Usage limit check and incremental update
export async function getDailyUsage(userId: string, dateStr?: string): Promise<number> {
  const targetDate = dateStr || new Date().toISOString().split('T')[0];

  if (!hasSupabaseKeys) {
    const cachedUsage = sessionStorage.getItem(`hesba_usage_${userId}_${targetDate}`);
    return cachedUsage ? parseInt(cachedUsage, 10) : 0;
  }

  try {
    const { data, error } = await supabase
      .from('user_calculation_usage')
      .select('calculation_count')
      .eq('user_id', userId)
      .eq('usage_date', targetDate)
      .maybeSingle();

    if (error) {
      console.error('Error getting daily usage:', error);
      return 0;
    }

    return data ? data.calculation_count : 0;
  } catch (err) {
    console.error('Exception getting daily usage:', err);
    return 0;
  }
}

export async function incrementDailyUsage(userId: string, dailyLimit: number | null): Promise<{ success: boolean; count: number; error?: string }> {
  const targetDate = new Date().toISOString().split('T')[0];
  const currentCount = await getDailyUsage(userId, targetDate);

  if (dailyLimit !== null && dailyLimit !== undefined && currentCount >= dailyLimit) {
    return {
      success: false,
      count: currentCount,
      error: 'لقد وصلت إلى الحد اليومي للتجربة المجانية. يمكنك المحاولة غدًا أو الاشتراك الآن.'
    };
  }

  const newCount = currentCount + 1;

  if (!hasSupabaseKeys) {
    sessionStorage.setItem(`hesba_usage_${userId}_${targetDate}`, String(newCount));
    return { success: true, count: newCount };
  }

  try {
    // Perform upsert with a calculation_count increment or overwrite securely
    const { error } = await supabase
      .from('user_calculation_usage')
      .upsert({
        user_id: userId,
        usage_date: targetDate,
        calculation_count: newCount,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,usage_date'
      });

    if (error) {
      console.error('Failed to increment calculation count:', error);
      return { success: false, count: currentCount, error: 'حدث خطأ أثناء تحديث عداد العمليات اليومي.' };
    }

    return { success: true, count: newCount };
  } catch (err: any) {
    console.error('Failed to increment daily calculation count:', err);
    return { success: false, count: currentCount, error: err.message };
  }
}

// 5. Billing settings profile
export async function getBillingProfile(userId: string): Promise<UserBillingProfile | null> {
  if (!hasSupabaseKeys) {
    return {
      id: 'mock-billing-profile',
      user_id: userId,
      phone_number: '0512345678',
      phone_locked: true,
      full_name: 'تجربة محاكاة',
      email: 'user@example.com'
    };
  }

  try {
    const { data, error } = await supabase
      .from('user_billing_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching billing profile:', error);
      return null;
    }

    return data as UserBillingProfile;
  } catch (err) {
    console.error('Failed to get billing profile:', err);
    return null;
  }
}

export async function createBillingProfile(profile: { user_id: string; phone_number: string; full_name?: string; email?: string }): Promise<UserBillingProfile> {
  const normPhone = normalizePhone(profile.phone_number);
  if (!hasSupabaseKeys) {
    return {
      id: 'mock-created-billing',
      user_id: profile.user_id,
      phone_number: normPhone,
      normalized_phone: normPhone,
      phone_locked: false,
      full_name: profile.full_name || null,
      email: profile.email || null
    };
  }

  const { data, error } = await supabase
    .from('user_billing_profiles')
    .insert({
      user_id: profile.user_id,
      phone_number: normPhone,
      normalized_phone: normPhone,
      phone_locked: false,
      full_name: profile.full_name || '',
      email: profile.email || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error || !data) {
    console.error('Error creating user billing profile:', error);
    throw new Error(error?.message || 'فشل تكوين الهوية الفوترية للمستخدم الجديد.');
  }

  return data as UserBillingProfile;
}

export async function testBillingProfileUniquePhone(phone: string, excludeUserId?: string): Promise<boolean> {
  if (!hasSupabaseKeys) return true;
  try {
    const normalized = normalizePhone(phone);
    if (!normalized) return true; // Empty is allowed for existing users
    const { data, error } = await supabase
      .from('user_billing_profiles')
      .select('id, user_id')
      .or(`normalized_phone.eq.${normalized},phone_number.eq.${normalized}`);

    if (error) return true;
    if (data && data.length > 0) {
      if (excludeUserId) {
        const others = data.filter(item => item.user_id !== excludeUserId);
        return others.length === 0;
      }
      return false;
    }
    return true;
  } catch {
    return true;
  }
}

// 6. Admin functions
export async function getSubscriptionStats() {
  if (!hasSupabaseKeys) {
    return {
      totalSubscribers: 15,
      activeSubs: 8,
      trialingSubs: 5,
      expiredSubs: 2
    };
  }

  try {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('status');

    if (error) throw error;
    
    const stats = {
      totalSubscribers: data.length,
      activeSubs: data.filter(s => s.status === 'active').length,
      trialingSubs: data.filter(s => s.status === 'trialing').length,
      expiredSubs: data.filter(s => s.status === 'expired').length
    };

    return stats;
  } catch (err) {
    console.error('Error in getSubscriptionStats:', err);
    return { totalSubscribers: 0, activeSubs: 0, trialingSubs: 0, expiredSubs: 0 };
  }
}

export async function adminListSubscribers(): Promise<any[]> {
  if (!hasSupabaseKeys) {
    return [
      {
        id: 'sub-1',
        user_id: 'user-mock-1',
        email: 'ahmad@example.com',
        phone_number: '0555555551',
        full_name: 'أحمد الحربي',
        status: 'active',
        plan_name: 'اشتراك شهري',
        plan_code: 'monthly',
        plan_id: 'mock-plan-monthly',
        source: 'manual_paid',
        custom_daily_limit: null,
        notes: 'تم تفعيله يدويًا من الإدارة',
        started_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        ends_at: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
        usage_today: 4
      },
      {
        id: 'sub-2',
        user_id: 'user-mock-2',
        email: 'khaled@example.com',
        phone_number: '0544444442',
        full_name: 'خالم المطيري',
        status: 'trialing',
        plan_name: 'تجربة مجانية',
        plan_code: 'trial',
        plan_id: 'mock-plan-trial',
        source: 'trial',
        custom_daily_limit: 10,
        notes: 'تجربة تلقائية',
        started_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        ends_at: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
        usage_today: 9
      },
      {
        id: 'sub-3',
        user_id: 'user-mock-3',
        email: 'sara@example.com',
        phone_number: '0533333333',
        full_name: 'سارة العتيبي',
        status: 'expired',
        plan_name: 'تجربة مجانية',
        plan_code: 'trial',
        plan_id: 'mock-plan-trial',
        source: 'trial',
        custom_daily_limit: null,
        notes: 'منتهي الصلاحية',
        started_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        ends_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        usage_today: 0
      }
    ];
  }

  try {
    // Select subscriptions with plan details
    const { data: subs, error: errSubs } = await supabase
      .from('user_subscriptions')
      .select('*, plan:subscription_plans(*)');

    if (errSubs) throw errSubs;

    // Get billing profiles
    const { data: profiles, error: errProf } = await supabase
      .from('user_billing_profiles')
      .select('*');

    if (errProf) throw errProf;

    // Get usage for today
    const today = new Date().toISOString().split('T')[0];
    const { data: todayUsages } = await supabase
      .from('user_calculation_usage')
      .select('*')
      .eq('usage_date', today);

    return subs.map(s => {
      const prof = profiles.find(p => p.user_id === s.user_id);
      const usage = todayUsages?.find(u => u.user_id === s.user_id);
      return {
        id: s.id,
        user_id: s.user_id,
        email: prof?.email || 'مسجل خارجي',
        phone_number: prof?.phone_number || 'غير متوفر',
        full_name: prof?.full_name || 'عضو مجهول',
        status: s.status,
        plan_name: s.plan?.name || 'غير محدد',
        plan_code: s.plan?.code || 'none',
        plan_id: s.plan_id,
        source: s.source,
        custom_daily_limit: s.custom_daily_limit,
        notes: s.notes,
        started_at: s.started_at,
        ends_at: s.ends_at,
        usage_today: usage?.calculation_count || 0
      };
    });
  } catch (err) {
    console.error('Failed to list subscribers for admin:', err);
    return [];
  }
}

export async function adminManualActivateSubscription(userId: string, planCode: string, termDays?: number): Promise<void> {
  if (!hasSupabaseKeys) return;

  try {
    // 1. Fetch Subscription Plan
    const { data: plan, error: planErr } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('code', planCode)
      .maybeSingle();

    if (planErr || !plan) throw new Error('خطة الاشتراك غير متوفرة.');

    const duration = termDays || plan.duration_days;
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + duration);

    // 2. Check if user already has an active subscription row
    const { data: existingSub } = await supabase
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingSub) {
      // Update
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          plan_id: plan.id,
          status: 'active',
          started_at: new Date().toISOString(),
          ends_at: endsAt.toISOString(),
          source: 'manual_paid',
          notes: `تفعيل يدوي من الإدارة لباقة: ${plan.name}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSub.id);

      if (error) throw error;
    } else {
      // Insert
      const { error } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          plan_id: plan.id,
          status: 'active',
          started_at: new Date().toISOString(),
          ends_at: endsAt.toISOString(),
          source: 'manual_paid',
          notes: `تفعيل يدوي جديد من الإدارة لباقة: ${plan.name}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    }
  } catch (err) {
    console.error('Error activating subscription manually:', err);
    throw err;
  }
}

export async function adminCancelSubscription(userId: string): Promise<void> {
  if (!hasSupabaseKeys) return;
  try {
    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        notes: 'تم إلغاء الاشتراك من لوحة التحكم بواسطة الإدارة',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) throw error;
  } catch (err) {
    console.error('Error cancelling subscription:', err);
    throw err;
  }
}

export async function adminExtendSubscription(userId: string, days: number): Promise<void> {
  if (!hasSupabaseKeys) return;
  try {
    const { data: sub, error: subErr } = await supabase
      .from('user_subscriptions')
      .select('id, ends_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subErr || !sub) throw new Error('لا يوجد اشتراك متاح لتمديده.');

    const newEndsAt = new Date(sub.ends_at);
    newEndsAt.setDate(newEndsAt.getDate() + days);

    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        ends_at: newEndsAt.toISOString(),
        status: 'active', // Extend re-activates if expired
        notes: `تم تمديد فترات الباقة العقارية بمقدار ${days} يوم بواسطة الإدارة.`,
        updated_at: new Date().toISOString()
      })
      .eq('id', sub.id);

    if (error) throw error;
  } catch (err) {
    console.error('Error extending subscription:', err);
    throw err;
  }
}

export async function adminMarkSubscriptionExpired(userId: string): Promise<void> {
  if (!hasSupabaseKeys) return;
  try {
    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'expired',
        notes: 'تم إنهاء الصلاحية يدويًا بطلب من الإدارة.',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) throw error;
  } catch (err) {
    console.error('Error marking expired:', err);
    throw err;
  }
}

export async function adminUpdatePlan(planId: string, updates: Partial<SubscriptionPlan>): Promise<void> {
  if (!hasSupabaseKeys) {
    const plans = loadLocalPlans();
    const idx = plans.findIndex(p => p.id === planId);
    if (idx !== -1) {
      plans[idx] = {
        ...plans[idx],
        ...updates,
        updated_at: new Date().toISOString()
      };
      localStorage.setItem('dynamic_subscription_plans', JSON.stringify(plans));
    }
    return;
  }
  try {
    const { error } = await supabase
      .from('subscription_plans')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', planId);

    if (error) throw error;
  } catch (err) {
    console.error('Error updating plan:', err);
    throw err;
  }
}

export async function adminCreatePlan(plan: Omit<SubscriptionPlan, "id" | "created_at">): Promise<SubscriptionPlan> {
  const newId = `plan-${Math.random().toString(36).substr(2, 9)}`;
  const createdPlan: SubscriptionPlan = {
    ...plan,
    id: newId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (!hasSupabaseKeys) {
    const plans = loadLocalPlans();
    plans.push(createdPlan);
    localStorage.setItem('dynamic_subscription_plans', JSON.stringify(plans));
    return createdPlan;
  }

  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .insert({
        ...plan,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data as SubscriptionPlan;
  } catch (err) {
    console.error('Error creating plan:', err);
    throw err;
  }
}

export async function adminDeletePlan(planId: string): Promise<void> {
  if (!hasSupabaseKeys) {
    const plans = loadLocalPlans();
    const filtered = plans.filter(p => p.id !== planId);
    localStorage.setItem('dynamic_subscription_plans', JSON.stringify(filtered));
    return;
  }

  try {
    const { error } = await supabase
      .from('subscription_plans')
      .delete()
      .eq('id', planId);

    if (error) throw error;
  } catch (err) {
    console.error('Error deleting plan:', err);
    throw err;
  }
}

export async function adminCopyPlan(planId: string): Promise<SubscriptionPlan> {
  let targetPlan: SubscriptionPlan | null = null;
  if (!hasSupabaseKeys) {
    const plans = loadLocalPlans();
    const match = plans.find(p => p.id === planId);
    if (!match) throw new Error('باقة غير متوفرة للتكرار');
    targetPlan = match;
  } else {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .maybeSingle();
      
    if (error || !data) throw new Error('باقة غير متوفرة للتكرار');
    targetPlan = data as SubscriptionPlan;
  }

  const copied: Omit<SubscriptionPlan, "id" | "created_at"> = {
    code: `${targetPlan.code}_copy_${Math.random().toString(36).substr(2, 3)}`,
    name: `${targetPlan.name} (نسخة)`,
    description: targetPlan.description,
    price_sar: targetPlan.price_sar,
    duration_days: targetPlan.duration_days,
    daily_calculation_limit: targetPlan.daily_calculation_limit,
    is_active: false, // Start disabled by default for copying safety
    sort_order: (targetPlan.sort_order || 0) + 1,
    features: targetPlan.features || [],
    badge_text: targetPlan.badge_text,
    badge_color: targetPlan.badge_color,
    card_color: targetPlan.card_color,
    is_free_plan: !!targetPlan.is_free_plan
  };

  return adminCreatePlan(copied);
}

// -------------------------------------------------------------
// Activation Requests functions (طلبات التفعيل)
// -------------------------------------------------------------

export interface ActivationRequest {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  user_email?: string;
  user_name?: string;
  plan_name?: string;
  plan_code?: string;
}

export async function recordActivationRequest(userId: string, planId: string): Promise<any> {
  const newRequest = {
    user_id: userId,
    plan_id: planId,
    status: 'pending' as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (!hasSupabaseKeys) {
    // Save to localStorage
    let requests: any[] = [];
    try {
      const stored = localStorage.getItem('dynamic_activation_requests');
      if (stored) requests = JSON.parse(stored);
    } catch {}
    
    const requestWithId = {
      ...newRequest,
      id: `act-${Math.random().toString(36).substr(2, 9)}`
    };
    requests.push(requestWithId);
    localStorage.setItem('dynamic_activation_requests', JSON.stringify(requests));
    return requestWithId;
  }

  try {
    const { data, error } = await supabase
      .from('activation_requests')
      .insert(newRequest)
      .select()
      .single();

    if (error) {
      console.error('Error inserting activation request:', error);
      throw error;
    }
    return data;
  } catch (err) {
    console.error('Exception recording activation request:', err);
    throw err;
  }
}

export async function adminListActivationRequests(): Promise<ActivationRequest[]> {
  if (!hasSupabaseKeys) {
    let requests: any[] = [];
    try {
      const stored = localStorage.getItem('dynamic_activation_requests');
      if (stored) requests = JSON.parse(stored);
    } catch {}

    const plans = loadLocalPlans();
    
    // Fallback users for mapping inside mockup
    const trialSubscribers = [
      { user_id: 'user-mock-1', email: 'ahmad@example.com', full_name: 'أحمد الحربي' },
      { user_id: 'user-mock-2', email: 'khaled@example.com', full_name: 'خالد المطيري' },
      { user_id: 'user-mock-3', email: 'sara@example.com', full_name: 'سارة العتيبي' }
    ];

    return requests.map(r => {
      const u = r.user_id ? trialSubscribers.find(usr => usr.user_id === r.user_id) : null;
      const p = plans.find(pl => pl.id === r.plan_id);
      return {
        ...r,
        user_email: u?.email || 'user@example.com',
        user_name: u?.full_name || 'شريك مجهول',
        plan_name: p?.name || 'باقة مجهولة',
        plan_code: p?.code || 'unknown'
      };
    });
  }

  try {
    const { data: requests, error: reqErr } = await supabase
      .from('activation_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (reqErr) throw reqErr;

    // Get profiles and plans to enrich
    const { data: profiles } = await supabase.from('user_billing_profiles').select('*');
    const plans = await getSubscriptionPlans();

    return (requests || []).map(r => {
      const prof = profiles?.find(p => p.user_id === r.user_id);
      const plan = plans.find(p => p.id === r.plan_id);
      return {
        ...r,
        user_email: prof?.email || 'غير متوفر',
        user_name: prof?.full_name || 'غير متوفر',
        plan_name: plan?.name || 'باقة غير معروفة',
        plan_code: plan?.code || 'unknown'
      };
    });
  } catch (err) {
    console.error('Error listing activation requests:', err);
    return [];
  }
}

export async function adminApproveActivationRequest(requestId: string): Promise<void> {
  let requestObj: ActivationRequest | null = null;
  
  if (!hasSupabaseKeys) {
    let requests: any[] = [];
    try {
      const stored = localStorage.getItem('dynamic_activation_requests');
      if (stored) requests = JSON.parse(stored);
    } catch {}

    const idx = requests.findIndex(r => r.id === requestId);
    if (idx === -1) throw new Error('طلب التفعيل غير متاح');
    
    requests[idx].status = 'approved';
    requests[idx].updated_at = new Date().toISOString();
    localStorage.setItem('dynamic_activation_requests', JSON.stringify(requests));
    
    requestObj = requests[idx];
    
    // Mock user sub activation locally
    const plans = loadLocalPlans();
    const plan = plans.find(p => p.id === requestObj?.plan_id);
    console.log(`[Local Sync] Approved subscription for ${requestObj?.user_id} with plan ${plan?.code}`);
    return;
  }

  try {
    // Get request details
    const { data: req, error: fetchErr } = await supabase
      .from('activation_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchErr || !req) throw new Error('الطلب غير متوفر.');

    // Update Request status to approved
    const { error: updateErr } = await supabase
      .from('activation_requests')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', requestId);

    if (updateErr) throw updateErr;

    // Fetch plan details to get code
    const { data: plan, error: planErr } = await supabase
      .from('subscription_plans')
      .select('code, duration_days')
      .eq('id', req.plan_id)
      .single();

    if (planErr || !plan) throw new Error('خطة الاشتراك المرتبطة بالطلب غير موجودة.');

    // Activate the subscription
    await adminManualActivateSubscription(req.user_id, plan.code, plan.duration_days);
  } catch (err) {
    console.error('Error approving activation request:', err);
    throw err;
  }
}

export async function adminRejectActivationRequest(requestId: string): Promise<void> {
  if (!hasSupabaseKeys) {
    let requests: any[] = [];
    try {
      const stored = localStorage.getItem('dynamic_activation_requests');
      if (stored) requests = JSON.parse(stored);
    } catch {}

    const idx = requests.findIndex(r => r.id === requestId);
    if (idx !== -1) {
      requests[idx].status = 'rejected';
      requests[idx].updated_at = new Date().toISOString();
      localStorage.setItem('dynamic_activation_requests', JSON.stringify(requests));
    }
    return;
  }

  try {
    const { error } = await supabase
      .from('activation_requests')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', requestId);

    if (error) throw error;
  } catch (err) {
    console.error('Error rejecting activation request:', err);
    throw err;
  }
}

export async function adminDeleteActivationRequest(requestId: string): Promise<void> {
  if (!hasSupabaseKeys) {
    let requests: any[] = [];
    try {
      const stored = localStorage.getItem('dynamic_activation_requests');
      if (stored) requests = JSON.parse(stored);
    } catch {}

    const filtered = requests.filter(r => r.id !== requestId);
    localStorage.setItem('dynamic_activation_requests', JSON.stringify(filtered));
    return;
  }

  try {
    const { error } = await supabase
      .from('activation_requests')
      .delete()
      .eq('id', requestId);

    if (error) throw error;
  } catch (err) {
    console.error('Error deleting activation request:', err);
    throw err;
  }
}

export interface SaveSubscriptionParams {
  userId: string;
  planId: string | null;
  status: 'trialing' | 'active' | 'expired' | 'cancelled' | 'past_due';
  startedAt: string;
  endsAt: string;
  source: 'trial' | 'admin_free' | 'manual_paid' | 'payment' | 'system';
  customDailyLimit: number | null;
  notes: string | null;
}

export async function adminSaveUserSubscription(params: SaveSubscriptionParams): Promise<void> {
  if (!hasSupabaseKeys) return;

  try {
    // Check if user has any subscription row
    const { data: existingSub } = await supabase
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', params.userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const rowData = {
      user_id: params.userId,
      plan_id: params.planId,
      status: params.status,
      started_at: params.startedAt,
      ends_at: params.endsAt,
      source: params.source,
      custom_daily_limit: params.customDailyLimit,
      notes: params.notes,
      updated_at: new Date().toISOString()
    };

    if (existingSub) {
      const { error } = await supabase
        .from('user_subscriptions')
        .update(rowData)
        .eq('id', existingSub.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('user_subscriptions')
        .insert({
          ...rowData,
          created_at: new Date().toISOString()
        });
      if (error) throw error;
    }
  } catch (err) {
    console.error('Error saving user subscription:', err);
    throw err;
  }
}

export async function adminUpdatePhoneNumber(userId: string, newPhone: string): Promise<void> {
  const normalized = normalizePhone(newPhone);
  
  // Enforce unique check
  const isUnique = await testBillingProfileUniquePhone(normalized, userId);
  if (!isUnique) {
    throw new Error('رقم الجوال مستخدم مسبقًا من قبل مستخدم آخر. يرجى إدخال رقم فريد.');
  }

  if (!hasSupabaseKeys) return;

  try {
    // 1. Update user_billing_profiles
    const { error: profileError } = await supabase
      .from('user_billing_profiles')
      .update({ 
        phone_number: normalized || null, 
        normalized_phone: normalized || null, 
        updated_at: new Date().toISOString() 
      })
      .eq('user_id', userId);

    if (profileError) throw profileError;

    // 2. Also update app_users table
    const { error: userError } = await supabase
      .from('app_users')
      .update({ phone: normalized, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (userError) {
      console.warn('Tried to update phone in app_users, but failed:', userError);
    }
  } catch (err) {
    console.error('Failed to update phone number:', err);
    throw err;
  }
}

// 7. Seeding & idempotent trial plan assurance
export async function ensureTrialPlanExists(): Promise<SubscriptionPlan | null> {
  if (!hasSupabaseKeys) return null;
  try {
    const { data: existing, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('code', 'trial')
      .maybeSingle();

    if (error) {
      console.error('Error fetching trial plan:', error);
      return null;
    }

    if (existing) {
      const updates: Partial<SubscriptionPlan> = {};
      if (existing.name !== 'باقة مجانية') updates.name = 'باقة مجانية';
      if (existing.price_sar === null || existing.price_sar === undefined || existing.price_sar !== 0) {
        updates.price_sar = 0;
      }
      if (existing.duration_days === null || existing.duration_days === undefined) {
        updates.duration_days = 30;
      }
      if (existing.is_active !== true) updates.is_active = true;

      if (Object.keys(updates).length > 0) {
        const { data: updated, error: updateErr } = await supabase
          .from('subscription_plans')
          .update(updates)
          .eq('id', existing.id)
          .select()
          .single();
        if (updateErr) {
          console.error('Error updating trial plan:', updateErr);
          return existing;
        }
        return updated as SubscriptionPlan;
      }
      return existing as SubscriptionPlan;
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from('subscription_plans')
        .insert({
          code: 'trial',
          name: 'باقة مجانية',
          description: 'باقة مجانية - صلاحية 30 يوماً مع سقف حسابات يومي مرن',
          price_sar: 0,
          duration_days: 30,
          daily_calculation_limit: null,
          is_active: true,
          sort_order: 0,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (insertErr) {
        console.error('Error inserting trial plan:', insertErr);
        return null;
      }
      return inserted as SubscriptionPlan;
    }
  } catch (err) {
    console.error('Exception in ensureTrialPlanExists:', err);
    return null;
  }
}

// 8. Safe backfill for existing users who do not have any active/trialing subscriptions
export async function adminBackfillFreePlanForExistingUsers(): Promise<{ success: boolean; processed: number; added: number; error?: string }> {
  if (!hasSupabaseKeys) {
    return { success: false, processed: 0, added: 0, error: 'الاتصال بقاعدة البيانات غير متاح في بيئة المحاكاة.' };
  }

  try {
    const trialPlan = await ensureTrialPlanExists();
    if (!trialPlan) {
      return { success: false, processed: 0, added: 0, error: 'الباقة المجانية ذات الكود trial غير متوفرة ولا يمكن إنشاؤها.' };
    }

    const { data: users, error: usersErr } = await supabase
      .from('app_users')
      .select('id, email, full_name');

    if (usersErr || !users) {
      throw new Error(`تعذر تحميل المستخدمين: ${usersErr?.message}`);
    }

    const { data: existingSubs, error: subsErr } = await supabase
      .from('user_subscriptions')
      .select('user_id, status, ends_at, source');

    if (subsErr) {
      throw new Error(`تعذر تحميل الاشتراكات: ${subsErr?.message}`);
    }

    let addedCount = 0;
    const now = new Date();

    for (const u of users) {
      const userSubs = (existingSubs || []).filter(sub => sub.user_id === u.id);
      
      const hasActiveSub = userSubs.some(sub => 
        (sub.status === 'active' || sub.status === 'trialing') &&
        new Date(sub.ends_at) >= now
      );

      if (hasActiveSub) {
        continue; // Skip users with an active/trialing non-expired subscription
      }

      // Check if user has an expired/cancelled trial subscription already, to avoid repeating backfills if duplicate triggers
      const hasHadTrial = userSubs.some(sub => sub.source === 'trial');
      if (hasHadTrial) {
        continue; // Already backfilled or registered with a trial plan, don't overwrite/duplicate
      }

      const startDate = new Date();
      const endsDate = new Date();
      endsDate.setDate(endsDate.getDate() + (trialPlan.duration_days || 30));

      const { error: insertErr } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: u.id,
          plan_id: trialPlan.id,
          status: 'trialing',
          source: 'trial',
          started_at: startDate.toISOString(),
          ends_at: endsDate.toISOString(),
          notes: 'Auto-created free plan for existing user',
          custom_daily_limit: null,
          created_at: startDate.toISOString(),
          updated_at: startDate.toISOString()
        });

      if (insertErr) {
        console.error(`Failed to insert backfill subscription for user ${u.id}:`, insertErr);
        continue;
      }

      addedCount++;
    }

    return { success: true, processed: users.length, added: addedCount };
  } catch (err: any) {
    console.error('Error during backfill existing users:', err);
    return { success: false, processed: 0, added: 0, error: err.message || String(err) };
  }
}

