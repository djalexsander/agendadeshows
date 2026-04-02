import { useState } from "react";
import { Music, LogIn, Eye, EyeOff, UserCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { APP_VERSION } from "@/lib/version";

export default function Login() {
  const [mode, setMode] = useState<"login" | "activate" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const isActivate = mode === "activate";
  const isSignup = mode === "signup";

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setNome("");
    setTelefone("");
    setShowPassword(false);
    setSignupSuccess(false);
  };

  const switchMode = (nextMode: "login" | "activate" | "signup") => {
    setMode(nextMode);
    resetForm();
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSignup) {
      if (!nome || !email || !telefone || !password || !confirmPassword) {
        toast({ title: "Erro", description: "Preencha todos os campos.", variant: "destructive" });
        return;
      }
      const phoneDigits = telefone.replace(/\D/g, "");
      if (phoneDigits.length < 10) {
        toast({ title: "Erro", description: "Informe um telefone válido.", variant: "destructive" });
        return;
      }
      if (password.length < 6) {
        toast({ title: "Erro", description: "A senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
        return;
      }
      if (password !== confirmPassword) {
        toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
        return;
      }

      setLoading(true);
      const { error } = await signUp(email, password, nome, telefone);
      setLoading(false);

      if (error) {
        toast({ title: "Erro", description: error.message || "Erro ao criar conta.", variant: "destructive" });
        return;
      }

      // Sign out immediately so user sees pending screen on next login
      await supabase.auth.signOut();
      setSignupSuccess(true);
      return;
    }

    if (isActivate) {
      if (!email || !password || !confirmPassword) return;
      if (password.length < 6) {
        toast({ title: "Erro", description: "A senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
        return;
      }
      if (password !== confirmPassword) {
        toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
        return;
      }

      setLoading(true);
      const response = await supabase.functions.invoke("activate-account", {
        body: { email, password },
      });
      setLoading(false);

      if (response.error || response.data?.error) {
        toast({ title: "Erro", description: response.data?.error || response.error?.message, variant: "destructive" });
        return;
      }

      toast({ title: "Conta ativada!", description: "Agora faça login com seu e-mail e senha." });
      switchMode("login");
      setEmail(email);
      return;
    }

    // Login
    if (!email || !password) return;
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      toast({ title: "Erro ao entrar", description: "E-mail ou senha incorretos.", variant: "destructive" });
    }
  };

  if (signupSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-3">
            <div className="h-16 w-16 rounded-2xl bg-[hsl(140_60%_45%)]/20 flex items-center justify-center mx-auto">
              <UserCheck className="h-8 w-8 text-[hsl(140_60%_55%)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Cadastro Enviado!</h1>
              <p className="text-muted-foreground mt-2">
                Seu cadastro foi recebido com sucesso. O administrador irá analisar e aprovar sua conta em breve.
              </p>
            </div>
          </div>
          <div className="rounded-2xl bg-card border border-border p-6 space-y-4">
            <div className="space-y-2 text-center">
              <p className="text-sm text-muted-foreground">
                Você receberá acesso assim que o administrador aprovar seu cadastro e o pagamento for confirmado.
              </p>
            </div>
            <Button onClick={() => switchMode("login")} className="w-full h-11 gap-2">
              <LogIn className="h-4 w-4" /> Ir para Login
            </Button>
          </div>
          <p className="text-center text-[10px] text-muted-foreground/50">{APP_VERSION}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto">
            <Music className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Agenda de Shows</h1>
            <p className="text-muted-foreground mt-1">Gerencie sua agenda musical</p>
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border p-6 space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-secondary/40 p-1">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={`h-10 rounded-lg text-sm font-medium transition-colors ${
                  mode === "login" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className={`h-10 rounded-lg text-sm font-medium transition-colors ${
                  mode === "signup" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Criar Conta
              </button>
              <button
                type="button"
                onClick={() => switchMode("activate")}
                className={`h-10 rounded-lg text-sm font-medium transition-colors ${
                  mode === "activate" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Ativar
              </button>
            </div>

            <div className="text-center">
              <h2 className="text-lg font-semibold">
                {isSignup ? "Criar Conta" : isActivate ? "Primeiro acesso" : "Entrar"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isSignup
                  ? "Preencha seus dados para solicitar acesso"
                  : isActivate
                  ? "Defina sua senha para ativar sua conta"
                  : "Acesse sua conta"}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div className="space-y-2">
                <Label htmlFor="nome">Nome completo *</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome completo"
                  className="h-12 bg-secondary/50 border-border"
                />
              </div>
            )}

            {isSignup && (
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone *</Label>
                <Input
                  id="telefone"
                  value={telefone}
                  onChange={(e) => setTelefone(formatPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  className="h-12 bg-secondary/50 border-border"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">E-mail{isSignup ? " *" : ""}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="h-12 bg-secondary/50 border-border"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{isActivate || isSignup ? "Senha *" : "Senha"}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isActivate || isSignup ? "Mínimo 6 caracteres" : "••••••••"}
                  className="h-12 bg-secondary/50 border-border pr-12"
                  autoComplete={isActivate || isSignup ? "new-password" : "current-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {(isActivate || isSignup) && (
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar senha *</Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita sua senha"
                  className="h-12 bg-secondary/50 border-border"
                  autoComplete="new-password"
                />
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !email || !password || ((isActivate || isSignup) && !confirmPassword) || (isSignup && (!nome || !telefone))}
              className="w-full h-12 text-base gap-2 bg-primary hover:bg-primary/90"
            >
              {isSignup ? <UserPlus className="h-5 w-5" /> : isActivate ? <UserCheck className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
              {loading
                ? isSignup ? "Criando..." : isActivate ? "Ativando..." : "Entrando..."
                : isSignup ? "Criar Conta" : isActivate ? "Ativar conta" : "Entrar"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {isSignup
            ? "Após o cadastro, aguarde a aprovação do administrador."
            : isActivate
            ? "Use o e-mail informado pelo administrador."
            : "Acesso fornecido pelo administrador"}
        </p>
        <p className="text-center text-[10px] text-muted-foreground/50">{APP_VERSION}</p>
      </div>
    </div>
  );
}
