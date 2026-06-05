-- =========================================================================
-- حسبة - إنشاء وتعديل جدول مستخدمي التطبيق (app_users - وعاء نظيف بدون ربت)
-- =========================================================================

DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.app_users CASCADE;

CREATE TABLE public.app_users (
  id uuid PRIMARY KEY, -- يتم ربطه بـ auth.users
  full_name text,
  email text UNIQUE,
  phone text,
  is_blocked boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- إعدادات الدخول المباشر لإدارة المنصة
DROP TABLE IF EXISTS public.admin_settings CASCADE;
CREATE TABLE public.admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_username text DEFAULT 'admin',
  admin_email text DEFAULT 'admin@hesba.com',
  admin_password text DEFAULT 'hesba989',
  updated_at timestamp with time zone DEFAULT now()
);

INSERT INTO public.admin_settings (admin_username, admin_email, admin_password)
VALUES ('admin', 'admin@hesba.com', 'hesba989')
ON CONFLICT DO NOTHING;

-- تفعيل الـ RLS
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_select" ON public.app_users FOR SELECT USING (true);
CREATE POLICY "allow_insert" ON public.app_users FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_update" ON public.app_users FOR UPDATE USING (true);
CREATE POLICY "allow_delete" ON public.app_users FOR DELETE USING (true);

CREATE POLICY "allow_select" ON public.admin_settings FOR SELECT USING (true);
CREATE POLICY "allow_update" ON public.admin_settings FOR UPDATE USING (true);
CREATE POLICY "allow_insert" ON public.admin_settings FOR INSERT WITH CHECK (true);

-- دالة تسجيل مستخدم تلقائي للـ Trigger
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

-- دالة حذف الحساب
CREATE OR REPLACE FUNCTION public.delete_current_user()
RETURNS void AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
