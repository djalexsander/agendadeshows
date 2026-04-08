
-- Function to auto-create company and admin membership when a new profile is created
CREATE OR REPLACE FUNCTION public.handle_new_profile_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_company_id uuid;
  v_company_name text;
BEGIN
  -- Skip if user is a system admin (they may already have a company)
  IF public.has_role(NEW.user_id, 'admin') THEN
    RETURN NEW;
  END IF;

  -- Check if user already has a company membership
  IF EXISTS (SELECT 1 FROM public.company_members WHERE user_id = NEW.user_id) THEN
    RETURN NEW;
  END IF;

  -- Build company name from profile
  v_company_name := COALESCE(NULLIF(NEW.nome_artistico, ''), NULLIF(NEW.nome, ''), NEW.email);

  -- Create company
  INSERT INTO public.companies (name, owner_user_id)
  VALUES (v_company_name, NEW.user_id)
  RETURNING id INTO v_company_id;

  -- Add user as company admin
  INSERT INTO public.company_members (company_id, user_id, role, active)
  VALUES (v_company_id, NEW.user_id, 'admin', true);

  RETURN NEW;
END;
$$;

-- Trigger on profiles insert
CREATE TRIGGER on_profile_created_create_company
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_profile_company();
