
CREATE TABLE public.module_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  billing_period text NOT NULL DEFAULT 'monthly',
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.module_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access module_catalog"
ON public.module_catalog FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients can read active modules"
ON public.module_catalog FOR SELECT
TO authenticated
USING (active = true);

CREATE TRIGGER update_module_catalog_updated_at
BEFORE UPDATE ON public.module_catalog
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.module_catalog (module_name, display_name, description, price, billing_period, sort_order) VALUES
('financeiro', 'Financeiro', 'Controle financeiro e acompanhamento de valores', 15.00, 'monthly', 1),
('equipe', 'Equipe', 'Gestão de equipe e usuários da operação', 15.00, 'monthly', 2),
('relatorios', 'Relatórios', 'Visão resumida e indicadores do sistema', 10.00, 'monthly', 3),
('export_png', 'Exportação PNG', 'Exportação visual profissional dos eventos', 5.00, 'monthly', 4),
('gps', 'Rotas / GPS', 'Atalhos para navegação e rota dos eventos', 5.00, 'monthly', 5);
