import { useEffect, useState } from "react";
import { AlertTriangle, Crown, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useBasePlanConfig } from "@/hooks/useBasePlanConfig";
import { formatBillingPeriod } from "@/lib/planStatus";

export default function TrialExpired() {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const { config } = useBasePlanConfig();
  const [loading, setLoading] = useState(false);
  const [trialDays, setTrialDays] = useState(7);

  useEffect(() => {
    supabase.from("signup_config").select("trial_days").limit(1).then(({ data }) => {
      if (data && data.length > 0 && (data[0] as any).trial_days) {
        setTrialDays((data[0] as any).trial_days);
      }
    });
  }, []);

  const price = config?.price ?? 49.90;
  const period = config?.billing_period ?? "monthly";

  const handleUpgrade = async () => {
    if (!user) return;
    setLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        plan_type: "monthly",
        status_plano: "aguardando_pagamento",
        valor_plano: price,
      } as any)
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível processar.", variant: "destructive" });
      setLoading(false);
      return;
    }

    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="h-16 w-16 rounded-2xl bg-destructive/20 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Seu teste grátis acabou</h1>
            <p className="text-muted-foreground mt-1">
              Os {trialDays} dias gratuitos terminaram. Continue com o plano mensal — seus dados estão salvos.
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
              <p className="text-sm text-muted-foreground">Renovação mensal</p>
              <p className="text-2xl font-bold text-primary">
                R$ {price.toFixed(2)}
                <span className="text-sm font-normal text-muted-foreground">{formatBillingPeriod(period)}</span>
              </p>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              Continua com tudo que já cadastrou
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              Acesso completo ao app
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              Pagamento por Pix com aprovação rápida
            </li>
          </ul>
          <Button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full h-12 text-base gap-2 bg-primary hover:bg-primary/90"
          >
            <Shield className="h-5 w-5" />
            {loading ? "Processando..." : "Contratar plano mensal"}
          </Button>
        </div>

        <Button variant="ghost" onClick={signOut} className="w-full gap-2">
          <LogOut className="h-4 w-4" /> Sair
        </Button>
      </div>
    </div>
  );
}
