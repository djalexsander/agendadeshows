ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_plano_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_status_plano_check
CHECK (
  status_plano IS NULL
  OR status_plano = ANY (
    ARRAY[
      'ativo'::text,
      'inativo'::text,
      'trial'::text,
      'expirado'::text,
      'pendente_pagamento'::text
    ]
  )
);