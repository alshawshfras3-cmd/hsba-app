-- =========================================================================
-- حسبة - إنشاء وتعديل جدول بروفايلات المستخدمين والصلاحيات (user_profiles)
-- =========================================================================

-- 1. إنشاء/تعديل جدول البروفايلات في سكيمة public مع دعم الرتب الجديدة
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  role text DEFAULT 'customer',
  subscription text DEFAULT 'free' CHECK (subscription IN ('free', 'basic', 'premium', 'enterprise')),
  subscription_expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  last_login timestamptz,
  is_active boolean DEFAULT true
);

-- تعديل قيد التحقق من الرتب ليشمل الرتب الجديدة والموروثة للتوافق التام
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_role_check 
  CHECK (role IN ('owner', 'admin', 'staff', 'customer', 'user', 'manager'));

-- 2. تفعيل سياسة أمان مستوى الصفوف (Row Level Security - RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. دوال مساعدة معرّفة بحصانة أمان (SECURITY DEFINER) لمنع الدوران اللانهائي (Infinite Recursion)
-- دالة التحقق من رتبة المالك
CREATE OR REPLACE FUNCTION public.is_owner(user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_email text;
  v_role text;
BEGIN
  SELECT email, role INTO v_email, v_role FROM public.user_profiles WHERE id = user_id;
  RETURN (v_role = 'owner' OR v_email = 'alshawshfras@gmail.com' OR v_email = 'alshawshfras3@gmail.com');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة التحقق من رتبة المدير (Admin)
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM public.user_profiles WHERE id = user_id;
  RETURN (v_role = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. إزالة السياسات القديمة والموروثة لمنع التعارض
DROP POLICY IF EXISTS "allow_select_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "allow_admin_select_all" ON public.user_profiles;
DROP POLICY IF EXISTS "allow_update_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "allow_admin_update_all" ON public.user_profiles;
DROP POLICY IF EXISTS "admin_read_all" ON public.user_profiles;
DROP POLICY IF EXISTS "user_read_own" ON public.user_profiles;
DROP POLICY IF EXISTS "select_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "update_policy" ON public.user_profiles;

-- 5. إنشاء سياسات أمان ذكية ومقاومة للثغرات
-- سياسة القراءة (SELECT):
-- - المالك يرى كل شيء وكل الرتب.
-- - المدير يرى الجميع ما عدا المالك.
-- - العضو العادي يرى بروفايله فقط.
CREATE POLICY "select_policy" ON public.user_profiles
FOR SELECT USING (
  public.is_owner(auth.uid()) OR
  (public.is_admin(auth.uid()) AND COALESCE(role, 'customer') <> 'owner') OR
  (auth.uid() = id)
);

-- سياسة التحديث (UPDATE):
-- - المالك يستطيع تعديل كل شيء.
-- - المدير يستطيع تعديل الباقات والأدوار للعملاء والموظفين وجميع الأدوار ما عدا المالك والمدراء الآخرين، ولا يستطيع الترقية لمالك أو مدير آخر.
-- - العضو العادي يعدل بروفايله الخاص فقط دون تغيير هوية الدور رتبته أو الاشتراك.
CREATE POLICY "update_policy" ON public.user_profiles
FOR UPDATE USING (
  public.is_owner(auth.uid()) OR
  (
    public.is_admin(auth.uid()) AND 
    COALESCE(role, 'customer') IN ('customer', 'staff', 'user', 'manager')
  ) OR
  (auth.uid() = id)
) WITH CHECK (
  public.is_owner(auth.uid()) OR
  (
    public.is_admin(auth.uid()) AND 
    COALESCE(role, 'customer') IN ('customer', 'staff', 'user', 'manager') AND
    (COALESCE(role, 'customer') NOT IN ('owner', 'admin'))
  ) OR
  (
    auth.uid() = id AND 
    (role = (SELECT role FROM public.user_profiles WHERE id = auth.uid())) AND
    (COALESCE(subscription, 'free') = (SELECT COALESCE(subscription, 'free') FROM public.user_profiles WHERE id = auth.uid()))
  )
);

-- سياسة الحذف (DELETE):
-- - المالك يستطيع حذف الجميع ما عدا نفسه.
-- - المدير يستطيع حذف customer و staff (و user و manager) فقط.
DROP POLICY IF EXISTS "delete_policy" ON public.user_profiles;
CREATE POLICY "delete_policy" ON public.user_profiles
FOR DELETE USING (
  public.is_owner(auth.uid()) OR
  (
    public.is_admin(auth.uid()) AND 
    COALESCE(role, 'customer') IN ('customer', 'staff', 'user', 'manager')
  )
);

-- 6. دالة معالج مستخدم جديد (trigger function) لإنشاء بروفايل تلقائي
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role text;
BEGIN
  IF new.email = 'alshawshfras@gmail.com' OR new.email = 'alshawshfras3@gmail.com' THEN
    v_role := 'owner';
  ELSE
    v_role := 'customer';
  END IF;

  INSERT INTO public.user_profiles (id, email, full_name, role, subscription)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    v_role,
    'free'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ربط الدالة بجدول مستخدمي Supabase Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. ترحيل وتحديث لجميع المستخدمين والمالك الرئيسي (Backfill)
INSERT INTO public.user_profiles (id, email, full_name, role, subscription, created_at)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'username', split_part(email, '@', 1)),
  CASE WHEN email IN ('alshawshfras@gmail.com', 'alshawshfras3@gmail.com') THEN 'owner'::text ELSE 'customer'::text END,
  'free',
  created_at
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  email = COALESCE(user_profiles.email, EXCLUDED.email),
  full_name = COALESCE(user_profiles.full_name, EXCLUDED.full_name);

-- فرض رتبة المالك على الحسابات المعنية دائمًا
UPDATE public.user_profiles
SET role = 'owner'
WHERE email IN ('alshawshfras@gmail.com', 'alshawshfras3@gmail.com');

-- 8. إضافة حقل تفضيل الوضع الداكن (ثمات المستخدم)
ALTER TABLE public.user_profiles 
  ADD COLUMN IF NOT EXISTS theme_preference text DEFAULT 'light' CHECK (theme_preference IN ('light', 'dark', 'system'));

-- 9. دالة حذف الحساب الذاتي للمستخدم الحالي بصلابة أمنية كاملة
CREATE OR REPLACE FUNCTION public.delete_current_user()
RETURNS void AS $$
BEGIN
  -- يتم حذف العضو نفسه من auth.users وينتقل الحذف بالتبعية (Cascade) للبروفايل
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. دالة حذف حساب مستخدم آخر بواسطة مالك المنصة أو المدير العام
CREATE OR REPLACE FUNCTION public.delete_user_by_admin(target_user_id uuid)
RETURNS void AS $$
DECLARE
  v_caller_role text;
  v_caller_email text;
  v_target_role text;
BEGIN
  -- جلب بيانات المشنّ لهذه العملية (المستدعي)
  SELECT email, role INTO v_caller_email, v_caller_role 
  FROM public.user_profiles 
  WHERE id = auth.uid();

  -- جلب رتبة المستهدف بالحذف
  SELECT COALESCE(role, 'customer') INTO v_target_role
  FROM public.user_profiles
  WHERE id = target_user_id;

  -- التحقق من أنه لا يقوم بحذف نفسه هنا (يجب أن يستخدم حذف الحساب الذاتي)
  IF auth.uid() = target_user_id THEN
    RAISE EXCEPTION 'خطأ أمني: لا يمكنك إزالة حسابك من هنا بشكل مباشر.';
  END IF;

  -- التحقق من الهوية وصلاحيات الحذف
  IF (v_caller_role = 'owner' OR v_caller_email = 'alshawshfras@gmail.com' OR v_caller_email = 'alshawshfras3@gmail.com') THEN
    -- المالك يستطيع حذف الجميع ما عدا نفسه
    DELETE FROM auth.users WHERE id = target_user_id;
  ELSIF (v_caller_role = 'admin') THEN
    -- المدير يستطيع حذف customer و staff (و user و manager) فقط
    IF v_target_role IN ('customer', 'staff', 'user', 'manager') THEN
      DELETE FROM auth.users WHERE id = target_user_id;
    ELSE
      RAISE EXCEPTION 'غير مصرح للوصول: لا يمكن للمدير حذف حسابات المسؤولين أو ملاك النظام.';
    END IF;
  ELSE
    RAISE EXCEPTION 'غير مصرح للوصول: هذه العملية مخصصة لمالك المنصة والمدراء المعتمدين فقط.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

