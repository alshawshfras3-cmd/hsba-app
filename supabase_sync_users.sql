-- =========================================================================
-- حسبة - سكربت مزامنة وترحيل الحسابات التاريخية إلى جدول app_users الموحد
-- قم بتشغيل هذا السكربت في قسم "SQL Editor" في لوحة تحكم Supabase
-- =========================================================================

-- 1. التأكد من وجود جدول app_users بالهيكل الصحيح والممتاز
CREATE TABLE IF NOT EXISTS public.app_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text UNIQUE,
  phone text,
  is_blocked boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- تفعيل Row Level Security (RLS)
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- حذف سياسات الوصول القديمة إن وجدت لتجنب التكرار
DROP POLICY IF EXISTS "allow_select" ON public.app_users;
DROP POLICY IF EXISTS "allow_insert" ON public.app_users;
DROP POLICY IF EXISTS "allow_update" ON public.app_users;
DROP POLICY IF EXISTS "allow_delete" ON public.app_users;

-- إعادة إنشاء سياسات RLS النظيفة
CREATE POLICY "allow_select" ON public.app_users FOR SELECT USING (true);
CREATE POLICY "allow_insert" ON public.app_users FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_update" ON public.app_users FOR UPDATE USING (true);
CREATE POLICY "allow_delete" ON public.app_users FOR DELETE USING (true);

-- 2. ترحيل ومزامنة كافة المستخدمين الحاليين من جدول auth.users (الحسابات الفعلية في Supabase Auth)
-- سيقوم هذا الاستعلام بالمرور على جميع الحسابات في Supabase وإدخال مَن ليس له سجل في app_users تلقائياً
INSERT INTO public.app_users (id, full_name, email, phone, is_blocked, created_at, updated_at)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'username', split_part(email, '@', 1)),
  email,
  phone,
  false, -- القيمة الافتراضية غير محظور
  COALESCE(created_at, now()),
  COALESCE(updated_at, now())
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  email = COALESCE(excluded.email, public.app_users.email),
  phone = COALESCE(excluded.phone, public.app_users.phone),
  full_name = COALESCE(public.app_users.full_name, excluded.full_name);

-- 3. ترحيل ومزامنة الحسابات التاريخية من جدول user_profiles القديم (إن وجد) لضمان عدم ضياع التعديلات السابقة
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    INSERT INTO public.app_users (id, full_name, email, phone, is_blocked, created_at)
    SELECT 
      id,
      COALESCE(full_name, username, 'مستخدم سابق'),
      email,
      phone,
      (CASE WHEN role = 'suspended' THEN true ELSE false END),
      COALESCE(created_at, now())
    FROM public.user_profiles
    ON CONFLICT (id) DO UPDATE SET
      full_name = COALESCE(public.app_users.full_name, excluded.full_name),
      is_blocked = COALESCE(public.app_users.is_blocked, excluded.is_blocked);
  END IF;
END $$;

-- 4. إعادة تهيئة دالة ومtrigger إنشاء الحساب التلقائي لضمان المزامنة للمستخدمين الجدد مستقبلاً
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

-- إعادة ربط الـ Trigger بجدول auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- دالة حذف الحساب
CREATE OR REPLACE FUNCTION public.delete_current_user()
RETURNS void AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
