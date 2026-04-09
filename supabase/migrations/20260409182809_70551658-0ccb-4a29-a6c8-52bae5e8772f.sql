
-- 1. Manual plan overrides
CREATE TABLE public.manual_plan_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_code text NOT NULL DEFAULT 'basic',
  is_active boolean NOT NULL DEFAULT true,
  granted_by_user_id uuid NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_by_user_id uuid,
  revoked_at timestamptz,
  reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint: only one active override per user
CREATE UNIQUE INDEX idx_manual_plan_overrides_active 
  ON public.manual_plan_overrides (user_id) 
  WHERE is_active = true;

CREATE TRIGGER update_manual_plan_overrides_updated_at
  BEFORE UPDATE ON public.manual_plan_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.manual_plan_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access manual_plan_overrides"
  ON public.manual_plan_overrides FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can read own active plan overrides"
  ON public.manual_plan_overrides FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND is_active = true);

-- 2. Manual module overrides
CREATE TABLE public.manual_module_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  granted_by_user_id uuid NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_by_user_id uuid,
  revoked_at timestamptz,
  reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint: only one active override per module per user
CREATE UNIQUE INDEX idx_manual_module_overrides_active 
  ON public.manual_module_overrides (user_id, module_name) 
  WHERE is_active = true;

CREATE TRIGGER update_manual_module_overrides_updated_at
  BEFORE UPDATE ON public.manual_module_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.manual_module_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access manual_module_overrides"
  ON public.manual_module_overrides FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can read own active module overrides"
  ON public.manual_module_overrides FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND is_active = true);

-- 3. Admin access audit logs
CREATE TABLE public.admin_access_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL,
  action_type text NOT NULL,
  resource_type text NOT NULL,
  resource_code text NOT NULL,
  previous_value text,
  new_value text,
  reason text,
  notes text,
  performed_by_user_id uuid NOT NULL,
  performed_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_target ON public.admin_access_audit_logs (target_user_id);
CREATE INDEX idx_audit_logs_performed_at ON public.admin_access_audit_logs (performed_at DESC);

ALTER TABLE public.admin_access_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access audit_logs"
  ON public.admin_access_audit_logs FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
