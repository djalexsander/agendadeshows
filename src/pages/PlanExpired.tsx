import { useState } from "react";
import { CalendarX, Crown, LogOut, Shield, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useBasePlanConfig } from "@/hooks/useBasePlanConfig";
import { formatBillingPeriod } from "@/lib/planStatus";

export default function PlanExpired() {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const { config } = useBasePlanConfig();
  const [loading, setLoading] = useState(false);

  const price = config?.price ?? 49.90;
  const period = config?.billing_period ?? "monthly";

  const handleRenew = async () => {
    if (!user) return;
    setLoading(true);

    // Create a base plan payment request
    const { error: paymentError } = await (supabase.from("base_plan_payments") as any).insert({
      user_id: user.id,
      amount: price,
      status: "pending_review",
      billing_period: period,
    });

    if (paymentError) {
      toast({ title: "Erro", description: "Não foi possível solicitar renovação.", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Update profile status
    const { error } = await supabase
      .from("profiles")
      .update({
        status_plano: "aguardando_pagamento",
        valor_plano: price,
      } as any)
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível processar.", variant: "destructive" });
      setLoading(false);
      return;
    }

    toast({ title: "Solicitação enviada!", description: "Envie o comprovante de pagamento para liberar o acesso." });
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="h-16 w-16 rounded-2xl bg-orange-500/20 flex items-center justify-center mx-auto">
            <CalendarX className="h-8 w-8 text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Plano vencido</h1>
            <p className="text-muted-foreground mt-1">
              Olá, <strong>{profile?.nome}</strong>! Renove em 1 clique para voltar a usar — seus dados continuam salvos.
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-card border-2 border-primary p-6 space-y-4 shadow-lg shadow-primary/10">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Crown className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{config?.name || "Plano Mensal"}</h2>
              <p className="text-sm text-muted-foreground">Renove seu acesso</p>
              <p className="text-2xl font-bold text-primary">
                R$ {price.toFixed(2)}
                <span className="text-sm font-normal text-muted-foreground">{formatBillingPeriod(period)}</span>
              </p>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              Mais 30 dias de acesso completo
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              Sua agenda, financeiro e equipe intactos
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              Pagamento por Pix com aprovação rápida
            </li>
          </ul>
          <Button
            onClick={handleRenew}
            disabled={loading}
            className="w-full h-12 text-base gap-2 bg-primary hover:bg-primary/90"
          >
            <Send className="h-5 w-5" />
            {loading ? "Processando..." : "Renovar agora"}
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground px-4">
          Em seguida, envie o comprovante do Pix. A liberação acontece após confirmação do administrador.
        </p>

        <Button variant="ghost" onClick={signOut} className="w-full gap-2">
          <LogOut className="h-4 w-4" /> Sair
        </Button>
      </div>
    </div>
  );
}
