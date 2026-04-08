
CREATE TABLE public.module_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_module_requests_user_id ON public.module_requests (user_id);
CREATE INDEX idx_module_requests_status ON public.module_requests (status);

-- Prevent duplicate pending requests for same user+module
CREATE UNIQUE INDEX idx_module_requests_unique_pending
  ON public.module_requests (user_id, module_name)
  WHERE status = 'pending';

ALTER TABLE public.module_requests ENABLE ROW LEVEL SECURITY;

-- Users can read own requests
CREATE POLICY "Users can read own module_requests"
  ON public.module_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert own requests
CREATE POLICY "Users can insert own module_requests"
  ON public.module_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins full access
CREATE POLICY "Admins full access module_requests"
  ON public.module_requests FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Reuse updated_at trigger
CREATE TRIGGER update_module_requests_updated_at
  BEFORE UPDATE ON public.module_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
