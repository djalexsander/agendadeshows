
-- 1. Create company_role enum
CREATE TYPE public.company_role AS ENUM ('admin', 'collaborator', 'viewer');

-- 2. Create companies table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Create company_members table
CREATE TABLE public.company_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role company_role NOT NULL DEFAULT 'viewer',
  active BOOLEAN NOT NULL DEFAULT true,
  invited_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_company_members_updated_at
  BEFORE UPDATE ON public.company_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Create company_invitations table
CREATE TABLE public.company_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role company_role NOT NULL DEFAULT 'viewer',
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending',
  invited_by UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, email, status)
);
ALTER TABLE public.company_invitations ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_company_invitations_updated_at
  BEFORE UPDATE ON public.company_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Add company_id to existing tables
ALTER TABLE public.shows ADD COLUMN company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.financial_entries ADD COLUMN company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.team_members ADD COLUMN company_id UUID REFERENCES public.companies(id);

-- 6. Security definer helper functions
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.company_members
  WHERE user_id = _user_id AND active = true
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_user_company_role(_user_id UUID, _company_id UUID)
RETURNS company_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.company_members
  WHERE user_id = _user_id AND company_id = _company_id AND active = true
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_company_admin(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE user_id = _user_id AND company_id = _company_id AND role = 'admin' AND active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.is_company_member(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE user_id = _user_id AND company_id = _company_id AND active = true
  )
$$;

-- 7. RLS policies for companies
CREATE POLICY "System admins full access companies"
  ON public.companies FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can read own company"
  ON public.companies FOR SELECT TO authenticated
  USING (is_company_member(auth.uid(), id));

CREATE POLICY "Company admins can update own company"
  ON public.companies FOR UPDATE TO authenticated
  USING (is_company_admin(auth.uid(), id))
  WITH CHECK (is_company_admin(auth.uid(), id));

-- 8. RLS policies for company_members
CREATE POLICY "System admins full access company_members"
  ON public.company_members FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can read own company members"
  ON public.company_members FOR SELECT TO authenticated
  USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Company admins can manage members"
  ON public.company_members FOR INSERT TO authenticated
  WITH CHECK (is_company_admin(auth.uid(), company_id));

CREATE POLICY "Company admins can update members"
  ON public.company_members FOR UPDATE TO authenticated
  USING (is_company_admin(auth.uid(), company_id))
  WITH CHECK (is_company_admin(auth.uid(), company_id));

CREATE POLICY "Company admins can delete members"
  ON public.company_members FOR DELETE TO authenticated
  USING (is_company_admin(auth.uid(), company_id));

-- 9. RLS policies for company_invitations
CREATE POLICY "System admins full access company_invitations"
  ON public.company_invitations FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Company admins can manage invitations"
  ON public.company_invitations FOR ALL TO authenticated
  USING (is_company_admin(auth.uid(), company_id))
  WITH CHECK (is_company_admin(auth.uid(), company_id));

CREATE POLICY "Users can read own invitations by email"
  ON public.company_invitations FOR SELECT TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- 10. Update shows RLS - drop old user-only policies, add company-based
DROP POLICY IF EXISTS "Users can read own shows" ON public.shows;
DROP POLICY IF EXISTS "Users can create own shows" ON public.shows;
DROP POLICY IF EXISTS "Users can update own shows" ON public.shows;
DROP POLICY IF EXISTS "Users can delete own shows" ON public.shows;

CREATE POLICY "Company members can read shows"
  ON public.shows FOR SELECT TO public
  USING (
    auth.uid() = user_id
    OR is_company_member(auth.uid(), company_id)
  );

CREATE POLICY "Company admins and collaborators can create shows"
  ON public.shows FOR INSERT TO public
  WITH CHECK (
    auth.uid() = user_id
    OR (company_id IS NOT NULL AND get_user_company_role(auth.uid(), company_id) IN ('admin', 'collaborator'))
  );

CREATE POLICY "Company admins and collaborators can update shows"
  ON public.shows FOR UPDATE TO public
  USING (
    auth.uid() = user_id
    OR (company_id IS NOT NULL AND get_user_company_role(auth.uid(), company_id) IN ('admin', 'collaborator'))
  );

CREATE POLICY "Company admins can delete shows"
  ON public.shows FOR DELETE TO public
  USING (
    auth.uid() = user_id
    OR (company_id IS NOT NULL AND is_company_admin(auth.uid(), company_id))
  );

-- 11. Update financial_entries RLS - only company admins
DROP POLICY IF EXISTS "Users can manage own financial_entries" ON public.financial_entries;

CREATE POLICY "Owner or company admin can manage financial_entries"
  ON public.financial_entries FOR ALL TO authenticated
  USING (
    auth.uid() = user_id
    OR (company_id IS NOT NULL AND is_company_admin(auth.uid(), company_id))
  )
  WITH CHECK (
    auth.uid() = user_id
    OR (company_id IS NOT NULL AND is_company_admin(auth.uid(), company_id))
  );

-- 12. Update team_members RLS
DROP POLICY IF EXISTS "Users can manage own team_members" ON public.team_members;

CREATE POLICY "Company members can read team_members"
  ON public.team_members FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR (company_id IS NOT NULL AND is_company_member(auth.uid(), company_id))
  );

CREATE POLICY "Company admins can manage team_members"
  ON public.team_members FOR ALL TO authenticated
  USING (
    auth.uid() = user_id
    OR (company_id IS NOT NULL AND is_company_admin(auth.uid(), company_id))
  )
  WITH CHECK (
    auth.uid() = user_id
    OR (company_id IS NOT NULL AND is_company_admin(auth.uid(), company_id))
  );

-- 13. Migrate existing data: create company for each user with profile
DO $$
DECLARE
  r RECORD;
  new_company_id UUID;
BEGIN
  FOR r IN SELECT user_id, nome, email FROM public.profiles
  LOOP
    INSERT INTO public.companies (name, owner_user_id)
    VALUES (COALESCE(NULLIF(r.nome, ''), r.email), r.user_id)
    RETURNING id INTO new_company_id;

    INSERT INTO public.company_members (company_id, user_id, role, active)
    VALUES (new_company_id, r.user_id, 'admin', true);

    UPDATE public.shows SET company_id = new_company_id WHERE user_id = r.user_id;
    UPDATE public.financial_entries SET company_id = new_company_id WHERE user_id = r.user_id;
    UPDATE public.team_members SET company_id = new_company_id WHERE user_id = r.user_id;
  END LOOP;
END $$;

-- 14. Create indexes
CREATE INDEX idx_company_members_user_id ON public.company_members(user_id);
CREATE INDEX idx_company_members_company_id ON public.company_members(company_id);
CREATE INDEX idx_company_invitations_email ON public.company_invitations(email);
CREATE INDEX idx_company_invitations_token ON public.company_invitations(token);
CREATE INDEX idx_shows_company_id ON public.shows(company_id);
CREATE INDEX idx_financial_entries_company_id ON public.financial_entries(company_id);
CREATE INDEX idx_team_members_company_id ON public.team_members(company_id);
