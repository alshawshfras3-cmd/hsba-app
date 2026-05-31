-- =========================================================================
-- حسبة - تهيئة جداول قواعد الراتب والتقاعد الجديدة
-- =========================================================================

-- 1. الجدول 1: institution_settings (إعدادات عامة لكل بنك)
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

-- 2. الجدول 2: sector_classification_mapping (تصنيف القطاعات لكل بنك)
create table if not exists sector_classification_mapping (
  id              uuid primary key default gen_random_uuid(),
  bank_id         text not null,
  sector_id       text not null,     -- sector from app (e.g. 'gov_civil', 'military')
  bank_sector_id  text not null,     -- bank's internal classification (e.g. 'strong', 'weak')
  label_ar        text,
  created_at      timestamptz default now(),
  unique(bank_id, sector_id)
);

-- 3. الجدول 3: approved_salary_source_rules (الرواتب المعتمدة لكل بنك × قطاع)
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

-- 4. الجدول 4: pension_calculation_rules (حساب الراتب التقاعدي لكل بنك × قطاع)
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

-- 5. الجدول 5: retirement_term_rules (إضافة حقول السقفين للجدول الحالي/الجديد)
create table if not exists retirement_term_rules (
  id uuid primary key default gen_random_uuid(),
  bank_id text not null,
  sector_id text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(bank_id, sector_id)
);

alter table retirement_term_rules add column if not exists
  max_hijri_age_years integer default 77;   -- السقف الهجري بالسنوات

alter table retirement_term_rules add column if not exists
  max_civil_age_years integer default 65;   -- السقف الميلادي بالسنوات

-- 6. الجدول 6: rule_versions (سجل التغييرات والنسخ الاحتياطية للعودة للإصدارات السابقة)
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


-- =========================================================================
-- سياسات أمان مستوى الصفوف (Row Level Security - RLS)
-- =========================================================================

-- تفعيل الـ RLS على كافة الجداول الستة
alter table institution_settings enable row level security;
alter table sector_classification_mapping enable row level security;
alter table approved_salary_source_rules enable row level security;
alter table pension_calculation_rules enable row level security;
alter table retirement_term_rules enable row level security;
alter table rule_versions enable row level security;

-- قراءة مفتوحة للجميع، الكتابة للمشرفين فقط (محققة بالـ auth role = admin)
drop policy if exists "read_all" on institution_settings;
create policy "read_all" on institution_settings for select using (true);
drop policy if exists "admin_write" on institution_settings;
create policy "admin_write" on institution_settings for all using (auth.jwt() ->> 'role' = 'admin');

drop policy if exists "read_all" on sector_classification_mapping;
create policy "read_all" on sector_classification_mapping for select using (true);
drop policy if exists "admin_write" on sector_classification_mapping;
create policy "admin_write" on sector_classification_mapping for all using (auth.jwt() ->> 'role' = 'admin');

drop policy if exists "read_all" on approved_salary_source_rules;
create policy "read_all" on approved_salary_source_rules for select using (true);
drop policy if exists "admin_write" on approved_salary_source_rules;
create policy "admin_write" on approved_salary_source_rules for all using (auth.jwt() ->> 'role' = 'admin');

drop policy if exists "read_all" on pension_calculation_rules;
create policy "read_all" on pension_calculation_rules for select using (true);
drop policy if exists "admin_write" on pension_calculation_rules;
create policy "admin_write" on pension_calculation_rules for all using (auth.jwt() ->> 'role' = 'admin');

drop policy if exists "read_all" on retirement_term_rules;
create policy "read_all" on retirement_term_rules for select using (true);
drop policy if exists "admin_write" on retirement_term_rules;
create policy "admin_write" on retirement_term_rules for all using (auth.jwt() ->> 'role' = 'admin');

drop policy if exists "read_all" on rule_versions;
create policy "read_all" on rule_versions for select using (true);
drop policy if exists "admin_write" on rule_versions;
create policy "admin_write" on rule_versions for all using (auth.jwt() ->> 'role' = 'admin');


-- =========================================================================
-- البيانات الأولية (Seeds) للبنكين (الراجحي والأهلي)
-- =========================================================================

-- 1. تهيئة الرواتب المعتمدة (approved_salary_source_rules) لبنك الراجحي
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

-- 2. تهيئة طريقة حساب التقاعد (pension_calculation_rules) للراجحي والأهلي
insert into pension_calculation_rules (
  bank_id, 
  sector_id, 
  calculation_method, 
  divisor_months, 
  salary_source_override,
  rate_below_threshold, 
  rate_above_threshold, 
  years_threshold, 
  description_ar
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

-- 3. تهيئة ربط وتصنيف قطاعات الأهلي (sector_classification_mapping)
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


-- =========================================================================
-- جدول حفظ عروض الحسبة والتمويل (saved_results) للمستخدمين
-- =========================================================================

create table if not exists saved_results (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
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

-- إنشاء كشافات لتحسين سرعة الاستعلام
create index if not exists saved_results_user_idx on saved_results(user_id);
create index if not exists saved_results_created_idx on saved_results(created_at desc);

-- تفعيل الـ RLS لحماية خصوصية بيانات المستخدمين
alter table saved_results enable row level security;

-- السماح للمستخدمين بالتحكم في سجلاتهم المحفوظة فقط
drop policy if exists "users_select_own" on saved_results;
create policy "users_select_own" on saved_results
  for select using (auth.uid() = user_id);

drop policy if exists "users_insert_own" on saved_results;
create policy "users_insert_own" on saved_results
  for insert with check (auth.uid() = user_id);

drop policy if exists "users_delete_own" on saved_results;
create policy "users_delete_own" on saved_results
  for delete using (auth.uid() = user_id);


-- =========================================================================
-- جدول شرائح الدعم السكني المتدرج (housing_support_tiers)
-- =========================================================================

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

alter table housing_support_tiers enable row level security;

drop policy if exists "read_all" on housing_support_tiers;
create policy "read_all" on housing_support_tiers for select using (true);

drop policy if exists "admin_write" on housing_support_tiers;
create policy "admin_write" on housing_support_tiers for all using (auth.jwt() ->> 'role' = 'admin');

-- تعبئة الشرائح الرسمية المؤكدة من بنك الراجحي
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

-- =========================================================================
-- جدول عتبات الدفعة المقدمة غير المستردة (advance_payment_tiers)
-- =========================================================================

create table if not exists advance_payment_tiers (
  id               uuid primary key default gen_random_uuid(),
  salary_threshold numeric(15,2) not null,
  amount           numeric(15,2) not null,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

alter table advance_payment_tiers enable row level security;

drop policy if exists "read_all" on advance_payment_tiers;
create policy "read_all" on advance_payment_tiers for select using (true);

drop policy if exists "admin_write" on advance_payment_tiers;
create policy "admin_write" on advance_payment_tiers for all using (auth.jwt() ->> 'role' = 'admin');

-- تعبئة عتبات الدفعة المقدمة
insert into advance_payment_tiers (salary_threshold, amount)
values
  (9999.99, 150000), -- للرواتب أقل من 10000
  (10000.00, 100000) -- للرواتب 10000 وأكثر
on conflict do nothing;


