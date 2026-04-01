import { useState } from "react";
import { Music, LogIn, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const isSignup = mode === "signup";

  const resetForm = () => {
    setNome("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  };

  const switchMode = (nextMode: "login" | "signup") => {
    setMode(nextMode);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSignup) {
      if (!nome || !email || !password || !confirmPassword) return;

      if (password.length < 6) {
        toast({
          title: "Erro ao ativar conta",
          description: "A senha deve ter pelo menos 6 caracteres.",
          variant: "destructive",
        });
        return;
      }

      if (password !== confirmPassword) {
        toast({
          title: "Erro ao ativar conta",
          description: "As senhas não coincidem.",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);
      const { error, needsEmailConfirmation } = await signUp(email, password, nome);
      setLoading(false);

      if (error) {
        toast({
          title: "Erro ao ativar conta",
          description: error.message || "Não foi possível criar sua conta.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Conta criada com sucesso",
        description: needsEmailConfirmation
          ? "Confira seu e-mail para confirmar a conta e depois faça login."
          : "Sua conta foi ativada. Você já pode acessar a plataforma.",
      });

      if (needsEmailConfirmation) {
        switchMode("login");
      }

      return;
    }

    if (!email || !password) return;

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      toast({
        title: "Erro ao entrar",
        description: "E-mail ou senha incorretos.",
        variant: "destructive",
      });
    }
  };

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
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-secondary/40 p-1">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={`h-10 rounded-lg text-sm font-medium transition-colors ${
                  !isSignup ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className={`h-10 rounded-lg text-sm font-medium transition-colors ${
                  isSignup ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Ativar conta
              </button>
            </div>

            <div className="text-center">
              <h2 className="text-lg font-semibold">{isSignup ? "Primeiro acesso" : "Entrar"}</h2>
              <p className="text-sm text-muted-foreground">
                {isSignup ? "Crie sua conta para começar a usar a plataforma" : "Acesse sua conta"}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome ou nome artístico"
                  className="h-12 bg-secondary/50 border-border"
                  autoComplete="name"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
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
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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
                <Label htmlFor="confirm-password">Confirmar senha</Label>
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
              disabled={loading || !email || !password || (isSignup && (!nome || !confirmPassword))}
              className="w-full h-12 text-base gap-2 bg-primary hover:bg-primary/90"
            >
              <LogIn className="h-5 w-5" />
              {loading ? (isSignup ? "Ativando..." : "Entrando...") : isSignup ? "Ativar conta" : "Entrar"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {isSignup ? "Depois da ativação, use seu e-mail e senha para entrar." : "Acesso fornecido pelo administrador"}
        </p>
      </div>
    </div>
  );
}
