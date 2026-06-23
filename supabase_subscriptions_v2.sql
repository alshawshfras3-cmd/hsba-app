-- =========================================================================
-- حسبة - تهيئة وإدارة نظام الاشتراكات والباقات الحقيقي السحابي (Supabase)
-- المرحلة الأولى: قواعد البيانات وسياسات الأمان RLS
-- =========================================================================

-- 1. جدول باقات الاشتراكات (subscription_plans)
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  price_sar numeric DEFAULT 0,
  duration_days integer NOT NULL,
  daily_calculation_limit integer,
  saved_results_limit integer,
  can_save_results boolean DEFAULT true,
  can_export_results boolean DEFAULT false,
  can_view_advanced_details boolean DEFAULT false,
  is_default_on_signup boolean DEFAULT false,
  is_free_plan boolean DEFAULT false,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  badge_text text,
  badge_color text,
  card_color text,
  features text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ضمان وجود جميع الأعمدة الإضافية في جدول الباقات (للترقية الآمنة إذا كان الجدول موجوداً مسبقاً)
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS daily_calculation_limit integer;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS saved_results_limit integer;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS can_save_results boolean DEFAULT true;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS can_export_results boolean DEFAULT false;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS can_view_advanced_details boolean DEFAULT false;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS is_default_on_signup boolean DEFAULT false;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS is_free_plan boolean DEFAULT false;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS badge_text text;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS badge_color text;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS card_color text;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS features text[] DEFAULT '{}';
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. جدول اشتراكات المستخدمين الحاليين (user_subscriptions)
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'trialing', -- trialing, active, expired, suspended, cancelled, past_due
  started_at timestamptz DEFAULT now(),
  ends_at timestamptz NOT NULL,
  cancelled_at timestamptz,
  source text DEFAULT 'signup_default', -- signup_default, admin, manual, system
  notes text,
  custom_daily_limit integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ترقية آمنة لهيكل جدول اشتراكات المستخدمين
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.subscription_plans(id) ON DELETE SET NULL;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'trialing';
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS started_at timestamptz DEFAULT now();
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS ends_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS source text DEFAULT 'signup_default';
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS custom_daily_limit integer;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- تحديث قيد التحقق لحالة الاشتراك (CHECK constraint)
ALTER TABLE public.user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_status_check;
ALTER TABLE public.user_subscriptions ADD CONSTRAINT user_subscriptions_status_check CHECK (status IN ('trialing', 'active', 'expired', 'suspended', 'cancelled', 'past_due'));

-- 3. جدول عدادات الاستخدام اليومية (user_calculation_usage)
CREATE TABLE IF NOT EXISTS public.user_calculation_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  usage_date date NOT NULL,
  calculation_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, usage_date)
);

-- 4. جدول طلبات التفعيل اليدويّة والترقية (activation_requests)
CREATE TABLE IF NOT EXISTS public.activation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  status text DEFAULT 'pending', -- pending, approved, rejected
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تفعيل سياسات حماية الجداول (Row Level Security - RLS)
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_calculation_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activation_requests ENABLE ROW LEVEL SECURITY;

-- سياسات حماية الباقات (subscription_plans)
DROP POLICY IF EXISTS "Anyone can read active plans" ON public.subscription_plans;
CREATE POLICY "Anyone can read active plans" ON public.subscription_plans 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can edit subscription plans" ON public.subscription_plans;
CREATE POLICY "Admins can edit subscription plans" ON public.subscription_plans 
  FOR ALL USING (public.is_admin(auth.uid()));

-- سياسات حماية اشتراكات المستخدمين (user_subscriptions)
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.user_subscriptions;
CREATE POLICY "Users can view their own subscription" ON public.user_subscriptions 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.user_subscriptions;
CREATE POLICY "Admins can manage all subscriptions" ON public.user_subscriptions 
  FOR ALL USING (public.is_admin(auth.uid()));

-- سياسات حماية عدادات الاستخدام (user_calculation_usage)
DROP POLICY IF EXISTS "Users can view and edit their own usage" ON public.user_calculation_usage;
CREATE POLICY "Users can view and edit their own usage" ON public.user_calculation_usage 
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all usages" ON public.user_calculation_usage;
CREATE POLICY "Admins can view all usages" ON public.user_calculation_usage 
  FOR SELECT USING (public.is_admin(auth.uid()));

-- سياسات حماية طلبات الاشتراك (activation_requests)
DROP POLICY IF EXISTS "Users can manage their own requests" ON public.activation_requests;
CREATE POLICY "Users can manage their own requests" ON public.activation_requests 
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all requests" ON public.activation_requests;
CREATE POLICY "Admins can manage all requests" ON public.activation_requests 
  FOR ALL USING (public.is_admin(auth.uid()));

-- 5. تعبئة الباقات والخطط الافتراضية
-- إدخال خطة مجانية تجريبية افتراضية للتسجيل البدئي
INSERT INTO public.subscription_plans (
  code, name, description, price_sar, duration_days, daily_calculation_limit, 
  saved_results_limit, is_default_on_signup, is_free_plan, is_active, sort_order, 
  badge_text, features, can_save_results, can_export_results, can_view_advanced_details
) VALUES (
  'free', 
  'الباقة المجانية', 
  'باقة مجانية محدودة للاستخدام الأساسي.',
  0, 
  7, 
  5, 
  2, 
  true, 
  true, 
  true, 
  0, 
  'الباقة الافتراضية', 
  ARRAY['ولوج كامل لحاسبة حسبة المالية', 'مقارنة عروض التمويل الأساسية', 'سقف 5 حسبات تمويلية يومياً', 'حفظ لنتيجتين من الحسبة'],
  true,
  false,
  false
) ON CONFLICT (code) DO NOTHING;

-- إدخال الباقة الاحترافية
INSERT INTO public.subscription_plans (
  code, name, description, price_sar, duration_days, daily_calculation_limit, 
  saved_results_limit, is_default_on_signup, is_free_plan, is_active, sort_order, 
  badge_text, features, can_save_results, can_export_results, can_view_advanced_details
) VALUES (
  'professional', 
  'الباقة الاحترافية للمستشارين', 
  'الخيار الأمثل للوسطاء ومستشاري التمويل العقاري والشركاء مع ولوج غير محدود، وتقارير PDF حصرية.',
  99, 
  30, 
  100, 
  50, 
  false, 
  false, 
  true, 
  1, 
  'الأكثر طلباً', 
  ARRAY['حسابات مقارنة وحسبة غير محدودة', 'دقة حاسبة التقاعد العسكري والمدني والـ DSR', 'إحصائيات وهوامش مرنة وبنوك متكاملة', 'تصدير التقارير لمشاركة المستفيدين'],
  true,
  true,
  true
) ON CONFLICT (code) DO NOTHING;
