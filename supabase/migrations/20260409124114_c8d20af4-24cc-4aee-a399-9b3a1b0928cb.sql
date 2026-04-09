
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_base_plan_price numeric := 0;
  v_is_self_signup boolean := false;
BEGIN
  v_is_self_signup := COALESCE((NEW.raw_user_meta_data->>'self_signup')::boolean, false);

  IF v_is_self_signup THEN
    SELECT price INTO v_base_plan_price
    FROM public.base_plan_config
    WHERE active = true
    ORDER BY created_at ASC
    LIMIT 1;

    v_base_plan_price := COALESCE(v_base_plan_price, 0);
  END IF;

  INSERT INTO public.profiles (user_id, email, nome, telefone, cidade, estado, status_plano, origem_cadastro, valor_plano, valor_padrao_na_data, plan_type, is_paid, trial_started_at, trial_ends_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'nome', ''),
    COALESCE(NEW.raw_user_meta_data->>'telefone', ''),
    COALESCE(NEW.raw_user_meta_data->>'cidade', ''),
    COALESCE(NEW.raw_user_meta_data->>'estado', ''),
    CASE 
      WHEN v_is_self_signup THEN 'pending_plan_choice'
      ELSE 'ativo'
    END,
    CASE
      WHEN v_is_self_signup THEN 'publico_link'
      ELSE 'admin_manual'
    END,
    CASE
      WHEN v_is_self_signup THEN v_base_plan_price
      ELSE 0
    END,
    CASE
      WHEN v_is_self_signup THEN v_base_plan_price
      ELSE 0
    END,
    CASE
      WHEN v_is_self_signup THEN 'free_trial_7_days'
      ELSE 'lifetime'
    END,
    CASE
      WHEN v_is_self_signup THEN false
      ELSE true
    END,
    CASE
      WHEN v_is_self_signup THEN now()
      ELSE NULL
    END,
    CASE
      WHEN v_is_self_signup THEN now() + interval '7 days'
      ELSE NULL
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
