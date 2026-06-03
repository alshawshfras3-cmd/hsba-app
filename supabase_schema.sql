-- =========================================================================
-- حسبة - تهيئة جداول قواعد الراتب والتقاعد الجديدة والأدوار المعتمدة
-- =========================================================================

-- 1. الجدول 1: user_profiles (بروفايلات المستخدمين والاشتراكات) - ننشئه أولاً لتستند إليه الدوال والسياسات
create table if not exists user_profiles (
  id uuid primary key default gen_random_uuid(), -- سيتم ربطه بـ auth.users(id) لاحقاً أو في الترحيل
  email text,
  full_name text,
  role text default 'user',
  subscription text default 'free' check (subscription in ('free', 'basic', 'premium', 'enterprise')),
  subscription_expires_at timestamptz,
  created_at timestamptz default now(),
  last_login timestamptz,
  is_active boolean default true
);

-- تعديل قيد التحقق من الرتب ليشمل الرتب النهائية المعتمدة فقط
alter table user_profiles drop constraint if exists user_profiles_role_check;
alter table user_profiles add constraint user_profiles_role_check 
  check (role in ('owner', 'manager', 'employee', 'user'));

-- 2. الجدول 2: institution_settings (إعدادات عامة لكل بنك)
create table if not exists institution_settings (
  id           uuid primary key default gen_random_uuid(),
  bank_id      text not null,
  setting_key  text not null,    -- e.g. 'max_hijri_age', 'default_dsr'
  setting_value text not null,
  label_ar     text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  unique(bank_id, setting_key)
);

-- 3. الجدول 3: sector_classification_mapping (تصنيف القطاعات لكل بنك)
create table if not exists sector_classification_mapping (
  id              uuid primary key default gen_random_uuid(),
  bank_id         text not null,
  sector_id       text not null,     -- sector from app (e.g. 'gov_civil', 'military')
  bank_sector_id  text not null,     -- bank's internal classification (e.g. 'strong', 'weak')
  label_ar        text,
  created_at      timestamptz default now(),
  unique(bank_id, sector_id)
);

-- 4. الجدول 4: approved_salary_source_rules (الرواتب المعتمدة لكل بنك × قطاع)
create table if not exists approved_salary_source_rules (
  id              uuid primary key default gen_random_uuid(),
  bank_id         text not null,
  sector_id       text not null,        -- 'gov_civil', 'military', 'companies', 'semi_gov', 'retired', 'default'
  salary_source   text not null,        -- 'basic_only' | 'basic_housing' | 'gross' | 'custom_multiplier'
  multiplier      numeric(5,4) default 1.0,  -- للراجحي مدني: 1.345
  description_ar  text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique(bank_id, sector_id)
);

-- 5. الجدول 5: pension_calculation_rules (حساب الراتب التقاعدي لكل بنك × قطاع)
create table if not exists pension_calculation_rules (
  id                        uuid primary key default gen_random_uuid(),
  bank_id                   text not null,
  sector_id                 text not null,
  calculation_method        text not null,  -- 'service_based' | 'fixed_percentage'

  -- service_based fields (الراجحي)
  divisor_months            integer,        -- 480 للمدني/الشركات، 420 للعسكري
  salary_source_override    text,           -- إذا يختلف عن approved_salary_source_rules

  -- fixed_percentage fields (الأهلي)
  rate_below_threshold      numeric(5,2),   -- نسبة % إذا سنوات للتقاعد <= threshold
  rate_above_threshold      numeric(5,2),   -- نسبة % إذا سنوات للتقاعد > threshold
  years_threshold           integer,        -- عدد السنوات الفاصلة (عادة 5)

  description_ar            text,
  created_at                timestamptz default now(),
  updated_at                timestamptz default now(),
  unique(bank_id, sector_id)
);

-- 6. الجدول 6: retirement_term_rules (إضافة حقول السقفين للجدول الحالي/الجديد)
create table if not exists retirement_term_rules (
  id uuid primary key default gen_random_uuid(),
  bank_id text not null,
  sector_id text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(bank_id, sector_id)
);

alter table retirement_term_rules add column if not exists max_hijri_age_years integer default 77;   -- السقف الهجري بالسنوات
alter table retirement_term_rules add column if not exists max_civil_age_years integer default 65;   -- السقف الميلادي بالسنوات

-- 7. الجدول 7: rule_versions (سجل التغييرات والنسخ الاحتياطية للعودة للإصدارات السابقة)
create table if not exists rule_versions (
  id            uuid primary key default gen_random_uuid(),
  table_name    text not null,         -- 'pension_calculation_rules', 'approved_salary_source_rules', etc.
  record_id     uuid not null,
  bank_id       text not null,
  changed_by    text,                  -- user email
  old_data      jsonb,
  new_data      jsonb,
  change_note   text,
  created_at    timestamptz default now()
);

create index if not exists rule_versions_table_record_idx on rule_versions(table_name, record_id);
create index if not exists rule_versions_bank_created_idx on rule_versions(bank_id, created_at desc);

-- 8. الجدول 8: saved_results (جدول حفظ عروض الحسبة والتمويل للمستخدمين)
create table if not exists saved_results (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null,
  created_at          timestamptz default now(),
  title               text not null,
  finance_type        text not null,
  sector              text not null,
  bank_name           text not null,
  real_estate_amount  numeric(15,2) default 0,
  personal_amount     numeric(15,2) default 0,
  monthly_installment numeric(15,2) default 0,
  term_months         integer not null,
  support_type        text default 'none',
  net_salary          numeric(15,2) default 0,
  profit_margin       numeric(5,2) default 0,
  eligibility_status  text default 'eligible',
  payload             jsonb default '{}'::jsonb
);

create index if not exists saved_results_user_idx on saved_results(user_id);
create index if not exists saved_results_created_idx on saved_results(created_at desc);

-- 9. الجدول 9: housing_support_tiers (شرائح الدعم السكني المتدرج)
create table if not exists housing_support_tiers (
  id             uuid primary key default gen_random_uuid(),
  min_salary     numeric(15,2) not null,
  max_salary     numeric(15,2) not null,
  amount_at_min  numeric(15,2) not null,
  amount_at_max  numeric(15,2) not null,
  sort_order     integer not null default 0,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- 10. الجدول 10: advance_payment_tiers (عتبات الدفعة المقدمة غير المستردة)
create table if not exists advance_payment_tiers (
  id               uuid primary key default gen_random_uuid(),
  salary_threshold numeric(15,2) not null,
  amount           numeric(15,2) not null,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);


-- =========================================================================
-- 3) الدوال الأمنية المعتمدة (SECURITY DEFINER مع SET search_path = public)
-- =========================================================================

CREATE OR REPLACE FUNCTION public.is_owner(user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_email text;
  v_role text;
BEGIN
  SELECT email, role INTO v_email, v_role FROM public.user_profiles WHERE id = user_id;
  RETURN (v_role = 'owner' OR v_email = 'alshawshfras@gmail.com' OR v_email = 'alshawshfras3@gmail.com');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_manager(user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM public.user_profiles WHERE id = user_id;
  RETURN (v_role = 'manager');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.has_role(user_id uuid, requested_role text)
RETURNS boolean AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM public.user_profiles WHERE id = user_id;
  RETURN (v_role = requested_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.can_write_settings(user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM public.user_profiles WHERE id = user_id;
  RETURN (v_role IN ('owner', 'manager', 'employee'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- =========================================================================
-- سياسات أمان مستوى الصفوف (Row Level Security - RLS)
-- =========================================================================

-- تفعيل الـ RLS على كافة الجداول
alter table institution_settings enable row level security;
alter table sector_classification_mapping enable row level security;
alter table approved_salary_source_rules enable row level security;
alter table pension_calculation_rules enable row level security;
alter table retirement_term_rules enable row level security;
alter table rule_versions enable row level security;
alter table saved_results enable row level security;
alter table housing_support_tiers enable row level security;
alter table advance_payment_tiers enable row level security;
alter table user_profiles enable row level security;

-- قراءة مفتوحة للجميع، الكتابة للمشرفين فقط (محققة بالدالة can_write_settings)
drop policy if exists "read_all" on institution_settings;
create policy "read_all" on institution_settings for select using (true);
drop policy if exists "admin_write" on institution_settings;
create policy "admin_write" on institution_settings for all using (public.can_write_settings(auth.uid()));

drop policy if exists "read_all" on sector_classification_mapping;
create policy "read_all" on sector_classification_mapping for select using (true);
drop policy if exists "admin_write" on sector_classification_mapping;
create policy "admin_write" on sector_classification_mapping for all using (public.can_write_settings(auth.uid()));

drop policy if exists "read_all" on approved_salary_source_rules;
create policy "read_all" on approved_salary_source_rules for select using (true);
drop policy if exists "admin_write" on approved_salary_source_rules;
create policy "admin_write" on approved_salary_source_rules for all using (public.can_write_settings(auth.uid()));

drop policy if exists "read_all" on pension_calculation_rules;
create policy "read_all" on pension_calculation_rules for select using (true);
drop policy if exists "admin_write" on pension_calculation_rules;
create policy "admin_write" on pension_calculation_rules for all using (public.can_write_settings(auth.uid()));

drop policy if exists "read_all" on retirement_term_rules;
create policy "read_all" on retirement_term_rules for select using (true);
drop policy if exists "admin_write" on retirement_term_rules;
create policy "admin_write" on retirement_term_rules for all using (public.can_write_settings(auth.uid()));

drop policy if exists "read_all" on rule_versions;
create policy "read_all" on rule_versions for select using (true);
drop policy if exists "admin_write" on rule_versions;
create policy "admin_write" on rule_versions for all using (public.can_write_settings(auth.uid()));

drop policy if exists "read_all" on housing_support_tiers;
create policy "read_all" on housing_support_tiers for select using (true);
drop policy if exists "admin_write" on housing_support_tiers;
create policy "admin_write" on housing_support_tiers for all using (public.can_write_settings(auth.uid()));

drop policy if exists "read_all" on advance_payment_tiers;
create policy "read_all" on advance_payment_tiers for select using (true);
drop policy if exists "admin_write" on advance_payment_tiers;
create policy "admin_write" on advance_payment_tiers for all using (public.can_write_settings(auth.uid()));

-- سياسات saved_results (يفرز للمستخدم نفسه)
drop policy if exists "users_select_own" on saved_results;
create policy "users_select_own" on saved_results for select using (auth.uid() = user_id);
drop policy if exists "users_insert_own" on saved_results;
create policy "users_insert_own" on saved_results for insert with check (auth.uid() = user_id);
drop policy if exists "users_delete_own" on saved_results;
create policy "users_delete_own" on saved_results for delete using (auth.uid() = user_id);

-- سياسات الجدول user_profiles
-- - المالك يرى كل شيء وكل الرتب المعتمدة.
-- - المدير يرى الجميع ما عدا المالك.
-- - العضو العادي يرى نفسه فقط.
drop policy if exists "admin_read_all" on user_profiles;
drop policy if exists "user_read_own" on user_profiles;
drop policy if exists "admin_update_all" on user_profiles;

CREATE POLICY "select_policy" ON public.user_profiles
FOR SELECT USING (
  public.is_owner(auth.uid()) OR
  (public.is_manager(auth.uid()) AND COALESCE(role, 'user') <> 'owner') OR
  (auth.uid() = id)
);

CREATE POLICY "update_policy" ON public.user_profiles
FOR UPDATE USING (
  public.is_owner(auth.uid()) OR
  (
    public.is_manager(auth.uid()) AND 
    COALESCE(role, 'user') IN ('user', 'employee')
  ) OR
  (auth.uid() = id)
) WITH CHECK (
  public.is_owner(auth.uid()) OR
  (
    public.is_manager(auth.uid()) AND 
    COALESCE(role, 'user') IN ('user', 'employee') AND
    (COALESCE(role, 'user') NOT IN ('owner', 'manager'))
  ) OR
  (
    auth.uid() = id AND 
    (role = (SELECT role FROM public.user_profiles WHERE id = auth.uid())) AND
    (COALESCE(subscription, 'free') = (SELECT COALESCE(subscription, 'free') FROM public.user_profiles WHERE id = auth.uid()))
  )
);

CREATE POLICY "delete_policy" ON public.user_profiles
FOR DELETE USING (
  public.is_owner(auth.uid()) OR
  (
    public.is_manager(auth.uid()) AND 
    COALESCE(role, 'user') IN ('user', 'employee')
  )
);


-- =========================================================================
-- البيانات الأولية (Seeds) والترجرات
-- =========================================================================

-- تهيئة الرواتب المعتمدة لبنك الراجحي
insert into approved_salary_source_rules (bank_id, sector_id, salary_source, multiplier, description_ar)
values
  ('rajhi', 'companies', 'basic_housing', 1.0, 'أساسي + سكن'),
  ('rajhi', 'gov_civil', 'basic_only', 1.345, 'أساسي × 1.345'),
  ('rajhi', 'military', 'basic_only', 1.345, 'أساسي × 1.345'),
  ('rajhi', 'semi_gov', 'basic_housing', 1.0, 'أساسي + سكن'),
  ('rajhi', 'default', 'basic_housing', 1.0, 'أساسي + سكن (افتراضي)')
on conflict (bank_id, sector_id) 
do update set 
  salary_source = excluded.salary_source,
  multiplier = excluded.multiplier,
  description_ar = excluded.description_ar,
  updated_at = now();

-- تهيئة طريقة حساب التقاعد للراجحي والأهلي
insert into pension_calculation_rules (
  bank_id, sector_id, calculation_method, divisor_months, salary_source_override, rate_below_threshold, rate_above_threshold, years_threshold, description_ar
)
values
  ('rajhi', 'companies', 'service_based', 480, null, null, null, null, 'شركات: (أساسي+سكن)×خدمة÷480'),
  ('rajhi', 'gov_civil', 'service_based', 480, null, null, null, null, 'مدني: أساسي×1.345×خدمة÷480'),
  ('rajhi', 'military', 'service_based', 420, null, null, null, null, 'عسكري: أساسي×1.345×خدمة÷420'),
  ('rajhi', 'semi_gov', 'service_based', 480, null, null, null, null, 'شبه حكومي: (أساسي+سكن)×خدمة÷480'),
  ('rajhi', 'default', 'service_based', 480, null, null, null, null, 'افتراضي'),
  ('ahli', 'strong', 'fixed_percentage', null, null, 80.00, 70.00, 5, 'قطاعات قوية: <=5 سنوات للتقاعد = 80%، >5 = 70%'),
  ('ahli', 'weak', 'fixed_percentage', null, null, 70.00, 60.00, 5, 'قطاعات ضعيفة: <=5 سنوات للتقاعد = 70%، >5 = 60%')
on conflict (bank_id, sector_id)
do update set
  calculation_method = excluded.calculation_method,
  divisor_months = excluded.divisor_months,
  salary_source_override = excluded.salary_source_override,
  rate_below_threshold = excluded.rate_below_threshold,
  rate_above_threshold = excluded.rate_above_threshold,
  years_threshold = excluded.years_threshold,
  description_ar = excluded.description_ar,
  updated_at = now();

-- تهيئة ربط وتصنيف قطاعات الأهلي
insert into sector_classification_mapping (bank_id, sector_id, bank_sector_id, label_ar)
values
  ('ahli', 'gov_civil', 'strong', 'حكومي — قوي'),
  ('ahli', 'military', 'strong', 'عسكري (ضباط) — قوي'),
  ('ahli', 'semi_gov', 'strong', 'شبه حكومي — قوي'),
  ('ahli', 'companies', 'strong', 'شركات كبرى — قوي'),
  ('ahli', 'military_enlisted', 'weak', 'أفراد عسكريين — ضعيف'),
  ('ahli', 'private', 'weak', 'خاص بدون اتفاقية — ضعيف')
on conflict (bank_id, sector_id)
do update set
  bank_sector_id = excluded.bank_sector_id,
  label_ar = excluded.label_ar;

-- تعبئة الشرائح الرسمية المؤكدة للدعم السكني من بنك الراجحي
insert into housing_support_tiers (sort_order, min_salary, max_salary, amount_at_min, amount_at_max)
values
  (1, 0, 3000, 0, 0),
  (2, 3000, 4000, 1350, 1206),
  (3, 4000, 5000, 1206, 1073),
  (4, 5000, 6000, 1073, 955),
  (5, 6000, 7000, 955, 850),
  (6, 7000, 8000, 850, 757),
  (7, 8000, 9000, 757, 673),
  (8, 9000, 10000, 673, 599)
on conflict do nothing;

-- تعبئة عتبات الدفعة المقدمة
insert into advance_payment_tiers (salary_threshold, amount)
values
  (9999.99, 150000), -- للرواتب أقل من 10000
  (10000.00, 100000) -- للرواتب 10000 وأكثر
on conflict do nothing;

-- دالة معالج مستخدم جديد (trigger function) لإنشاء بروفايل تلقائي
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_role text;
begin
  if new.email = 'alshawshfras@gmail.com' or new.email = 'alshawshfras3@gmail.com' then
    v_role := 'owner';
  else
    v_role := 'user';
  end if;

  insert into public.user_profiles (id, email, role, subscription)
  values (new.id, new.email, v_role, 'free')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- دالة حذف الحساب الذاتي للمستخدم الحالي بصلابة أمنية كاملة
create or replace function public.delete_current_user()
returns void AS $$
begin
  delete from auth.users where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public;

-- دالة حذف حساب مستخدم آخر بواسطة مالك المنصة أو المدير العام
create or replace function public.delete_user_by_admin(target_user_id uuid)
returns void as $$
declare
  v_caller_role text;
  v_caller_email text;
  v_target_role text;
begin
  select email, role into v_caller_email, v_caller_role 
  from public.user_profiles 
  where id = auth.uid();

  select coalesce(role, 'user') into v_target_role
  from public.user_profiles
  where id = target_user_id;

  if auth.uid() = target_user_id then
    raise exception 'خطأ أمني: لا يمكنك إزالة حسابك من هنا بشكل مباشر.';
  end if;

  if (v_caller_role = 'owner' or v_caller_email = 'alshawshfras@gmail.com' or v_caller_email = 'alshawshfras3@gmail.com') then
    delete from auth.users where id = target_user_id;
  elsif (v_caller_role = 'manager') then
    if v_target_role in ('user', 'employee') then
      delete from auth.users where id = target_user_id;
    else
      raise exception 'غير مصرح للوصول: لا يمكن للمدير حذف حسابات المسؤولين أو ملاك النظام.';
    END IF;
  else
    raise exception 'غير مصرح للوصول: هذه العملية مخصصة لمالك المنصة والمدراء المعتمدين فقط.';
  end if;
end;
$$ language plpgsql security definer set search_path = public;

-- 11. الجدول 11: system_settings وإعدادات الأمان الخاصة به
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  source text DEFAULT 'seed',
  updated_at timestamptz DEFAULT now(),
  updated_by text
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_system_settings" ON public.system_settings;
CREATE POLICY "read_system_settings" ON public.system_settings 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "write_system_settings" ON public.system_settings;
CREATE POLICY "write_system_settings" ON public.system_settings 
  FOR ALL USING (public.can_write_settings(auth.uid()));

-- 12. تحديث الأدوار وتوحيدها وتطبيق الاستثناءات
UPDATE public.user_profiles
SET role = 'owner'
WHERE email = 'alshawshfras3@gmail.com';

UPDATE public.user_profiles
SET role = 'owner'
WHERE role = 'admin';

UPDATE public.user_profiles
SET role = 'employee'
WHERE role = 'staff';

UPDATE public.user_profiles
SET role = 'user'
WHERE role = 'customer';

