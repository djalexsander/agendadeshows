-- Add plan management columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_type text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_paid boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz DEFAULT NULL;

-- Update existing active users to paid_lifetime so they keep access
UPDATE public.profiles
SET plan_type = 'lifetime',
    is_paid = true
WHERE status_plano = 'ativo';

-- Update the handle_new_user function to set pending_plan_choice for self-signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_valor_padrao numeric := 0;
  v_is_self_signup boolean := false;
BEGIN
  v_is_self_signup := COALESCE((NEW.raw_user_meta_data->>'self_signup')::boolean, false);

  IF v_is_self_signup THEN
    SELECT valor_padrao INTO v_valor_padrao FROM public.signup_config LIMIT 1;
  END IF;

  INSERT INTO public.profiles (user_id, email, nome, telefone, status_plano, origem_cadastro, valor_plano, valor_padrao_na_data, plan_type, is_paid)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'nome', ''),
    COALESCE(NEW.raw_user_meta_data->>'telefone', ''),
    CASE 
      WHEN v_is_self_signup THEN 'pending_plan_choice'
      ELSE 'ativo'
    END,
    CASE
      WHEN v_is_self_signup THEN 'publico_link'
      ELSE 'admin_manual'
    END,
    CASE
      WHEN v_is_self_signup THEN COALESCE(v_valor_padrao, 0)
      ELSE 0
    END,
    CASE
      WHEN v_is_self_signup THEN COALESCE(v_valor_padrao, 0)
      ELSE 0
    END,
    CASE
      WHEN v_is_self_signup THEN 'none'
      ELSE 'lifetime'
    END,
    CASE
      WHEN v_is_self_signup THEN false
      ELSE true
    END
  );

  IF v_is_self_signup THEN
    INSERT INTO public.admin_notifications (tipo, titulo, mensagem, referencia_user_id)
    VALUES (
      'novo_cadastro',
      'Novo cadastro',
      'O usuário ' || COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email) || ' se cadastrou.',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$function$;