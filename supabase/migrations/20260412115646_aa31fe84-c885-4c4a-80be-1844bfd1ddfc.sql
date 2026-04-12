
-- Drop existing policies
DROP POLICY IF EXISTS "Company admins can manage invitations" ON public.company_invitations;
DROP POLICY IF EXISTS "System admins full access company_invitations" ON public.company_invitations;
DROP POLICY IF EXISTS "Users can read own invitations by email" ON public.company_invitations;

-- Recreate with explicit per-operation policies
CREATE POLICY "company_invitations_select_admin"
ON public.company_invitations FOR SELECT TO authenticated
USING (
  public.is_company_admin(auth.uid(), company_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
);

CREATE POLICY "company_invitations_insert_admin"
ON public.company_invitations FOR INSERT TO authenticated
WITH CHECK (
  public.is_company_admin(auth.uid(), company_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "company_invitations_update_admin"
ON public.company_invitations FOR UPDATE TO authenticated
USING (
  public.is_company_admin(auth.uid(), company_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  public.is_company_admin(auth.uid(), company_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "company_invitations_delete_admin"
ON public.company_invitations FOR DELETE TO authenticated
USING (
  public.is_company_admin(auth.uid(), company_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);
