-- Add Asaas columns to module_payments
ALTER TABLE public.module_payments ADD COLUMN IF NOT EXISTS asaas_customer_id text;
ALTER TABLE public.module_payments ADD COLUMN IF NOT EXISTS asaas_payment_id text;
ALTER TABLE public.module_payments ADD COLUMN IF NOT EXISTS pix_payload text;
ALTER TABLE public.module_payments ADD COLUMN IF NOT EXISTS pix_qr_code_image text;
ALTER TABLE public.module_payments ADD COLUMN IF NOT EXISTS pix_expiration_date timestamptz;
ALTER TABLE public.module_payments ADD COLUMN IF NOT EXISTS gateway_provider text DEFAULT 'manual';
ALTER TABLE public.module_payments ADD COLUMN IF NOT EXISTS gateway_status text;
ALTER TABLE public.module_payments ADD COLUMN IF NOT EXISTS hidden_in_admin boolean NOT NULL DEFAULT false;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_module_payments_asaas_payment_id ON public.module_payments(asaas_payment_id);
CREATE INDEX IF NOT EXISTS idx_module_payments_user_module ON public.module_payments(user_id, module_name);