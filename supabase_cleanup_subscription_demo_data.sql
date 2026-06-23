-- ==========================================
-- HESBA / حسبة — Subscription Clean-up Script
-- File: supabase_cleanup_subscription_demo_data.sql
-- Description: Inspects and cleans up demo, mock, and unlinked subscription data.
-- ==========================================

-- ------------------------------------------
-- STEP 1: INSPECTION (SELECT queries)
-- Run these queries first to verify the state of your data.
-- ------------------------------------------

-- 1.1 View subscriptions flagged as Demo / Trial / Notes with "تجربة"
SELECT id, user_id, status, source, notes, started_at, ends_at
FROM public.user_subscriptions
WHERE 
  source IN ('تجريب النظام', 'demo', 'mock', 'trial', 'system_seed') 
  OR notes LIKE '%تجرب%' 
  OR notes LIKE '%محاك%';

-- 1.2 View billing profiles with example/test emails or names containing test patterns
SELECT id, user_id, full_name, email, phone_number
FROM public.user_billing_profiles
WHERE 
  email LIKE '%example.com%' 
  OR full_name LIKE '%تجرب%' 
  OR full_name LIKE '%محاك%' 
  OR full_name = 'عضو مجهول';

-- 1.3 View activation requests containing trial/test remarks or fields
SELECT id, user_id, phone_number, status, created_at
FROM public.activation_requests
WHERE 
  user_id IN (
    SELECT user_id FROM public.user_billing_profiles WHERE email LIKE '%example.com%'
  ) 
  OR status = 'rejected' AND created_at < NOW() - INTERVAL '30 days';

-- 1.4 View subscriptions with unlinked user IDs (not present in auth.users)
SELECT us.id, us.user_id, us.source, us.notes
FROM public.user_subscriptions us
LEFT JOIN auth.users au ON us.user_id = au.id
WHERE au.id IS NULL;


-- ------------------------------------------
-- STEP 2: SAFE CLEANUP (DELETE queries wrapped in a transaction)
-- Run this block to clean up the demo/mock rows safely.
-- ------------------------------------------

BEGIN;

-- 2.1 Delete billing profiles with example emails or names containing test patterns
DELETE FROM public.user_billing_profiles
WHERE 
  email LIKE '%example.com%' 
  OR full_name LIKE '%تجرب%' 
  OR full_name LIKE '%محاك%' 
  OR full_name = 'عضو مجهول';

-- 2.2 Delete activation requests for demo/example emails or unlinked users
DELETE FROM public.activation_requests
WHERE 
  user_id IN (
    SELECT DISTINCT user_id FROM public.user_billing_profiles WHERE email LIKE '%example.com%'
  )
  OR NOT EXISTS (
    SELECT 1 FROM auth.users au WHERE au.id = public.activation_requests.user_id
  );

-- 2.3 Delete calculation usage for demo/example emails or unlinked users
DELETE FROM public.user_calculation_usage
WHERE 
  user_id IN (
    SELECT DISTINCT user_id FROM public.user_billing_profiles WHERE email LIKE '%example.com%'
  )
  OR NOT EXISTS (
    SELECT 1 FROM auth.users au WHERE au.id = public.user_calculation_usage.user_id
  );

-- 2.4 Delete subscriptions flagged as demo/mock or unlinked from auth.users
DELETE FROM public.user_subscriptions
WHERE 
  source IN ('تجريب النظام', 'demo', 'mock', 'trial', 'system_seed') 
  OR notes LIKE '%تجرب%' 
  OR notes LIKE '%محاك%'
  OR NOT EXISTS (
    SELECT 1 FROM auth.users au WHERE au.id = public.user_subscriptions.user_id
  );

-- COMMIT or ROLLBACK;
-- To execute changes, run COMMIT;
COMMIT;
