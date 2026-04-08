
-- Add Asaas integration columns to base_plan_payments
ALTER TABLE public.base_plan_payments
  ADD COLUMN IF NOT EXISTS asaas_customer_id text,
  ADD COLUMN IF NOT EXISTS asaas_payment_id text,
  ADD COLUMN IF NOT EXISTS pix_payload text,
  ADD COLUMN IF NOT EXISTS pix_qr_code_image text,
  ADD COLUMN IF NOT EXISTS pix_expiration_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS gateway_provider text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS gateway_status text;

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_base_plan_payments_asaas_payment_id
  ON public.base_plan_payments (asaas_payment_id)
  WHERE asaas_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_base_plan_payments_user_id_status
  ON public.base_plan_payments (user_id, status);
