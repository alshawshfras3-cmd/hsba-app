-- Create confirmed_bank_cases table for logging actual bank decisions
CREATE TABLE IF NOT EXISTS public.confirmed_bank_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  created_by uuid NULL,

  case_code text NULL,
  customer_label text NULL,

  bank_id text NOT NULL,
  bank_name text NULL,

  product_type text NOT NULL,
  support_type text NULL,

  employment_sector text NULL,
  employer_name text NULL,

  salary_bank_id text NULL,
  salary_bank_name text NULL,
  is_salary_transferred_to_same_bank boolean NULL,

  salary_amount numeric NULL,
  obligations_amount numeric NULL,

  system_result_amount numeric NULL,
  system_installment_amount numeric NULL,

  actual_bank_amount numeric NULL,
  actual_installment_amount numeric NULL,

  actual_status text NOT NULL,
  decision_reason text NULL,
  conditions text[] NOT NULL DEFAULT '{}',
  notes text NULL,

  confidence_level text NOT NULL DEFAULT 'medium',
  is_verified boolean NOT NULL DEFAULT true,

  CONSTRAINT chk_actual_status CHECK (actual_status IN ('approved', 'rejected', 'conditional', 'needs_review')),
  CONSTRAINT chk_confidence_level CHECK (confidence_level IN ('low', 'medium', 'high'))
);

-- Indexes for performance filtering
CREATE INDEX IF NOT EXISTS idx_confirmed_cases_bank_id ON public.confirmed_bank_cases(bank_id);
CREATE INDEX IF NOT EXISTS idx_confirmed_cases_actual_status ON public.confirmed_bank_cases(actual_status);
CREATE INDEX IF NOT EXISTS idx_confirmed_cases_employer_name ON public.confirmed_bank_cases(employer_name);
CREATE INDEX IF NOT EXISTS idx_confirmed_cases_employment_sector ON public.confirmed_bank_cases(employment_sector);
CREATE INDEX IF NOT EXISTS idx_confirmed_cases_salary_bank_id ON public.confirmed_bank_cases(salary_bank_id);
CREATE INDEX IF NOT EXISTS idx_confirmed_cases_created_at ON public.confirmed_bank_cases(created_at);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_update_timestamp()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  return new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_confirmed_bank_case_timestamp
  BEFORE UPDATE ON public.confirmed_bank_cases
  FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();

-- Enable RLS
ALTER TABLE public.confirmed_bank_cases ENABLE ROW LEVEL SECURITY;

-- Policy to allow only admins full access (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY admin_all_confirmed_cases ON public.confirmed_bank_cases
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
