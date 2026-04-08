-- Create module_payments table
CREATE TABLE public.module_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module_name text NOT NULL,
  amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending_review',
  receipt_url text,
  notes text,
  rejection_reason text,
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_module_payments_user_id ON public.module_payments(user_id);
CREATE INDEX idx_module_payments_module_name ON public.module_payments(module_name);
CREATE INDEX idx_module_payments_status ON public.module_payments(status);

-- Enable RLS
ALTER TABLE public.module_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can read own module_payments"
  ON public.module_payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own module_payments"
  ON public.module_payments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins full access module_payments"
  ON public.module_payments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE TRIGGER update_module_payments_updated_at
  BEFORE UPDATE ON public.module_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();