
-- Confirm email for the user
UPDATE auth.users 
SET email_confirmed_at = now(), 
    updated_at = now()
WHERE email = 'alexsander.xaviervieira@gmail.com' 
  AND email_confirmed_at IS NULL;
