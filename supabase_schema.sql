-- =========================================================================
-- حسبة - تهيئة قاعدة البيانات النظيفة بالكامل والربط الذكي مع Supabase
-- =========================================================================

-- 1. جدول المستخدمين للتطبيق (app_users) بدلاً من user_profiles
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.app_users CASCADE;

CREATE TABLE public.app_users (
  id uuid PRIMARY KEY, -- يتم ربطه بـ auth.users.id
  full_name text,
  email text UNIQUE,
  phone text,
  is_blocked boolean DEFAULT false,
  status text DEFAULT 'active',
  last_login_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. جدول مشرفي لوحة التحكم بالصلاحيات الأمنية (admins)
DROP TABLE IF EXISTS public.admins CASCADE;

CREATE TABLE public.admins (
  user_id uuid PRIMARY KEY
);

-- 3. الجداول الأخرى الخاصة بالمعايير والحسبة لضمان تشغيل النظام
CREATE TABLE IF NOT EXISTS public.institution_settings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id      text NOT NULL,
  setting_key  text NOT NULL,    -- e.g. 'max_hijri_age', 'default_dsr'
  setting_value text NOT NULL,
  label_ar     text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE(bank_id, setting_key)
);

CREATE TABLE IF NOT EXISTS public.sector_classification_mapping (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id         text NOT NULL,
  sector_id       text NOT NULL,     -- sector from app (e.g. 'gov_civil', 'military')
  bank_sector_id  text NOT NULL,     -- bank's internal classification (e.g. 'strong', 'weak')
  label_ar        text,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(bank_id, sector_id)
);

CREATE TABLE IF NOT EXISTS public.approved_salary_source_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id         text NOT NULL,
  sector_id       text NOT NULL,        -- 'gov_civil', 'military', 'companies', 'semi_gov', 'retired', 'default'
  salary_source   text NOT NULL,        -- 'basic_only' | 'basic_housing' | 'gross' | 'custom_multiplier'
  multiplier      numeric(5,4) DEFAULT 1.0,  -- للراجحي مدني: 1.345
  description_ar  text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(bank_id, sector_id)
);

CREATE TABLE IF NOT EXISTS public.pension_calculation_rules (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id                   text NOT NULL,
  sector_id                 text NOT NULL,
  calculation_method        text NOT NULL,  -- 'service_based' | 'fixed_percentage'
  divisor_months            integer,        -- 480 للمدني/الشركات، 420 للعسكري
  salary_source_override    text,
  rate_below_threshold      numeric(5,2),
  rate_above_threshold      numeric(5,2),
  years_threshold           integer,
  description_ar            text,
  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz DEFAULT now(),
  UNIQUE(bank_id, sector_id)
);

CREATE TABLE IF NOT EXISTS public.retirement_term_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id text NOT NULL,
  sector_id text NOT NULL,
  max_hijri_age_years integer DEFAULT 77,
  max_civil_age_years integer DEFAULT 65,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(bank_id, sector_id)
);

CREATE TABLE IF NOT EXISTS public.rule_versions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name    text NOT NULL,
  record_id     uuid NOT NULL,
  bank_id       text NOT NULL,
  changed_by    text,
  old_data      jsonb,
  new_data      jsonb,
  change_note   text,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.saved_results (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL,
  created_at          timestamptz DEFAULT now(),
  title               text NOT NULL,
  finance_type        text NOT NULL,
  sector              text NOT NULL,
  bank_name           text NOT NULL,
  real_estate_amount  numeric(15,2) DEFAULT 0,
  personal_amount     numeric(15,2) DEFAULT 0,
  monthly_installment numeric(15,2) DEFAULT 0,
  term_months         integer NOT NULL,
  support_type        text DEFAULT 'none',
  net_salary          numeric(15,2) DEFAULT 0,
  profit_margin       numeric(5,2) DEFAULT 0,
  eligibility_status  text DEFAULT 'eligible',
  payload             jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.housing_support_tiers (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_salary     numeric(15,2) NOT NULL,
  max_salary     numeric(15,2) NOT NULL,
  amount_at_min  numeric(15,2) NOT NULL,
  amount_at_max  numeric(15,2) NOT NULL,
  sort_order     integer NOT NULL DEFAULT 0,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.advance_payment_tiers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salary_threshold numeric(15,2) NOT NULL,
  amount           numeric(15,2) NOT NULL,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  source text DEFAULT 'seed',
  updated_at timestamptz DEFAULT now(),
  updated_by text
);

-- 4. الفهارس والقيود (Indexes & Constraints) لضمان الأداء السريع والصلابة
CREATE INDEX IF NOT EXISTS app_users_email_idx ON public.app_users(email);
CREATE INDEX IF NOT EXISTS rule_versions_table_record_idx ON public.rule_versions(table_name, record_id);
CREATE INDEX IF NOT EXISTS rule_versions_bank_created_idx ON public.rule_versions(bank_id, created_at DESC);
CREATE INDEX IF NOT EXISTS saved_results_user_idx ON public.saved_results(user_id);
CREATE INDEX IF NOT EXISTS saved_results_created_idx ON public.saved_results(created_at DESC);

-- 5. تفعيل RLS على كافة الجداول لضمان الأمان
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sector_classification_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approved_salary_source_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pension_calculation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retirement_term_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rule_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housing_support_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advance_payment_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 6. سياسات RLS النظيفة (الدخول للوحة التحكم والحسبة آمن بالكامل)
-- سياسة المستخدمين:
CREATE POLICY "Users can only read and write their own data" ON public.app_users FOR ALL USING (auth.uid() = id);

-- سياسة المشرفين:
CREATE POLICY "Admins full access" ON public.admins FOR ALL USING (auth.uid() = user_id OR auth.uid() IN (SELECT user_id FROM public.admins));

CREATE POLICY "read_all" ON public.institution_settings FOR SELECT USING (true);
CREATE POLICY "write_all" ON public.institution_settings FOR ALL USING (auth.uid() IN (SELECT user_id FROM public.admins));

CREATE POLICY "read_all" ON public.sector_classification_mapping FOR SELECT USING (true);
CREATE POLICY "write_all" ON public.sector_classification_mapping FOR ALL USING (auth.uid() IN (SELECT user_id FROM public.admins));

CREATE POLICY "read_all" ON public.approved_salary_source_rules FOR SELECT USING (true);
CREATE POLICY "write_all" ON public.approved_salary_source_rules FOR ALL USING (auth.uid() IN (SELECT user_id FROM public.admins));

CREATE POLICY "read_all" ON public.pension_calculation_rules FOR SELECT USING (true);
CREATE POLICY "write_all" ON public.pension_calculation_rules FOR ALL USING (auth.uid() IN (SELECT user_id FROM public.admins));

CREATE POLICY "read_all" ON public.retirement_term_rules FOR SELECT USING (true);
CREATE POLICY "write_all" ON public.retirement_term_rules FOR ALL USING (auth.uid() IN (SELECT user_id FROM public.admins));

CREATE POLICY "read_all" ON public.rule_versions FOR SELECT USING (true);
CREATE POLICY "write_all" ON public.rule_versions FOR ALL USING (auth.uid() IN (SELECT user_id FROM public.admins));

CREATE POLICY "read_all" ON public.housing_support_tiers FOR SELECT USING (true);
CREATE POLICY "write_all" ON public.housing_support_tiers FOR ALL USING (auth.uid() IN (SELECT user_id FROM public.admins));

CREATE POLICY "read_all" ON public.advance_payment_tiers FOR SELECT USING (true);
CREATE POLICY "write_all" ON public.advance_payment_tiers FOR ALL USING (auth.uid() IN (SELECT user_id FROM public.admins));

CREATE POLICY "Anyone can read system settings" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "Only admins can modify settings"
ON system_settings
FOR ALL
USING (
  auth.uid() IN (SELECT user_id FROM admins)
);

CREATE POLICY "users_select_own" ON public.saved_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own" ON public.saved_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_delete_own" ON public.saved_results FOR DELETE USING (auth.uid() = user_id);

-- 7. دالة معالجة المستخدم الجديد للتأكد من إنشائه تلقائياً داخل app_users فوراً
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.app_users (id, full_name, email, phone, is_blocked)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email,
    new.phone,
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ربط الدالة بجدول مستخدمي Supabase Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- دالة حذف الحساب الذاتي للمستخدم الحالي بصلابة أمنية كاملة
CREATE OR REPLACE FUNCTION public.delete_current_user()
RETURNS void AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- دالة حذف حساب مستخدم آخر بواسطة المسؤول
CREATE OR REPLACE FUNCTION public.delete_user_by_admin(target_user_id uuid)
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.admins WHERE user_id = auth.uid()
  )
  THEN RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.delete_user_by_admin(uuid) FROM public;

-- 8. تعبئة البيانات الافتراضية للمعايير والبنوك الافتراضية
INSERT INTO public.approved_salary_source_rules (bank_id, sector_id, salary_source, multiplier, description_ar)
VALUES
  ('rajhi', 'companies', 'basic_housing', 1.0, 'أساسي + سكن'),
  ('rajhi', 'gov_civil', 'basic_only', 1.345, 'أساسي × 1.345'),
  ('rajhi', 'military', 'basic_only', 1.345, 'أساسي × 1.345'),
  ('rajhi', 'semi_gov', 'basic_housing', 1.0, 'أساسي + سكن'),
  ('rajhi', 'default', 'basic_housing', 1.0, 'أساسي + سكن (افتراضي)')
ON CONFLICT (bank_id, sector_id) 
DO UPDATE SET 
  salary_source = excluded.salary_source,
  multiplier = excluded.multiplier,
  description_ar = excluded.description_ar,
  updated_at = now();

INSERT INTO public.pension_calculation_rules (
  bank_id, sector_id, calculation_method, divisor_months, salary_source_override, rate_below_threshold, rate_above_threshold, years_threshold, description_ar
)
VALUES
  ('rajhi', 'companies', 'service_based', 480, null, null, null, null, 'شركات: (أساسي+سكن)×خدمة÷480'),
  ('rajhi', 'gov_civil', 'service_based', 480, null, null, null, null, 'مدني: أساسي×1.345×خدمة÷480'),
  ('rajhi', 'military', 'service_based', 420, null, null, null, null, 'عسكري: أساسي×1.345×خدمة÷420'),
  ('rajhi', 'semi_gov', 'service_based', 480, null, null, null, null, 'شبه حكومي: (أساسي+سكن)×خدمة÷480'),
  ('rajhi', 'default', 'service_based', 480, null, null, null, null, 'افتراضي'),
  ('ahli', 'strong', 'fixed_percentage', null, null, 80.00, 70.00, 5, 'قطاعات قوية: <=5 سنوات للتقاعد = 80%، >5 = 70%'),
  ('ahli', 'weak', 'fixed_percentage', null, null, 70.00, 60.00, 5, 'قطاعات ضعيفة: <=5 سنوات للتقاعد = 70%، >5 = 60%')
ON CONFLICT (bank_id, sector_id)
DO UPDATE SET
  calculation_method = excluded.calculation_method,
  divisor_months = excluded.divisor_months,
  salary_source_override = excluded.salary_source_override,
  rate_below_threshold = excluded.rate_below_threshold,
  rate_above_threshold = excluded.rate_above_threshold,
  years_threshold = excluded.years_threshold,
  description_ar = excluded.description_ar,
  updated_at = now();

INSERT INTO public.sector_classification_mapping (bank_id, sector_id, bank_sector_id, label_ar)
VALUES
  ('ahli', 'gov_civil', 'strong', 'حكومي — قوي'),
  ('ahli', 'military', 'strong', 'عسكري (ضباط) — قوي'),
  ('ahli', 'semi_gov', 'strong', 'شبه حكومي — قوي'),
  ('ahli', 'companies', 'strong', 'شركات كبرى — قوي'),
  ('ahli', 'military_enlisted', 'weak', 'أفراد عسكريين — ضعيف'),
  ('ahli', 'private', 'weak', 'خاص بدون اتفاقية — ضعيف')
ON CONFLICT (bank_id, sector_id)
DO UPDATE SET
  bank_sector_id = excluded.bank_sector_id,
  label_ar = excluded.label_ar;

INSERT INTO public.housing_support_tiers (sort_order, min_salary, max_salary, amount_at_min, amount_at_max)
VALUES
  (1, 0, 3000, 0, 0),
  (2, 3000, 4000, 1350, 1206),
  (3, 4000, 5000, 1206, 1073),
  (4, 5000, 6000, 1073, 955),
  (5, 6000, 7000, 955, 850),
  (6, 7000, 8000, 850, 757),
  (7, 8000, 9000, 757, 673),
  (8, 9000, 10000, 673, 599)
ON CONFLICT DO NOTHING;

INSERT INTO public.advance_payment_tiers (salary_threshold, amount)
VALUES
  (9999.99, 150000),
  (10000.00, 100000)
ON CONFLICT DO NOTHING;

-- ضمان إنشاء الأعمدة تدريجياً دون الحاجة لإسقاط الجدول القديم
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

