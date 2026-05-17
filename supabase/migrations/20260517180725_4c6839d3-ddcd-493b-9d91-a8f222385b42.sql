CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_base_plan_price numeric := 0;
  v_is_self_signup boolean := false;
  v_is_oauth_signup boolean := false;
  v_provider text;
  v_origem text;
  v_trial_days integer := 7;
BEGIN
  v_is_self_signup := COALESCE((NEW.raw_user_meta_data->>'self_signup')::boolean, false);
  v_provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');
  v_is_oauth_signup := v_provider <> 'email';

  -- Treat OAuth signups (Google, etc.) as self signup: they should follow the trial flow,
  -- not become lifetime/free accounts by default.
  IF v_is_oauth_signup THEN
    v_is_self_signup := true;
  END IF;

  IF v_is_self_signup THEN
    SELECT price INTO v_base_plan_price
    FROM public.base_plan_config
    WHERE active = true
    ORDER BY created_at ASC
    LIMIT 1;
    v_base_plan_price := COALESCE(v_base_plan_price, 0);

    SELECT trial_days INTO v_trial_days
    FROM public.signup_config
    LIMIT 1;
    v_trial_days := COALESCE(v_trial_days, 7);
  END IF;

  IF v_is_oauth_signup THEN
    v_origem := v_provider || '_oauth';
  ELSIF v_is_self_signup THEN
    v_origem := 'publico_link';
  ELSE
    v_origem := 'admin_manual';
  END IF;

  INSERT INTO public.profiles (
    user_id, email, nome, telefone, cidade, estado,
    status_plano, origem_cadastro, valor_plano, valor_padrao_na_data,
    plan_type, is_paid, trial_started_at, trial_ends_at, grace_ends_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NEW.raw_user_meta_data->>'nome',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      ''
    ),
    COALESCE(NEW.raw_user_meta_data->>'telefone', ''),
    COALESCE(NEW.raw_user_meta_data->>'cidade', ''),
    COALESCE(NEW.raw_user_meta_data->>'estado', ''),
    CASE WHEN v_is_self_signup THEN 'pending_plan_choice' ELSE 'ativo' END,
    v_origem,
    CASE WHEN v_is_self_signup THEN v_base_plan_price ELSE 0 END,
    CASE WHEN v_is_self_signup THEN v_base_plan_price ELSE 0 END,
    CASE WHEN v_is_self_signup THEN 'free_trial_7_days' ELSE 'lifetime' END,
    CASE WHEN v_is_self_signup THEN false ELSE true END,
    CASE WHEN v_is_self_signup THEN now() ELSE NULL END,
    CASE WHEN v_is_self_signup THEN now() + (v_trial_days || ' days')::interval ELSE NULL END,
    CASE WHEN v_is_self_signup THEN now() + ((v_trial_days + 3) || ' days')::interval ELSE NULL END
  );

  IF v_is_self_signup THEN
    INSERT INTO public.admin_notifications (tipo, titulo, mensagem, referencia_user_id)
    VALUES (
      'novo_cadastro',
      'Novo cadastro' || CASE WHEN v_is_oauth_signup THEN ' (' || v_provider || ')' ELSE '' END,
      'O usuário ' || COALESCE(
        NEW.raw_user_meta_data->>'nome',
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        NEW.email
      ) || ' se cadastrou' ||
      CASE WHEN v_is_oauth_signup THEN ' via ' || v_provider ELSE '' END || '.',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$function$;