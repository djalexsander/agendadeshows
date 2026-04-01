
-- ============================================================
-- 1. ROLE ENUM & USER_ROLES TABLE
-- ============================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'client');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Only admins can read all roles, users can read their own
CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 2. PROFILES TABLE
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nome TEXT NOT NULL DEFAULT '',
  nome_artistico TEXT DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  telefone TEXT DEFAULT '',
  cidade TEXT DEFAULT '',
  estado TEXT DEFAULT '',
  status_plano TEXT DEFAULT 'ativo' CHECK (status_plano IN ('ativo', 'inativo', 'trial', 'expirado')),
  valor_plano NUMERIC(10,2) DEFAULT 0,
  vencimento DATE,
  observacoes TEXT DEFAULT '',
  primeiro_acesso BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read own profile
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update own profile  
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins can do everything on profiles
CREATE POLICY "Admins full access profiles" ON public.profiles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, nome)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'nome', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 3. SHOWS TABLE
-- ============================================================
CREATE TABLE public.shows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  cidade TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT '',
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'confirmado', 'finalizado')),
  evento TEXT DEFAULT '',
  horario TEXT DEFAULT '',
  local TEXT DEFAULT '',
  observacoes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shows ENABLE ROW LEVEL SECURITY;

-- Users can only access their own shows
CREATE POLICY "Users can read own shows" ON public.shows
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own shows" ON public.shows
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shows" ON public.shows
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own shows" ON public.shows
  FOR DELETE USING (auth.uid() = user_id);

-- Admins can see all shows
CREATE POLICY "Admins full access shows" ON public.shows
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 4. PAYMENTS TABLE (financial control)
-- ============================================================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado', 'cancelado')),
  forma_pagamento TEXT DEFAULT 'pix',
  data_vencimento DATE,
  data_pagamento DATE,
  observacoes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Only admins can manage payments
CREATE POLICY "Admins full access payments" ON public.payments
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Clients can see their own payments
CREATE POLICY "Clients can view own payments" ON public.payments
  FOR SELECT USING (auth.uid() = client_user_id);

-- ============================================================
-- 5. PIX CONFIG TABLE (admin Pix settings)
-- ============================================================
CREATE TABLE public.pix_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  chave_pix TEXT NOT NULL DEFAULT '',
  tipo_chave TEXT DEFAULT 'cpf' CHECK (tipo_chave IN ('cpf', 'cnpj', 'email', 'telefone', 'aleatoria')),
  nome_beneficiario TEXT DEFAULT '',
  cidade_beneficiario TEXT DEFAULT '',
  qr_code_base64 TEXT DEFAULT '',
  copia_cola TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pix_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access pix_config" ON public.pix_config
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 6. UPDATE TIMESTAMP TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_shows_updated_at BEFORE UPDATE ON public.shows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pix_config_updated_at BEFORE UPDATE ON public.pix_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
