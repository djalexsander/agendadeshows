
-- Create user_modules table
CREATE TABLE public.user_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module_name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_modules_user_module_unique UNIQUE (user_id, module_name)
);

-- Index for fast lookups by user
CREATE INDEX idx_user_modules_user_id ON public.user_modules (user_id);

-- Enable RLS
ALTER TABLE public.user_modules ENABLE ROW LEVEL SECURITY;

-- Users can read their own modules
CREATE POLICY "Users can read own modules"
  ON public.user_modules FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins full access
CREATE POLICY "Admins full access user_modules"
  ON public.user_modules FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Reuse existing updated_at trigger
CREATE TRIGGER update_user_modules_updated_at
  BEFORE UPDATE ON public.user_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
