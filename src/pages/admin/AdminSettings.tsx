import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Settings, Copy, Link, DollarSign, ToggleLeft, ToggleRight, Save, ExternalLink, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useBasePlanConfig } from "@/hooks/useBasePlanConfig";
import { formatBillingPeriod } from "@/lib/planStatus";
import { useNavigate } from "react-router-dom";

interface SignupConfig {
  id: string;
  cadastro_ativo: boolean;
  instrucoes_pagamento: string;
  trial_days: number;
}

export default function AdminSettings() {
  const [config, setConfig] = useState<SignupConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cadastroAtivo, setCadastroAtivo] = useState(true);
  const [instrucoes, setInstrucoes] = useState("");
  const [trialDays, setTrialDays] = useState(7);
  const { toast } = useToast();
  const { config: planConfig, loading: planLoading } = useBasePlanConfig();
  const navigate = useNavigate();

  const publicLink = window.location.origin;

  const loadConfig = async () => {
    const { data } = await (supabase.from("signup_config") as any).select("*").limit(1);
    if (data && data.length > 0) {
      const c = data[0] as SignupConfig;
      setConfig(c);
      setCadastroAtivo(c.cadastro_ativo);
      setInstrucoes(c.instrucoes_pagamento || "");
      setTrialDays(c.trial_days ?? 7);
    }
    setLoading(false);
  };

  useEffect(() => { loadConfig(); }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);

    await (supabase.from("signup_config") as any).update({
      cadastro_ativo: cadastroAtivo,
      instrucoes_pagamento: instrucoes,
      trial_days: trialDays,
      updated_at: new Date().toISOString(),
    }).eq("id", config.id);

    toast({ title: "Salvo!", description: "Configurações atualizadas com sucesso." });
    setSaving(false);
    loadConfig();
  };

  const copyLink = () => {
    navigator.clipboard.writeText(publicLink);
    toast({ title: "Link copiado!", description: "Link público de cadastro copiado." });
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto flex justify-center py-20">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-4 md:space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground text-sm">Configurações do cadastro público</p>
      </div>

      {/* Link público */}
      <div className="rounded-2xl bg-card border border-border p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Link className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Link Público de Cadastro</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Compartilhe este link para que novos clientes possam criar conta.
        </p>
        <div className="flex gap-2">
          <Input value={publicLink} readOnly className="h-10 bg-secondary/50 border-border flex-1 text-sm font-mono" />
          <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={copyLink}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Ativar/desativar cadastro */}
      <div className="rounded-2xl bg-card border border-border p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {cadastroAtivo ? <ToggleRight className="h-5 w-5 text-[hsl(140,60%,55%)]" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
            <h2 className="font-semibold">Cadastro Público</h2>
          </div>
          <Switch checked={cadastroAtivo} onCheckedChange={setCadastroAtivo} />
        </div>
        <p className="text-sm text-muted-foreground">
          {cadastroAtivo
            ? "Novos usuários podem criar conta pelo link público."
            : "Cadastro público desativado. Apenas o administrador pode criar novos usuários."}
        </p>
      </div>

      {/* Plano Base Atual — informativo */}
      <div className="rounded-2xl bg-card border border-border p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Plano Base Atual</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Este é o valor cobrado automaticamente de novos clientes que se cadastrarem pelo link público.
          Para alterar, acesse a tela de gerenciamento do plano base.
        </p>
        {planLoading ? (
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        ) : planConfig ? (
          <div className="flex items-center justify-between flex-wrap gap-4 rounded-xl bg-secondary/40 border border-border/50 p-4">
            <div>
              <p className="font-semibold">{planConfig.name}</p>
              <p className="text-2xl font-bold text-primary">
                R$ {planConfig.price.toFixed(2)}
                <span className="text-sm font-normal text-muted-foreground">{formatBillingPeriod(planConfig.billing_period)}</span>
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-xl"
              onClick={() => navigate("/admin/base-plan")}
            >
              <ExternalLink className="h-4 w-4" />
              Gerenciar plano base
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum plano base configurado.</p>
        )}
      </div>


      {/* Duração do Trial */}
      <div className="rounded-2xl bg-card border border-border p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Duração do Teste Grátis</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Quantidade de dias de acesso completo para novos usuários que iniciarem o teste grátis.
        </p>
        <Select value={String(trialDays)} onValueChange={(v) => setTrialDays(Number(v))}>
          <SelectTrigger className="w-full bg-secondary/50 border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">3 dias</SelectItem>
            <SelectItem value="5">5 dias</SelectItem>
            <SelectItem value="7">7 dias</SelectItem>
            <SelectItem value="14">14 dias</SelectItem>
            <SelectItem value="30">30 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl bg-card border border-border p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Instruções de Pagamento</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Texto exibido para o usuário na tela de pagamento.
        </p>
        <Textarea
          value={instrucoes}
          onChange={(e) => setInstrucoes(e.target.value)}
          placeholder="Ex: Realize o pagamento via Pix e envie o comprovante."
          className="bg-secondary/50 border-border resize-none"
          rows={3}
        />
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full h-11 gap-2 bg-primary hover:bg-primary/90">
        <Save className="h-4 w-4" />
        {saving ? "Salvando..." : "Salvar Configurações"}
      </Button>
    </div>
  );
}
