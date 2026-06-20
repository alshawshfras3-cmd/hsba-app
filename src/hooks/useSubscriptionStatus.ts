import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getCurrentSubscription, 
  getDailyUsage, 
  incrementDailyUsage, 
  DbSubscription,
  getBillingProfile,
  UserBillingProfile,
  createTrialSubscription
} from '../lib/subscriptionService';
import { hasSupabaseKeys } from '../lib/supabase';

export function useSubscriptionStatus() {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<DbSubscription | null>(null);
  const [billingProfile, setBillingProfile] = useState<UserBillingProfile | null>(null);
  const [usedToday, setUsedToday] = useState(0);

  const loadStatus = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setBillingProfile(null);
      setUsedToday(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let [sub, profile, usage] = await Promise.all([
        getCurrentSubscription(user.id),
        getBillingProfile(user.id),
        getDailyUsage(user.id)
      ]);

      // Dynamic automatic self-healing for any user without any subscription record in Supabase
      if (!sub && hasSupabaseKeys) {
        try {
          console.log(`[SUBSCRIPTION SELF-HEAL] No subscription found for user ${user.id}. Creating trial plan default...`);
          const newSub = await createTrialSubscription(user.id);
          if (newSub) {
            sub = newSub;
          }
        } catch (healErr) {
          console.error('[SUBSCRIPTION SELF-HEAL] Failed to auto-create trial plan:', healErr);
        }
      }

      setSubscription(sub);
      setBillingProfile(profile);
      setUsedToday(usage);
    } catch (err) {
      console.error('Error loading subscription status hook:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Calculations
  const isTrialing = subscription?.status === 'trialing';
  const isActive = subscription?.status === 'active';
  const isExpired = subscription?.status === 'expired' || (subscription ? new Date(subscription.ends_at) < new Date() : false);
  const isCancelled = subscription?.status === 'cancelled';

  // Days remaining calculation
  let daysRemaining = 0;
  if (subscription?.ends_at) {
    const end = new Date(subscription.ends_at).getTime();
    const now = Date.now();
    daysRemaining = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
  }

  const dailyLimit = subscription?.custom_daily_limit !== undefined && subscription?.custom_daily_limit !== null
    ? subscription.custom_daily_limit 
    : (subscription?.plan?.daily_calculation_limit ?? null);
  const remainingToday = dailyLimit !== null ? Math.max(0, dailyLimit - usedToday) : null;

  // Decision Logic: Admin can always calculate, others need active status and daily limits
  let canCalculate = false;
  let lockReason: 'none' | 'expired_trial' | 'daily_limit_reached' | 'no_subscription' | 'not_loaded' | 'cancelled' = 'none';

  if (loading) {
    canCalculate = false;
    lockReason = 'not_loaded';
  } else if (isAdmin) {
    canCalculate = true;
    lockReason = 'none';
  } else if (!subscription) {
    canCalculate = false;
    lockReason = 'no_subscription';
  } else if (isExpired) {
    canCalculate = false;
    lockReason = 'expired_trial';
  } else if (isCancelled) {
    canCalculate = false;
    lockReason = 'cancelled';
  } else if (dailyLimit !== null && usedToday >= dailyLimit) {
    canCalculate = false;
    lockReason = 'daily_limit_reached';
  } else {
    canCalculate = true;
    lockReason = 'none';
  }

  const triggerIncrement = async (): Promise<boolean> => {
    if (!user || isAdmin) return true; // Admins don't count towards limits or update usage database
    
    try {
      const result = await incrementDailyUsage(user.id, dailyLimit);
      if (result.success) {
        setUsedToday(result.count);
        return true;
      } else {
        return false;
      }
    } catch (err) {
      console.error('Failed to trigger increment usage:', err);
      return false;
    }
  };

  return {
    loading,
    subscription,
    billingProfile,
    isTrialing,
    isActive,
    isExpired,
    isCancelled,
    daysRemaining,
    dailyLimit,
    usedToday,
    remainingToday,
    canCalculate,
    lockReason,
    incrementUsage: triggerIncrement,
    refresh: loadStatus
  };
}
