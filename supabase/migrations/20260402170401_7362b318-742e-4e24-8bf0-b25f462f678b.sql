
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.notify_admins_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_supabase_url text;
  v_anon_key text;
BEGIN
  -- Get config from vault or use hardcoded project URL
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  IF v_supabase_url IS NULL THEN
    v_supabase_url := 'https://mcrfdcqqdnqbvtlfduvb.supabase.co';
  END IF;
  
  v_anon_key := current_setting('app.settings.supabase_anon_key', true);
  IF v_anon_key IS NULL THEN
    v_anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jcmZkY3FxZG5xYnZ0bGZkdXZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNzc0MDUsImV4cCI6MjA5MDY1MzQwNX0.c-S-5JO1EdwEQgUsZUkfMp-UHPw6H720ZS0zz72kqp0';
  END IF;

  PERFORM extensions.http_post(
    url := v_supabase_url || '/functions/v1/send-push',
    body := json_build_object(
      'title', NEW.titulo,
      'body', NEW.mensagem,
      'url', '/admin',
      'target_role', 'admin'
    )::text,
    headers := json_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon_key
    )::jsonb
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_admin_notification_push
AFTER INSERT ON public.admin_notifications
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_push();
