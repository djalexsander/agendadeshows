import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Eye, EyeOff, KeyRound, Loader2, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [checking, setChecking] = useState(true);
  const [validRecovery, setValidRecovery] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Detecta sessão de recovery (Supabase processa o hash automaticamente)
  useEffect(() => {
    const hash = window.location.hash || "";
    const isRecoveryHash = hash.includes("type=recovery") || hash.includes("access_token");

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setValidRecovery(true);
        setChecking(false);
      }
    });

    // Fallback: verifica se já existe uma sessão (caso o evento já tenha ocorrido)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setValidRecovery(true);
      } else if (!isRecoveryHash) {
        setValidRecovery(false);
      }
      setChecking(false);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha precisa ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "Confirme a mesma senha nos dois campos.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast({
        title: "Erro ao redefinir",
        description: error.message || "Não foi possível atualizar a senha.",
        variant: "destructive",
      });
      return;
    }

    setSuccess(true);
    toast({ title: "Senha atualizada!", description: "Você já pode entrar com a nova senha." });

    // Faz logout para forçar novo login com a senha nova
    await supabase.auth.signOut();
    setTimeout(() => navigate("/", { replace: true }), 1500);
  };

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Background ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle variant="compact" />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md space-y-6">
          {/* Logo */}
          <div className="text-center space-y-3">
            <div className="h-14 w-14 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto shadow-glow">
              <CalendarDays className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Minha Agenda</h1>
              <p className="text-xs text-muted-foreground mt-1">Redefinição de senha</p>
            </div>
          </div>

          <div className="rounded-2xl bg-card border border-border/70 shadow-elevated p-6 sm:p-7 space-y-6">
            {checking ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Verificando link...</p>
              </div>
            ) : !validRecovery ? (
              <div className="text-center space-y-4 py-4">
                <div className="mx-auto h-12 w-12 rounded-2xl bg-destructive/10 ring-1 ring-destructive/20 flex items-center justify-center">
                  <KeyRound className="h-5 w-5 text-destructive" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">Link inválido ou expirado</h2>
                  <p className="text-sm text-muted-foreground">
                    Este link de redefinição não é válido. Solicite um novo na tela de login.
                  </p>
                </div>
                <Button onClick={() => navigate("/", { replace: true })} className="w-full">
                  Voltar para o login
                </Button>
              </div>
            ) : success ? (
              <div className="text-center space-y-4 py-4">
                <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/12 ring-1 ring-primary/20 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">Senha redefinida!</h2>
                  <p className="text-sm text-muted-foreground">
                    Redirecionando para a tela de login...
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="text-center space-y-2">
                  <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/12 ring-1 ring-primary/20 flex items-center justify-center">
                    <KeyRound className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight">Criar nova senha</h2>
                  <p className="text-sm text-muted-foreground">
                    Defina uma senha forte para acessar sua conta.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Nova senha</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="h-11 bg-secondary/40 pr-11"
                        autoComplete="new-password"
                        autoFocus
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

                  <div className="space-y-2">
                    <Label htmlFor="confirm-new-password">Confirmar nova senha</Label>
                    <Input
                      id="confirm-new-password"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita sua senha"
                      className="h-11 bg-secondary/40"
                      autoComplete="new-password"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || !password || !confirmPassword}
                    className="w-full h-11 text-sm font-semibold gap-2 shadow-glow"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Atualizando...
                      </>
                    ) : (
                      <>
                        <KeyRound className="h-4 w-4" />
                        Redefinir senha
                      </>
                    )}
                  </Button>
                </form>
              </>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Conexão segura e criptografada</span>
          </div>
        </div>
      </div>
    </div>
  );
}
