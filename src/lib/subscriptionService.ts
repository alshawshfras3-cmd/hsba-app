import { supabase, hasSupabaseKeys } from './supabase';

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
  phone_number: string;
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
      notes: 'محاكاة التجربة المجانية',
      custom_daily_limit: null,
      plan: {
        id: 'mock-plan-trial',
        code: 'trial',
        name: 'تجربة مجانية',
        description: 'فترة تجريبية مجانية',
        price_sar: 0,
        duration_days: 7,
        daily_calculation_limit: 10,
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
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching subscription:', error);
      return null;
    }

    if (!data) return null;

    // Check if subscription has naturally expired (if client requests it while status hasn't been updated in background)
    const isExpired = new Date(data.ends_at) < new Date();
    if (isExpired && (data.status === 'trialing' || data.status === 'active')) {
      const updatedStatus = 'expired';
      // Auto-update to expired status in DB
      await supabase
        .from('user_subscriptions')
        .update({ status: updatedStatus, updated_at: new Date().toISOString() })
        .eq('id', data.id);
      
      data.status = updatedStatus;
    }

    return data as DbSubscription;
  } catch (err) {
    console.error('Failed to get user subscription:', err);
    return null;
  }
}

// 2. Fetch active plans
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  if (!hasSupabaseKeys) {
    return [
      {
        id: 'mock-plan-trial',
        code: 'trial',
        name: 'تجربة مجانية',
        description: 'فترة تجريبية لمدة 7 أيام - حد 10 عمليات يومية',
        price_sar: 0,
        duration_days: 7,
        daily_calculation_limit: 10,
        is_active: true,
        sort_order: 0,
        created_at: new Date().toISOString()
      },
      {
        id: 'mock-plan-monthly',
        code: 'monthly',
        name: 'اشتراك شهري',
        description: 'اشتراك شهري - ليس هناك حدود حسابية',
        price_sar: 24.99,
        duration_days: 30,
        daily_calculation_limit: null,
        is_active: true,
        sort_order: 1,
        created_at: new Date().toISOString()
      },
      {
        id: 'mock-plan-6months',
        code: 'six_months',
        name: 'اشتراك 6 أشهر',
        description: 'اشتراك نصف سنوي - أفضل توفير وأسرع معالجة',
        price_sar: 140.00,
        duration_days: 180,
        daily_calculation_limit: null,
        is_active: true,
        sort_order: 2,
        created_at: new Date().toISOString()
      }
    ];
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

    return data as SubscriptionPlan[];
  } catch (err) {
    console.error('Failed to get plans:', err);
    return [];
  }
}

// 3. Create Trial Subscription for new user
export async function createTrialSubscription(userId: string): Promise<DbSubscription | null> {
  if (!hasSupabaseKeys) {
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + 7); // 7 days trials
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
        duration_days: 7,
        daily_calculation_limit: 10,
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
  if (!hasSupabaseKeys) {
    return {
      id: 'mock-created-billing',
      user_id: profile.user_id,
      phone_number: profile.phone_number,
      phone_locked: true,
      full_name: profile.full_name || null,
      email: profile.email || null
    };
  }

  const { data, error } = await supabase
    .from('user_billing_profiles')
    .insert({
      user_id: profile.user_id,
      phone_number: profile.phone_number,
      phone_locked: true,
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

export async function testBillingProfileUniquePhone(phone: string): Promise<boolean> {
  if (!hasSupabaseKeys) return true;
  try {
    const { data, error } = await supabase
      .from('user_billing_profiles')
      .select('id')
      .eq('phone_number', phone)
      .limit(1)
      .maybeSingle();

    if (error) return true;
    return !data; // Return true if no profile has this phone
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
  if (!hasSupabaseKeys) return;
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
  if (!hasSupabaseKeys) return;

  try {
    // 1. Update user_billing_profiles
    const { error: profileError } = await supabase
      .from('user_billing_profiles')
      .update({ phone_number: newPhone, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (profileError) throw profileError;

    // 2. Also update app_users table
    const { error: userError } = await supabase
      .from('app_users')
      .update({ phone: newPhone, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (userError) {
      console.warn('Tried to update phone in app_users, but failed:', userError);
    }
  } catch (err) {
    console.error('Failed to update phone number:', err);
    throw err;
  }
}
