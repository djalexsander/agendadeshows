import { useState } from "react";
import { Mail, KeyRound, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialEmail?: string;
}

export function ForgotPasswordDialog({ open, onOpenChange, initialEmail }: ForgotPasswordDialogProps) {
  const [email, setEmail] = useState(initialEmail ?? "");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  // Mantém o email sincronizado quando o dialog abre
  const handleOpenChange = (next: boolean) => {
    if (next) {
      setEmail(initialEmail ?? "");
      setSent(false);
    }
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast({
        title: "E-mail inválido",
        description: "Informe um e-mail válido para continuar.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    if (error) {
      toast({
        title: "Erro ao enviar",
        description: error.message || "Não foi possível enviar o e-mail. Tente novamente.",
        variant: "destructive",
      });
      return;
    }

    setSent(true);
    toast({
      title: "E-mail enviado",
      description: "Verifique sua caixa de entrada para redefinir sua senha.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/12 ring-1 ring-primary/20 flex items-center justify-center mb-2">
            <KeyRound className="h-5 w-5 text-primary" />
          </div>
          <DialogTitle className="text-center">Recuperar senha</DialogTitle>
          <DialogDescription className="text-center">
            {sent
              ? "Enviamos um link de redefinição para o seu e-mail. Confira a caixa de entrada e o spam."
              : "Informe seu e-mail e enviaremos um link para criar uma nova senha."}
          </DialogDescription>
        </DialogHeader>

        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="h-11 pl-10 bg-secondary/40"
                  autoFocus
                  autoComplete="email"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || !email} className="gap-2">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    Enviar link
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-secondary/40 p-3 text-sm text-center">
              <span className="text-muted-foreground">Link enviado para:</span>
              <p className="font-semibold mt-1 break-all">{email}</p>
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)} className="w-full">
                Entendi
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
