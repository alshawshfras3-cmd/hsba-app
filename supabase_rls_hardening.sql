-- =========================================================================
-- HESBA / حسبة — Supabase Security & RLS Hardening Script
-- File: supabase_rls_hardening.sql
-- Description: Drops permissive/dangerous security policies and secures all tables 
--              with strong Row Level Security (RLS) rules using the public.is_admin() helper.
-- =========================================================================

BEGIN;

-- -------------------------------------------------------------------------
-- 1. TABLE: public.app_users (CRITICAL HARDENING)
-- -------------------------------------------------------------------------
-- Problem: Historical scripts had "allow_select", "allow_update", "allow_delete" set to true, 
-- which exposed user emails, usernames, and phones, and allowed anyone to update/delete profiles.

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Clean up permissive policies
DROP POLICY IF EXISTS "allow_select" ON public.app_users;
DROP POLICY IF EXISTS "allow_insert" ON public.app_users;
DROP POLICY IF EXISTS "allow_update" ON public.app_users;
DROP POLICY IF EXISTS "allow_delete" ON public.app_users;
DROP POLICY IF EXISTS "Users can only read and write their own data" ON public.app_users;

-- Create hardened, secure policies
CREATE POLICY select_app_users ON public.app_users
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin(auth.uid()));

CREATE POLICY insert_app_users ON public.app_users
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id OR public.is_admin(auth.uid()));

CREATE POLICY update_app_users ON public.app_users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = id OR public.is_admin(auth.uid()));

-- Only administrators should be allowed to delete records directly
CREATE POLICY delete_app_users ON public.app_users
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));


-- -------------------------------------------------------------------------
-- 2. TABLE: public.admin_settings (CRITICAL HARDENING)
-- -------------------------------------------------------------------------
-- Problem: This table stored plain credentials for backup admins and was entirely open (USING (true)).

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Clean up permissive policies
DROP POLICY IF EXISTS "allow_select" ON public.admin_settings;
DROP POLICY IF EXISTS "allow_update" ON public.admin_settings;
DROP POLICY IF EXISTS "allow_insert" ON public.admin_settings;

-- Restrict all access strictly to system administrators
CREATE POLICY secure_select_admin_settings ON public.admin_settings
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY secure_write_admin_settings ON public.admin_settings
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));


-- -------------------------------------------------------------------------
-- 3. TABLE: public.activation_requests (LOOPHOLE SECURING)
-- -------------------------------------------------------------------------
-- Problem: Standard users had FOR ALL permission allowing them to modify request status to 'approved' themselves.

ALTER TABLE public.activation_requests ENABLE ROW LEVEL SECURITY;

-- Clean up permissive policies
DROP POLICY IF EXISTS "Users can manage their own requests" ON public.activation_requests;
DROP POLICY IF EXISTS "select_own_requests" ON public.activation_requests;
DROP POLICY IF EXISTS "insert_own_requests" ON public.activation_requests;
DROP POLICY IF EXISTS "admin_all_requests" ON public.activation_requests;

-- Create secure policies
-- Users can read their own activation requests
CREATE POLICY select_own_activation_requests ON public.activation_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- Users can only insert their own new requests with 'pending' status
CREATE POLICY insert_own_activation_requests ON public.activation_requests
  FOR INSERT TO authenticated
  WITH CHECK ((user_id = auth.uid() AND status = 'pending') OR public.is_admin(auth.uid()));

-- Prevent users from updating or deleting payments/activations (admin only)
CREATE POLICY admin_manage_activation_requests ON public.activation_requests
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));


-- -------------------------------------------------------------------------
-- 4. TABLE: public.saved_results (ISOLATION HARDENING)
-- -------------------------------------------------------------------------
-- Ensure standard users are fully isolated and only see/manage their own results, 
-- whilst ensuring system administrators can view the logs or metrics if required.

ALTER TABLE public.saved_results ENABLE ROW LEVEL SECURITY;

-- Clean up old policies
DROP POLICY IF EXISTS "users_select_own" ON public.saved_results;
DROP POLICY IF EXISTS "users_insert_own" ON public.saved_results;
DROP POLICY IF EXISTS "users_delete_own" ON public.saved_results;

-- Create hardened policies
CREATE POLICY select_saved_results ON public.saved_results
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY insert_saved_results ON public.saved_results
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY update_saved_results ON public.saved_results
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY delete_saved_results ON public.saved_results
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));


-- -------------------------------------------------------------------------
-- 5. TABLE: public.user_subscriptions (TAMPER PREVENTION)
-- -------------------------------------------------------------------------
-- Users must never be allowed to modify, update, or cancel their subscriptions directly. 
-- Standard users can only READ their own subscription records, while administrators manage.

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Clean up
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "user_select_own_subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "admin_all_subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.user_subscriptions;

-- Create secure policies
CREATE POLICY select_user_subscriptions ON public.user_subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY admin_manage_user_subscriptions ON public.user_subscriptions
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));


-- -------------------------------------------------------------------------
-- 6. TABLE: public.system_settings (READ ACCESSIBLE / ADMIN EDITABLE)
-- -------------------------------------------------------------------------
-- Essential note: The client code reads configuration constants from public.system_settings 
-- to initialize calculators (DSR, Support tiers, etc.). Public access using (true) for SELECT is required. 
-- Writing and editing must remain strictly locked for system administrators.

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Clean up
DROP POLICY IF EXISTS "Anyone can read system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Only admins can insert system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Only admins can update system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Only admins can delete system settings" ON public.system_settings;

-- Set up policies
CREATE POLICY select_system_settings ON public.system_settings
  FOR SELECT USING (true); -- Publicly readable for dynamic calculations configuration

CREATE POLICY admin_manage_system_settings ON public.system_settings
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));


-- -------------------------------------------------------------------------
-- 7. TABLE: public.subscription_plans (READ ACCESSIBLE / ADMIN EDITABLE)
-- -------------------------------------------------------------------------
-- Subscription plans are publicly visible to allow plans display inside the public checkout page.

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Clean up
DROP POLICY IF EXISTS "Anyone can read active plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "select_active_plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "admin_all_plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Admins can edit subscription plans" ON public.subscription_plans;

-- Set secure policies
CREATE POLICY select_subscription_plans ON public.subscription_plans
  FOR SELECT USING (is_active = true OR public.is_admin(auth.uid()));

CREATE POLICY admin_manage_subscription_plans ON public.subscription_plans
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

COMMIT;
