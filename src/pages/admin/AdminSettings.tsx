import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Settings, Copy, Link, DollarSign, ToggleLeft, ToggleRight, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface SignupConfig {
  id: string;
  valor_padrao: number;
  cadastro_ativo: boolean;
  instrucoes_pagamento: string;
}

export default function AdminSettings() {
  const [config, setConfig] = useState<SignupConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [valorPadrao, setValorPadrao] = useState("");
  const [cadastroAtivo, setCadastroAtivo] = useState(true);
  const [instrucoes, setInstrucoes] = useState("");
  const { toast } = useToast();

  const publicLink = window.location.origin;

  const loadConfig = async () => {
    const { data } = await (supabase.from("signup_config") as any).select("*").limit(1);
    if (data && data.length > 0) {
      const c = data[0] as SignupConfig;
      setConfig(c);
      setValorPadrao(String(c.valor_padrao || ""));
      setCadastroAtivo(c.cadastro_ativo);
      setInstrucoes(c.instrucoes_pagamento || "");
    }
    setLoading(false);
  };

  useEffect(() => { loadConfig(); }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);

    await (supabase.from("signup_config") as any).update({
      valor_padrao: valorPadrao ? parseFloat(valorPadrao) : 0,
      cadastro_ativo: cadastroAtivo,
      instrucoes_pagamento: instrucoes,
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
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground text-sm">Configurações do cadastro público e valores</p>
      </div>

      {/* Link público */}
      <div className="rounded-2xl bg-card border border-border p-6 space-y-4">
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
      <div className="rounded-2xl bg-card border border-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {cadastroAtivo ? <ToggleRight className="h-5 w-5 text-[hsl(140_60%_55%)]" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
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

      {/* Valor padrão */}
      <div className="rounded-2xl bg-card border border-border p-6 space-y-4">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Valor Padrão para Novos Clientes</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Este valor será automaticamente atribuído a novos clientes que se cadastrarem pelo link público.
          Alterar este valor <strong>não afeta</strong> usuários já cadastrados.
        </p>
        <div className="space-y-1.5">
          <Label>Valor (R$)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={valorPadrao}
            onChange={(e) => setValorPadrao(e.target.value)}
            placeholder="0.00"
            className="h-10 bg-secondary/50 border-border max-w-xs"
          />
        </div>
      </div>

      {/* Instruções de pagamento */}
      <div className="rounded-2xl bg-card border border-border p-6 space-y-4">
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
