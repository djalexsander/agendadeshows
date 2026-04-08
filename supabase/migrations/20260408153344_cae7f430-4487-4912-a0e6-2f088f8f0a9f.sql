
-- 1. Add period fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_period_start timestamptz NULL,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz NULL;

-- 2. Base plan config table
CREATE TABLE public.base_plan_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Plano Base',
  price numeric(10,2) NOT NULL DEFAULT 49.90,
  billing_period text NOT NULL DEFAULT 'monthly',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.base_plan_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read base_plan_config"
  ON public.base_plan_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins full access base_plan_config"
  ON public.base_plan_config FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_base_plan_config_updated_at
  BEFORE UPDATE ON public.base_plan_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default plan
INSERT INTO public.base_plan_config (name, price, billing_period)
VALUES ('Plano Base', 49.90, 'monthly');

-- 3. Base plan payments table
CREATE TABLE public.base_plan_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending_review',
  billing_period text NOT NULL DEFAULT 'monthly',
  receipt_url text NULL,
  notes text NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz NULL,
  reviewed_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_base_plan_payments_user_id ON public.base_plan_payments(user_id);
CREATE INDEX idx_base_plan_payments_status ON public.base_plan_payments(status);

ALTER TABLE public.base_plan_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own base_plan_payments"
  ON public.base_plan_payments FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own base_plan_payments"
  ON public.base_plan_payments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins full access base_plan_payments"
  ON public.base_plan_payments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_base_plan_payments_updated_at
  BEFORE UPDATE ON public.base_plan_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
