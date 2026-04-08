
ALTER TABLE public.financial_entries
  ADD COLUMN IF NOT EXISTS data_lancamento date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS data_vencimento date,
  ADD COLUMN IF NOT EXISTS data_pagamento date,
  ADD COLUMN IF NOT EXISTS categoria text,
  ADD COLUMN IF NOT EXISTS forma_pagamento text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS pessoa text,
  ADD COLUMN IF NOT EXISTS comprovante_url text,
  ADD COLUMN IF NOT EXISTS parcelas integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parcela_atual integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS recorrencia text NOT NULL DEFAULT 'nenhuma',
  ADD COLUMN IF NOT EXISTS show_id uuid;

-- Index for common filters
CREATE INDEX IF NOT EXISTS idx_financial_entries_categoria ON public.financial_entries(categoria);
CREATE INDEX IF NOT EXISTS idx_financial_entries_status ON public.financial_entries(status);
CREATE INDEX IF NOT EXISTS idx_financial_entries_data_lancamento ON public.financial_entries(data_lancamento);
