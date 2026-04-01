-- Storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprovantes', 'comprovantes', true);

-- Storage policies
CREATE POLICY "Authenticated users can upload comprovantes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'comprovantes');

CREATE POLICY "Anyone can read comprovantes"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'comprovantes');

-- Payment proofs table
CREATE TABLE public.payment_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id uuid NOT NULL,
  image_url text NOT NULL DEFAULT '',
  mensagem text DEFAULT '',
  status text DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can insert own proofs"
ON public.payment_proofs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = client_user_id);

CREATE POLICY "Clients can read own proofs"
ON public.payment_proofs FOR SELECT
TO authenticated
USING (auth.uid() = client_user_id);

CREATE POLICY "Admins full access payment_proofs"
ON public.payment_proofs FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_payment_proofs_updated_at
  BEFORE UPDATE ON public.payment_proofs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();