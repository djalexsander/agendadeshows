import { useState, useEffect } from "react";
import {
  CalendarDays,
  LogIn,
  Eye,
  EyeOff,
  UserPlus,
  Sparkles,
  DollarSign,
  Users,
  ShieldCheck,
} from "lucide-react";
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
import { ThemeToggle } from "@/components/ThemeToggle";

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
    if (loading) return;

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

  const features = [
    { icon: CalendarDays, title: "Agenda inteligente", desc: "Calendário visual com seus próximos shows e eventos." },
    { icon: DollarSign, title: "Financeiro completo", desc: "Receitas, despesas e relatórios em um só lugar." },
    { icon: Users, title: "Equipe organizada", desc: "Convide colaboradores e gerencie sua produção." },
  ];

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Background ambient glow — sutil e adapta aos dois temas */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-primary/10 blur-3xl" />
      </div>

      {/* Theme toggle no canto superior direito */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle variant="compact" />
      </div>

      <div className="relative z-10 min-h-screen grid lg:grid-cols-2">
        {/* Brand panel — só desktop */}
        <div className="hidden lg:flex flex-col justify-between p-10 xl:p-14 border-r border-border/60 bg-gradient-surface">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <CalendarDays className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">Minha Agenda</h1>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Plataforma para músicos</p>
            </div>
          </div>

          <div className="space-y-8 max-w-md">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 backdrop-blur px-3 py-1">
                <Sparkles className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">SaaS para artistas</span>
              </div>
              <h2 className="text-3xl xl:text-4xl font-bold tracking-tight leading-tight">
                Sua agenda, financeiro e equipe — <span className="text-primary">tudo em um só app</span>.
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Organize seus shows, controle suas finanças e gerencie sua produção com a praticidade que você merece.
              </p>
            </div>

            <ul className="space-y-4">
              {features.map((f) => (
                <li key={f.title} className="flex gap-3">
                  <div className="h-9 w-9 shrink-0 rounded-xl bg-primary/12 ring-1 ring-primary/20 flex items-center justify-center">
                    <f.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold">{f.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Seus dados protegidos e criptografados</span>
          </div>
        </div>

        {/* Form panel */}
        <div className="flex items-center justify-center p-4 sm:p-6 lg:p-10">
          <div className="w-full max-w-md space-y-6">
            {/* Logo mobile-only */}
            <div className="lg:hidden text-center space-y-3">
              <div className="h-14 w-14 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto shadow-glow">
                <CalendarDays className="h-7 w-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Minha Agenda</h1>
                <p className="text-xs text-muted-foreground mt-1">Agenda, financeiro e equipe — tudo em um só app.</p>
              </div>
            </div>

            <div className="rounded-2xl bg-card border border-border/70 shadow-elevated p-6 sm:p-7 space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-secondary/60 p-1">
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className={`h-10 rounded-lg text-sm font-medium transition-base ${
                      mode === "login"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Entrar
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode("signup")}
                    className={`h-10 rounded-lg text-sm font-medium transition-base ${
                      mode === "signup"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Criar Conta
                  </button>
                </div>

                <div className="text-center space-y-1">
                  <h2 className="text-xl font-bold tracking-tight">
                    {isSignup ? "Crie sua conta" : "Bem-vindo de volta"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {isSignup
                      ? signupConfig?.cadastro_ativo === false
                        ? "Cadastro público desativado no momento."
                        : "Preencha seus dados para começar"
                      : "Entre para acessar sua agenda"}
                  </p>
                  {isSignup && signupConfig?.cadastro_ativo !== false && basePlanPrice != null && basePlanPrice > 0 && (
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 ring-1 ring-primary/20 px-3 py-1 mt-2">
                      <DollarSign className="h-3 w-3 text-primary" />
                      <span className="text-xs font-semibold text-primary">
                        Acesso por R$ {basePlanPrice.toFixed(2)}
                      </span>
                    </div>
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
                      className="h-11 bg-secondary/40"
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
                      className="h-11 bg-secondary/40"
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
                        className="h-11 bg-secondary/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="estado">Estado</Label>
                      <Select value={estado} onValueChange={setEstado}>
                        <SelectTrigger className="h-11 bg-secondary/40">
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
                    className="h-11 bg-secondary/40"
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
                      className="h-11 bg-secondary/40 pr-11"
                      autoComplete={isSignup ? "new-password" : "current-password"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-base"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                      className="h-11 bg-secondary/40"
                      autoComplete="new-password"
                    />
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading || !email || !password || (isSignup && !confirmPassword) || (isSignup && (!nome || !telefone)) || (isSignup && signupConfig?.cadastro_ativo === false)}
                  className="w-full h-11 text-sm font-semibold gap-2 shadow-glow"
                >
                  {isSignup ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                  {loading
                    ? isSignup ? "Criando..." : "Entrando..."
                    : isSignup ? "Criar Conta" : "Entrar"}
                </Button>
              </form>
            </div>

            <div className="text-center space-y-1">
              <p className="text-xs text-muted-foreground">
                {isSignup
                  ? "Após criar a conta você poderá ativar o teste grátis ou contratar o plano."
                  : "Problemas para entrar? Fale com o administrador."}
              </p>
              <p className="text-[10px] text-muted-foreground/50">{APP_VERSION}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
