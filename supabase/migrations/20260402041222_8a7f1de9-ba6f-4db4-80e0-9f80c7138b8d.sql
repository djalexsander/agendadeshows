-- Add approval tracking to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approved_by uuid;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- Create admin notifications table
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL DEFAULT 'novo_cadastro',
  titulo text NOT NULL DEFAULT '',
  mensagem text NOT NULL DEFAULT '',
  referencia_user_id uuid,
  lida boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access notifications"
ON public.admin_notifications FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;

-- Update handle_new_user to set status based on self_signup and create notification
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, nome, telefone, status_plano)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'nome', ''),
    COALESCE(NEW.raw_user_meta_data->>'telefone', ''),
    CASE 
      WHEN (NEW.raw_user_meta_data->>'self_signup')::boolean = true THEN 'pendente_aprovacao'
      ELSE 'ativo'
    END
  );

  IF (NEW.raw_user_meta_data->>'self_signup')::boolean = true THEN
    INSERT INTO public.admin_notifications (tipo, titulo, mensagem, referencia_user_id)
    VALUES (
      'novo_cadastro',
      'Novo cadastro',
      'O usuário ' || COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email) || ' se cadastrou e aguarda aprovação.',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$function$;