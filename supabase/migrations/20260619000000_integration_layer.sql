-- CREATE TABLES FOR INTEGRATION LAYER
-- Phase 1 — Integration Tables + RLS Policies + Indexes

-- 1. Create public.api_clients table
CREATE TABLE IF NOT EXISTS public.api_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Create public.api_keys table
CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.api_clients(id) ON DELETE CASCADE,
  key_prefix text NOT NULL UNIQUE,
  key_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  daily_limit integer NOT NULL DEFAULT 100,
  last_used_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

-- 3. Create public.api_calculation_requests table
CREATE TABLE IF NOT EXISTS public.api_calculation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.api_clients(id) ON DELETE SET NULL,
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  external_request_id text,
  request_payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'received',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  duration_ms integer
);

-- 4. Create public.api_calculation_results table
CREATE TABLE IF NOT EXISTS public.api_calculation_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.api_calculation_requests(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.api_clients(id) ON DELETE SET NULL,
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  result_payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  duration_ms integer
);

-- Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_client_id ON public.api_keys(client_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON public.api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_requests_client_created ON public.api_calculation_requests(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_requests_key_created ON public.api_calculation_requests(api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_results_request_id ON public.api_calculation_results(request_id);

-- Enable Row Level Security (RLS) on all four tables
ALTER TABLE public.api_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_calculation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_calculation_results ENABLE ROW LEVEL SECURITY;

-- Create Security Policies using the existing is_admin(user_uuid) pattern
-- Policy for api_clients (Admins only)
CREATE POLICY admin_all_api_clients ON public.api_clients
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Policy for api_keys (Admins only)
CREATE POLICY admin_all_api_keys ON public.api_keys
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Policy for api_calculation_requests (Admins only for viewing)
CREATE POLICY admin_select_api_requests ON public.api_calculation_requests
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Policy for api_calculation_results (Admins only for viewing)
CREATE POLICY admin_select_api_results ON public.api_calculation_results
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));
