import { Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function PendingApproval() {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="h-16 w-16 rounded-2xl bg-yellow-500/20 flex items-center justify-center mx-auto">
            <Clock className="h-8 w-8 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Aguardando Aprovação</h1>
            <p className="text-muted-foreground mt-2">
              Olá, <strong>{profile?.nome}</strong>! Seu cadastro foi recebido e está sendo analisado pelo administrador.
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border p-6 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-[hsl(140_60%_45%)]/20 flex items-center justify-center text-xs font-bold text-[hsl(140_60%_55%)]">1</div>
              <p className="text-sm"><strong>Cadastro enviado</strong> — concluído ✓</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-xs font-bold text-yellow-400">2</div>
              <p className="text-sm"><strong>Aguardando aprovação</strong> — em análise</p>
            </div>
            <div className="flex items-center gap-3 opacity-40">
              <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">3</div>
              <p className="text-sm">Enviar comprovante de pagamento</p>
            </div>
            <div className="flex items-center gap-3 opacity-40">
              <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">4</div>
              <p className="text-sm">Acesso liberado</p>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Você será notificado assim que o administrador aprovar seu cadastro.
        </p>

        <Button variant="ghost" onClick={signOut} className="w-full gap-2">
          <LogOut className="h-4 w-4" /> Sair
        </Button>
      </div>
    </div>
  );
}
