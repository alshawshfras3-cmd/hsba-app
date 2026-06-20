-- 1. Create activation_requests table
CREATE TABLE IF NOT EXISTS public.activation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Add dynamic layout columns to subscription_plans
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS features text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS badge_text text,
ADD COLUMN IF NOT EXISTS badge_color text,
ADD COLUMN IF NOT EXISTS card_color text,
ADD COLUMN IF NOT EXISTS is_free_plan boolean DEFAULT false;

-- 3. Enable RLS on activation_requests
ALTER TABLE public.activation_requests ENABLE ROW LEVEL SECURITY;

-- 4. Policies for activation_requests
CREATE POLICY select_own_requests ON public.activation_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY insert_own_requests ON public.activation_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow admins to manage all requests
CREATE POLICY admin_all_requests ON public.activation_requests
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
