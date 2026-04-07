ALTER TABLE public.profiles DROP CONSTRAINT profiles_status_plano_check;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_plano_check CHECK (
  status_plano IS NULL OR status_plano = ANY (ARRAY[
    'ativo', 'inativo', 'trial', 'expirado',
    'pendente_pagamento', 'pendente_aprovacao',
    'aguardando_pagamento', 'rejeitado',
    'pagamento_em_analise', 'pending_plan_choice',
    'trial_active', 'trial_expired', 'paid_lifetime', 'blocked'
  ])
);