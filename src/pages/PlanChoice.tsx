import { useState } from "react";
import { Sparkles, Crown, LogOut, Clock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function PlanChoice() {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<"trial" | "lifetime" | null>(null);

  const handleStartTrial = async () => {
    if (!user) return;
    setLoading("trial");

    const now = new Date();
    const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const { error } = await supabase
      .from("profiles")
      .update({
        plan_type: "free_trial_7_days",
        trial_started_at: now.toISOString(),
        trial_ends_at: trialEnd.toISOString(),
        status_plano: "ativo",
      } as any)
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível ativar o teste grátis.", variant: "destructive" });
      setLoading(null);
      return;
    }

    toast({ title: "Teste grátis ativado! 🎉", description: "Você tem 7 dias de acesso completo." });
    window.location.reload();
  };

  const handleLifetime = async () => {
    if (!user) return;
    setLoading("lifetime");

    // Update status to aguardando_pagamento and set plan_type to lifetime
    const { error } = await supabase
      .from("profiles")
      .update({
        plan_type: "lifetime",
        status_plano: "aguardando_pagamento",
        valor_plano: 50,
      } as any)
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível processar.", variant: "destructive" });
      setLoading(null);
      return;
    }

    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Escolha seu plano</h1>
            <p className="text-muted-foreground mt-1">
              Olá, <strong>{profile?.nome}</strong>! Escolha como quer começar.
            </p>
          </div>
        </div>

        {/* Free Trial Card */}
        <div className="rounded-2xl bg-card border border-border p-6 space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-xl">
            Grátis
          </div>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Comece agora grátis</h2>
              <p className="text-sm text-muted-foreground">Teste o aplicativo gratuitamente por 7 dias</p>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              Acesso completo por 7 dias
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              Sem compromisso
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              Cancele quando quiser
            </li>
          </ul>
          <Button
            onClick={handleStartTrial}
            disabled={loading !== null}
            variant="outline"
            className="w-full h-12 text-base gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all"
          >
            <Clock className="h-5 w-5" />
            {loading === "trial" ? "Ativando..." : "Começar teste grátis"}
          </Button>
        </div>

        {/* Lifetime Card */}
        <div className="rounded-2xl bg-card border-2 border-primary p-6 space-y-4 relative overflow-hidden shadow-lg shadow-primary/10">
          <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-xl">
            Recomendado
          </div>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Crown className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Pague agora</h2>
              <p className="text-sm text-muted-foreground">Plano vitalício por apenas</p>
              <p className="text-2xl font-bold text-primary">R$ 50,00</p>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              Acesso vitalício sem mensalidade
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              Todas as funcionalidades
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              Pagamento único
            </li>
          </ul>
          <Button
            onClick={handleLifetime}
            disabled={loading !== null}
            className="w-full h-12 text-base gap-2 bg-primary hover:bg-primary/90"
          >
            <Shield className="h-5 w-5" />
            {loading === "lifetime" ? "Processando..." : "Assinar plano vitalício"}
          </Button>
        </div>

        {/* Disclaimer */}
        <p className="text-center text-xs text-muted-foreground px-4">
          Após os 7 dias de teste, o acesso será bloqueado caso não haja upgrade para o plano vitalício.
        </p>

        <Button variant="ghost" onClick={signOut} className="w-full gap-2">
          <LogOut className="h-4 w-4" /> Sair
        </Button>
      </div>
    </div>
  );
}
