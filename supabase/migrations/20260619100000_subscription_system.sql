-- DB MIGRATION: Phase 1 — Subscription Core, Trial Gate, and Admin Plans

-- 1. Create subscription_plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  price_sar numeric(10,2) NOT NULL,
  duration_days integer NOT NULL,
  daily_calculation_limit integer,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Create user_subscriptions table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'expired', 'cancelled', 'past_due')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  cancelled_at timestamptz,
  source text NOT NULL DEFAULT 'system',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create user_calculation_usage table
CREATE TABLE IF NOT EXISTS public.user_calculation_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  usage_date date NOT NULL DEFAULT current_date,
  calculation_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_usage_date UNIQUE (user_id, usage_date)
);

-- 4. Create user_billing_profiles table
CREATE TABLE IF NOT EXISTS public.user_billing_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  phone_number text NOT NULL UNIQUE,
  phone_locked boolean NOT NULL DEFAULT true,
  full_name text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Create payment_transactions table
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subscription_id uuid REFERENCES public.user_subscriptions(id) ON DELETE SET NULL,
  plan_id uuid REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  provider text,
  provider_payment_id text,
  amount_sar numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'SAR',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_user_subs_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subs_ends_at ON public.user_subscriptions(ends_at);
CREATE INDEX IF NOT EXISTS idx_calc_usage_user_date ON public.user_calculation_usage(user_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_billing_profiles_user ON public.user_billing_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_profiles_phone ON public.user_billing_profiles(phone_number);
CREATE INDEX IF NOT EXISTS idx_pay_trans_user ON public.payment_transactions(user_id);

-- Enable RLS on all subscription tables
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_calculation_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_billing_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Create Policies using public.is_admin helper pattern
-- 1. Policies for subscription_plans
CREATE POLICY select_active_plans ON public.subscription_plans 
  FOR SELECT TO authenticated 
  USING (is_active = true OR public.is_admin(auth.uid()));

CREATE POLICY admin_all_plans ON public.subscription_plans 
  FOR ALL TO authenticated 
  USING (public.is_admin(auth.uid())) 
  WITH CHECK (public.is_admin(auth.uid()));

-- 2. Policies for user_subscriptions
CREATE POLICY user_select_own_subscriptions ON public.user_subscriptions 
  FOR SELECT TO authenticated 
  USING (user_id = auth.uid());

CREATE POLICY admin_all_subscriptions ON public.user_subscriptions 
  FOR ALL TO authenticated 
  USING (public.is_admin(auth.uid())) 
  WITH CHECK (public.is_admin(auth.uid()));

-- 3. Policies for user_calculation_usage
CREATE POLICY user_select_own_usage ON public.user_calculation_usage 
  FOR SELECT TO authenticated 
  USING (user_id = auth.uid());

CREATE POLICY user_insert_own_usage ON public.user_calculation_usage 
  FOR INSERT TO authenticated 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY user_update_own_usage ON public.user_calculation_usage 
  FOR UPDATE TO authenticated 
  USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY admin_all_usage ON public.user_calculation_usage 
  FOR ALL TO authenticated 
  USING (public.is_admin(auth.uid())) 
  WITH CHECK (public.is_admin(auth.uid()));

-- 4. Policies for user_billing_profiles
CREATE POLICY user_select_own_profile ON public.user_billing_profiles 
  FOR SELECT TO authenticated 
  USING (user_id = auth.uid());

CREATE POLICY user_insert_own_profile ON public.user_billing_profiles 
  FOR INSERT TO authenticated 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY user_update_own_profile ON public.user_billing_profiles 
  FOR UPDATE TO authenticated 
  USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY admin_all_billing_profiles ON public.user_billing_profiles 
  FOR ALL TO authenticated 
  USING (public.is_admin(auth.uid())) 
  WITH CHECK (public.is_admin(auth.uid()));

-- 5. Policies for payment_transactions
CREATE POLICY user_select_own_transactions ON public.payment_transactions 
  FOR SELECT TO authenticated 
  USING (user_id = auth.uid());

CREATE POLICY admin_all_transactions ON public.payment_transactions 
  FOR ALL TO authenticated 
  USING (public.is_admin(auth.uid())) 
  WITH CHECK (public.is_admin(auth.uid()));

-- Seed Default Subscription Plans
INSERT INTO public.subscription_plans (code, name, description, price_sar, duration_days, daily_calculation_limit, is_active, sort_order)
VALUES 
  ('trial', 'تجربة مجانية', 'فترة تجريبية لمدة 7 أيام - حد 10 عمليات يومية', 0.00, 7, 10, true, 0),
  ('monthly', 'اشتراك شهري', 'اشتراك شهري - وصول كامل غير محدود', 24.99, 30, null, true, 1),
  ('six_months', 'اشتراك 6 أشهر', 'اشتراك نصف سنوي - وفر أكثر مع الوصول الكامل', 140.00, 180, null, true, 2)
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_sar = EXCLUDED.price_sar,
  duration_days = EXCLUDED.duration_days,
  daily_calculation_limit = EXCLUDED.daily_calculation_limit;
