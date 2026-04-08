
CREATE TABLE public.trial_module_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, module_name)
);

ALTER TABLE public.trial_module_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own trial_module_selections"
  ON public.trial_module_selections
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins full access trial_module_selections"
  ON public.trial_module_selections
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_trial_module_selections_updated_at
  BEFORE UPDATE ON public.trial_module_selections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
