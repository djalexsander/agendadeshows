import { XCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function RejectedPage() {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="h-16 w-16 rounded-2xl bg-destructive/20 flex items-center justify-center mx-auto">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Cadastro não aprovado</h1>
            <p className="text-muted-foreground mt-2">
              Olá, <strong>{profile?.nome}</strong>. Seu cadastro não foi aprovado pelo administrador.
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border p-6">
          <p className="text-sm text-muted-foreground text-center">
            Se você acredita que houve um engano, entre em contato com o administrador para revisão.
          </p>
        </div>

        <Button variant="ghost" onClick={signOut} className="w-full gap-2">
          <LogOut className="h-4 w-4" /> Sair
        </Button>
      </div>
    </div>
  );
}
