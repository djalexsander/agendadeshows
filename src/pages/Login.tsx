import { useState, useEffect } from "react";
import { CalendarDays, LogIn, Eye, EyeOff, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { APP_VERSION } from "@/lib/version";
import { signupSchema, loginSchema, firstZodError } from "@/lib/validation";

export default function Login() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signupConfig, setSignupConfig] = useState<{ cadastro_ativo: boolean; instrucoes_pagamento: string } | null>(null);
  const [basePlanPrice, setBasePlanPrice] = useState<number | null>(null);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    (supabase.from("signup_config") as any).select("*").limit(1).then(({ data }: any) => {
      if (data && data.length > 0) setSignupConfig(data[0]);
    });
    (supabase.from("base_plan_config") as any).select("price").eq("active", true).limit(1).single().then(({ data }: any) => {
      if (data) setBasePlanPrice(data.price);
    });
  }, []);

  const isSignup = mode === "signup";

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setNome("");
    setTelefone("");
    setCidade("");
    setEstado("");
    setShowPassword(false);
  };

  const switchMode = (nextMode: "login" | "signup") => {
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
    if (loading) return; // evita duplo submit

    if (isSignup) {
      const parsed = signupSchema.safeParse({
        nome,
        email,
        telefone,
        password,
        confirmPassword,
        cidade,
        estado,
      });
      if (!parsed.success) {
        toast({
          title: "Erro",
          description: firstZodError(parsed.error) ?? "Verifique os dados informados.",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);
      const { error, needsEmailConfirmation } = await signUp(
        parsed.data.email,
        parsed.data.password,
        parsed.data.nome,
        parsed.data.telefone,
        parsed.data.cidade ?? "",
        parsed.data.estado ?? "",
      );
      setLoading(false);

      if (error) {
        toast({ title: "Erro", description: error.message || "Erro ao criar conta.", variant: "destructive" });
        return;
      }

      if (needsEmailConfirmation) {
        toast({ title: "Cadastro realizado!", description: "Verifique seu e-mail para confirmar a conta e depois faça login." });
        switchMode("login");
        return;
      }

      toast({ title: "Cadastro realizado!", description: "Redirecionando para o pagamento..." });
      return;
    }

    // Login
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast({
        title: "Erro",
        description: firstZodError(parsed.error) ?? "Verifique os dados informados.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await signIn(parsed.data.email, parsed.data.password);
    setLoading(false);

    if (error) {
      toast({ title: "Erro ao entrar", description: "E-mail ou senha incorretos.", variant: "destructive" });
    }
  };


  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto">
            <CalendarDays className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Minha Agenda</h1>
            <p className="text-muted-foreground mt-1">Agenda, financeiro e equipe — tudo em um só app.</p>
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border p-6 space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-secondary/40 p-1">
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
            </div>

            <div className="text-center">
              <h2 className="text-lg font-semibold">
                {isSignup ? "Criar Conta" : "Entrar"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isSignup
                  ? signupConfig?.cadastro_ativo === false
                    ? "Cadastro público desativado no momento."
                    : "Preencha seus dados para criar sua conta"
                  : "Acesse sua conta"}
              </p>
              {isSignup && signupConfig?.cadastro_ativo !== false && basePlanPrice != null && basePlanPrice > 0 && (
                <p className="text-sm font-semibold text-primary mt-1">
                  Valor de acesso: R$ {basePlanPrice.toFixed(2)}
                </p>
              )}
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

            {isSignup && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    placeholder="Sua cidade"
                    className="h-12 bg-secondary/50 border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Select value={estado} onValueChange={setEstado}>
                    <SelectTrigger className="h-12 bg-secondary/50 border-border">
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {ESTADOS_BR.map((uf) => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
              <Label htmlFor="password">{isSignup ? "Senha *" : "Senha"}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignup ? "Mínimo 6 caracteres" : "••••••••"}
                  className="h-12 bg-secondary/50 border-border pr-12"
                  autoComplete={isSignup ? "new-password" : "current-password"}
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

            {isSignup && (
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
              disabled={loading || !email || !password || (isSignup && !confirmPassword) || (isSignup && (!nome || !telefone)) || (isSignup && signupConfig?.cadastro_ativo === false)}
              className="w-full h-12 text-base gap-2 bg-primary hover:bg-primary/90"
            >
              {isSignup ? <UserPlus className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
              {loading
                ? isSignup ? "Criando..." : "Entrando..."
                : isSignup ? "Criar Conta" : "Entrar"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {isSignup
            ? "Após criar a conta você poderá ativar o teste grátis ou contratar o plano."
            : "Problemas para entrar? Fale com o administrador."}
        </p>
        <p className="text-center text-[10px] text-muted-foreground/50">{APP_VERSION}</p>
      </div>
    </div>
  );
}
