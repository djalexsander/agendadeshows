-- Add tracking fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS origem_cadastro text DEFAULT 'admin_manual';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS valor_padrao_na_data numeric DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS data_envio_comprovante timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS data_aprovacao_pagamento timestamptz;

-- Create signup_config table
CREATE TABLE IF NOT EXISTS public.signup_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  valor_padrao numeric NOT NULL DEFAULT 0,
  cadastro_ativo boolean NOT NULL DEFAULT true,
  instrucoes_pagamento text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.signup_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access signup_config"
ON public.signup_config FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read signup_config"
ON public.signup_config FOR SELECT
TO anon, authenticated
USING (true);

-- Insert default config row
INSERT INTO public.signup_config (valor_padrao, cadastro_ativo, instrucoes_pagamento)
VALUES (0, true, 'Realize o pagamento via Pix e envie o comprovante para liberar seu acesso.')
ON CONFLICT DO NOTHING;

-- Update handle_new_user to set origem and fetch default price
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

  -- Fetch default price for self-signups
  IF v_is_self_signup THEN
    SELECT valor_padrao INTO v_valor_padrao FROM public.signup_config LIMIT 1;
  END IF;

  INSERT INTO public.profiles (user_id, email, nome, telefone, status_plano, origem_cadastro, valor_plano, valor_padrao_na_data)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'nome', ''),
    COALESCE(NEW.raw_user_meta_data->>'telefone', ''),
    CASE 
      WHEN v_is_self_signup THEN 'pendente_aprovacao'
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
    END
  );

  IF v_is_self_signup THEN
    INSERT INTO public.admin_notifications (tipo, titulo, mensagem, referencia_user_id)
    VALUES (
      'novo_cadastro',
      'Novo cadastro',
      'O usuário ' || COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email) || ' se cadastrou pelo link público e aguarda aprovação. Valor: R$ ' || COALESCE(v_valor_padrao, 0)::text,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$function$;